from datetime import timedelta
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework.test import APITestCase

from apps.coupons.models import Coupon
from apps.organizations.models import Organization

User = get_user_model()


class CouponAdminAPITest(APITestCase):
    """Tests pour les endpoints admin /api/coupons/admin/."""

    def setUp(self):
        self.admin = User.objects.create_superuser(
            username='admin', email='admin@test.com', password='TestPass123!',
        )
        self.user = User.objects.create_user(
            username='buyer', email='buyer@test.com', password='TestPass123!',
        )
        self.org = Organization.objects.create(
            name='Éditions A', org_type='MAISON_EDITION', owner=self.admin,
        )
        now = timezone.now()
        Coupon.objects.create(
            code='ADM-1', discount_type='PERCENT', discount_value=10,
            status='SENT', organization=self.org,
            valid_until=now + timedelta(days=30),
        )
        Coupon.objects.create(
            code='ADM-2', discount_type='FIXED', discount_value=500,
            status='USED', organization=self.org,
            used_by=self.user, used_at=now,
            valid_until=now + timedelta(days=30),
        )
        # Coupon plateforme
        Coupon.objects.create(
            code='ADM-3', discount_type='PERCENT', discount_value=5,
            status='SENT', organization=None,
            valid_until=now + timedelta(days=30),
        )

    def test_overview(self):
        self.client.force_authenticate(user=self.admin)
        resp = self.client.get('/api/coupons/admin/overview/')
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.data['total_issued'], 3)
        self.assertEqual(resp.data['total_used'], 1)
        self.assertGreater(resp.data['activation_rate'], 0)

    def test_list(self):
        self.client.force_authenticate(user=self.admin)
        resp = self.client.get('/api/coupons/admin/list/')
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.data['count'], 3)

    def test_list_filter_status(self):
        self.client.force_authenticate(user=self.admin)
        resp = self.client.get('/api/coupons/admin/list/?status=USED')
        self.assertEqual(resp.data['count'], 1)

    def test_list_filter_org(self):
        self.client.force_authenticate(user=self.admin)
        resp = self.client.get(f'/api/coupons/admin/list/?org={self.org.id}')
        self.assertEqual(resp.data['count'], 2)

    def test_non_admin_forbidden(self):
        self.client.force_authenticate(user=self.user)
        resp = self.client.get('/api/coupons/admin/overview/')
        self.assertEqual(resp.status_code, 403)
        resp = self.client.get('/api/coupons/admin/list/')
        self.assertEqual(resp.status_code, 403)
