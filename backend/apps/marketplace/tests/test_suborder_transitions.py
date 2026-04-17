"""Tests for SubOrder state machine transitions."""
from unittest.mock import patch

from rest_framework import status

from apps.marketplace.models import SubOrder
from apps.marketplace.utils import validate_suborder_transition
from .test_base import MarketplaceTestBase


class SubOrderTransitionUnitTests(MarketplaceTestBase):
    """Unit tests for validate_suborder_transition (no HTTP)."""

    def test_valid_transition_confirmed_to_preparing(self):
        valid, err = validate_suborder_transition('CONFIRMED', 'PREPARING', 'vendor')
        self.assertTrue(valid)
        self.assertIsNone(err)

    def test_valid_transition_preparing_to_ready(self):
        valid, err = validate_suborder_transition('PREPARING', 'READY', 'vendor')
        self.assertTrue(valid)
        self.assertIsNone(err)

    def test_valid_transition_ready_to_shipped_by_delivery(self):
        valid, err = validate_suborder_transition('READY', 'SHIPPED', 'delivery')
        self.assertTrue(valid)

    def test_valid_transition_shipped_to_delivered_by_delivery(self):
        valid, err = validate_suborder_transition('SHIPPED', 'DELIVERED', 'delivery')
        self.assertTrue(valid)

    def test_invalid_transition_pending_to_delivered(self):
        valid, err = validate_suborder_transition('PENDING', 'DELIVERED', 'vendor')
        self.assertFalse(valid)
        self.assertIsNotNone(err)

    def test_terminal_status_cannot_transition(self):
        valid, err = validate_suborder_transition('DELIVERED', 'CANCELLED', 'admin')
        self.assertFalse(valid)

    def test_same_status_rejected(self):
        valid, err = validate_suborder_transition('PENDING', 'PENDING', 'vendor')
        self.assertFalse(valid)

    def test_vendor_cannot_ship(self):
        """Only delivery or admin can transition READY → SHIPPED."""
        valid, err = validate_suborder_transition('READY', 'SHIPPED', 'vendor')
        self.assertFalse(valid)


class SubOrderTransitionAPITests(MarketplaceTestBase):
    """Integration tests for SubOrder status transitions via API."""

    @patch('apps.core.tasks.send_suborder_update_task.delay')
    def test_vendor_confirms_suborder(self, mock_task):
        _, so = self._create_order_with_suborder(status='PENDING')
        self._auth(self.vendor_user)
        resp = self.client.patch(
            f'/api/marketplace/sub-orders/{so.id}/status/',
            {'status': 'CONFIRMED'},
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        so.refresh_from_db()
        self.assertEqual(so.status, 'CONFIRMED')

    def test_unauthorized_user_cannot_transition(self):
        _, so = self._create_order_with_suborder(status='PENDING')
        self._auth(self.random_user)
        resp = self.client.patch(
            f'/api/marketplace/sub-orders/{so.id}/status/',
            {'status': 'CONFIRMED'},
        )
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)

    @patch('apps.core.tasks.send_suborder_update_task.delay')
    @patch('apps.core.tasks.send_order_delivered_task.delay')
    @patch('apps.core.tasks.send_vendor_delivery_completed_task.delay')
    def test_delivered_propagates_to_order(self, mock_vdc, mock_od, mock_su):
        """When all SubOrders are DELIVERED, Order becomes DELIVERED."""
        order, so = self._create_order_with_suborder(
            status='SHIPPED', delivery_agent=self.delivery_profile,
        )
        self._auth(self.delivery_user)
        resp = self.client.patch(
            f'/api/marketplace/delivery/sub-orders/{so.id}/status/',
            {'status': 'DELIVERED'},
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        order.refresh_from_db()
        self.assertEqual(order.status, 'DELIVERED')

    @patch('apps.core.tasks.send_suborder_update_task.delay')
    @patch('apps.core.tasks.send_max_attempts_alert_task.delay')
    def test_attempted_status_with_reason(self, mock_alert, mock_task):
        """Delivery agent can mark ATTEMPTED with a reason."""
        _, so = self._create_order_with_suborder(
            status='SHIPPED', delivery_agent=self.delivery_profile,
        )
        self._auth(self.delivery_user)
        resp = self.client.patch(
            f'/api/marketplace/delivery/sub-orders/{so.id}/status/',
            {'status': 'ATTEMPTED', 'attempt_reason': 'Client absent'},
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        so.refresh_from_db()
        self.assertEqual(so.status, 'ATTEMPTED')
        self.assertEqual(so.attempt_count, 1)
        self.assertEqual(so.last_attempt_reason, 'Client absent')
