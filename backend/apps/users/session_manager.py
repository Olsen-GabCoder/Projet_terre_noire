"""
Gestion des sessions actives pour Frollot.
"""
import uuid
from datetime import timedelta

from django.conf import settings
from django.utils import timezone

from .models import ActiveSession
from .auth_security import get_client_ip


def parse_device_info(user_agent_string):
    """
    Parse simple du User-Agent pour detecter le type d'appareil et un nom lisible.
    Retourne { 'device_name': str, 'device_type': str }.
    """
    ua = (user_agent_string or '').lower()

    # Detect device type
    if any(kw in ua for kw in ['iphone', 'android', 'mobile']):
        device_type = 'MOBILE'
    elif any(kw in ua for kw in ['ipad', 'tablet']):
        device_type = 'TABLET'
    else:
        device_type = 'DESKTOP'

    # Detect browser
    browser = 'Navigateur inconnu'
    if 'edg/' in ua or 'edge/' in ua:
        browser = 'Edge'
    elif 'opr/' in ua or 'opera' in ua:
        browser = 'Opera'
    elif 'chrome' in ua and 'edg/' not in ua:
        browser = 'Chrome'
    elif 'firefox' in ua:
        browser = 'Firefox'
    elif 'safari' in ua and 'chrome' not in ua:
        browser = 'Safari'

    # Detect OS
    os_name = ''
    if 'windows' in ua:
        os_name = 'Windows'
    elif 'macintosh' in ua or 'mac os' in ua:
        os_name = 'macOS'
    elif 'linux' in ua and 'android' not in ua:
        os_name = 'Linux'
    elif 'android' in ua:
        os_name = 'Android'
    elif 'iphone' in ua or 'ipad' in ua:
        os_name = 'iOS'

    device_name = f"{browser} on {os_name}" if os_name else browser

    return {
        'device_name': device_name,
        'device_type': device_type,
    }


def create_session(user, request, session_key=None):
    """
    Cree une ActiveSession pour l'utilisateur.
    Retourne l'instance ActiveSession creee.
    """
    user_agent = request.META.get('HTTP_USER_AGENT', '')
    ip_address = get_client_ip(request)
    info = parse_device_info(user_agent)

    refresh_lifetime = settings.SIMPLE_JWT.get(
        'REFRESH_TOKEN_LIFETIME', timedelta(days=7)
    )

    # Nettoyer les sessions expirées de cet utilisateur
    ActiveSession.objects.filter(user=user, expires_at__lt=timezone.now()).delete()

    # Si une session existe déjà pour le même appareil + IP, la réutiliser
    existing = ActiveSession.objects.filter(
        user=user,
        device_name=info['device_name'],
        ip_address=ip_address,
    ).first()
    if existing:
        existing.session_key = session_key or uuid.uuid4()
        existing.user_agent = user_agent
        existing.expires_at = timezone.now() + refresh_lifetime
        existing.save(update_fields=['session_key', 'user_agent', 'expires_at', 'last_active_at'])
        return existing

    # Limite : 3 sessions max par utilisateur
    MAX_SESSIONS = 3
    active_count = ActiveSession.objects.filter(user=user).count()
    if active_count >= MAX_SESSIONS:
        # Supprimer la session la plus ancienne pour faire de la place
        oldest = ActiveSession.objects.filter(user=user).order_by('last_active_at').first()
        if oldest:
            oldest.delete()

    session = ActiveSession.objects.create(
        user=user,
        session_key=session_key or uuid.uuid4(),
        device_name=info['device_name'],
        device_type=info['device_type'],
        ip_address=ip_address,
        user_agent=user_agent,
        expires_at=timezone.now() + refresh_lifetime,
    )
    return session


def revoke_session(session_key):
    """Supprime une ActiveSession par sa cle."""
    ActiveSession.objects.filter(session_key=session_key).delete()
