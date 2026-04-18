"""
Tests for the refund flow.
Covers: create, validation, duplicate prevention, admin approve/reject.
"""
from decimal import Decimal
from unittest.mock import patch

from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase

from apps.books.models import Book, Category, Author
from apps.core.models import SiteConfig
from .models import Order, Refund

User = get_user_model()


class RefundTestMixin:
    """Shared helpers for refund tests."""

    def _create_base_data(self):
        SiteConfig.get_config()
        self.user = User.objects.create_user(
            username='refund_buyer', email='refund@example.com',
            password='TestPass123!', first_name='Buyer', last_name='Refund',
        )
        self.admin_user = User.objects.create_superuser(
            username='refund_admin', email='refund_admin@example.com',
            password='AdminPass123!', first_name='Admin', last_name='Refund',
        )
        self.other_user = User.objects.create_user(
            username='refund_other', email='refund_other@example.com',
            password='TestPass123!',
        )
        category, _ = Category.objects.get_or_create(
            name='Test Refund', defaults={'slug': 'test-refund'},
        )
        author = Author.objects.create(full_name='Auteur Refund', slug='auteur-refund')
        self.book = Book.objects.create(
            title='Livre Refund', slug='livre-refund', reference='REF-REFUND',
            description='Test', price=Decimal('5000'), format='PAPIER',
            category=category, author=author, available=True,
        )

    def _create_paid_order(self, user=None, total=Decimal('5000')):
        return Order.objects.create(
            user=user or self.user,
            status='PAID',
            subtotal=total,
            shipping_cost=Decimal('0'),
            discount_amount=Decimal('0'),
            total_amount=total,
            shipping_address='123 Rue Test',
            shipping_phone='+241 00 00 00',
            shipping_city='Libreville',
        )


class RefundCreateTests(RefundTestMixin, APITestCase):
    """Tests for POST /api/orders/refunds/create/."""

    def setUp(self):
        self._create_base_data()

    def test_create_refund_on_paid_order(self):
        """Client crée un remboursement sur une commande PAID → 201."""
        order = self._create_paid_order()
        self.client.force_authenticate(user=self.user)
        response = self.client.post('/api/orders/refunds/create/', {
            'order': order.id,
            'amount': '3000',
            'reason': 'DAMAGED',
            'description': 'Livre abîmé à la livraison.',
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        refund = Refund.objects.get(order=order)
        self.assertEqual(refund.status, 'REQUESTED')
        self.assertEqual(refund.amount, Decimal('3000'))
        self.assertEqual(refund.user, self.user)

    def test_create_refund_on_pending_order_rejected(self):
        """Commande PENDING → 400."""
        order = self._create_paid_order()
        order.status = 'PENDING'
        order.save(update_fields=['status'])
        self.client.force_authenticate(user=self.user)
        response = self.client.post('/api/orders/refunds/create/', {
            'order': order.id,
            'amount': '3000',
            'reason': 'NOT_RECEIVED',
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_create_refund_exceeds_total_rejected(self):
        """Montant > total de la commande → 400."""
        order = self._create_paid_order(total=Decimal('5000'))
        self.client.force_authenticate(user=self.user)
        response = self.client.post('/api/orders/refunds/create/', {
            'order': order.id,
            'amount': '6000',
            'reason': 'QUALITY',
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_duplicate_refund_rejected(self):
        """Deuxième demande quand la première est en cours → 400."""
        order = self._create_paid_order()
        Refund.objects.create(
            order=order, user=self.user, amount=Decimal('2000'),
            reason='DAMAGED', status='REQUESTED',
        )
        self.client.force_authenticate(user=self.user)
        response = self.client.post('/api/orders/refunds/create/', {
            'order': order.id,
            'amount': '1000',
            'reason': 'OTHER',
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class RefundAdminTests(RefundTestMixin, APITestCase):
    """Tests for admin approve/reject."""

    def setUp(self):
        self._create_base_data()

    @patch('apps.core.email.send_async')
    def test_admin_approve_refund(self, mock_send):
        """Admin approuve → PROCESSED, order REFUNDED."""
        order = self._create_paid_order()
        refund = Refund.objects.create(
            order=order, user=self.user, amount=Decimal('5000'),
            reason='NOT_RECEIVED', status='REQUESTED',
        )
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.post(f'/api/orders/refunds/admin/{refund.id}/', {
            'action': 'approve',
            'admin_note': 'Remboursement validé.',
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['status'], 'PROCESSED')

        refund.refresh_from_db()
        self.assertEqual(refund.status, 'PROCESSED')
        self.assertIsNotNone(refund.processed_at)
        self.assertEqual(refund.admin_note, 'Remboursement validé.')

        order.refresh_from_db()
        self.assertEqual(order.status, 'REFUNDED')

    def test_admin_reject_refund(self):
        """Admin rejette → REJECTED."""
        order = self._create_paid_order()
        refund = Refund.objects.create(
            order=order, user=self.user, amount=Decimal('2000'),
            reason='QUALITY', status='REQUESTED',
        )
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.post(f'/api/orders/refunds/admin/{refund.id}/', {
            'action': 'reject',
            'admin_note': 'Photos insuffisantes.',
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['status'], 'REJECTED')

        refund.refresh_from_db()
        self.assertEqual(refund.status, 'REJECTED')
        self.assertEqual(refund.admin_note, 'Photos insuffisantes.')

        order.refresh_from_db()
        self.assertEqual(order.status, 'PAID')  # Inchangé
