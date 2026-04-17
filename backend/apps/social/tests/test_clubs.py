"""Tests for book clubs: create, join, leave, messages, media, permissions."""
from rest_framework import status

from apps.social.models import BookClub, BookClubMembership, BookClubMessage
from .test_base import SocialTestBase


class BookClubTests(SocialTestBase):

    def test_create_club_creator_auto_admin(self):
        """POST creates a club and the creator is auto-assigned ADMIN membership."""
        self._auth(self.user_a)
        resp = self.client.post('/api/social/clubs/', {
            'name': 'Nouveau Club',
            'description': 'Un club de test',
            'is_public': True,
        }, format='json')
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        club = BookClub.objects.get(pk=resp.data['id'])
        self.assertEqual(club.creator, self.user_a)
        membership = BookClubMembership.objects.get(club=club, user=self.user_a)
        self.assertEqual(membership.role, 'ADMIN')

    def test_join_club(self):
        """POST join creates a MEMBER membership."""
        club = self._create_club(creator=self.user_a)
        self._auth(self.user_b)
        resp = self.client.post(f'/api/social/clubs/{club.slug}/join/')
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        self.assertTrue(resp.data['joined'])
        self.assertTrue(BookClubMembership.objects.filter(
            club=club, user=self.user_b, role='MEMBER',
        ).exists())

    def test_leave_club(self):
        """POST leave removes the membership."""
        club = self._create_club(creator=self.user_a)
        BookClubMembership.objects.create(club=club, user=self.user_b, role='MEMBER')
        self._auth(self.user_b)
        resp = self.client.post(f'/api/social/clubs/{club.slug}/leave/')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertFalse(BookClubMembership.objects.filter(club=club, user=self.user_b).exists())

    def test_club_messages_require_membership_for_read(self):
        """SECURITY: non-member cannot read club messages."""
        club = self._create_club(creator=self.user_a)
        BookClubMessage.objects.create(club=club, author=self.user_a, content='Secret msg')
        self._auth(self.user_c)  # not a member
        resp = self.client.get(f'/api/social/clubs/{club.slug}/messages/')
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)

    def test_club_messages_member_can_read(self):
        """Member can read club messages."""
        club = self._create_club(creator=self.user_a)
        BookClubMembership.objects.create(club=club, user=self.user_b, role='MEMBER')
        BookClubMessage.objects.create(club=club, author=self.user_a, content='Hello members')
        self._auth(self.user_b)
        resp = self.client.get(f'/api/social/clubs/{club.slug}/messages/')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)

    def test_club_shared_media_require_membership(self):
        """SECURITY: non-member cannot access shared media."""
        club = self._create_club(creator=self.user_a)
        self._auth(self.user_c)  # not a member
        resp = self.client.get(f'/api/social/clubs/{club.slug}/media/')
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)

    def test_orphan_club_admin_can_manage(self):
        """Club with creator=None: an ADMIN member can update."""
        club = self._create_club(creator=self.user_a)
        BookClubMembership.objects.create(club=club, user=self.user_b, role='ADMIN')
        # Simulate account deletion: set creator to None
        BookClub.objects.filter(pk=club.pk).update(creator=None)
        club.refresh_from_db()
        self.assertIsNone(club.creator)
        # user_b (ADMIN) should be able to update
        self._auth(self.user_b)
        resp = self.client.patch(
            f'/api/social/clubs/{club.slug}/',
            {'description': 'Updated by admin'},
            format='json',
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        club.refresh_from_db()
        self.assertEqual(club.description, 'Updated by admin')

    def test_kick_member(self):
        """Admin can kick a member."""
        club = self._create_club(creator=self.user_a)
        membership = BookClubMembership.objects.create(
            club=club, user=self.user_b, role='MEMBER',
        )
        self._auth(self.user_a)
        resp = self.client.delete(
            f'/api/social/clubs/{club.slug}/members/{membership.id}/kick/',
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertFalse(BookClubMembership.objects.filter(
            club=club, user=self.user_b,
        ).exists())
