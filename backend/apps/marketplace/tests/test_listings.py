"""Tests for BookListing CRUD and permissions."""
from decimal import Decimal

from rest_framework import status

from apps.marketplace.models import BookListing
from apps.books.models import Book
from .test_base import MarketplaceTestBase


class BookListingTests(MarketplaceTestBase):

    def test_create_listing_as_vendor(self):
        """Vendor member can create a listing."""
        self._auth(self.vendor_user)
        book2 = Book.objects.create(
            title='Livre 2', reference='978-TEST-002',
            description='Deuxieme livre', price=Decimal('3000'),
            category=self.category, author=self.author,
        )
        resp = self.client.post('/api/marketplace/listings/create/', {
            'book': book2.id, 'price': '3500', 'stock': 5,
            'condition': 'NEW',
        })
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        self.assertTrue(BookListing.objects.filter(book=book2, vendor=self.vendor_org).exists())

    def test_create_listing_non_vendor_forbidden(self):
        """Non-vendor user gets 403."""
        self._auth(self.random_user)
        resp = self.client.post('/api/marketplace/listings/create/', {
            'book': self.book.id, 'price': '5000', 'stock': 5,
        })
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)

    def test_list_public_listings(self):
        """Public endpoint returns active listings."""
        resp = self.client.get('/api/marketplace/listings/')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        ids = [item['id'] for item in (resp.data['results'] if isinstance(resp.data, dict) else resp.data)]
        self.assertIn(self.listing.id, ids)

    def test_inactive_listing_hidden_from_public(self):
        """Inactive listing is not shown publicly."""
        self.listing.is_active = False
        self.listing.save()
        resp = self.client.get('/api/marketplace/listings/')
        ids = [item['id'] for item in (resp.data['results'] if isinstance(resp.data, dict) else resp.data)]
        self.assertNotIn(self.listing.id, ids)
        # Restore
        self.listing.is_active = True
        self.listing.save()

    def test_my_listings_as_vendor(self):
        """Vendor sees own listings."""
        self._auth(self.vendor_user)
        resp = self.client.get('/api/marketplace/listings/mine/')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        ids = [item['id'] for item in (resp.data['results'] if isinstance(resp.data, dict) else resp.data)]
        self.assertIn(self.listing.id, ids)

    def test_update_listing_price(self):
        """Vendor can update listing price."""
        self._auth(self.vendor_user)
        resp = self.client.patch(
            f'/api/marketplace/listings/{self.listing.id}/',
            {'price': '6000'},
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.listing.refresh_from_db()
        self.assertEqual(self.listing.price, Decimal('6000'))

    def test_update_listing_other_vendor_forbidden(self):
        """Another user (non-member) cannot update listing."""
        self._auth(self.random_user)
        resp = self.client.patch(
            f'/api/marketplace/listings/{self.listing.id}/',
            {'price': '1000'},
        )
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)

    def test_deactivate_listing(self):
        """DELETE soft-deletes (deactivates) the listing."""
        self._auth(self.vendor_user)
        resp = self.client.delete(f'/api/marketplace/listings/{self.listing.id}/')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.listing.refresh_from_db()
        self.assertFalse(self.listing.is_active)
        # Restore
        self.listing.is_active = True
        self.listing.save()
