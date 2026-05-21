"""Throttles pour limiter les requetes sur les endpoints publics et sensibles."""
from rest_framework.throttling import AnonRateThrottle


class PublicEndpointThrottle(AnonRateThrottle):
    """10 requetes/minute pour les endpoints publics (contact, newsletter, etc.)."""
    scope = 'anon_burst'


class LoginThrottle(AnonRateThrottle):
    """5 tentatives de connexion par minute par IP."""
    scope = 'login'


class RegisterThrottle(AnonRateThrottle):
    """3 inscriptions par heure par IP."""
    scope = 'register'


class PasswordResetThrottle(AnonRateThrottle):
    """3 demandes de reinitialisation par heure par IP."""
    scope = 'password_reset'


class ContactThrottle(AnonRateThrottle):
    """5 messages de contact par heure par IP."""
    scope = 'contact'
