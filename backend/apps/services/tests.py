"""
Comprehensive tests for the Services app.

Covers: service listing (public browse, create), service requests,
service request listing by role, quote creation, and quote PDF download.
"""
from decimal import Decimal
from io import BytesIO
from unittest.mock import patch, MagicMock

from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.utils import timezone

from rest_framework import status
from rest_framework.test import APITestCase

from apps.users.models import UserProfile
from .models import ServiceListing, ServiceRequest, ServiceQuote

User = get_user_model()

BASE_URL = '/api/services'


class ServiceTestMixin:
    """Shared helpers for service tests."""

    def _create_base_data(self):
        """Create users, provider profile, and a service listing."""
        # Regular client user
        self.client_user = User.objects.create_user(
            username='client',
            email='client@example.com',
            password='TestPass123!',
            first_name='Client',
            last_name='Lecteur',
        )
        # Provider user (correcteur)
        self.provider_user = User.objects.create_user(
            username='provider',
            email='provider@example.com',
            password='TestPass123!',
            first_name='Pro',
            last_name='Correcteur',
        )
        # Second provider (illustrateur)
        self.provider_user2 = User.objects.create_user(
            username='provider2',
            email='provider2@example.com',
            password='TestPass123!',
            first_name='Pro',
            last_name='Illustrateur',
        )
        # Admin
        self.admin_user = User.objects.create_superuser(
            username='admin',
            email='admin@example.com',
            password='AdminPass123!',
            first_name='Admin',
            last_name='Frollot',
        )

        # Provider profiles
        self.provider_profile = UserProfile.objects.create(
            user=self.provider_user,
            profile_type='CORRECTEUR',
            slug='pro-correcteur',
            bio='Correcteur professionnel',
            is_active=True,
        )
        self.provider_profile2 = UserProfile.objects.create(
            user=self.provider_user2,
            profile_type='ILLUSTRATEUR',
            slug='pro-illustrateur',
            bio='Illustrateur professionnel',
            is_active=True,
        )

        # Active listing
        self.listing = ServiceListing.objects.create(
            provider=self.provider_profile,
            service_type='CORRECTION',
            title='Correction de manuscrit',
            description='Service de correction professionnelle pour manuscrits.',
            price_type='PER_PAGE',
            base_price=Decimal('500'),
            turnaround_days=7,
            languages=['fr', 'en'],
            genres=['Roman', 'Essai'],
            is_active=True,
        )
        # Second listing (illustration, active)
        self.listing2 = ServiceListing.objects.create(
            provider=self.provider_profile2,
            service_type='ILLUSTRATION',
            title='Illustration couverture',
            description='Illustration de couverture de livre.',
            price_type='PER_PROJECT',
            base_price=Decimal('50000'),
            turnaround_days=14,
            languages=['fr'],
            is_active=True,
        )
        # Inactive listing (should not appear in public views)
        self.inactive_listing = ServiceListing.objects.create(
            provider=self.provider_profile,
            service_type='PROOFREADING',
            title='Relecture ancienne offre',
            description='Offre desactivee.',
            price_type='PER_PAGE',
            base_price=Decimal('300'),
            turnaround_days=5,
            is_active=False,
        )

    def _create_service_request(self, client_user=None, provider_profile=None,
                                listing=None, req_status='SUBMITTED'):
        """Create a ServiceRequest directly in the database."""
        return ServiceRequest.objects.create(
            client=client_user or self.client_user,
            listing=listing or self.listing,
            provider_profile=provider_profile or self.provider_profile,
            title='Corriger mon manuscrit',
            description='Je souhaite faire corriger mon manuscrit de 200 pages.',
            requirements='Orthographe et grammaire uniquement.',
            page_count=200,
            status=req_status,
        )


# ══════════════════════════════════════════════════════════════
# Service Listing — Public browse
# ══════════════════════════════════════════════════════════════

