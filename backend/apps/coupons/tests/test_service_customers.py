from decimal import Decimal

from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase

from apps.organizations.models import Organization, OrganizationMembership
from apps.services.models import ServiceListing, ServiceRequest, ServiceQuote, ServiceOrder
from apps.users.models import UserProfile

User = get_user_model()


class ServiceCustomerListTest(APITestCase):
    """Tests for GET /api/coupons/service-customers/."""

    def setUp(self):
        self.provider_user = User.objects.create_user(
            username='prov', email='prov@test.com', password='TestPass123!',
        )
        self.profile = UserProfile.objects.create(
            user=self.provider_user, profile_type='CORRECTEUR',
        )
        self.client_user = User.objects.create_user(
            username='cli', email='cli@test.com', password='TestPass123!',
            first_name='Jean', last_name='Client',
        )
        # Create a ServiceListing + ServiceRequest + ServiceQuote + ServiceOrder
        listing = ServiceListing.objects.create(
            provider=self.profile, service_type='CORRECTION', title='Correction',
            description='Test', price_type='PER_PROJECT', base_price=Decimal('10000'),
            turnaround_days=7,
        )
        req = ServiceRequest.objects.create(
            client=self.client_user, listing=listing,
            provider_profile=self.profile, title='Corriger mon texte',
            description='Test', status='ACCEPTED',
        )
        from django.utils import timezone
        from datetime import timedelta
        quote = ServiceQuote.objects.create(
            request=req, price=Decimal('10000'), turnaround_days=7, status='ACCEPTED',
            valid_until=timezone.now() + timedelta(days=30),
        )
        from django.utils import timezone
        from datetime import timedelta
        ServiceOrder.objects.create(
            request=req, quote=quote, client=self.client_user, provider=self.profile,
            amount=Decimal('10000'), deadline=timezone.now() + timedelta(days=7),
        )

    def test_returns_service_clients(self):
        self.client.force_authenticate(user=self.provider_user)
        resp = self.client.get('/api/coupons/service-customers/')
        self.assertEqual(resp.status_code, 200)
        emails = {c['email'] for c in resp.data}
        self.assertIn('cli@test.com', emails)

    def test_org_vendor_gets_empty(self):
        org_owner = User.objects.create_user(
            username='org_owner', email='org@test.com', password='TestPass123!',
        )
        org = Organization.objects.create(name='Org', org_type='MAISON_EDITION', owner=org_owner)
        OrganizationMembership.objects.create(organization=org, user=org_owner, role='PROPRIETAIRE')
        self.client.force_authenticate(user=org_owner)
        resp = self.client.get('/api/coupons/service-customers/')
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.data, [])
