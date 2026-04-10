"""
Authentification JWT via cookies HttpOnly.
Lit le token depuis le cookie si absent du header Authorization.
Verifie la version du token pour invalider apres changement de mot de passe.
Verifie la session active pour supporter la revocation de session.
"""
from datetime import timedelta

from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError, AuthenticationFailed
from rest_framework.exceptions import AuthenticationFailed as DRFAuthFailed
from django.conf import settings
from django.utils import timezone


class JWTCookieAuthentication(JWTAuthentication):
    """
    Authentification JWT qui accepte le token depuis :
    1. Le header Authorization (Bearer)
    2. Le cookie access_token (HttpOnly)

    Verifie que token_version correspond a la version actuelle du user
    (invalide les anciens tokens apres changement de mot de passe).
    Verifie que la session active existe et n'a pas ete revoquee.
    """
    def authenticate(self, request):
        raw_token = None

        # D'abord essayer le header (comportement par defaut)
        header = self.get_header(request)
        if header is not None:
            raw_token = self.get_raw_token(header)

        # Sinon, lire depuis le cookie
        if raw_token is None:
            cookie_name = getattr(settings, 'JWT_ACCESS_COOKIE_NAME', 'access_token')
            raw_token = request.COOKIES.get(cookie_name)

        if raw_token is None:
            return None

        try:
            validated_token = self.get_validated_token(raw_token)
            user = self.get_user(validated_token)

            # Verifier la version du token
            token_version = validated_token.get('token_version')
            if token_version is not None and token_version != user.token_version:
                return None

            # Verifier la session active
            session_key = validated_token.get('session_key')
            if session_key:
                from .models import ActiveSession
                try:
                    session = ActiveSession.objects.get(session_key=session_key)
                    # Update last_active_at only if > 5 min since last update (avoid DB thrashing)
                    if timezone.now() - session.last_active_at > timedelta(minutes=5):
                        session.save(update_fields=['last_active_at'])
                except ActiveSession.DoesNotExist:
                    return None

            return (user, validated_token)
        except (InvalidToken, TokenError, DRFAuthFailed, Exception):
            # Token invalide, expire, user supprime, session revoquee, etc.
            # Retourner None pour que les vues publiques (AllowAny, IsAuthenticatedOrReadOnly)
            # fonctionnent. Les vues protegees (IsAuthenticated) retourneront 401 normalement.
            return None
