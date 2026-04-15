from datetime import timedelta
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework.test import APITestCase

from apps.coupons.models import Coupon
from apps.organizations.models import Organization, OrganizationMembership

User = get_user_model()


class CouponRetryAPITest(APITestCase):
    """Tests pour POST /api/coupons/{id}/retry/."""

    def setUp(self):
        self.owner = User.objects.create_user(
            username='vendor', email='vendor@test.com', password='TestPass123!',
        )
        self.org = Organization.objects.create(
            name='Éditions A', org_type='MAISON_EDITION', owner=self.owner,
        )
        OrganizationMembership.objects.create(
            organization=self.org, user=self.owner, role='PROPRIETAIRE',
        )
        now = timezone.now()
        self.coupon = Coupon.objects.create(
            code='RET-001', discount_type='PERCENT', discount_value=10,
            status='FAILED', organization=self.org,
            recipient_email='buyer@test.com',
            valid_until=now + timedelta(days=30),
        )

    @patch('apps.coupons.tasks.send_single_coupon_task.delay')
    def test_retry_endpoint_relaunches_failed_coupon(self, mock_delay):
        """Un coupon FAILED repasse PENDING et la tâche est relancée."""
        self.client.force_authenticate(user=self.owner)
        resp = self.client.post(f'/api/coupons/{self.coupon.id}/retry/')
        self.assertEqual(resp.status_code, 202)
        self.coupon.refresh_from_db()
        self.assertEqual(self.coupon.status, 'PENDING')
        mock_delay.assert_called_once_with(self.coupon.id)

    def test_retry_endpoint_rejects_non_failed_coupon(self):
        """Un coupon SENT ne peut pas être réessayé (400)."""
        self.coupon.status = 'SENT'
        self.coupon.save()
        self.client.force_authenticate(user=self.owner)
        resp = self.client.post(f'/api/coupons/{self.coupon.id}/retry/')
        self.assertEqual(resp.status_code, 400)
        self.assertIn('error', resp.data)

    def test_retry_endpoint_permission(self):
        """Un autre user ne peut pas retry un coupon qui n'est pas le sien (404)."""
        other_owner = User.objects.create_user(
            username='other_vendor', email='ov@test.com', password='TestPass123!',
        )
        other_org = Organization.objects.create(
            name='Éditions B', org_type='MAISON_EDITION', owner=other_owner,
        )
        OrganizationMembership.objects.create(
            organization=other_org, user=other_owner, role='PROPRIETAIRE',
        )
        self.client.force_authenticate(user=other_owner)
        resp = self.client.post(f'/api/coupons/{self.coupon.id}/retry/')
        self.assertEqual(resp.status_code, 404)
