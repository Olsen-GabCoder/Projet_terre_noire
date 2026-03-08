"""Throttle pour limiter les requêtes sur les endpoints publics."""
from rest_framework.throttling import AnonRateThrottle


class PublicEndpointThrottle(AnonRateThrottle):
    """10 requêtes/minute pour les endpoints publics (contact, newsletter, etc.)."""
    scope = 'anon_burst'
