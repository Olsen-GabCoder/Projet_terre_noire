"""Tests for delivery rates CRUD and public search."""
from rest_framework import status

from apps.marketplace.delivery_models import DeliveryRate
from .test_base import MarketplaceTestBase


class DeliveryRateTests(MarketplaceTestBase):

    def test_create_delivery_rate(self):
        """Delivery agent can create a rate."""
        self._auth(self.delivery_user)
        resp = self.client.post('/api/marketplace/delivery/rates/', {
            'zone_name': 'Libreville Centre',
            'country': 'GA',
            'cities': ['Libreville', 'Owendo'],
            'price': 2000,
            'currency': 'XAF',
            'estimated_days_min': 1,
            'estimated_days_max': 2,
        }, format='json')
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        self.assertTrue(DeliveryRate.objects.filter(agent=self.delivery_profile).exists())

    def test_create_rate_non_livreur_forbidden(self):
        """Non-delivery user gets 403."""
        self._auth(self.random_user)
        resp = self.client.post('/api/marketplace/delivery/rates/', {
            'zone_name': 'Test', 'country': 'GA', 'price': 1000,
        }, format='json')
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)

    def test_update_rate_price(self):
        """Delivery agent can update rate price."""
        self._auth(self.delivery_user)
        rate = DeliveryRate.objects.create(
            agent=self.delivery_profile, zone_name='Zone A',
            country='GA', cities=['Libreville'], price=1500,
        )
        resp = self.client.patch(
            f'/api/marketplace/delivery/rates/{rate.id}/',
            {'price': 2500}, format='json',
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        rate.refresh_from_db()
        self.assertEqual(float(rate.price), 2500.0)

    def test_search_rates_by_city(self):
        """Public search returns rates covering a given city."""
        DeliveryRate.objects.create(
            agent=self.delivery_profile, zone_name='Lbv',
            country='GA', cities=['Libreville', 'Owendo'], price=2000,
        )
        resp = self.client.get('/api/marketplace/delivery/search/', {
            'city': 'Libreville', 'country': 'GA',
        })
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(len(resp.data), 1)

    def test_toggle_rate_active(self):
        """Delivery agent can deactivate a rate."""
        self._auth(self.delivery_user)
        rate = DeliveryRate.objects.create(
            agent=self.delivery_profile, zone_name='Zone B',
            country='GA', cities=['Port-Gentil'], price=3000,
        )
        resp = self.client.patch(
            f'/api/marketplace/delivery/rates/{rate.id}/',
            {'is_active': False}, format='json',
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        rate.refresh_from_db()
        self.assertFalse(rate.is_active)
