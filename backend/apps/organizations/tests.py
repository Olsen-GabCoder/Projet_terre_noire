from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status

from .models import Organization, OrganizationMembership, OrganizationReview, Invitation

User = get_user_model()


class OrganizationModelTest(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='owner', email='owner@test.com', password='test1234')

    def test_create_organization(self):
        org = Organization.objects.create(name='Éditions Test', org_type='MAISON_EDITION', owner=self.user)
        self.assertEqual(str(org), "Éditions Test (Maison d'édition)")
        self.assertTrue(org.slug)
        self.assertTrue(org.is_active)

    def test_slug_auto_generated(self):
        org = Organization.objects.create(name='Ma Librairie', org_type='LIBRAIRIE', owner=self.user)
        self.assertEqual(org.slug, 'ma-librairie')

    def test_slug_unique(self):
        Organization.objects.create(name='Doublon', org_type='LIBRAIRIE', owner=self.user)
        org2 = Organization.objects.create(name='Doublon', org_type='IMPRIMERIE', owner=self.user)
        self.assertNotEqual(org2.slug, 'doublon')
        self.assertTrue(org2.slug.startswith('doublon'))

    def test_default_country_gabon(self):
        org = Organization.objects.create(name='Test', org_type='LIBRAIRIE', owner=self.user)
        self.assertEqual(org.country, 'Gabon')


class OrganizationAPITest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.owner = User.objects.create_user(username='owner', email='owner@test.com', password='test1234')
        self.other = User.objects.create_user(username='other', email='other@test.com', password='test1234')
        self.org = Organization.objects.create(
            name='Éditions Frollot', org_type='MAISON_EDITION', owner=self.owner,
            description='Une maison d\'édition test', is_accepting_manuscripts=True,
        )
        OrganizationMembership.objects.create(organization=self.org, user=self.owner, role='PROPRIETAIRE')

    def test_directory_public(self):
        res = self.client.get('/api/organizations/directory/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertTrue(len(res.data) >= 1)

    def test_storefront_public(self):
        res = self.client.get(f'/api/organizations/{self.org.slug}/storefront/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data['name'], 'Éditions Frollot')
        self.assertIn('description', res.data)
        self.assertIn('avg_rating', res.data)

    def test_catalog_public(self):
        res = self.client.get(f'/api/organizations/{self.org.slug}/catalog/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)

    def test_team_public(self):
        res = self.client.get(f'/api/organizations/{self.org.slug}/team/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)

    def test_create_org_requires_auth(self):
        res = self.client.post('/api/organizations/', {'name': 'Test', 'org_type': 'LIBRAIRIE'})
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_create_org_authenticated(self):
        self.client.force_authenticate(user=self.other)
        res = self.client.post('/api/organizations/', {
            'name': 'Nouvelle Librairie', 'org_type': 'LIBRAIRIE', 'city': 'Libreville',
        })
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertTrue(OrganizationMembership.objects.filter(
            organization__name='Nouvelle Librairie', user=self.other, role='PROPRIETAIRE',
        ).exists())

    def test_update_org_only_admin(self):
        self.client.force_authenticate(user=self.other)
        res = self.client.patch(f'/api/organizations/{self.org.id}/', {'name': 'Hacked'})
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_update_org_as_owner(self):
        self.client.force_authenticate(user=self.owner)
        res = self.client.patch(f'/api/organizations/{self.org.id}/', {'description': 'Updated'})
        self.assertEqual(res.status_code, status.HTTP_200_OK)

    def test_dashboard_requires_membership(self):
        self.client.force_authenticate(user=self.other)
        res = self.client.get(f'/api/organizations/{self.org.id}/dashboard/')
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_dashboard_as_member(self):
        self.client.force_authenticate(user=self.owner)
        res = self.client.get(f'/api/organizations/{self.org.id}/dashboard/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertIn('member_count', res.data)


class OrganizationReviewTest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.owner = User.objects.create_user(username='owner', email='owner@test.com', password='test1234')
        self.reviewer = User.objects.create_user(username='reviewer', email='rev@test.com', password='test1234')
        self.org = Organization.objects.create(name='Test Org', org_type='LIBRAIRIE', owner=self.owner)

    def test_create_review(self):
        self.client.force_authenticate(user=self.reviewer)
        res = self.client.post(f'/api/organizations/{self.org.slug}/reviews/', {'rating': 4, 'comment': 'Bien !'})
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.org.refresh_from_db()
        self.assertEqual(self.org.review_count, 1)

    def test_duplicate_review_rejected(self):
        self.client.force_authenticate(user=self.reviewer)
        self.client.post(f'/api/organizations/{self.org.slug}/reviews/', {'rating': 5})
        res = self.client.post(f'/api/organizations/{self.org.slug}/reviews/', {'rating': 3})
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_list_reviews_public(self):
        OrganizationReview.objects.create(user=self.reviewer, organization=self.org, rating=4, comment='OK')
        res = self.client.get(f'/api/organizations/{self.org.slug}/reviews/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)


class InvitationTest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.owner = User.objects.create_user(username='owner', email='owner@test.com', password='test1234')
        self.org = Organization.objects.create(name='Test Org', org_type='MAISON_EDITION', owner=self.owner)
        OrganizationMembership.objects.create(organization=self.org, user=self.owner, role='PROPRIETAIRE')
        self.invitee = User.objects.create_user(username='invitee', email='invitee@test.com', password='test1234')

    def test_invite_requires_admin(self):
        self.client.force_authenticate(user=self.invitee)
        res = self.client.post(f'/api/organizations/{self.org.id}/invitations/', {
            'email': 'new@test.com', 'role': 'MEMBRE',
        })
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_invite_as_owner(self):
        self.client.force_authenticate(user=self.owner)
        res = self.client.post(f'/api/organizations/{self.org.id}/invitations/', {
            'email': 'invitee@test.com', 'role': 'EDITEUR',
        })
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertTrue(Invitation.objects.filter(email='invitee@test.com', organization=self.org).exists())

    def test_accept_invitation(self):
        self.client.force_authenticate(user=self.owner)
        res = self.client.post(f'/api/organizations/{self.org.id}/invitations/', {
            'email': 'invitee@test.com', 'role': 'MEMBRE',
        })
        token = Invitation.objects.get(email='invitee@test.com').token
        self.client.force_authenticate(user=self.invitee)
        res = self.client.post('/api/organizations/invitations/respond/', {'token': str(token), 'accept': True})
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertTrue(OrganizationMembership.objects.filter(user=self.invitee, organization=self.org).exists())
