from datetime import timedelta

from django.test import TestCase
from django.contrib.auth import get_user_model
from django.utils import timezone
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


class InvitationSecurityTest(TestCase):
    """Tests for invitation security (verifies fix cb3ecf1)."""

    def setUp(self):
        self.client = APIClient()
        self.owner = User.objects.create_user(
            username='sec_owner', email='sec_owner@test.com', password='test1234',
        )
        self.org = Organization.objects.create(
            name='Sec Org', org_type='MAISON_EDITION', owner=self.owner,
        )
        OrganizationMembership.objects.create(
            organization=self.org, user=self.owner, role='PROPRIETAIRE',
        )
        self.invitee = User.objects.create_user(
            username='sec_invitee', email='sec_invitee@test.com', password='test1234',
        )
        self.intruder = User.objects.create_user(
            username='sec_intruder', email='sec_intruder@test.com', password='test1234',
        )

    def _create_invitation(self, email='sec_invitee@test.com', role='MEMBRE', expires_delta=timedelta(days=7)):
        return Invitation.objects.create(
            organization=self.org, email=email, role=role,
            invited_by=self.owner, expires_at=timezone.now() + expires_delta,
        )

    def test_invitation_wrong_user_rejected(self):
        """User B cannot accept an invitation addressed to user A (verifies cb3ecf1)."""
        inv = self._create_invitation(email='sec_invitee@test.com')
        self.client.force_authenticate(user=self.intruder)  # wrong user
        res = self.client.post('/api/organizations/invitations/respond/', {
            'token': str(inv.token), 'accept': True,
        })
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)
        self.assertFalse(OrganizationMembership.objects.filter(
            user=self.intruder, organization=self.org,
        ).exists())

    def test_invitation_expired_rejected(self):
        """Expired invitation returns 400."""
        inv = self._create_invitation(expires_delta=timedelta(days=-1))
        self.client.force_authenticate(user=self.invitee)
        res = self.client.post('/api/organizations/invitations/respond/', {
            'token': str(inv.token), 'accept': True,
        })
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        inv.refresh_from_db()
        self.assertEqual(inv.status, 'EXPIRED')

    def test_invitation_double_accept_rejected(self):
        """Accepting the same invitation twice fails on the second attempt."""
        inv = self._create_invitation()
        self.client.force_authenticate(user=self.invitee)
        self.client.post('/api/organizations/invitations/respond/', {
            'token': str(inv.token), 'accept': True,
        })
        res = self.client.post('/api/organizations/invitations/respond/', {
            'token': str(inv.token), 'accept': True,
        })
        self.assertEqual(res.status_code, status.HTTP_404_NOT_FOUND)

    def test_commercial_cannot_invite(self):
        """A COMMERCIAL member cannot create invitations (requires PROPRIETAIRE/ADMIN)."""
        commercial = User.objects.create_user(
            username='sec_comm', email='sec_comm@test.com', password='test1234',
        )
        OrganizationMembership.objects.create(
            organization=self.org, user=commercial, role='COMMERCIAL',
        )
        self.client.force_authenticate(user=commercial)
        res = self.client.post(f'/api/organizations/{self.org.id}/invitations/', {
            'email': 'new@test.com', 'role': 'MEMBRE',
        })
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_editeur_cannot_manage_members(self):
        """An EDITEUR cannot add members."""
        editeur = User.objects.create_user(
            username='sec_edit', email='sec_edit@test.com', password='test1234',
        )
        OrganizationMembership.objects.create(
            organization=self.org, user=editeur, role='EDITEUR',
        )
        self.client.force_authenticate(user=editeur)
        res = self.client.post(f'/api/organizations/{self.org.id}/members/add/', {
            'email': 'someone@test.com', 'role': 'MEMBRE',
        })
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)


