"""Tests pour l'app core."""
from unittest.mock import patch

from django.test import TestCase
from rest_framework import status
from rest_framework.test import APITestCase

from .email import send_async
from .models import SiteConfig


class SendAsyncTest(TestCase):
    """Tests du helper send_async (envoi email non-bloquant)."""

    def test_exception_in_thread_is_logged_not_raised(self):
        """send_async ne crashe pas si la fonction lève une exception."""
        def boom():
            raise RuntimeError("email server down")

        with patch("apps.core.email.logger") as mock_logger:
            thread = send_async(boom)
            thread.join(timeout=2)
            self.assertFalse(thread.is_alive(), "Le thread devrait être terminé")
            mock_logger.exception.assert_called_once()
            logged_msg = mock_logger.exception.call_args[0][0]
            self.assertIn("send_async", logged_msg)

    def test_function_name_in_log(self):
        """Le nom de la fonction est bien inclus dans le log d'exception."""
        def my_email_func():
            raise ValueError("SMTP error")

        with patch("apps.core.email.logger") as mock_logger:
            thread = send_async(my_email_func)
            thread.join(timeout=2)
            args = mock_logger.exception.call_args[0]
            self.assertIn("my_email_func", str(args))

    def test_success_does_not_log_exception(self):
        """send_async ne log pas d'exception si la fonction réussit."""
        called = []

        def ok():
            called.append(True)

        with patch("apps.core.email.logger") as mock_logger:
            thread = send_async(ok)
            thread.join(timeout=2)
            self.assertEqual(called, [True])
            mock_logger.exception.assert_not_called()

    def test_returns_started_thread(self):
        """send_async retourne un Thread déjà démarré."""
        import threading

        def noop():
            pass

        thread = send_async(noop)
        self.assertIsInstance(thread, threading.Thread)
        thread.join(timeout=2)

    def test_thread_is_daemon(self):
        """Le thread est daemon (n'empêche pas l'arrêt du processus)."""
        import threading

        event = threading.Event()

        def wait_for_event():
            event.wait(timeout=0.05)

        thread = send_async(wait_for_event)
        self.assertTrue(thread.daemon)
        event.set()
        thread.join(timeout=2)


class DeliveryConfigTest(APITestCase):
    """Tests de la config livraison."""

    def test_get_delivery_config(self):
        SiteConfig.get_config()  # initialise la config si absente
        response = self.client.get('/api/config/delivery/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('shipping_free_threshold', response.data)
        self.assertIn('shipping_cost', response.data)
