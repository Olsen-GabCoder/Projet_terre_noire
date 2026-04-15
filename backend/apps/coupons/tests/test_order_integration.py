"""
Test d'intégration e2e complet du flux coupons vendeur.
Scénario :
1. Vendeur A crée un template -10%
2. Vendeur A envoie le coupon à user_X
3. user_X crée un panier mixte (items org A + items org B)
4. user_X applique le coupon → réduction uniquement sur items org A
5. user_X passe la commande → SubOrder org A a discount_amount, SubOrder org B intact
6. user_X annule la commande → coupon restauré à SENT, SubOrder.discount_amount → 0
7. user_X retente d'utiliser le coupon → ça marche
"""
from decimal import Decimal
from unittest.mock import patch

from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase

from apps.books.models import Author, Book, Category
from apps.core.models import SiteConfig
from apps.coupons.models import Coupon, CouponTemplate
from apps.coupons.services import create_coupons_for_send, send_single_coupon
from apps.marketplace.models import SubOrder
from apps.orders.models import Order
from apps.organizations.models import Organization, OrganizationMembership

User = get_user_model()


class CouponEndToEndTest(APITestCase):
    """Test e2e complet : template → envoi → commande mixte → annulation → réutilisation."""

    def setUp(self):
        SiteConfig.get_config()

        # Vendeur A
        self.vendor_a = User.objects.create_user(
            username='vendor_a', email='vendor_a@test.com', password='TestPass123!',
        )
        self.org_a = Organization.objects.create(
            name='Éditions A', org_type='MAISON_EDITION', owner=self.vendor_a,
        )
        OrganizationMembership.objects.create(
            organization=self.org_a, user=self.vendor_a, role='PROPRIETAIRE',
        )

        # Vendeur B
        self.vendor_b = User.objects.create_user(
            username='vendor_b', email='vendor_b@test.com', password='TestPass123!',
        )
        self.org_b = Organization.objects.create(
            name='Librairie B', org_type='LIBRAIRIE', owner=self.vendor_b,
        )
        OrganizationMembership.objects.create(
            organization=self.org_b, user=self.vendor_b, role='PROPRIETAIRE',
        )

        # Acheteur
        self.buyer = User.objects.create_user(
            username='buyer', email='buyer@test.com', password='TestPass123!',
            first_name='Achille', last_name='Buyer',
        )

        # Livres
        self.cat, _ = Category.objects.get_or_create(name='Roman', defaults={'slug': 'roman-e2e'})
        self.author = Author.objects.create(full_name='Auteur E2E', slug='auteur-e2e')
        self.book_a = Book.objects.create(
            title='Livre Org A', slug='livre-org-a', reference='E2E-A',
            price=Decimal('5000'), format='PAPIER', available=True,
            category=self.cat, author=self.author,
            publisher_organization=self.org_a,
        )
        self.book_b = Book.objects.create(
            title='Livre Org B', slug='livre-org-b', reference='E2E-B',
            price=Decimal('3000'), format='PAPIER', available=True,
            category=self.cat, author=self.author,
            publisher_organization=self.org_b,
        )

    @patch('apps.core.email.send_templated_email', return_value=True)
    @patch('apps.core.tasks.send_order_confirmation_task.delay')
    @patch('apps.core.tasks.send_vendor_new_order_task.delay')
    def test_full_e2e_flow(self, mock_vendor_email, mock_order_email, mock_templated):
        # ── Étape 1 : Vendeur A crée un template ──
        template = CouponTemplate.objects.create(
            organization=self.org_a,
            name='-10% libraire',
            discount_type='PERCENT',
            discount_value=Decimal('10'),
            default_expiry_days=30,
            created_by=self.vendor_a,
        )

        # ── Étape 2 : Vendeur A envoie le coupon à buyer ──
        coupon_ids = create_coupons_for_send(
            template=template,
            recipient_emails=['buyer@test.com'],
            created_by=self.vendor_a,
            custom_message='Merci !',
        )
        self.assertEqual(len(coupon_ids), 1)
        coupon = Coupon.objects.get(id=coupon_ids[0])
        self.assertEqual(coupon.status, 'PENDING')
        self.assertEqual(coupon.recipient, self.buyer)
        self.assertEqual(coupon.organization, self.org_a)

        # Simuler l'envoi Celery
        send_single_coupon(coupon.id)
        coupon.refresh_from_db()
        self.assertEqual(coupon.status, 'SENT')

        # ── Étape 3+4+5 : buyer crée une commande mixte avec le coupon ──
        self.client.force_authenticate(user=self.buyer)
        order_payload = {
            'items': [
                {'book_id': self.book_a.id, 'quantity': 2},  # 2 × 5000 = 10000 org A
                {'book_id': self.book_b.id, 'quantity': 1},  # 1 × 3000 = 3000 org B
            ],
            'shipping_address': '123 Rue Test',
            'shipping_phone': '+241066000000',
            'shipping_city': 'Libreville',
            'coupon_code': coupon.code,
        }
        resp = self.client.post('/api/orders/', order_payload, format='json')
        self.assertEqual(resp.status_code, 201, resp.data)

        order = Order.objects.get(id=resp.data['id'])

        # Vérifier la réduction
        # Scoped subtotal org A = 10000, 10% = 1000
        self.assertEqual(order.discount_amount, Decimal('1000.00'))
        self.assertEqual(order.subtotal, Decimal('13000.00'))

        # SubOrder org A a le discount
        so_a = SubOrder.objects.get(order=order, vendor=self.org_a)
        self.assertEqual(so_a.discount_amount, Decimal('1000.00'))
        self.assertEqual(so_a.coupon, coupon)

        # SubOrder org B intact
        so_b = SubOrder.objects.get(order=order, vendor=self.org_b)
        self.assertEqual(so_b.discount_amount, Decimal('0'))
        self.assertIsNone(so_b.coupon)

        # Coupon marqué USED
        coupon.refresh_from_db()
        self.assertEqual(coupon.status, 'USED')
        self.assertEqual(coupon.used_by, self.buyer)
        self.assertEqual(coupon.used_on_order, order)

        # ── Étape 6 : buyer annule la commande ──
        resp = self.client.post(f'/api/orders/{order.id}/cancel/')
        self.assertEqual(resp.status_code, 200)

        order.refresh_from_db()
        self.assertEqual(order.status, 'CANCELLED')

        # Coupon restauré
        coupon.refresh_from_db()
        self.assertEqual(coupon.status, 'SENT')
        self.assertIsNone(coupon.used_by)
        self.assertIsNone(coupon.used_on_order)
        self.assertEqual(coupon.usage_count, 0)

        # SubOrder org A discount remis à 0
        so_a.refresh_from_db()
        self.assertEqual(so_a.discount_amount, Decimal('0'))
        self.assertIsNone(so_a.coupon)

        # ── Étape 7 : buyer réutilise le coupon (nouvelle commande) ──
        order_payload2 = {
            'items': [
                {'book_id': self.book_a.id, 'quantity': 1},  # 5000 org A
            ],
            'shipping_address': '123 Rue Test',
            'shipping_phone': '+241066000000',
            'shipping_city': 'Libreville',
            'coupon_code': coupon.code,
        }
        resp2 = self.client.post('/api/orders/', order_payload2, format='json')
        self.assertEqual(resp2.status_code, 201, resp2.data)

        order2 = Order.objects.get(id=resp2.data['id'])
        # 10% de 5000 = 500
        self.assertEqual(order2.discount_amount, Decimal('500.00'))

        coupon.refresh_from_db()
        self.assertEqual(coupon.status, 'USED')
        self.assertEqual(coupon.used_on_order, order2)

    @patch('apps.core.email.send_templated_email', return_value=True)
    @patch('apps.core.tasks.send_order_confirmation_task.delay')
    @patch('apps.core.tasks.send_vendor_new_order_task.delay')
    def test_platform_coupon_applies_to_global_subtotal(self, mock_v, mock_o, mock_e):
        """Coupon plateforme (org=None) : réduction sur le subtotal global."""
        coupon = Coupon.objects.create(
            code='PLAT-10', discount_type='PERCENT', discount_value=Decimal('10'),
            status='SENT', is_active=True, max_uses=None,
            organization=None,
        )
        self.client.force_authenticate(user=self.buyer)
        resp = self.client.post('/api/orders/', {
            'items': [
                {'book_id': self.book_a.id, 'quantity': 1},  # 5000
                {'book_id': self.book_b.id, 'quantity': 1},  # 3000
            ],
            'shipping_address': 'Addr', 'shipping_phone': '123', 'shipping_city': 'City',
            'coupon_code': 'PLAT-10',
        }, format='json')
        self.assertEqual(resp.status_code, 201, resp.data)
        order = Order.objects.get(id=resp.data['id'])
        # 10% de 8000 = 800
        self.assertEqual(order.discount_amount, Decimal('800.00'))

        # Aucun SubOrder n'a de discount (coupon plateforme = global)
        for so in SubOrder.objects.filter(order=order):
            self.assertEqual(so.discount_amount, Decimal('0'))

    @patch('apps.core.email.send_templated_email', return_value=True)
    @patch('apps.core.tasks.send_order_confirmation_task.delay')
    @patch('apps.core.tasks.send_vendor_new_order_task.delay')
    def test_personal_coupon_not_usable_by_other(self, mock_v, mock_o, mock_e):
        """Un coupon personnel ne peut pas être utilisé par un autre user."""
        coupon = Coupon.objects.create(
            code='PERSONAL-X', discount_type='FIXED', discount_value=Decimal('1000'),
            status='SENT', is_active=True, max_uses=1,
            organization=self.org_a,
            recipient=self.buyer, recipient_email='buyer@test.com',
        )
        # vendor_b essaie d'utiliser le coupon de buyer
        self.client.force_authenticate(user=self.vendor_b)
        resp = self.client.post('/api/orders/', {
            'items': [{'book_id': self.book_a.id, 'quantity': 1}],
            'shipping_address': 'Addr', 'shipping_phone': '123', 'shipping_city': 'City',
            'coupon_code': 'PERSONAL-X',
        }, format='json')
        self.assertEqual(resp.status_code, 201)
        order = Order.objects.get(id=resp.data['id'])
        # Coupon non appliqué car mauvais destinataire
        self.assertEqual(order.discount_amount, Decimal('0'))
        self.assertIsNone(order.coupon_code)

    @patch('apps.core.email.send_templated_email', return_value=True)
    @patch('apps.core.tasks.send_order_confirmation_task.delay')
    @patch('apps.core.tasks.send_vendor_new_order_task.delay')
    def test_scoped_coupon_only_items_org_a(self, mock_v, mock_o, mock_e):
        """Coupon org A sur commande 100% org B → pas de réduction."""
        coupon = Coupon.objects.create(
            code='SCOPE-A', discount_type='FIXED', discount_value=Decimal('2000'),
            status='SENT', is_active=True, max_uses=1,
            organization=self.org_a,
            recipient=self.buyer, recipient_email='buyer@test.com',
        )
        self.client.force_authenticate(user=self.buyer)
        resp = self.client.post('/api/orders/', {
            'items': [{'book_id': self.book_b.id, 'quantity': 1}],  # 100% org B
            'shipping_address': 'Addr', 'shipping_phone': '123', 'shipping_city': 'City',
            'coupon_code': 'SCOPE-A',
        }, format='json')
        self.assertEqual(resp.status_code, 201)
        order = Order.objects.get(id=resp.data['id'])
        self.assertEqual(order.discount_amount, Decimal('0'))
        self.assertIsNone(order.coupon_code)
