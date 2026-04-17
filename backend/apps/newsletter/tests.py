"""Tests pour l'app newsletter."""
import unittest

from rest_framework.test import APITestCase
from rest_framework import status

from apps.newsletter.models import NewsletterSubscriber


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

    @unittest.expectedFailure
    def test_double_subscribe_reactivates(self):
        """BUG CONNU: Un email inactif devrait pouvoir se réinscrire mais le
        ModelSerializer unique validator rejette l'email AVANT que le custom
        create() avec get_or_create ne puisse le réactiver. Le chemin de
        réactivation dans NewsletterSubscribeSerializer.create() est donc
        du dead code — il ne peut jamais être atteint.
        Fix: ajouter un UniqueValidator avec un queryset filtré sur is_active=True
        ou surcharger validate_email pour gérer la réactivation.
        """
        sub = NewsletterSubscriber.objects.create(email='back@example.com', is_active=False)
        resp = self.client.post('/api/newsletter/subscribe/', {'email': 'back@example.com'})
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        sub.refresh_from_db()
        self.assertTrue(sub.is_active)

    def test_subscribe_already_active_rejected(self):
        """Un email déjà actif → 400."""
        NewsletterSubscriber.objects.create(email='dup@example.com', is_active=True)
        resp = self.client.post('/api/newsletter/subscribe/', {'email': 'dup@example.com'})
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_subscribe_empty_email_rejected(self):
        """Email vide → 400."""
        resp = self.client.post('/api/newsletter/subscribe/', {'email': ''})
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
