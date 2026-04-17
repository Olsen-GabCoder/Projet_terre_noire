"""Tests for reading lists (CRUD, privacy, slug-based operations)."""
from rest_framework import status

from apps.social.models import ReadingList, ReadingListItem
from .test_base import SocialTestBase


class ReadingListTests(SocialTestBase):

    def test_create_reading_list(self):
        """POST creates a list with user=request.user."""
        self._auth(self.user_a)
        resp = self.client.post('/api/social/lists/', {
            'title': 'Ma liste de lecture',
            'is_public': True,
        })
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        rl = ReadingList.objects.get(pk=resp.data['id'])
        self.assertEqual(rl.user, self.user_a)
        self.assertTrue(rl.slug)  # slug auto-generated

    def test_private_list_invisible_to_others(self):
        """Another user cannot see a private list via retrieve."""
        rl = ReadingList.objects.create(
            user=self.user_a, title='Liste privee', is_public=False,
        )
        self._auth(self.user_b)
        resp = self.client.get(f'/api/social/lists/{rl.slug}/')
        self.assertEqual(resp.status_code, status.HTTP_404_NOT_FOUND)

    def test_add_book_to_list(self):
        """POST add-book adds the book to the list."""
        rl = ReadingList.objects.create(user=self.user_a, title='Test list')
        self._auth(self.user_a)
        resp = self.client.post(
            f'/api/social/lists/{rl.slug}/add-book/',
            {'book_id': self.book.id},
        )
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        self.assertTrue(ReadingListItem.objects.filter(reading_list=rl, book=self.book).exists())

    def test_delete_list_uses_slug(self):
        """DELETE with slug works (verifies slug-based routing fix)."""
        rl = ReadingList.objects.create(user=self.user_a, title='To delete')
        self._auth(self.user_a)
        resp = self.client.delete(f'/api/social/lists/{rl.slug}/')
        self.assertEqual(resp.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(ReadingList.objects.filter(pk=rl.pk).exists())
