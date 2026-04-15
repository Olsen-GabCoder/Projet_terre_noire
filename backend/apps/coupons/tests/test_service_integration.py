"""
Test e2e complet : prestataire crée template → envoie coupon → client accepte devis avec coupon →
ServiceOrder avec discount_amount → annulation → restauration → réutilisation.
+ Test dual-user emitter isolation.
"""
from datetime import timedelta
from datetime import timedelta
from decimal import Decimal
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework.test import APITestCase

from apps.coupons.models import Coupon, CouponTemplate
from apps.coupons.services import create_coupons_for_send, send_single_coupon
from apps.organizations.models import Organization, OrganizationMembership
from apps.services.models import ServiceListing, ServiceOrder, ServiceQuote, ServiceRequest
from apps.users.models import UserProfile

User = get_user_model()


class ServiceCouponE2ETest(APITestCase):

    def setUp(self):
        # Prestataire
        self.provider_user = User.objects.create_user(
            username='provider', email='provider@test.com', password='TestPass123!',
            first_name='Alice', last_name='Correctrice',
        )
        self.profile = UserProfile.objects.create(
            user=self.provider_user, profile_type='CORRECTEUR',
        )
        # Client
        self.client_user = User.objects.create_user(
            username='buyer', email='buyer@test.com', password='TestPass123!',
        )
        # Service setup
        self.listing = ServiceListing.objects.create(
            provider=self.profile, service_type='CORRECTION', title='Correction pro',
            description='Test', price_type='PER_PROJECT', base_price=Decimal('10000'),
            turnaround_days=7,
        )
        self.request_obj = ServiceRequest.objects.create(
            client=self.client_user, listing=self.listing,
            provider_profile=self.profile, title='Corriger mon livre',
            description='Test', status='QUOTED',
        )
        self.quote = ServiceQuote.objects.create(
            request=self.request_obj, price=Decimal('10000'),
            turnaround_days=7, status='PENDING',
            valid_until=timezone.now() + timedelta(days=30),
        )

    @patch('apps.core.email.send_templated_email', return_value=True)
    def test_full_service_coupon_e2e(self, mock_email):
        # 1. Prestataire crée un template
        template = CouponTemplate.objects.create(
            provider_profile=self.profile, name='-10% correction',
            discount_type='PERCENT', discount_value=Decimal('10'),
            default_expiry_days=30,
        )

        # 2. Envoie le coupon
        coupon_ids = create_coupons_for_send(
            template=template, recipient_emails=['buyer@test.com'],
            created_by=self.provider_user, custom_message='Merci !',
        )
        coupon = Coupon.objects.get(id=coupon_ids[0])
        self.assertEqual(coupon.provider_profile, self.profile)
        send_single_coupon(coupon.id)
        coupon.refresh_from_db()
        self.assertEqual(coupon.status, 'SENT')

        # 3. Client accepte le devis avec le coupon
        self.client.force_authenticate(user=self.client_user)
        resp = self.client.patch(f'/api/services/service-quotes/{self.quote.id}/respond/', {
            'accept': True, 'coupon_code': coupon.code,
        }, format='json')
        self.assertEqual(resp.status_code, 200, resp.data)

        # 4. ServiceOrder créée avec discount_amount
        order = ServiceOrder.objects.get(quote=self.quote)
        self.assertEqual(order.discount_amount, Decimal('1000.00'))  # 10% de 10000
        self.assertEqual(order.coupon, coupon)
        coupon.refresh_from_db()
        self.assertEqual(coupon.status, 'USED')

        # 5. Annulation
        resp = self.client.patch(f'/api/services/orders/{order.id}/status/', {
            'status': 'CANCELLED',
        }, format='json')
        self.assertEqual(resp.status_code, 200)

        # 6. Coupon restauré
        coupon.refresh_from_db()
        self.assertEqual(coupon.status, 'SENT')
        order.refresh_from_db()
        self.assertEqual(order.discount_amount, Decimal('0'))
        self.assertIsNone(order.coupon)

        # 7. Réutilisation (nouveau devis)
        req2 = ServiceRequest.objects.create(
            client=self.client_user, listing=self.listing,
            provider_profile=self.profile, title='Corriger autre',
            description='Test2', status='QUOTED',
        )
        quote2 = ServiceQuote.objects.create(
            request=req2, price=Decimal('8000'), turnaround_days=5, status='PENDING',
            valid_until=timezone.now() + timedelta(days=30),
        )
        resp2 = self.client.patch(f'/api/services/service-quotes/{quote2.id}/respond/', {
            'accept': True, 'coupon_code': coupon.code,
        }, format='json')
        self.assertEqual(resp2.status_code, 200)
        order2 = ServiceOrder.objects.get(quote=quote2)
        self.assertEqual(order2.discount_amount, Decimal('800.00'))  # 10% de 8000
        coupon.refresh_from_db()
        self.assertEqual(coupon.status, 'USED')

    @patch('apps.core.email.send_templated_email', return_value=True)
    @patch('apps.core.tasks.send_order_confirmation_task.delay')
    @patch('apps.core.tasks.send_vendor_new_order_task.delay')
    def test_service_coupon_not_applicable_to_books(self, mock_v, mock_o, mock_e):
        """Coupon provider ne réduit rien sur une commande de livres."""
        from apps.books.models import Author, Book, Category
        from apps.core.models import SiteConfig
        SiteConfig.get_config()

        coupon = Coupon.objects.create(
            code='SVC-ONLY', discount_type='FIXED', discount_value=Decimal('2000'),
            status='SENT', is_active=True, max_uses=1,
            provider_profile=self.profile, recipient=self.client_user,
            recipient_email='buyer@test.com',
        )
        cat, _ = Category.objects.get_or_create(name='Roman', defaults={'slug': 'roman-svc'})
        author = Author.objects.create(full_name='Auteur SVC', slug='auteur-svc')
        book = Book.objects.create(
            title='Livre SVC', slug='livre-svc', reference='SVC-001',
            price=Decimal('5000'), format='PAPIER', available=True,
            category=cat, author=author,
        )

        self.client.force_authenticate(user=self.client_user)
        resp = self.client.post('/api/orders/', {
            'items': [{'book_id': book.id, 'quantity': 1}],
            'shipping_address': 'Addr', 'shipping_phone': '123', 'shipping_city': 'City',
            'coupon_code': 'SVC-ONLY',
        }, format='json')
        self.assertEqual(resp.status_code, 201)
        from apps.orders.models import Order
        order = Order.objects.get(id=resp.data['id'])
        # Provider coupon should not apply to books (no org match, scoped_subtotal=0)
        self.assertEqual(order.discount_amount, Decimal('0'))


