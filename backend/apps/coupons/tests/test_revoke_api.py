from datetime import timedelta
from decimal import Decimal
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework.test import APITestCase

from apps.coupons.models import Coupon
from apps.organizations.models import Organization, OrganizationMembership

User = get_user_model()


class CouponRevokeAPITest(APITestCase):
    """Tests pour POST /api/coupons/{id}/revoke/."""

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
        self.recipient = User.objects.create_user(
            username='buyer', email='buyer@test.com', password='TestPass123!',
        )
        now = timezone.now()
        self.coupon = Coupon.objects.create(
            code='REV-001', discount_type='PERCENT', discount_value=10,
            status='SENT', organization=self.org,
            recipient=self.recipient, recipient_email='buyer@test.com',
            valid_until=now + timedelta(days=30),
        )

    @patch('apps.core.email.send_templated_email', return_value=True)
    def test_revoke_ok(self, mock_email):
        self.client.force_authenticate(user=self.owner)
        resp = self.client.post(f'/api/coupons/{self.coupon.id}/revoke/')
        self.assertEqual(resp.status_code, 200)
        self.coupon.refresh_from_db()
        self.assertEqual(self.coupon.status, 'REVOKED')

    def test_revoke_used_coupon_rejected(self):
        self.coupon.status = 'USED'
        self.coupon.save()
        self.client.force_authenticate(user=self.owner)
        resp = self.client.post(f'/api/coupons/{self.coupon.id}/revoke/')
        self.assertEqual(resp.status_code, 400)

    def test_revoke_other_org_coupon_404(self):
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
        resp = self.client.post(f'/api/coupons/{self.coupon.id}/revoke/')
        self.assertEqual(resp.status_code, 404)

    @patch('apps.core.email.send_templated_email', return_value=True)
    def test_revoke_creates_notification(self, mock_email):
        from apps.notifications.models import Notification
        self.client.force_authenticate(user=self.owner)
        self.client.post(f'/api/coupons/{self.coupon.id}/revoke/')
        self.assertTrue(
            Notification.objects.filter(
                recipient=self.recipient,
                notification_type='COUPON_REVOKED',
            ).exists()
        )
