"""
Authentification JWT via cookies HttpOnly.
Lit le token depuis le cookie si absent du header Authorization.
"""
from rest_framework_simplejwt.authentication import JWTAuthentication
from django.conf import settings


class JWTCookieAuthentication(JWTAuthentication):
    """
    Authentification JWT qui accepte le token depuis :
    1. Le header Authorization (Bearer)
    2. Le cookie access_token (HttpOnly)
    """
    def authenticate(self, request):
        # D'abord essayer le header (comportement par défaut)
        header = self.get_header(request)
        if header is not None:
            raw_token = self.get_raw_token(header)
            if raw_token is not None:
                validated_token = self.get_validated_token(raw_token)
                return (self.get_user(validated_token), validated_token)

        # Sinon, lire depuis le cookie
        cookie_name = getattr(settings, 'JWT_ACCESS_COOKIE_NAME', 'access_token')
        raw_token = request.COOKIES.get(cookie_name)
        if raw_token:
            validated_token = self.get_validated_token(raw_token)
            return (self.get_user(validated_token), validated_token)

        return None
