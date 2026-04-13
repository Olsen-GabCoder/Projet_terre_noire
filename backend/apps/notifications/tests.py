"""Tests complets pour l'app notifications."""
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from .models import Notification
from .services import create_notification

User = get_user_model()

BASE_URL = '/api/notifications'


class _NotifMixin:
    """Mixin pour créer les données de test communes."""

    @classmethod
    def setUpTestData(cls):
        cls.user = User.objects.create_user(
            username='notif_user', email='notif@test.com',
            password='TestPass123!', is_active=True,
        )
        cls.other_user = User.objects.create_user(
            username='other_user', email='other@test.com',
            password='TestPass123!', is_active=True,
        )

    def _create_notif(self, recipient=None, **kwargs):
        defaults = {
            'recipient': recipient or self.user,
            'notification_type': 'ORDER_CREATED',
            'title': 'Commande #42 créée',
            'message': 'Votre commande a été créée.',
            'link': '/dashboard/orders',
        }
        defaults.update(kwargs)
        return Notification.objects.create(**defaults)


class NotificationModelTest(_NotifMixin, APITestCase):
    """Tests du modèle Notification."""

    def test_create_notification(self):
        notif = self._create_notif()
        self.assertEqual(notif.notification_type, 'ORDER_CREATED')
        self.assertFalse(notif.is_read)
        self.assertIsNone(notif.read_at)

    def test_default_ordering(self):
        """Le queryset par défaut est ordonné par -created_at (le Meta ordering est défini)."""
        self.assertEqual(Notification._meta.ordering, ['-created_at'])

    def test_str_representation(self):
        notif = self._create_notif()
        self.assertIn('ORDER_CREATED', str(notif))
        self.assertIn('Commande #42', str(notif))


class CreateNotificationHelperTest(_NotifMixin, APITestCase):
    """Tests du helper create_notification()."""

    def test_create_notification_success(self):
        notif = create_notification(
            self.user, 'ORDER_PAID', 'Paiement confirmé',
            message='Test', link='/orders',
        )
        self.assertIsNotNone(notif)
        self.assertEqual(notif.recipient, self.user)
        self.assertEqual(Notification.objects.count(), 1)

    def test_create_notification_with_metadata(self):
        notif = create_notification(
            self.user, 'ORDER_CREATED', 'Test',
            metadata={'order_id': 42},
        )
        self.assertEqual(notif.metadata, {'order_id': 42})

    def test_create_notification_none_recipient(self):
        result = create_notification(None, 'ORDER_CREATED', 'Test')
        self.assertIsNone(result)
        self.assertEqual(Notification.objects.count(), 0)

    @patch('apps.notifications.models.Notification.objects')
    def test_create_notification_silent_on_error(self, mock_manager):
        mock_manager.create.side_effect = Exception('DB down')
        result = create_notification(self.user, 'ORDER_CREATED', 'Test')
        self.assertIsNone(result)


class NotificationListTest(_NotifMixin, APITestCase):
    """Tests GET /api/notifications/."""

    def setUp(self):
        self.client.force_authenticate(user=self.user)
        self.n1 = self._create_notif(title='Notif 1')
        self.n2 = self._create_notif(title='Notif 2', is_read=True)
        self._create_notif(recipient=self.other_user, title='Other')

    def test_list_own_notifications(self):
        response = self.client.get(f'{BASE_URL}/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['count'], 2)

    def test_cannot_see_others_notifications(self):
        response = self.client.get(f'{BASE_URL}/')
        titles = [n['title'] for n in response.data['results']]
        self.assertNotIn('Other', titles)

    def test_filter_unread(self):
        response = self.client.get(f'{BASE_URL}/?is_read=false')
        self.assertEqual(response.data['count'], 1)
        self.assertEqual(response.data['results'][0]['title'], 'Notif 1')

    def test_filter_read(self):
        response = self.client.get(f'{BASE_URL}/?is_read=true')
        self.assertEqual(response.data['count'], 1)
        self.assertEqual(response.data['results'][0]['title'], 'Notif 2')

    def test_unauthenticated_401(self):
        self.client.force_authenticate(user=None)
        response = self.client.get(f'{BASE_URL}/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


class UnreadCountTest(_NotifMixin, APITestCase):
    """Tests GET /api/notifications/unread_count/."""

    def setUp(self):
        self.client.force_authenticate(user=self.user)

    def test_unread_count_correct(self):
        self._create_notif()
        self._create_notif()
        self._create_notif(is_read=True)
        response = self.client.get(f'{BASE_URL}/unread_count/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['count'], 2)

    def test_unread_count_zero_when_all_read(self):
        self._create_notif(is_read=True)
        response = self.client.get(f'{BASE_URL}/unread_count/')
        self.assertEqual(response.data['count'], 0)

    def test_unauthenticated_401(self):
        self.client.force_authenticate(user=None)
        response = self.client.get(f'{BASE_URL}/unread_count/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


class MarkAsReadTest(_NotifMixin, APITestCase):
    """Tests PATCH /api/notifications/{id}/mark_as_read/."""

    def setUp(self):
        self.client.force_authenticate(user=self.user)
        self.notif = self._create_notif()

    def test_mark_as_read_success(self):
        response = self.client.patch(f'{BASE_URL}/{self.notif.id}/mark_as_read/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.notif.refresh_from_db()
        self.assertTrue(self.notif.is_read)

    def test_mark_as_read_sets_read_at(self):
        self.client.patch(f'{BASE_URL}/{self.notif.id}/mark_as_read/')
        self.notif.refresh_from_db()
        self.assertIsNotNone(self.notif.read_at)

    def test_cannot_mark_others_notification(self):
        other_notif = self._create_notif(recipient=self.other_user)
        response = self.client.patch(f'{BASE_URL}/{other_notif.id}/mark_as_read/')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_unauthenticated_401(self):
        self.client.force_authenticate(user=None)
        response = self.client.patch(f'{BASE_URL}/{self.notif.id}/mark_as_read/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


class MarkAllAsReadTest(_NotifMixin, APITestCase):
    """Tests POST /api/notifications/mark_all_as_read/."""

    def setUp(self):
        self.client.force_authenticate(user=self.user)

    def test_mark_all_as_read(self):
        self._create_notif()
        self._create_notif()
        response = self.client.post(f'{BASE_URL}/mark_all_as_read/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['updated'], 2)
        self.assertEqual(Notification.objects.filter(recipient=self.user, is_read=False).count(), 0)

    def test_only_marks_own_notifications(self):
        self._create_notif()
        other_notif = self._create_notif(recipient=self.other_user)
        self.client.post(f'{BASE_URL}/mark_all_as_read/')
        other_notif.refresh_from_db()
        self.assertFalse(other_notif.is_read)


class DeleteNotificationTest(_NotifMixin, APITestCase):
    """Tests DELETE /api/notifications/{id}/."""

    def setUp(self):
        self.client.force_authenticate(user=self.user)
        self.notif = self._create_notif()

    def test_delete_own_notification(self):
        response = self.client.delete(f'{BASE_URL}/{self.notif.id}/')
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(Notification.objects.filter(id=self.notif.id).count(), 0)

    def test_cannot_delete_others_notification(self):
        other_notif = self._create_notif(recipient=self.other_user)
        response = self.client.delete(f'{BASE_URL}/{other_notif.id}/')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_unauthenticated_401(self):
        self.client.force_authenticate(user=None)
        response = self.client.delete(f'{BASE_URL}/{self.notif.id}/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
