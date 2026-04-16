"""Tests : comportement de send_single_coupon en cas d'échec SMTP."""
from decimal import Decimal
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.test import TestCase

from apps.coupons.models import Coupon, CouponTemplate
from apps.coupons.services import send_single_coupon
from apps.notifications.models import Notification

User = get_user_model()


class SendCouponFailureTest(TestCase):
    def setUp(self):
        self.sender = User.objects.create_user(
            username='sender_fail', email='sender_fail@test.com', password='TestPass123!',
        )
        self.recipient = User.objects.create_user(
            username='recipient_fail', email='recipient_fail@test.com', password='TestPass123!',
        )
        self.tpl = CouponTemplate.objects.create(
            name='Fail Test',
            discount_type='PERCENT',
            discount_value=Decimal('15'),
            default_expiry_days=30,
            created_by=self.sender,
        )
        self.coupon = Coupon.objects.create(
            template=self.tpl,
            code='FAIL-TEST-001',
            discount_type='PERCENT',
            discount_value=Decimal('15'),
            recipient_email=self.recipient.email,
            recipient=self.recipient,
            created_by=self.sender,
            status='PENDING',
        )

    def test_smtp_failure_marks_coupon_failed(self):
        """Un échec SMTP marque le coupon FAILED et ne crée pas de notification."""
        with patch('apps.core.email.send_coupon_email') as mock_send:
            mock_send.side_effect = Exception("SMTP timeout")
            result = send_single_coupon(self.coupon.id)

        self.assertFalse(result)
        self.coupon.refresh_from_db()
        self.assertEqual(self.coupon.status, 'FAILED')
        self.assertFalse(
            Notification.objects.filter(
                recipient=self.recipient,
                notification_type='COUPON_RECEIVED',
            ).exists()
        )

    def test_smtp_success_marks_coupon_sent(self):
        """Un envoi SMTP réussi marque le coupon SENT et crée la notification."""
        with patch('apps.core.email.send_coupon_email') as mock_send:
            mock_send.return_value = None
            result = send_single_coupon(self.coupon.id)

        self.assertTrue(result)
        self.coupon.refresh_from_db()
        self.assertEqual(self.coupon.status, 'SENT')
        self.assertTrue(
            Notification.objects.filter(
                recipient=self.recipient,
                notification_type='COUPON_RECEIVED',
            ).exists()
        )