class DualUserEmitterIsolationTest(APITestCase):
    """Test that a dual-casquette user sees only the correct templates per context."""

    def setUp(self):
        self.dual_user = User.objects.create_user(
            username='dual', email='dual@test.com', password='TestPass123!',
        )
        # Provider profile
        self.profile = UserProfile.objects.create(
            user=self.dual_user, profile_type='CORRECTEUR',
        )
        # Org membership
        self.org = Organization.objects.create(
            name='Éditions Dual', org_type='MAISON_EDITION', owner=self.dual_user,
        )
        OrganizationMembership.objects.create(
            organization=self.org, user=self.dual_user, role='PROPRIETAIRE',
        )
        # Templates
        self.tpl_org = CouponTemplate.objects.create(
            organization=self.org, name='Promo org', discount_type='PERCENT', discount_value=10,
        )
        self.tpl_provider = CouponTemplate.objects.create(
            provider_profile=self.profile, name='Promo provider', discount_type='FIXED', discount_value=500,
        )

    def test_no_emitter_type_returns_400(self):
        self.client.force_authenticate(user=self.dual_user)
        resp = self.client.get('/api/coupons/templates/')
        self.assertEqual(resp.status_code, 400)
        self.assertIn('emitter_type', resp.data.get('error', ''))

    def test_org_context_sees_only_org_templates(self):
        self.client.force_authenticate(user=self.dual_user)
        resp = self.client.get('/api/coupons/templates/?emitter_type=organization')
        self.assertEqual(resp.status_code, 200)
        names = {t['name'] for t in resp.data}
        self.assertIn('Promo org', names)
        self.assertNotIn('Promo provider', names)

    def test_provider_context_sees_only_provider_templates(self):
        self.client.force_authenticate(user=self.dual_user)
        resp = self.client.get('/api/coupons/templates/?emitter_type=provider_profile')
        self.assertEqual(resp.status_code, 200)
        names = {t['name'] for t in resp.data}
        self.assertIn('Promo provider', names)
        self.assertNotIn('Promo org', names)

    def test_issued_isolation_org(self):
        Coupon.objects.create(
            code='DUAL-ORG', discount_type='PERCENT', discount_value=10,
            status='SENT', organization=self.org,
        )
        Coupon.objects.create(
            code='DUAL-PROV', discount_type='FIXED', discount_value=500,
            status='SENT', provider_profile=self.profile,
        )
        self.client.force_authenticate(user=self.dual_user)
        resp = self.client.get('/api/coupons/my-issued/?emitter_type=organization')
        codes = {c['code'] for c in resp.data.get('results', resp.data)}
        self.assertIn('DUAL-ORG', codes)
        self.assertNotIn('DUAL-PROV', codes)

    def test_issued_isolation_provider(self):
        Coupon.objects.create(
            code='DUAL-ORG2', discount_type='PERCENT', discount_value=10,
            status='SENT', organization=self.org,
        )
        Coupon.objects.create(
            code='DUAL-PROV2', discount_type='FIXED', discount_value=500,
            status='SENT', provider_profile=self.profile,
        )
        self.client.force_authenticate(user=self.dual_user)
        resp = self.client.get('/api/coupons/my-issued/?emitter_type=provider_profile')
        codes = {c['code'] for c in resp.data.get('results', resp.data)}
        self.assertIn('DUAL-PROV2', codes)
        self.assertNotIn('DUAL-ORG2', codes)
