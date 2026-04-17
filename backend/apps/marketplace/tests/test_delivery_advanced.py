"""Advanced delivery tests: transitions, attempted, max attempts alert, rate validation."""
from decimal import Decimal
from unittest.mock import patch

from rest_framework import status

from apps.marketplace.delivery_models import DeliveryRate
from .test_base import MarketplaceTestBase


class DeliveryTransitionTests(MarketplaceTestBase):
    """Tests for delivery agent status transitions via API."""

    @patch('apps.core.tasks.send_suborder_update_task.delay')
    def test_delivery_transition_ready_to_shipped(self, mock_task):
        """Delivery agent transitions READY → SHIPPED."""
        _, so = self._create_order_with_suborder(
            status='READY', delivery_agent=self.delivery_profile,
        )
        self._auth(self.delivery_user)
        resp = self.client.patch(
            f'/api/marketplace/delivery/sub-orders/{so.id}/status/',
            {'status': 'SHIPPED'},
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        so.refresh_from_db()
        self.assertEqual(so.status, 'SHIPPED')

    @patch('apps.core.tasks.send_suborder_update_task.delay')
    @patch('apps.core.tasks.send_order_delivered_task.delay')
    @patch('apps.core.tasks.send_vendor_delivery_completed_task.delay')
    def test_delivery_transition_shipped_to_delivered(self, mock_vdc, mock_od, mock_su):
        """Delivery agent transitions SHIPPED → DELIVERED."""
        _, so = self._create_order_with_suborder(
            status='SHIPPED', delivery_agent=self.delivery_profile,
        )
        self._auth(self.delivery_user)
        resp = self.client.patch(
            f'/api/marketplace/delivery/sub-orders/{so.id}/status/',
            {'status': 'DELIVERED'},
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        so.refresh_from_db()
        self.assertEqual(so.status, 'DELIVERED')
        self.assertIsNotNone(so.delivered_at)

    @patch('apps.core.tasks.send_suborder_update_task.delay')
    def test_delivery_attempted_with_reason(self, mock_task):
        """ATTEMPTED records reason and increments attempt_count."""
        _, so = self._create_order_with_suborder(
            status='SHIPPED', delivery_agent=self.delivery_profile,
        )
        self._auth(self.delivery_user)
        resp = self.client.patch(
            f'/api/marketplace/delivery/sub-orders/{so.id}/status/',
            {'status': 'ATTEMPTED', 'attempt_reason': 'Porte fermée'},
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        so.refresh_from_db()
        self.assertEqual(so.attempt_count, 1)
        self.assertEqual(so.last_attempt_reason, 'Porte fermée')

    @patch('apps.core.tasks.send_max_attempts_alert_task.delay')
    @patch('apps.core.tasks.send_suborder_update_task.delay')
    def test_delivery_max_attempts_alert(self, mock_su, mock_alert):
        """After 3 attempts, max_attempts_alert task is called."""
        _, so = self._create_order_with_suborder(
            status='SHIPPED', delivery_agent=self.delivery_profile,
        )
        so.attempt_count = 2
        so.save(update_fields=['attempt_count'])
        self._auth(self.delivery_user)
        self.client.patch(
            f'/api/marketplace/delivery/sub-orders/{so.id}/status/',
            {'status': 'ATTEMPTED', 'attempt_reason': '3e tentative échouée'},
        )
        mock_alert.assert_called_once_with(so.id)


class DeliveryRateValidationTests(MarketplaceTestBase):
    """Tests for delivery rate validation."""

    def test_delivery_rate_negative_price_rejected(self):
        """Negative price is rejected with 400 (fixed: now uses DeliveryRateSerializer)."""
        self._auth(self.delivery_user)
        resp = self.client.post('/api/marketplace/delivery/rates/', {
            'zone_name': 'Zone Negative',
            'country': 'GA',
            'cities': ['Libreville'],
            'price': -500,
        }, format='json')
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
