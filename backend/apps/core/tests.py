"""Tests pour l'app core."""
from rest_framework.test import APITestCase
from rest_framework import status

from .models import SiteConfig


class DeliveryConfigTest(APITestCase):
    """Tests de la config livraison."""

    def test_get_delivery_config(self):
        config = SiteConfig.get_config()
        response = self.client.get('/api/config/delivery/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('shipping_free_threshold', response.data)
        self.assertIn('shipping_cost', response.data)
