"""
Throttles de sécurité pour les endpoints Frollot.
Protègent contre le brute-force, le spam et les abus.
"""
from django.conf import settings
from rest_framework.throttling import AnonRateThrottle, UserRateThrottle


class _TestingBypassMixin:
    """Désactive le throttling pendant les tests Django (TESTING=True)."""
    def allow_request(self, request, view):
        if getattr(settings, 'TESTING', False):
            return True
        return super().allow_request(request, view)


class ForgotPasswordThrottle(_TestingBypassMixin, AnonRateThrottle):
    """Limite les demandes de réinitialisation de mot de passe à 3/heure par IP."""
    rate = '3/hour'


class ResetPasswordThrottle(_TestingBypassMixin, AnonRateThrottle):
    """Limite les tentatives de réinitialisation à 5/heure par IP."""
    rate = '5/hour'


class RegistrationThrottle(_TestingBypassMixin, AnonRateThrottle):
    """Limite les inscriptions à 10/heure par IP."""
    rate = '10/hour'


class ResendVerificationThrottle(_TestingBypassMixin, AnonRateThrottle):
    """Limite le renvoi d'email de vérification à 3/heure par IP."""
    rate = '3/hour'


class OrderCreateThrottle(_TestingBypassMixin, UserRateThrottle):
    """Limite la création de commandes à 10/heure par utilisateur."""
    rate = '10/hour'


class ManuscriptSubmitThrottle(_TestingBypassMixin, UserRateThrottle):
    """Limite la soumission de manuscrits à 5/jour par utilisateur."""
    rate = '5/day'


class ContactThrottle(_TestingBypassMixin, AnonRateThrottle):
    """Limite les messages de contact à 5/heure par IP."""
    rate = '5/hour'
