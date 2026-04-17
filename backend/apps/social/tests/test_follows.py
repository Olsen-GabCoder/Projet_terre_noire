"""Tests for follow toggles."""
from rest_framework import status

from apps.social.models import UserFollow
from .test_base import SocialTestBase


class FollowTests(SocialTestBase):

    def test_follow_user_creates_relationship(self):
        """POST toggle creates a follow."""
        self._auth(self.user_a)
        resp = self.client.post('/api/social/follow/user/', {'user_id': self.user_b.id})
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertTrue(resp.data['followed'])
        self.assertTrue(UserFollow.objects.filter(follower=self.user_a, following=self.user_b).exists())

    def test_follow_user_toggle_unfollows(self):
        """POST toggle twice removes the follow."""
        self._auth(self.user_a)
        self.client.post('/api/social/follow/user/', {'user_id': self.user_b.id})
        resp = self.client.post('/api/social/follow/user/', {'user_id': self.user_b.id})
        self.assertFalse(resp.data['followed'])
        self.assertFalse(UserFollow.objects.filter(follower=self.user_a, following=self.user_b).exists())

    def test_auto_follow_self_blocked(self):
        """User cannot follow themselves."""
        self._auth(self.user_a)
        resp = self.client.post('/api/social/follow/user/', {'user_id': self.user_a.id})
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_follow_unauthenticated_rejected(self):
        """Unauthenticated request returns 401."""
        resp = self.client.post('/api/social/follow/user/', {'user_id': self.user_b.id})
        self.assertEqual(resp.status_code, status.HTTP_401_UNAUTHORIZED)
