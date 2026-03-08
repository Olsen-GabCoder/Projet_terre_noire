"""Tests pour l'app orders."""
from decimal import Decimal
from rest_framework.test import APITestCase
from rest_framework import status
from django.contrib.auth import get_user_model

from apps.books.models import Book, Category, Author
from apps.core.models import SiteConfig

User = get_user_model()


class OrderCreateTest(APITestCase):
    """Tests de création de commande."""

    def setUp(self):
        SiteConfig.get_config()  # S'assure que la config livraison existe
        self.user = User.objects.create_user(
            username='buyer',
            email='buyer@example.com',
            password='TestPass123!',
            first_name='Buyer',
            last_name='Test',
        )
        cat = Category.objects.create(name='Roman', slug='roman')
        auth = Author.objects.create(full_name='Auteur Test', slug='auteur-test')
        self.book = Book.objects.create(
            title='Livre Test',
            slug='livre-test',
            reference='REF001',
            description='Desc',
            price=Decimal('5000'),
            format='PAPIER',
            available=True,
            category=cat,
            author=auth,
        )

    def test_create_order_authenticated(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.post('/api/orders/', {
            'items': [{'book_id': self.book.id, 'quantity': 1}],
            'shipping_address': '123 Rue Test',
            'shipping_phone': '+24112345678',
            'shipping_city': 'Port-Gentil',
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, msg=response.data)
        self.assertIn('id', response.data)

    def test_create_order_unauthenticated(self):
        response = self.client.post('/api/orders/', {
            'items': [{'book_id': self.book.id, 'quantity': 1}],
            'shipping_address': '123 Rue',
            'shipping_phone': '+24112345678',
            'shipping_city': 'PG',
        })
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
