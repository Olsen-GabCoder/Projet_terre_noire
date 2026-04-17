"""Shared fixtures for social tests."""
from decimal import Decimal

from django.test import TestCase
from rest_framework.test import APIClient

from apps.books.models import Category, Author, Book
from apps.social.models import (
    Post, BookClub, BookClubMembership,
)
from apps.users.models import User, UserProfile


class SocialTestBase(TestCase):
    """Base class providing common fixtures for all social tests."""

    @classmethod
    def setUpTestData(cls):
        cls.user_a = User.objects.create_user(
            username='social_a', email='a@social.test', password='Testpass1!',
            first_name='Alice', last_name='Auteur',
        )
        cls.user_b = User.objects.create_user(
            username='social_b', email='b@social.test', password='Testpass1!',
            first_name='Bob', last_name='Lecteur',
        )
        cls.user_c = User.objects.create_user(
            username='social_c', email='c@social.test', password='Testpass1!',
            first_name='Charlie', last_name='Tiers',
        )
        UserProfile.objects.create(user=cls.user_a, profile_type='AUTEUR', is_active=True)
        UserProfile.objects.create(user=cls.user_b, profile_type='LECTEUR', is_active=True)

        cls.category = Category.objects.create(name='Roman Social Test')
        cls.author = Author.objects.create(full_name='Auteur Social Test')
        cls.book = Book.objects.create(
            title='Livre Social Test', reference='978-SOC-001',
            description='Un livre pour les tests sociaux',
            price=Decimal('3000'), category=cls.category,
            author=cls.author, format='PAPIER',
        )

    def setUp(self):
        self.client = APIClient()

    def _auth(self, user):
        self.client.force_authenticate(user=user)

    def _create_post(self, author=None, content='Test post', post_type='TEXT', **kwargs):
        return Post.objects.create(
            author=author or self.user_a,
            content=content,
            post_type=post_type,
            **kwargs,
        )

    def _create_club(self, creator=None, name='Club Test', is_public=True):
        creator = creator or self.user_a
        club = BookClub.objects.create(
            name=name, creator=creator, is_public=is_public,
        )
        BookClubMembership.objects.create(
            club=club, user=creator, role='ADMIN',
        )
        return club
