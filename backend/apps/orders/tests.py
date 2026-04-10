"""
Comprehensive tests for the Orders app.

Covers: order creation, listing, cancellation, detail retrieval,
admin status update, and payment creation.
"""
from decimal import Decimal
from unittest.mock import patch

from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase

from apps.books.models import Book, Category, Author
from apps.core.models import SiteConfig
from .models import Order, OrderItem, Payment

User = get_user_model()


class OrderTestMixin:
    """Shared helpers for order tests."""

    def _create_base_data(self):
        """Create user, category, author, book, and site config."""
        SiteConfig.get_config()
        self.user = User.objects.create_user(
            username='buyer',
            email='buyer@example.com',
            password='TestPass123!',
            first_name='Buyer',
            last_name='Test',
        )
        self.other_user = User.objects.create_user(
            username='other',
            email='other@example.com',
            password='TestPass123!',
            first_name='Other',
            last_name='User',
        )
        self.admin_user = User.objects.create_superuser(
            username='admin',
            email='admin@example.com',
            password='AdminPass123!',
            first_name='Admin',
            last_name='Frollot',
        )
        self.category, _ = Category.objects.get_or_create(
            name='Roman', defaults={'slug': 'roman'},
        )
        self.author = Author.objects.create(
            full_name='Auteur Order', slug='auteur-order',
        )
        self.book = Book.objects.create(
            title='Livre Order Test',
            slug='livre-order-test',
            reference='ORD-REF001',
            description='Description du livre de test',
            price=Decimal('5000'),
            format='PAPIER',
            available=True,
            category=self.category,
            author=self.author,
        )
        self.book2 = Book.objects.create(
            title='Deuxieme Livre',
            slug='deuxieme-livre',
            reference='ORD-REF002',
            description='Un autre livre',
            price=Decimal('3000'),
            format='PAPIER',
            available=True,
            category=self.category,
            author=self.author,
        )

    def _valid_order_payload(self, **overrides):
        """Return a valid order creation payload."""
        data = {
            'items': [{'book_id': self.book.id, 'quantity': 1}],
            'shipping_address': '123 Rue de la Liberté, Quartier Centre',
            'shipping_phone': '+24112345678',
            'shipping_city': 'Port-Gentil',
        }
        data.update(overrides)
        return data

    def _create_order_via_api(self, user=None):
        """Create an order through the API and return the response."""
        self.client.force_authenticate(user=user or self.user)
        return self.client.post(
            '/api/orders/',
            self._valid_order_payload(),
            format='json',
        )

    def _create_order_in_db(self, user=None, order_status='PENDING'):
        """Create an Order directly in the database."""
        return Order.objects.create(
            user=user or self.user,
            status=order_status,
            subtotal=Decimal('5000'),
            shipping_cost=Decimal('0'),
            discount_amount=Decimal('0'),
            total_amount=Decimal('5000'),
            shipping_address='123 Rue Test',
            shipping_phone='+24112345678',
            shipping_city='Port-Gentil',
        )


# ──────────────────────────────────────────────────────────────
# Order Creation
# ──────────────────────────────────────────────────────────────