class RolePermissionTest(TestCase):
    """Tests for role-based permissions on organizations."""

    def setUp(self):
        self.client = APIClient()
        self.owner = User.objects.create_user(
            username='rp_owner', email='rp_owner@test.com', password='test1234',
        )
        self.member = User.objects.create_user(
            username='rp_member', email='rp_member@test.com', password='test1234',
        )
        self.admin_member = User.objects.create_user(
            username='rp_admin', email='rp_admin@test.com', password='test1234',
        )
        self.outsider = User.objects.create_user(
            username='rp_out', email='rp_out@test.com', password='test1234',
        )
        self.org = Organization.objects.create(
            name='Role Org', org_type='LIBRAIRIE', owner=self.owner,
        )
        OrganizationMembership.objects.create(
            organization=self.org, user=self.owner, role='PROPRIETAIRE',
        )
        OrganizationMembership.objects.create(
            organization=self.org, user=self.member, role='MEMBRE',
        )
        OrganizationMembership.objects.create(
            organization=self.org, user=self.admin_member, role='ADMINISTRATEUR',
        )

    def test_proprietaire_can_update_org(self):
        self.client.force_authenticate(user=self.owner)
        res = self.client.patch(f'/api/organizations/{self.org.id}/', {'description': 'New desc'})
        self.assertEqual(res.status_code, status.HTTP_200_OK)

    def test_membre_cannot_update_org(self):
        self.client.force_authenticate(user=self.member)
        res = self.client.patch(f'/api/organizations/{self.org.id}/', {'description': 'Hacked'})
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_can_invite(self):
        self.client.force_authenticate(user=self.admin_member)
        res = self.client.post(f'/api/organizations/{self.org.id}/invitations/', {
            'email': 'newguy@test.com', 'role': 'MEMBRE',
        })
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)

    def test_non_member_cannot_access_dashboard(self):
        self.client.force_authenticate(user=self.outsider)
        res = self.client.get(f'/api/organizations/{self.org.id}/dashboard/')
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_proprietaire_cannot_be_removed(self):
        """Attempting to remove the owner should fail."""
        owner_membership = OrganizationMembership.objects.get(
            organization=self.org, user=self.owner,
        )
        self.client.force_authenticate(user=self.owner)
        res = self.client.delete(
            f'/api/organizations/{self.org.id}/members/{owner_membership.pk}/',
        )
        # Should be rejected (400 or 403) — owner cannot be removed
        self.assertIn(res.status_code, [status.HTTP_400_BAD_REQUEST, status.HTTP_403_FORBIDDEN])


class CascadeIntegrityTest(TestCase):
    """Tests for cascade deletion and uniqueness constraints."""

    def setUp(self):
        self.owner = User.objects.create_user(
            username='cas_owner', email='cas_owner@test.com', password='test1234',
        )
        self.reviewer = User.objects.create_user(
            username='cas_rev', email='cas_rev@test.com', password='test1234',
        )

    def test_org_deletion_cascades_memberships(self):
        org = Organization.objects.create(name='Cascade Org', org_type='LIBRAIRIE', owner=self.owner)
        OrganizationMembership.objects.create(organization=org, user=self.owner, role='PROPRIETAIRE')
        org_id = org.id
        org.delete()
        self.assertFalse(OrganizationMembership.objects.filter(organization_id=org_id).exists())

    def test_org_deletion_cascades_invitations(self):
        org = Organization.objects.create(name='Cascade Org2', org_type='LIBRAIRIE', owner=self.owner)
        Invitation.objects.create(
            organization=org, email='test@test.com', role='MEMBRE',
            invited_by=self.owner, expires_at=timezone.now() + timedelta(days=7),
        )
        org_id = org.id
        org.delete()
        self.assertFalse(Invitation.objects.filter(organization_id=org_id).exists())

    def test_review_unique_per_user_per_org(self):
        org = Organization.objects.create(name='Review Org', org_type='LIBRAIRIE', owner=self.owner)
        OrganizationReview.objects.create(user=self.reviewer, organization=org, rating=4, comment='Good')
        client = APIClient()
        client.force_authenticate(user=self.reviewer)
        res = client.post(f'/api/organizations/{org.slug}/reviews/', {'rating': 3})
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)


class DirectoryTest(TestCase):
    """Tests for the public organization directory."""

    def setUp(self):
        self.client = APIClient()
        self.owner = User.objects.create_user(
            username='dir_owner', email='dir_owner@test.com', password='test1234',
        )
        self.librairie = Organization.objects.create(
            name='Dir Librairie', org_type='LIBRAIRIE', owner=self.owner, is_active=True,
        )
        self.editeur = Organization.objects.create(
            name='Dir Editeur', org_type='MAISON_EDITION', owner=self.owner, is_active=True,
        )

    def test_directory_filters_by_type(self):
        res = self.client.get('/api/organizations/directory/', {'type': 'LIBRAIRIE'})
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        data = res.data['results'] if isinstance(res.data, dict) else res.data
        names = [o['name'] for o in data]
        self.assertIn('Dir Librairie', names)
        self.assertNotIn('Dir Editeur', names)

    def test_inactive_org_hidden_from_directory(self):
        self.librairie.is_active = False
        self.librairie.save()
        res = self.client.get('/api/organizations/directory/')
        data = res.data['results'] if isinstance(res.data, dict) else res.data
        names = [o['name'] for o in data]
        self.assertNotIn('Dir Librairie', names)
        self.librairie.is_active = True
        self.librairie.save()
