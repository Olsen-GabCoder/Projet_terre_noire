"""
Throttles de sécurité pour les endpoints Frollot.
Protègent contre le brute-force, le spam et les abus.
"""
from rest_framework.throttling import AnonRateThrottle, UserRateThrottle


class ForgotPasswordThrottle(AnonRateThrottle):
    """Limite les demandes de réinitialisation de mot de passe à 3/heure par IP."""
    rate = '3/hour'


class ResetPasswordThrottle(AnonRateThrottle):
    """Limite les tentatives de réinitialisation à 5/heure par IP."""
    rate = '5/hour'


class RegistrationThrottle(AnonRateThrottle):
    """Limite les inscriptions à 10/heure par IP."""
    rate = '10/hour'


class ResendVerificationThrottle(AnonRateThrottle):
    """Limite le renvoi d'email de vérification à 3/heure par IP."""
    rate = '3/hour'


class OrderCreateThrottle(UserRateThrottle):
    """Limite la création de commandes à 10/heure par utilisateur."""
    rate = '10/hour'


class ManuscriptSubmitThrottle(UserRateThrottle):
    """Limite la soumission de manuscrits à 5/jour par utilisateur."""
    rate = '5/day'


class ContactThrottle(AnonRateThrottle):
    """Limite les messages de contact à 5/heure par IP."""
    rate = '5/hour'
