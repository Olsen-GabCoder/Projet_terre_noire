# backend/apps/books/tests.py

from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APITestCase, APIClient
from rest_framework import status
from django.core.files.uploadedfile import SimpleUploadedFile
from django.core.exceptions import ValidationError
from django.contrib.auth import get_user_model
from decimal import Decimal

from .models import Category, Author, Book
from apps.orders.models import Order, OrderItem

User = get_user_model()


def _make_category(name='TestCat', slug='testcat'):
    """Crée ou récupère une catégorie (évite les conflits avec les seed data)."""
    obj, _ = Category.objects.get_or_create(name=name, defaults={'slug': slug})
    return obj


class ModelTests(TestCase):
    """Tests unitaires pour les modèles"""

    def setUp(self):
        self.category = _make_category('Roman', 'roman')
        self.author = Author.objects.create(
            full_name="Victor Hugo",
            biography="Écrivain français célèbre",
            slug="victor-hugo"
        )
        self.test_image = SimpleUploadedFile(
            name='test_cover.jpg',
            content=b'fake_image_content',
            content_type='image/jpeg'
        )
        self.book = Book.objects.create(
            title="Les Misérables",
            reference="ISBN123456",
            description="Un roman historique français",
            price=25.99,
            format="PAPIER",
            cover_image=self.test_image,
            available=True,
            category=self.category,
            author=self.author
        )

    def test_category_creation(self):
        self.assertEqual(self.category.name, "Roman")
        self.assertEqual(str(self.category), "Roman")

    def test_author_creation(self):
        self.assertEqual(self.author.full_name, "Victor Hugo")
        self.assertEqual(self.author.slug, "victor-hugo")
        self.assertEqual(str(self.author), "Victor Hugo")

    def test_book_creation(self):
        self.assertEqual(self.book.title, "Les Misérables")
        self.assertEqual(self.book.reference, "ISBN123456")
        self.assertEqual(self.book.price, 25.99)
        self.assertEqual(self.book.format, "PAPIER")
        self.assertTrue(self.book.available)
        self.assertEqual(self.book.category, self.category)
        self.assertEqual(self.book.author, self.author)
        self.assertEqual(str(self.book), "Les Misérables - Victor Hugo")

    def test_book_slug_auto_generation(self):
        book2 = Book.objects.create(
            title="Notre-Dame de Paris",
            reference="ISBN789012",
            description="Roman historique",
            price=19.99,
            format="PAPIER",
            available=True,
            category=self.category,
            author=self.author
        )
        self.assertIsNotNone(book2.slug)
        self.assertEqual(book2.slug, "notre-dame-de-paris")

    def test_book_properties(self):
        self.assertFalse(self.book.is_ebook)
        ebook = Book.objects.create(
            title="Ebook Test",
            reference="EBOOK001",
            description="Un ebook",
            price=9.99,
            format="EBOOK",
            available=True,
            category=self.category,
            author=self.author
        )
        self.assertTrue(ebook.is_ebook)
        self.assertTrue(self.book.is_available)
        self.book.available = False
        self.book.save()
        self.assertFalse(self.book.is_available)

    def test_category_books_count(self):
        Book.objects.create(
            title="L'Homme qui rit",
            reference="ISBN345678",
            description="Roman de Victor Hugo",
            price=22.50,
            format="PAPIER",
            available=True,
            category=self.category,
            author=self.author
        )
        self.assertEqual(self.category.books.count(), 2)

    def test_author_books_count(self):
        Book.objects.create(
            title="Les Contemplations",
            reference="ISBN901234",
            description="Recueil de poèmes",
            price=18.75,
            format="PAPIER",
            available=True,
            category=self.category,
            author=self.author
        )
        self.assertEqual(self.author.books.count(), 2)