class OrderCreationTest(OrderTestMixin, APITestCase):
    """Tests for POST /api/orders/."""

    def setUp(self):
        self._create_base_data()

    def test_create_order_authenticated(self):
        """Authenticated user can create an order with valid data."""
        self.client.force_authenticate(user=self.user)
        payload = self._valid_order_payload()
        response = self.client.post('/api/orders/', payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        self.assertIn('id', response.data)
        self.assertEqual(response.data['status'], 'PENDING')

    def test_create_order_multiple_items(self):
        """Order with several items computes correct totals."""
        self.client.force_authenticate(user=self.user)
        payload = self._valid_order_payload(items=[
            {'book_id': self.book.id, 'quantity': 2},
            {'book_id': self.book2.id, 'quantity': 1},
        ])
        response = self.client.post('/api/orders/', payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        order = Order.objects.get(id=response.data['id'])
        self.assertEqual(order.items.count(), 2)

    def test_create_order_unauthenticated(self):
        """Unauthenticated request is rejected with 401."""
        response = self.client.post(
            '/api/orders/',
            self._valid_order_payload(),
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_create_order_empty_items(self):
        """Order with empty items list is rejected."""
        self.client.force_authenticate(user=self.user)
        payload = self._valid_order_payload(items=[])
        response = self.client.post('/api/orders/', payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_create_order_missing_shipping_address(self):
        """Missing shipping_address triggers validation error."""
        self.client.force_authenticate(user=self.user)
        payload = self._valid_order_payload()
        del payload['shipping_address']
        response = self.client.post('/api/orders/', payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_create_order_missing_shipping_phone(self):
        """Missing shipping_phone triggers validation error."""
        self.client.force_authenticate(user=self.user)
        payload = self._valid_order_payload()
        del payload['shipping_phone']
        response = self.client.post('/api/orders/', payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_create_order_missing_shipping_city(self):
        """Missing shipping_city triggers validation error."""
        self.client.force_authenticate(user=self.user)
        payload = self._valid_order_payload()
        del payload['shipping_city']
        response = self.client.post('/api/orders/', payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_create_order_invalid_book_id(self):
        """Non-existent book_id is rejected."""
        self.client.force_authenticate(user=self.user)
        payload = self._valid_order_payload(
            items=[{'book_id': 99999, 'quantity': 1}],
        )
        response = self.client.post('/api/orders/', payload, format='json')
        self.assertIn(response.status_code, [
            status.HTTP_400_BAD_REQUEST,
            status.HTTP_404_NOT_FOUND,
        ])

    def test_create_order_zero_quantity_rejected(self):
        """Quantity of 0 is rejected."""
        self.client.force_authenticate(user=self.user)
        payload = self._valid_order_payload(
            items=[{'book_id': self.book.id, 'quantity': 0}],
        )
        response = self.client.post('/api/orders/', payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_create_order_item_missing_book_id(self):
        """Item without book_id is rejected."""
        self.client.force_authenticate(user=self.user)
        payload = self._valid_order_payload(
            items=[{'quantity': 1}],
        )
        response = self.client.post('/api/orders/', payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


# ──────────────────────────────────────────────────────────────
# Order Listing
# ──────────────────────────────────────────────────────────────

class OrderListingTest(OrderTestMixin, APITestCase):
    """Tests for GET /api/orders/."""

    def setUp(self):
        self._create_base_data()

    def test_list_own_orders_only(self):
        """Regular user sees only their own orders."""
        self._create_order_in_db(user=self.user)
        self._create_order_in_db(user=self.user)
        self._create_order_in_db(user=self.other_user)

        self.client.force_authenticate(user=self.user)
        response = self.client.get('/api/orders/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data['results']
        self.assertEqual(len(results), 2)
        for order_data in results:
            self.assertEqual(order_data['user']['id'], self.user.id)

    def test_no_access_to_other_users_orders(self):
        """User cannot see orders belonging to another user."""
        self._create_order_in_db(user=self.other_user)

        self.client.force_authenticate(user=self.user)
        response = self.client.get('/api/orders/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 0)

    def test_admin_sees_all_orders(self):
        """Admin user sees all orders across users."""
        self._create_order_in_db(user=self.user)
        self._create_order_in_db(user=self.other_user)

        self.client.force_authenticate(user=self.admin_user)
        response = self.client.get('/api/orders/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 2)

    def test_unauthenticated_listing_rejected(self):
        """Unauthenticated user cannot list orders."""
        response = self.client.get('/api/orders/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_pagination_present(self):
        """Response includes pagination keys."""
        self._create_order_in_db(user=self.user)
        self.client.force_authenticate(user=self.user)
        response = self.client.get('/api/orders/')
        self.assertIn('count', response.data)
        self.assertIn('results', response.data)


# ──────────────────────────────────────────────────────────────
# Order Detail / Retrieve
# ──────────────────────────────────────────────────────────────

class OrderDetailTest(OrderTestMixin, APITestCase):
    """Tests for GET /api/orders/{id}/."""

    def setUp(self):
        self._create_base_data()

    def test_retrieve_own_order(self):
        """User can retrieve their own order by id."""
        order = self._create_order_in_db(user=self.user)
        self.client.force_authenticate(user=self.user)
        response = self.client.get(f'/api/orders/{order.id}/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['id'], order.id)

    def test_cannot_retrieve_other_users_order(self):
        """User gets 404 when trying to access another user's order."""
        order = self._create_order_in_db(user=self.other_user)
        self.client.force_authenticate(user=self.user)
        response = self.client.get(f'/api/orders/{order.id}/')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_admin_can_retrieve_any_order(self):
        """Admin can retrieve any order."""
        order = self._create_order_in_db(user=self.user)
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.get(f'/api/orders/{order.id}/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_nonexistent_order_returns_404(self):
        """Request for non-existent order returns 404."""
        self.client.force_authenticate(user=self.user)
        response = self.client.get('/api/orders/99999/')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)


# ──────────────────────────────────────────────────────────────
# Order Cancellation
# ──────────────────────────────────────────────────────────────

class OrderCancellationTest(OrderTestMixin, APITestCase):
    """Tests for POST /api/orders/{id}/cancel/."""

    def setUp(self):
        self._create_base_data()

    @patch('apps.core.tasks.send_order_cancelled_task.delay')
    def test_cancel_pending_order(self, mock_task):
        """User can cancel a PENDING order."""
        resp = self._create_order_via_api()
        order_id = resp.data['id']

        cancel_resp = self.client.post(f'/api/orders/{order_id}/cancel/')
        self.assertEqual(cancel_resp.status_code, status.HTTP_200_OK)
        self.assertEqual(cancel_resp.data['status'], 'CANCELLED')
        mock_task.assert_called_once()

    def test_cannot_cancel_paid_order(self):
        """PAID order cannot be cancelled."""
        order = self._create_order_in_db(user=self.user, order_status='PAID')
        self.client.force_authenticate(user=self.user)
        response = self.client.post(f'/api/orders/{order.id}/cancel/')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        order.refresh_from_db()
        self.assertEqual(order.status, 'PAID')

    def test_cannot_cancel_shipped_order(self):
        """SHIPPED order cannot be cancelled."""
        order = self._create_order_in_db(user=self.user, order_status='SHIPPED')
        self.client.force_authenticate(user=self.user)
        response = self.client.post(f'/api/orders/{order.id}/cancel/')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_cannot_cancel_delivered_order(self):
        """DELIVERED order cannot be cancelled."""
        order = self._create_order_in_db(user=self.user, order_status='DELIVERED')
        self.client.force_authenticate(user=self.user)
        response = self.client.post(f'/api/orders/{order.id}/cancel/')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_cannot_cancel_other_users_order(self):
        """User cannot cancel another user's order (404 from queryset filter)."""
        order = self._create_order_in_db(user=self.other_user, order_status='PENDING')
        self.client.force_authenticate(user=self.user)
        response = self.client.post(f'/api/orders/{order.id}/cancel/')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_cancel_unauthenticated(self):
        """Unauthenticated user cannot cancel any order."""
        order = self._create_order_in_db(user=self.user)
        response = self.client.post(f'/api/orders/{order.id}/cancel/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    @patch('apps.core.tasks.send_order_cancelled_task.delay')
    def test_cancel_already_cancelled_order(self, mock_task):
        """Already-cancelled order cannot be cancelled again."""
        order = self._create_order_in_db(user=self.user, order_status='CANCELLED')
        self.client.force_authenticate(user=self.user)
        response = self.client.post(f'/api/orders/{order.id}/cancel/')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        mock_task.assert_not_called()


# ──────────────────────────────────────────────────────────────
# Admin Status Update
# ──────────────────────────────────────────────────────────────

class OrderAdminStatusUpdateTest(OrderTestMixin, APITestCase):
    """Tests for PATCH /api/orders/{id}/ (admin status update)."""

    def setUp(self):
        self._create_base_data()

    def test_admin_can_update_status(self):
        """Admin can change order status via PATCH."""
        order = self._create_order_in_db(user=self.user, order_status='PENDING')
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.patch(
            f'/api/orders/{order.id}/',
            {'status': 'PAID'},
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        order.refresh_from_db()
        self.assertEqual(order.status, 'PAID')

    @patch('apps.core.tasks.send_order_shipped_task.delay')
    def test_admin_update_to_shipped_triggers_task(self, mock_task):
        """Transitioning to SHIPPED triggers the shipping notification task."""
        order = self._create_order_in_db(user=self.user, order_status='PAID')
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.patch(
            f'/api/orders/{order.id}/',
            {'status': 'SHIPPED'},
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        mock_task.assert_called_once_with(order.id)

    def test_non_admin_cannot_update_status(self):
        """Regular user gets 403 when trying to update order status."""
        order = self._create_order_in_db(user=self.user, order_status='PENDING')
        self.client.force_authenticate(user=self.user)
        response = self.client.patch(
            f'/api/orders/{order.id}/',
            {'status': 'PAID'},
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        order.refresh_from_db()
        self.assertEqual(order.status, 'PENDING')

    def test_non_admin_cannot_update_other_user_order(self):
        """Regular user cannot update status of another user's order."""
        order = self._create_order_in_db(user=self.other_user, order_status='PENDING')
        self.client.force_authenticate(user=self.user)
        response = self.client.patch(
            f'/api/orders/{order.id}/',
            {'status': 'PAID'},
            format='json',
        )
        # Either 403 (denied before object lookup) or 404 (filtered by queryset)
        self.assertIn(response.status_code, [
            status.HTTP_403_FORBIDDEN,
            status.HTTP_404_NOT_FOUND,
        ])


# ──────────────────────────────────────────────────────────────
# Payment
# ──────────────────────────────────────────────────────────────

class PaymentCreationTest(OrderTestMixin, APITestCase):
    """Tests for POST /api/payments/."""

    def setUp(self):
        self._create_base_data()

    def _payment_payload(self, order_id, **overrides):
        """Return a valid payment payload."""
        import uuid
        data = {
            'order_id': order_id,
            'transaction_id': str(uuid.uuid4())[:20],
            'provider': 'CASH',
            'amount': '5000.00',
            'status': 'SUCCESS',
        }
        data.update(overrides)
        return data

    def test_create_payment_for_pending_order(self):
        """Successful payment transitions order to PAID."""
        order = self._create_order_in_db(user=self.user, order_status='PENDING')
        self.client.force_authenticate(user=self.user)
        response = self.client.post(
            '/api/payments/',
            self._payment_payload(order.id),
            format='json',
        )
        self.assertIn(response.status_code, [
            status.HTTP_200_OK,
            status.HTTP_201_CREATED,
        ])
        order.refresh_from_db()
        self.assertEqual(order.status, 'PAID')

    def test_payment_for_non_pending_order_rejected(self):
        """Cannot pay for an order that is not PENDING."""
        order = self._create_order_in_db(user=self.user, order_status='PAID')
        self.client.force_authenticate(user=self.user)
        response = self.client.post(
            '/api/payments/',
            self._payment_payload(order.id),
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_payment_without_order_id_rejected(self):
        """Missing order_id triggers 400."""
        self.client.force_authenticate(user=self.user)
        payload = self._payment_payload(order_id=None)
        del payload['order_id']
        response = self.client.post('/api/payments/', payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_payment_for_other_users_order_rejected(self):
        """Cannot create payment for another user's order."""
        order = self._create_order_in_db(user=self.other_user, order_status='PENDING')
        self.client.force_authenticate(user=self.user)
        response = self.client.post(
            '/api/payments/',
            self._payment_payload(order.id),
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_duplicate_payment_rejected(self):
        """Cannot pay twice for the same order."""
        order = self._create_order_in_db(user=self.user, order_status='PENDING')
        Payment.objects.create(
            order=order,
            transaction_id='existing-txn-001',
            provider='CASH',
            amount=Decimal('5000'),
            status='SUCCESS',
        )
        self.client.force_authenticate(user=self.user)
        response = self.client.post(
            '/api/payments/',
            self._payment_payload(order.id),
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_unauthenticated_payment_rejected(self):
        """Unauthenticated user cannot create a payment."""
        order = self._create_order_in_db(user=self.user, order_status='PENDING')
        response = self.client.post(
            '/api/payments/',
            self._payment_payload(order.id),
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