class ServiceListingPublicTest(ServiceTestMixin, APITestCase):
    """Tests for GET /api/services/listings/ (public)."""

    def setUp(self):
        self._create_base_data()

    def test_list_active_listings(self):
        """Public endpoint returns only active listings."""
        response = self.client.get(f'{BASE_URL}/listings/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        slugs = [item['slug'] for item in response.data]
        self.assertIn(self.listing.slug, slugs)
        self.assertIn(self.listing2.slug, slugs)
        self.assertNotIn(self.inactive_listing.slug, slugs)

    def test_filter_by_service_type(self):
        """Filtering by service_type returns only matching listings."""
        response = self.client.get(f'{BASE_URL}/listings/', {'service_type': 'CORRECTION'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        for item in response.data:
            self.assertEqual(item['service_type'], 'CORRECTION')

    def test_filter_by_service_type_no_results(self):
        """Non-existent service_type returns empty list."""
        response = self.client.get(f'{BASE_URL}/listings/', {'service_type': 'NONEXISTENT'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 0)

    def test_detail_by_slug(self):
        """Public detail retrieves listing by slug."""
        response = self.client.get(f'{BASE_URL}/listings/{self.listing.slug}/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['id'], self.listing.id)

    def test_detail_by_id(self):
        """Public detail retrieves listing by numeric id."""
        response = self.client.get(f'{BASE_URL}/listings/{self.listing.id}/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['slug'], self.listing.slug)

    def test_detail_inactive_listing_404(self):
        """Inactive listing returns 404 on public detail."""
        response = self.client.get(f'{BASE_URL}/listings/{self.inactive_listing.slug}/')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_detail_nonexistent_slug_404(self):
        """Non-existent slug returns 404."""
        response = self.client.get(f'{BASE_URL}/listings/does-not-exist/')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)


# ══════════════════════════════════════════════════════════════
# Service Listing — Create
# ══════════════════════════════════════════════════════════════

class ServiceListingCreateTest(ServiceTestMixin, APITestCase):
    """Tests for POST /api/services/listings/create/."""

    def setUp(self):
        self._create_base_data()

    def _listing_payload(self, **overrides):
        data = {
            'service_type': 'TRANSLATION',
            'title': 'Traduction francais-anglais',
            'description': 'Traduction professionnelle de livres.',
            'price_type': 'PER_WORD',
            'base_price': '50',
            'turnaround_days': 10,
            'languages': ['fr', 'en'],
        }
        data.update(overrides)
        return data

    def test_provider_can_create_listing(self):
        """Authenticated provider can create a new service listing."""
        self.client.force_authenticate(user=self.provider_user)
        response = self.client.post(
            f'{BASE_URL}/listings/create/',
            self._listing_payload(),
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        self.assertIn('listing', response.data)

    def test_non_provider_cannot_create_listing(self):
        """User without a professional profile is rejected (403)."""
        self.client.force_authenticate(user=self.client_user)
        response = self.client.post(
            f'{BASE_URL}/listings/create/',
            self._listing_payload(),
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_unauthenticated_cannot_create_listing(self):
        """Unauthenticated user is rejected (401)."""
        response = self.client.post(
            f'{BASE_URL}/listings/create/',
            self._listing_payload(),
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_create_listing_missing_title(self):
        """Missing required field triggers validation error."""
        self.client.force_authenticate(user=self.provider_user)
        payload = self._listing_payload()
        del payload['title']
        response = self.client.post(
            f'{BASE_URL}/listings/create/',
            payload,
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


# ══════════════════════════════════════════════════════════════
# Service Request — Create
# ══════════════════════════════════════════════════════════════

class ServiceRequestCreateTest(ServiceTestMixin, APITestCase):
    """Tests for POST /api/services/requests/create/."""

    def setUp(self):
        self._create_base_data()

    def _request_payload(self, **overrides):
        data = {
            'listing': self.listing.id,
            'provider_profile': self.provider_profile.id,
            'title': 'Corriger mon roman',
            'description': 'Roman de 300 pages a corriger.',
            'page_count': 300,
        }
        data.update(overrides)
        return data

    def test_authenticated_client_creates_request(self):
        """Authenticated user can create a service request."""
        self.client.force_authenticate(user=self.client_user)
        response = self.client.post(
            f'{BASE_URL}/requests/create/',
            self._request_payload(),
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        self.assertEqual(response.data['request']['status'], 'SUBMITTED')

    def test_unauthenticated_cannot_create_request(self):
        """Unauthenticated user is rejected."""
        response = self.client.post(
            f'{BASE_URL}/requests/create/',
            self._request_payload(),
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_create_request_with_file_upload(self):
        """Service request accepts a file attachment (PDF)."""
        self.client.force_authenticate(user=self.client_user)
        fake_pdf = SimpleUploadedFile(
            'manuscript.pdf',
            b'%PDF-1.4 fake content',
            content_type='application/pdf',
        )
        payload = {
            'listing': self.listing.id,
            'provider_profile': self.provider_profile.id,
            'title': 'Corriger avec fichier',
            'description': 'Manuscrit joint en PDF.',
            'page_count': 100,
            'file': fake_pdf,
        }
        response = self.client.post(
            f'{BASE_URL}/requests/create/',
            payload,
            format='multipart',
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)

    def test_create_request_missing_title(self):
        """Missing required title triggers validation error."""
        self.client.force_authenticate(user=self.client_user)
        payload = self._request_payload()
        del payload['title']
        response = self.client.post(
            f'{BASE_URL}/requests/create/',
            payload,
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_create_request_missing_provider_profile(self):
        """Missing provider_profile triggers validation error."""
        self.client.force_authenticate(user=self.client_user)
        payload = self._request_payload()
        del payload['provider_profile']
        response = self.client.post(
            f'{BASE_URL}/requests/create/',
            payload,
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


# ══════════════════════════════════════════════════════════════
# Service Request — List (role-based)
# ══════════════════════════════════════════════════════════════

class ServiceRequestListTest(ServiceTestMixin, APITestCase):
    """Tests for GET /api/services/requests/."""

    def setUp(self):
        self._create_base_data()
        # Request from client_user to provider_user
        self.request1 = self._create_service_request(
            client_user=self.client_user,
            provider_profile=self.provider_profile,
        )
        # Request from admin to provider_user2
        self.request2 = self._create_service_request(
            client_user=self.admin_user,
            provider_profile=self.provider_profile2,
            listing=self.listing2,
        )

    def test_client_sees_own_requests(self):
        """Client (default role) sees requests they submitted."""
        self.client.force_authenticate(user=self.client_user)
        response = self.client.get(f'{BASE_URL}/requests/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        ids = [r['id'] for r in response.data]
        self.assertIn(self.request1.id, ids)
        self.assertNotIn(self.request2.id, ids)

    def test_provider_sees_received_requests(self):
        """Provider with ?role=provider sees requests addressed to them."""
        self.client.force_authenticate(user=self.provider_user)
        response = self.client.get(f'{BASE_URL}/requests/', {'role': 'provider'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        ids = [r['id'] for r in response.data]
        self.assertIn(self.request1.id, ids)
        self.assertNotIn(self.request2.id, ids)

    def test_provider2_sees_only_their_requests(self):
        """Different provider sees only their own received requests."""
        self.client.force_authenticate(user=self.provider_user2)
        response = self.client.get(f'{BASE_URL}/requests/', {'role': 'provider'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        ids = [r['id'] for r in response.data]
        self.assertIn(self.request2.id, ids)
        self.assertNotIn(self.request1.id, ids)

    def test_non_provider_role_provider_returns_empty(self):
        """Client user with ?role=provider gets empty list (no provider profile)."""
        self.client.force_authenticate(user=self.client_user)
        response = self.client.get(f'{BASE_URL}/requests/', {'role': 'provider'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 0)

    def test_unauthenticated_cannot_list_requests(self):
        """Unauthenticated user is rejected."""
        response = self.client.get(f'{BASE_URL}/requests/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


# ══════════════════════════════════════════════════════════════
# Service Request — Detail
# ══════════════════════════════════════════════════════════════

class ServiceRequestDetailTest(ServiceTestMixin, APITestCase):
    """Tests for GET /api/services/requests/{id}/."""

    def setUp(self):
        self._create_base_data()
        self.service_request = self._create_service_request()

    def test_client_can_view_own_request(self):
        """Client who submitted the request can view it."""
        self.client.force_authenticate(user=self.client_user)
        response = self.client.get(
            f'{BASE_URL}/requests/{self.service_request.id}/',
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['id'], self.service_request.id)

    def test_provider_can_view_addressed_request(self):
        """Provider to whom the request is addressed can view it."""
        self.client.force_authenticate(user=self.provider_user)
        response = self.client.get(
            f'{BASE_URL}/requests/{self.service_request.id}/',
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_other_user_cannot_view_request(self):
        """Unrelated user gets 403."""
        self.client.force_authenticate(user=self.provider_user2)
        response = self.client.get(
            f'{BASE_URL}/requests/{self.service_request.id}/',
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_can_view_any_request(self):
        """Platform admin can view any request."""
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.get(
            f'{BASE_URL}/requests/{self.service_request.id}/',
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)


# ══════════════════════════════════════════════════════════════
# Service Quote — Create
# ══════════════════════════════════════════════════════════════

class ServiceQuoteCreateTest(ServiceTestMixin, APITestCase):
    """Tests for POST /api/services/quotes/create/."""

    def setUp(self):
        self._create_base_data()
        self.service_request = self._create_service_request()

    def _quote_payload(self, **overrides):
        valid_until = timezone.now() + timezone.timedelta(days=30)
        data = {
            'request': self.service_request.id,
            'price': '25000.00',
            'turnaround_days': 7,
            'message': 'Voici mon devis pour la correction.',
            'scope_of_work': 'Correction orthographique et grammaticale.',
            'revision_rounds': 2,
            'valid_until': valid_until.isoformat(),
        }
        data.update(overrides)
        return data

    def test_provider_creates_quote_for_own_request(self):
        """Provider can create a quote for a request addressed to them."""
        self.client.force_authenticate(user=self.provider_user)
        response = self.client.post(
            f'{BASE_URL}/quotes/create/',
            self._quote_payload(),
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        self.assertIn('quote', response.data)
        self.assertEqual(response.data['quote']['status'], 'PENDING')

    def test_wrong_provider_cannot_create_quote(self):
        """Provider who is NOT the one addressed gets 403."""
        self.client.force_authenticate(user=self.provider_user2)
        response = self.client.post(
            f'{BASE_URL}/quotes/create/',
            self._quote_payload(),
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_non_provider_cannot_create_quote(self):
        """Regular client (no provider profile) gets 403."""
        self.client.force_authenticate(user=self.client_user)
        response = self.client.post(
            f'{BASE_URL}/quotes/create/',
            self._quote_payload(),
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_unauthenticated_cannot_create_quote(self):
        """Unauthenticated request is rejected."""
        response = self.client.post(
            f'{BASE_URL}/quotes/create/',
            self._quote_payload(),
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_quote_missing_price_rejected(self):
        """Missing required price field triggers validation error."""
        self.client.force_authenticate(user=self.provider_user)
        payload = self._quote_payload()
        del payload['price']
        response = self.client.post(
            f'{BASE_URL}/quotes/create/',
            payload,
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_admin_can_create_quote_for_any_request(self):
        """Platform admin bypasses provider check."""
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.post(
            f'{BASE_URL}/quotes/create/',
            self._quote_payload(),
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)


# ══════════════════════════════════════════════════════════════
# Service Quote — PDF Download
# ══════════════════════════════════════════════════════════════

class ServiceQuotePDFTest(ServiceTestMixin, APITestCase):
    """Tests for GET /api/services/quotes/{id}/pdf/."""

    def setUp(self):
        self._create_base_data()
        self.service_request = self._create_service_request()
        self.quote = ServiceQuote.objects.create(
            request=self.service_request,
            price=Decimal('25000'),
            turnaround_days=7,
            message='Devis test',
            status='PENDING',
            valid_until=timezone.now() + timezone.timedelta(days=30),
        )

    @patch('apps.core.invoice.generate_service_quote_pdf')
    def test_client_can_download_quote_pdf(self, mock_pdf):
        """Client of the request can download the quote PDF."""
        mock_pdf.return_value = BytesIO(b'%PDF-1.4 fake')
        self.client.force_authenticate(user=self.client_user)
        response = self.client.get(f'{BASE_URL}/quotes/{self.quote.id}/pdf/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('application/pdf', response['Content-Type'])

    @patch('apps.core.invoice.generate_service_quote_pdf')
    def test_provider_can_download_quote_pdf(self, mock_pdf):
        """Provider of the request can download the quote PDF."""
        mock_pdf.return_value = BytesIO(b'%PDF-1.4 fake')
        self.client.force_authenticate(user=self.provider_user)
        response = self.client.get(f'{BASE_URL}/quotes/{self.quote.id}/pdf/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_unrelated_user_cannot_download_pdf(self):
        """User who is neither client nor provider gets 403."""
        self.client.force_authenticate(user=self.provider_user2)
        response = self.client.get(f'{BASE_URL}/quotes/{self.quote.id}/pdf/')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_unauthenticated_cannot_download_pdf(self):
        """Unauthenticated user is rejected."""
        response = self.client.get(f'{BASE_URL}/quotes/{self.quote.id}/pdf/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_nonexistent_quote_404(self):
        """Non-existent quote id returns 404."""
        self.client.force_authenticate(user=self.client_user)
        response = self.client.get(f'{BASE_URL}/quotes/99999/pdf/')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)


# ══════════════════════════════════════════════════════════════
# My Service Listings (provider)
# ══════════════════════════════════════════════════════════════

class MyServiceListingsTest(ServiceTestMixin, APITestCase):
    """Tests for GET /api/services/listings/mine/."""

    def setUp(self):
        self._create_base_data()

    def test_provider_sees_own_listings(self):
        """Provider sees listings they created (including inactive)."""
        self.client.force_authenticate(user=self.provider_user)
        response = self.client.get(f'{BASE_URL}/listings/mine/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        ids = [item['id'] for item in response.data]
        self.assertIn(self.listing.id, ids)
        # inactive_listing also belongs to provider_user
        self.assertIn(self.inactive_listing.id, ids)
        # listing2 belongs to provider_user2
        self.assertNotIn(self.listing2.id, ids)

    def test_non_provider_gets_403(self):
        """Client without provider profile gets 403."""
        self.client.force_authenticate(user=self.client_user)
        response = self.client.get(f'{BASE_URL}/listings/mine/')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_unauthenticated_gets_401(self):
        """Unauthenticated request returns 401."""
        response = self.client.get(f'{BASE_URL}/listings/mine/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
