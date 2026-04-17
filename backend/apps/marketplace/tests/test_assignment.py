"""Tests for delivery agent assignment."""
from unittest.mock import patch

from rest_framework import status

from apps.marketplace.models import SubOrder
from .test_base import MarketplaceTestBase


class DeliveryAssignmentTests(MarketplaceTestBase):

    @patch('apps.core.tasks.send_delivery_assignment_task.delay')
    def test_assign_delivery_agent(self, mock_task):
        """Vendor can assign a delivery agent to a SubOrder."""
        _, so = self._create_order_with_suborder(status='READY')
        self._auth(self.vendor_user)
        resp = self.client.post(
            f'/api/marketplace/sub-orders/{so.id}/assign-delivery/',
            {'agent_profile_id': self.delivery_profile.id, 'delivery_fee': 2000},
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        so.refresh_from_db()
        self.assertEqual(so.delivery_agent, self.delivery_profile)

    def test_assign_non_vendor_forbidden(self):
        """Non-vendor user cannot assign a delivery agent."""
        _, so = self._create_order_with_suborder(status='READY')
        self._auth(self.random_user)
        resp = self.client.post(
            f'/api/marketplace/sub-orders/{so.id}/assign-delivery/',
            {'agent_profile_id': self.delivery_profile.id},
        )
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)

    def test_my_assignments_as_delivery_agent(self):
        """Delivery agent sees their assigned SubOrders."""
        _, so = self._create_order_with_suborder(
            status='SHIPPED', delivery_agent=self.delivery_profile,
        )
        self._auth(self.delivery_user)
        resp = self.client.get('/api/marketplace/delivery/my-assignments/')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        data = resp.data['results'] if isinstance(resp.data, dict) else resp.data
        ids = [item['id'] for item in data]
        self.assertIn(so.id, ids)

    def test_my_assignments_forbidden_non_livreur(self):
        """Non-delivery user gets 403."""
        self._auth(self.random_user)
        resp = self.client.get('/api/marketplace/delivery/my-assignments/')
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)

    @patch('apps.core.tasks.send_delivery_assignment_task.delay')
    def test_assignment_triggers_notification(self, mock_task):
        """Assignment triggers the Celery notification task."""
        _, so = self._create_order_with_suborder(status='READY')
        self._auth(self.vendor_user)
        self.client.post(
            f'/api/marketplace/sub-orders/{so.id}/assign-delivery/',
            {'agent_profile_id': self.delivery_profile.id},
        )
        mock_task.assert_called_once_with(so.id)
