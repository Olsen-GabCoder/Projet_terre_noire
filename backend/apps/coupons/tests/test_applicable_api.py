from datetime import timedelta
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework.test import APITestCase

from apps.books.models import Author, Book, Category
from apps.coupons.models import Coupon
from apps.organizations.models import Organization

User = get_user_model()


class CouponApplicableAPITest(APITestCase):
    """Tests pour GET /api/coupons/applicable/."""

    def setUp(self):
        self.user = User.objects.create_user(
            username='buyer', email='buyer@test.com', password='TestPass123!',
        )
        self.org_a = Organization.objects.create(
            name='Org A', org_type='MAISON_EDITION', owner=self.user,
        )
        self.org_b = Organization.objects.create(
            name='Org B', org_type='LIBRAIRIE', owner=self.user,
        )
        self.cat, _ = Category.objects.get_or_create(name='Cat', defaults={'slug': 'cat'})
        self.author = Author.objects.create(full_name='Author', slug='author')
        self.book_a = Book.objects.create(
            title='Book A', slug='book-a', reference='APP-001',
            price=Decimal('5000'), format='PAPIER', available=True,
            category=self.cat, author=self.author, publisher_organization=self.org_a,
        )
        self.book_b = Book.objects.create(
            title='Book B', slug='book-b', reference='APP-002',
            price=Decimal('3000'), format='PAPIER', available=True,
            category=self.cat, author=self.author, publisher_organization=self.org_b,
        )
        now = timezone.now()
        # Coupon org A, SENT, pour self.user
        self.coupon_a = Coupon.objects.create(
            code='APP-A', discount_type='PERCENT', discount_value=10,
            status='SENT', organization=self.org_a,
            recipient=self.user, recipient_email='buyer@test.com',
            valid_until=now + timedelta(days=30),
        )
        # Coupon org B, SENT, pour self.user
        self.coupon_b = Coupon.objects.create(
            code='APP-B', discount_type='FIXED', discount_value=500,
            status='SENT', organization=self.org_b,
            recipient=self.user, recipient_email='buyer@test.com',
            valid_until=now + timedelta(days=30),
        )
        # Coupon org A, USED (ne doit pas apparaître)
        Coupon.objects.create(
            code='APP-USED', discount_type='PERCENT', discount_value=5,
            status='USED', organization=self.org_a,
            recipient=self.user, recipient_email='buyer@test.com',
            valid_until=now + timedelta(days=30),
        )
        # Coupon expiré (ne doit pas apparaître)
        Coupon.objects.create(
            code='APP-EXP', discount_type='PERCENT', discount_value=5,
            status='SENT', organization=self.org_a,
            recipient=self.user, recipient_email='buyer@test.com',
            valid_until=now - timedelta(days=1),
        )
        # Coupon plateforme
        self.coupon_plat = Coupon.objects.create(
            code='APP-PLAT', discount_type='PERCENT', discount_value=5,
            status='SENT', organization=None,
            recipient=self.user, recipient_email='buyer@test.com',
            valid_until=now + timedelta(days=30),
        )

    def test_applicable_returns_matching(self):
        self.client.force_authenticate(user=self.user)
        resp = self.client.get(f'/api/coupons/applicable/?cart_item_ids={self.book_a.id}')
        self.assertEqual(resp.status_code, 200)
        codes = {c['code'] for c in resp.data}
        self.assertIn('APP-A', codes)
        self.assertIn('APP-PLAT', codes)
        self.assertNotIn('APP-B', codes)  # org B not in cart
        self.assertNotIn('APP-USED', codes)
        self.assertNotIn('APP-EXP', codes)

    def test_applicable_mixed_cart(self):
        self.client.force_authenticate(user=self.user)
        resp = self.client.get(f'/api/coupons/applicable/?cart_item_ids={self.book_a.id},{self.book_b.id}')
        codes = {c['code'] for c in resp.data}
        self.assertIn('APP-A', codes)
        self.assertIn('APP-B', codes)
        self.assertIn('APP-PLAT', codes)

    def test_applicable_unauthenticated(self):
        resp = self.client.get(f'/api/coupons/applicable/?cart_item_ids={self.book_a.id}')
        self.assertEqual(resp.status_code, 401)

    def test_applicable_no_params_returns_all_sent(self):
        """No cart_item_ids or service_quote_id → returns all SENT coupons of the user."""
        self.client.force_authenticate(user=self.user)
        resp = self.client.get('/api/coupons/applicable/')
        self.assertEqual(resp.status_code, 200)
        codes = {c['code'] for c in resp.data}
        self.assertIn('APP-A', codes)
        self.assertIn('APP-B', codes)
        self.assertIn('APP-PLAT', codes)
        self.assertNotIn('APP-USED', codes)
        self.assertNotIn('APP-EXP', codes)
