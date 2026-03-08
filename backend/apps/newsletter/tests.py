"""Tests pour l'app newsletter."""
from rest_framework.test import APITestCase
from rest_framework import status


class NewsletterSubscribeTest(APITestCase):
    """Tests d'inscription newsletter."""

    def test_subscribe_success(self):
        response = self.client.post('/api/newsletter/subscribe/', {
            'email': 'news@example.com',
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(response.data.get('success'))

    def test_subscribe_invalid_email(self):
        response = self.client.post('/api/newsletter/subscribe/', {
            'email': 'invalid',
        })
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
