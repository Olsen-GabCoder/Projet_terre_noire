"""
Sécurité d'authentification Frollot — lockout de compte.
"""
from datetime import timedelta

from django.utils import timezone
from rest_framework.exceptions import Throttled

from .models import FailedLoginAttempt

# Configuration
MAX_FAILED_ATTEMPTS = 5
LOCKOUT_DURATION_MINUTES = 30


def get_client_ip(request):
    """Extrait l'adresse IP du client (supporte les proxies)."""
    x_forwarded = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded:
        return x_forwarded.split(',')[0].strip()
    return request.META.get('REMOTE_ADDR', '0.0.0.0')


def check_account_lockout(email):
    """
    Vérifie si un compte est verrouillé suite à trop de tentatives échouées.
    Lève Throttled (429) si le seuil est dépassé.
    """
    if not email:
        return
    cutoff = timezone.now() - timedelta(minutes=LOCKOUT_DURATION_MINUTES)
    recent_failures = FailedLoginAttempt.objects.filter(
        email=email.lower(),
        attempted_at__gte=cutoff,
    ).count()
    if recent_failures >= MAX_FAILED_ATTEMPTS:
        remaining = LOCKOUT_DURATION_MINUTES * 60  # secondes
        raise Throttled(
            detail=f"Compte temporairement verrouillé après {MAX_FAILED_ATTEMPTS} tentatives échouées. Réessayez dans {LOCKOUT_DURATION_MINUTES} minutes.",
            wait=remaining,
        )


def record_failed_attempt(email, request):
    """Enregistre une tentative de connexion échouée."""
    if not email:
        return
    FailedLoginAttempt.objects.create(
        email=email.lower(),
        ip_address=get_client_ip(request),
    )


def clear_failed_attempts(email):
    """Supprime les tentatives échouées après un login réussi."""
    if not email:
        return
    FailedLoginAttempt.objects.filter(email=email.lower()).delete()


def cleanup_old_attempts():
    """Supprime les anciennes tentatives (> 24h). Pour un cron/management command."""
    cutoff = timezone.now() - timedelta(hours=24)
    FailedLoginAttempt.objects.filter(attempted_at__lt=cutoff).delete()
