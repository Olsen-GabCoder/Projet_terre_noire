"""Tests pour l'app contact."""
from rest_framework.test import APITestCase
from rest_framework import status


class ContactSubmitTest(APITestCase):
    """Tests du formulaire de contact."""

    def test_submit_success(self):
        response = self.client.post('/api/contact/submit/', {
            'name': 'Jean Dupont',
            'email': 'jean@example.com',
            'subject': 'Commande',
            'message': 'Bonjour, j\'ai une question.',
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(response.data.get('success'))

    def test_submit_invalid_email(self):
        response = self.client.post('/api/contact/submit/', {
            'name': 'Jean',
            'email': 'invalid',
            'subject': 'Commande',
            'message': 'Test',
        })
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_contact_empty_message_rejected(self):
        """Message vide → 400."""
        resp = self.client.post('/api/contact/submit/', {
            'name': 'Jean', 'email': 'jean@test.com',
            'subject': 'Test', 'message': '',
        })
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_contact_missing_name_rejected(self):
        """Nom manquant → 400."""
        resp = self.client.post('/api/contact/submit/', {
            'name': '', 'email': 'jean@test.com',
            'subject': 'Test', 'message': 'Bonjour',
        })
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
