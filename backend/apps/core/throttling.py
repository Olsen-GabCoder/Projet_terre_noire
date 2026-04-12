"""Throttle pour limiter les requêtes sur les endpoints publics."""
from django.conf import settings
from rest_framework.throttling import AnonRateThrottle


class _TestingBypassMixin:
    """Désactive le throttling pendant les tests Django (TESTING=True)."""
    def allow_request(self, request, view):
        if getattr(settings, 'TESTING', False):
            return True
        return super().allow_request(request, view)


class PublicEndpointThrottle(_TestingBypassMixin, AnonRateThrottle):
    """10 requêtes/minute pour les endpoints publics (contact, newsletter, etc.)."""
    scope = 'anon_burst'