class BookAPITests(APITestCase):
    """Tests d'intégration pour l'API des livres"""

    def setUp(self):
        self.client = APIClient()
        # Utiliser un nom unique pour éviter les conflits seed
        self.category = _make_category('Science-Fiction', 'science-fiction')
        self.author = Author.objects.create(
            full_name="Isaac Asimov",
            biography="Auteur de science-fiction",
            slug="isaac-asimov"
        )
        self.test_image = SimpleUploadedFile(
            name='test_cover_sf.jpg',
            content=b'fake_image_content',
            content_type='image/jpeg'
        )
        self.book = Book.objects.create(
            title="Fondation",
            reference="ISBN-SF-001",
            description="Un empire galactique",
            price=29.99,
            format="PAPIER",
            cover_image=self.test_image,
            available=True,
            category=self.category,
            author=self.author
        )
        self.book2 = Book.objects.create(
            title="Les Robots",
            reference="ISBN-SF-002",
            description="Recueil de nouvelles",
            price=24.99,
            format="PAPIER",
            available=False,
            category=self.category,
            author=self.author
        )
        self.ebook = Book.objects.create(
            title="I, Robot",
            reference="ISBN-EBOOK-001",
            description="Première loi de la robotique",
            price=14.99,
            format="EBOOK",
            available=True,
            category=self.category,
            author=self.author
        )

    def test_get_book_list(self):
        url = reverse('book-list')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Vérifier qu'on obtient au moins nos 3 livres
        self.assertGreaterEqual(response.data['count'], 3)

    def test_get_book_detail(self):
        url = reverse('book-detail', args=[self.book.id])
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['title'], "Fondation")
        self.assertEqual(response.data['reference'], "ISBN-SF-001")
        self.assertEqual(response.data['author']['full_name'], "Isaac Asimov")

    def test_book_filter_by_category(self):
        url = reverse('book-list')
        response = self.client.get(url, {'category': self.category.id})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['count'], 3)

    def test_book_filter_by_format(self):
        url = '/api/books/by-format/EBOOK/'
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(response.data['count'], 1)

    def test_book_filter_by_availability(self):
        url = reverse('book-list')
        response = self.client.get(url, {'available': 'true'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(response.data['count'], 2)

    def test_book_search(self):
        url = reverse('book-list')
        response = self.client.get(url, {'search': 'Fondation'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['count'], 1)
        self.assertEqual(response.data['results'][0]['title'], "Fondation")

    def test_book_ordering(self):
        url = reverse('book-list')
        response = self.client.get(url, {'ordering': 'price'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        prices = [float(book['price']) for book in response.data['results']]
        self.assertEqual(prices, sorted(prices))

    def test_featured_books_endpoint(self):
        url = '/api/books/featured/'
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertLessEqual(len(response.data), 6)

    def test_new_releases_endpoint(self):
        url = '/api/books/new-releases/'
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertLessEqual(len(response.data), 10)

    def test_statistics_endpoint(self):
        url = '/api/books/statistics/'
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(response.data['total_books'], 3)
        self.assertGreaterEqual(response.data['total_authors'], 1)

    def test_author_api(self):
        url = reverse('author-list')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(response.data['count'], 1)

    def test_category_api(self):
        url = reverse('category-list')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Seed data + nos catégories
        self.assertGreaterEqual(response.data['count'], 1)


class PaginationTests(APITestCase):
    """Tests spécifiques pour la pagination"""

    def setUp(self):
        self.client = APIClient()
        category = _make_category('PaginationTest', 'pagination-test')
        author = Author.objects.create(full_name="Test Author", slug="test-author-pag")
        for i in range(15):
            Book.objects.create(
                title=f"Livre Pagination {i+1}",
                reference=f"PAG-{i+1}",
                description="Description test",
                price=10.00,
                format="PAPIER",
                available=True,
                category=category,
                author=author
            )

    def test_pagination_default(self):
        url = reverse('book-list')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertLessEqual(len(response.data['results']), 12)
        self.assertGreaterEqual(response.data['count'], 15)

    def test_pagination_custom_page_size(self):
        url = reverse('book-list')
        response = self.client.get(url, {'page_size': 5})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 5)


class ValidationTests(TestCase):
    """Tests de validation des modèles"""

    def setUp(self):
        self.category = _make_category('ValidationTest', 'validation-test')
        self.author = Author.objects.create(full_name="Valid Author", slug="valid-author")

    def test_book_price_validation(self):
        from django.core.validators import MinValueValidator
        validator = MinValueValidator(0)
        with self.assertRaises(ValidationError):
            validator(-10)

    def test_unique_reference(self):
        Book.objects.create(
            title="Livre 1",
            reference="VALID-REF-001",
            description="Description",
            price=10.00,
            format="PAPIER",
            available=True,
            category=self.category,
            author=self.author
        )
        with self.assertRaises(Exception):
            Book.objects.create(
                title="Livre 2",
                reference="VALID-REF-001",
                description="Description",
                price=15.00,
                format="PAPIER",
                available=True,
                category=self.category,
                author=self.author
            )


class PDFAccessSecurityTests(APITestCase):
    """Tests de sécurité pour l'accès aux PDF ebooks."""

    def setUp(self):
        self.category = _make_category('Ebook', 'ebook')
        self.author = Author.objects.create(full_name='PDF Author', slug='pdf-author')
        self.pdf_content = b'%PDF-1.4 fake pdf content'
        self.pdf_file = SimpleUploadedFile('test.pdf', self.pdf_content, content_type='application/pdf')
        self.ebook = Book.objects.create(
            title='Ebook Sécurisé',
            reference='SEC-PDF-001',
            description='Test PDF sécurisé',
            price=Decimal('5000'),
            format='EBOOK',
            available=True,
            category=self.category,
            author=self.author,
            pdf_file=self.pdf_file,
        )
        self.user = User.objects.create_user(
            username='pdfuser', email='pdf@example.com', password='TestPass123!'
        )
        self.admin = User.objects.create_superuser(
            username='pdfadmin', email='pdfadmin@example.com', password='AdminPass123!'
        )

    def test_pdf_unauthenticated_rejected(self):
        """Un utilisateur non connecté ne peut pas lire un PDF."""
        response = self.client.get(f'/api/books/{self.ebook.id}/read-pdf/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_pdf_no_purchase_rejected(self):
        """Un utilisateur connecté sans achat ne peut pas lire le PDF."""
        self.client.force_authenticate(user=self.user)
        response = self.client.get(f'/api/books/{self.ebook.id}/read-pdf/')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_pdf_with_purchase_allowed(self):
        """Un utilisateur ayant acheté le livre peut lire le PDF."""
        order = Order.objects.create(
            user=self.user,
            status='PAID',
            subtotal=Decimal('5000'),
            shipping_cost=Decimal('0'),
            discount_amount=Decimal('0'),
            total_amount=Decimal('5000'),
            shipping_address='123 Rue',
            shipping_phone='+24112345678',
            shipping_city='Port-Gentil',
        )
        OrderItem.objects.create(order=order, book=self.ebook, quantity=1, price=Decimal('5000'))
        self.client.force_authenticate(user=self.user)
        response = self.client.get(f'/api/books/{self.ebook.id}/read-pdf/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_pdf_pending_order_rejected(self):
        """Une commande PENDING ne donne pas accès au PDF."""
        order = Order.objects.create(
            user=self.user,
            status='PENDING',
            subtotal=Decimal('5000'),
            shipping_cost=Decimal('0'),
            discount_amount=Decimal('0'),
            total_amount=Decimal('5000'),
            shipping_address='123 Rue',
            shipping_phone='+24112345678',
            shipping_city='Port-Gentil',
        )
        OrderItem.objects.create(order=order, book=self.ebook, quantity=1, price=Decimal('5000'))
        self.client.force_authenticate(user=self.user)
        response = self.client.get(f'/api/books/{self.ebook.id}/read-pdf/')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_pdf_admin_always_allowed(self):
        """Un admin peut toujours lire les PDF sans achat."""
        self.client.force_authenticate(user=self.admin)
        response = self.client.get(f'/api/books/{self.ebook.id}/read-pdf/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_pdf_book_without_file_returns_404(self):
        """Un livre sans PDF retourne 404."""
        book_no_pdf = Book.objects.create(
            title='Livre Sans PDF',
            reference='NO-PDF-001',
            description='Pas de PDF',
            price=Decimal('3000'),
            format='PAPIER',
            available=True,
            category=self.category,
            author=self.author,
        )
        self.client.force_authenticate(user=self.admin)
        response = self.client.get(f'/api/books/{book_no_pdf.id}/read-pdf/')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
