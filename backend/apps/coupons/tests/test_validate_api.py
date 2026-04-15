from datetime import timedelta
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework.test import APITestCase

from apps.books.models import Author, Book, Category
from apps.coupons.models import Coupon
from apps.organizations.models import Organization

User = get_user_model()


class CouponValidateAPITest(APITestCase):
    """Tests pour POST /api/coupons/validate/."""

    def setUp(self):
        self.user = User.objects.create_user(
            username='buyer', email='buyer@test.com', password='TestPass123!',
        )
        self.other_user = User.objects.create_user(
            username='other', email='other@test.com', password='TestPass123!',
        )
        self.org_a = Organization.objects.create(
            name='Éditions A', org_type='MAISON_EDITION', owner=self.user,
        )
        self.org_b = Organization.objects.create(
            name='Éditions B', org_type='MAISON_EDITION', owner=self.other_user,
        )
        self.cat, _ = Category.objects.get_or_create(name='Roman', defaults={'slug': 'roman'})
        self.author = Author.objects.create(full_name='Auteur', slug='auteur')
        self.book_a = Book.objects.create(
            title='Livre A', slug='livre-a', reference='VA-001',
            price=Decimal('5000'), format='PAPIER', available=True,
            category=self.cat, author=self.author, publisher_organization=self.org_a,
        )
        self.book_b = Book.objects.create(
            title='Livre B', slug='livre-b', reference='VA-002',
            price=Decimal('3000'), format='PAPIER', available=True,
            category=self.cat, author=self.author, publisher_organization=self.org_b,
        )

        now = timezone.now()
        self.coupon = Coupon.objects.create(
            code='TEST-VALID', discount_type='PERCENT', discount_value=Decimal('10'),
            status='SENT', is_active=True, max_uses=1, usage_count=0,
            valid_from=now - timedelta(days=1), valid_until=now + timedelta(days=30),
            recipient_email='buyer@test.com', recipient=self.user,
            organization=self.org_a,
        )

    def test_valid_coupon(self):
        self.client.force_authenticate(user=self.user)
        resp = self.client.post('/api/coupons/validate/', {'code': 'TEST-VALID'})
        self.assertEqual(resp.status_code, 200)
        self.assertTrue(resp.data['valid'])
        self.assertEqual(resp.data['discount_type'], 'PERCENT')
        self.assertEqual(resp.data['scoped_to'], 'Éditions A')

    def test_expired_coupon(self):
        self.coupon.valid_until = timezone.now() - timedelta(hours=1)
        self.coupon.save()
        self.client.force_authenticate(user=self.user)
        resp = self.client.post('/api/coupons/validate/', {'code': 'TEST-VALID'})
        self.assertEqual(resp.status_code, 400)
        self.assertFalse(resp.data['valid'])

    def test_revoked_coupon(self):
        self.coupon.status = 'REVOKED'
        self.coupon.save()
        self.client.force_authenticate(user=self.user)
        resp = self.client.post('/api/coupons/validate/', {'code': 'TEST-VALID'})
        self.assertEqual(resp.status_code, 400)

    def test_personal_coupon_wrong_user(self):
        self.client.force_authenticate(user=self.other_user)
        resp = self.client.post('/api/coupons/validate/', {'code': 'TEST-VALID'})
        self.assertEqual(resp.status_code, 400)
        self.assertIn('destiné', resp.data['message'])

    def test_scoped_org_with_matching_cart(self):
        self.client.force_authenticate(user=self.user)
        resp = self.client.post('/api/coupons/validate/', {
            'code': 'TEST-VALID',
            'cart_items': [{'book_id': self.book_a.id, 'quantity': 1}],
        }, format='json')
        self.assertEqual(resp.status_code, 200)
        self.assertTrue(resp.data['valid'])

    def test_scoped_org_no_matching_items(self):
        self.client.force_authenticate(user=self.user)
        resp = self.client.post('/api/coupons/validate/', {
            'code': 'TEST-VALID',
            'cart_items': [{'book_id': self.book_b.id, 'quantity': 1}],
        }, format='json')
        self.assertEqual(resp.status_code, 400)
        self.assertIn('applicable', resp.data['message'])

    def test_min_order_amount_not_met(self):
        self.coupon.min_order_amount = Decimal('10000')
        self.coupon.save()
        self.client.force_authenticate(user=self.user)
        resp = self.client.post('/api/coupons/validate/', {
            'code': 'TEST-VALID',
            'cart_items': [{'book_id': self.book_a.id, 'quantity': 1}],
        }, format='json')
        self.assertEqual(resp.status_code, 400)
        self.assertIn('minimum', resp.data['message'])

    def test_nonexistent_code(self):
        self.client.force_authenticate(user=self.user)
        resp = self.client.post('/api/coupons/validate/', {'code': 'NOPE'})
        self.assertEqual(resp.status_code, 400)

    def test_platform_coupon_no_scope(self):
        """Coupon plateforme (org=None) valide sans scope."""
        Coupon.objects.create(
            code='PLATFORM-10', discount_type='PERCENT', discount_value=Decimal('10'),
            status='SENT', is_active=True, max_uses=None,
            valid_from=timezone.now() - timedelta(days=1),
            valid_until=timezone.now() + timedelta(days=30),
        )
        self.client.force_authenticate(user=self.user)
        resp = self.client.post('/api/coupons/validate/', {'code': 'PLATFORM-10'})
        self.assertEqual(resp.status_code, 200)
        self.assertTrue(resp.data['valid'])
        self.assertNotIn('scoped_to_org', resp.data)
