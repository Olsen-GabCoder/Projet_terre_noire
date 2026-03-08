"""Tests pour l'app users."""
from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase
from rest_framework import status

User = get_user_model()


class UserRegistrationTest(APITestCase):
    """Tests d'inscription."""

    def test_register_success(self):
        response = self.client.post('/api/users/register/', {
            'username': 'testuser',
            'email': 'test@example.com',
            'password': 'SecurePass123!',
            'password_confirm': 'SecurePass123!',
            'first_name': 'Test',
            'last_name': 'User',
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn('user', response.data)
        self.assertTrue(User.objects.filter(username='testuser').exists())

    def test_register_missing_fields(self):
        response = self.client.post('/api/users/register/', {'username': 'test'})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
