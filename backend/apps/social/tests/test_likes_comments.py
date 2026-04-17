"""Tests for post likes and comments."""
from rest_framework import status

from apps.social.models import PostLike
from .test_base import SocialTestBase


class LikeTests(SocialTestBase):

    def test_like_post_toggle_creates(self):
        """POST like creates a like."""
        post = self._create_post(author=self.user_a)
        self._auth(self.user_b)
        resp = self.client.post(f'/api/social/posts/{post.id}/like/')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertTrue(resp.data['liked'])
        self.assertTrue(PostLike.objects.filter(user=self.user_b, post=post).exists())

    def test_unlike_post_via_delete(self):
        """DELETE on like endpoint unlikes (verifies fix from commit e7b8709)."""
        post = self._create_post(author=self.user_a)
        PostLike.objects.create(user=self.user_b, post=post)
        self._auth(self.user_b)
        resp = self.client.delete(f'/api/social/posts/{post.id}/like/')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertFalse(resp.data['liked'])
        self.assertFalse(PostLike.objects.filter(user=self.user_b, post=post).exists())


class CommentTests(SocialTestBase):

    def test_create_comment(self):
        """POST comment on a post returns 201."""
        post = self._create_post(author=self.user_a)
        self._auth(self.user_b)
        resp = self.client.post(
            f'/api/social/posts/{post.id}/comments/',
            {'content': 'Great post!'},
        )
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        self.assertEqual(resp.data['user']['id'], self.user_b.id)

    def test_comment_unauthenticated_rejected(self):
        """Unauthenticated comment returns 401."""
        post = self._create_post(author=self.user_a)
        resp = self.client.post(
            f'/api/social/posts/{post.id}/comments/',
            {'content': 'Should fail'},
        )
        self.assertEqual(resp.status_code, status.HTTP_401_UNAUTHORIZED)
