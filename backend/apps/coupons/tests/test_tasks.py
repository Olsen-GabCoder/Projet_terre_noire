from datetime import timedelta
from decimal import Decimal
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone

from apps.coupons.models import Coupon
from apps.coupons.tasks import expire_stale_coupons

User = get_user_model()


class ExpireStaleCouponsTest(TestCase):
    """Tests pour la tâche Celery expire_stale_coupons."""

    def setUp(self):
        now = timezone.now()
        # Expired SENT coupon
        self.expired = Coupon.objects.create(
            code='EXP-001', discount_type='PERCENT', discount_value=10,
            status='SENT', valid_until=now - timedelta(days=1),
        )
        # Still valid SENT coupon
        self.valid = Coupon.objects.create(
            code='VAL-001', discount_type='PERCENT', discount_value=10,
            status='SENT', valid_until=now + timedelta(days=30),
        )
        # USED coupon (should not be touched even if expired)
        self.used = Coupon.objects.create(
            code='USED-001', discount_type='FIXED', discount_value=500,
            status='USED', valid_until=now - timedelta(days=1),
        )

    def test_expires_sent_coupons(self):
        expire_stale_coupons.apply()
        self.expired.refresh_from_db()
        self.assertEqual(self.expired.status, 'EXPIRED')

    def test_valid_coupon_untouched(self):
        expire_stale_coupons.apply()
        self.valid.refresh_from_db()
        self.assertEqual(self.valid.status, 'SENT')

    def test_used_coupon_untouched(self):
        expire_stale_coupons.apply()
        self.used.refresh_from_db()
        self.assertEqual(self.used.status, 'USED')


class SendSingleCouponTest(TestCase):
    """Tests pour la tâche send_single_coupon."""

    def setUp(self):
        self.user = User.objects.create_user(
            username='buyer', email='buyer@test.com', password='TestPass123!',
        )

    @patch('apps.core.email.send_templated_email', return_value=True)
    def test_send_success(self, mock_email):
        coupon = Coupon.objects.create(
            code='SEND-OK', discount_type='PERCENT', discount_value=10,
            status='PENDING', recipient_email='buyer@test.com',
            recipient=self.user,
        )
        from apps.coupons.services import send_single_coupon
        result = send_single_coupon(coupon.id)
        self.assertTrue(result)
        coupon.refresh_from_db()
        self.assertEqual(coupon.status, 'SENT')

    @patch('apps.core.email.send_templated_email', side_effect=Exception('SMTP down'))
    def test_send_failure_marks_failed(self, mock_email):
        coupon = Coupon.objects.create(
            code='SEND-FAIL', discount_type='PERCENT', discount_value=10,
            status='PENDING', recipient_email='buyer@test.com',
        )
        from apps.coupons.services import send_single_coupon
        result = send_single_coupon(coupon.id)
        self.assertFalse(result)
        coupon.refresh_from_db()
        self.assertEqual(coupon.status, 'FAILED')

    def test_send_nonexistent_coupon(self):
        from apps.coupons.services import send_single_coupon
        result = send_single_coupon(999999)
        self.assertFalse(result)

    @patch('apps.core.email.send_templated_email', return_value=True)
    def test_send_creates_notification(self, mock_email):
        from apps.notifications.models import Notification
        coupon = Coupon.objects.create(
            code='SEND-NOTIF', discount_type='FIXED', discount_value=500,
            status='PENDING', recipient_email='buyer@test.com',
            recipient=self.user,
        )
        from apps.coupons.services import send_single_coupon
        send_single_coupon(coupon.id)
        self.assertTrue(
            Notification.objects.filter(
                recipient=self.user,
                notification_type='COUPON_RECEIVED',
            ).exists()
        )
