"""Tests for Post CRUD and permissions."""
from rest_framework import status

from apps.social.models import Post
from .test_base import SocialTestBase


class PostTests(SocialTestBase):

    def test_create_text_post(self):
        """POST creates a text post with author=request.user."""
        self._auth(self.user_a)
        resp = self.client.post('/api/social/posts/', {
            'content': 'Mon premier post',
            'post_type': 'TEXT',
        })
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        post = Post.objects.get(pk=resp.data['id'])
        self.assertEqual(post.author, self.user_a)

    def test_create_post_unauthenticated(self):
        """Unauthenticated POST returns 401."""
        resp = self.client.post('/api/social/posts/', {
            'content': 'Should fail', 'post_type': 'TEXT',
        })
        self.assertEqual(resp.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_update_own_post(self):
        """Author can PATCH their own post."""
        post = self._create_post(author=self.user_a, content='Original')
        self._auth(self.user_a)
        resp = self.client.patch(f'/api/social/posts/{post.id}/', {'content': 'Modified'})
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        post.refresh_from_db()
        self.assertEqual(post.content, 'Modified')

    def test_update_other_post_forbidden(self):
        """Non-author gets 403 on PATCH."""
        post = self._create_post(author=self.user_a)
        self._auth(self.user_b)
        resp = self.client.patch(f'/api/social/posts/{post.id}/', {'content': 'Hack'})
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)

    def test_platform_review_requires_rating(self):
        """PLATFORM_REVIEW without rating returns 400."""
        self._auth(self.user_a)
        resp = self.client.post('/api/social/posts/', {
            'content': 'Great platform!',
            'post_type': 'PLATFORM_REVIEW',
        })
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
