"""
Vues OAuth pour Google et Facebook — Frollot.
Flow: Frontend redirige vers /api/users/oauth/<provider>/
      → Backend redirige vers le provider OAuth
      → Callback reçoit le code, échange contre token, crée/connecte l'utilisateur
      → Pose les cookies JWT et redirige vers le frontend
"""
import os
import uuid
import logging
import requests as http_requests

from datetime import timedelta

from django.conf import settings
from django.db import models
from django.http import HttpResponseRedirect
from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView
from urllib.parse import urlencode

from .models import SocialAccount, User, UserProfile
from .jwt_cookie_views import (
    _set_auth_cookies, _generate_tokens_with_session, _create_login_history,
)
from .session_manager import create_session

logger = logging.getLogger(__name__)

FRONTEND_URL = getattr(settings, 'FRONTEND_URL', 'http://localhost:5173')

# URL de base du backend — fixe, pas dépendante de request.build_absolute_uri()
# Évite le problème 127.0.0.1 vs localhost (redirect_uri_mismatch)
BACKEND_URL = os.getenv('BACKEND_URL', 'http://localhost:8000')


def _get_or_create_social_user(provider, provider_uid, email, first_name='', last_name='', extra_data=None):
    """
    Trouve ou crée un utilisateur via son compte social.
    - Si SocialAccount existe → retourne l'utilisateur lié
    - Si un User avec cet email existe → lie le SocialAccount et retourne
    - Sinon → crée User + SocialAccount + profil LECTEUR
    """
    # 1. Chercher un SocialAccount existant
    social = SocialAccount.objects.filter(provider=provider, provider_uid=provider_uid).select_related('user').first()
    if social:
        return social.user

    # 2. Chercher un User existant par email
    user = User.objects.filter(email__iexact=email).first()
    if user:
        SocialAccount.objects.create(
            user=user, provider=provider, provider_uid=provider_uid,
            email=email, extra_data=extra_data or {},
        )
        # Activer le compte si pas encore actif (l'email est vérifié par le provider)
        if not user.is_active:
            user.is_active = True
            user.save(update_fields=['is_active'])
        return user

    # 3. Créer un nouvel utilisateur
    username = email.split('@')[0]
    base_username = username
    counter = 1
    while User.objects.filter(username=username).exists():
        username = f"{base_username}{counter}"
        counter += 1

    user = User.objects.create_user(
        username=username,
        email=email,
        password=None,  # Pas de mot de passe — login social uniquement
        first_name=first_name,
        last_name=last_name,
        is_active=True,  # Email vérifié par le provider
    )

    SocialAccount.objects.create(
        user=user, provider=provider, provider_uid=provider_uid,
        email=email, extra_data=extra_data or {},
    )

    # Profil LECTEUR par défaut
    UserProfile.objects.get_or_create(user=user, profile_type='LECTEUR')

    return user


class OAuthExchangeToken(models.Model):
    """Token temporaire pour échanger un login OAuth contre des cookies JWT."""
    token = models.UUIDField(default=uuid.uuid4, unique=True)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='oauth_exchange_tokens')
    session_key = models.UUIDField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'users_oauth_exchange_token'

    @property
    def is_expired(self):
        return timezone.now() > self.created_at + timedelta(minutes=5)


def _login_social_user(user, request, provider):
    """
    Crée une session et un token d'échange temporaire.
    Redirige vers un endpoint backend (même domaine) qui pose les cookies
    puis redirige vers le frontend. Pas d'AJAX — tout via redirect navigateur.
    """
    session_key = uuid.uuid4()
    create_session(user, request, session_key=session_key)
    _create_login_history(user, user.email, request, 'SUCCESS')

    exchange = OAuthExchangeToken.objects.create(user=user, session_key=session_key)

    # Redirect vers le finalize via le FRONTEND (proxy Vite → même domaine → cookies OK)
    return HttpResponseRedirect(f"{FRONTEND_URL}/api/users/oauth/finalize/?token={exchange.token}")


def _oauth_error_redirect(message='Erreur de connexion'):
    """Redirige vers le frontend avec un message d'erreur."""
    return HttpResponseRedirect(f"{FRONTEND_URL}/login?oauth=error")


# ══════════════════════════════════════════════════
# GOOGLE OAUTH
# ══════════════════════════════════════════════════

GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth'
GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token'
GOOGLE_USERINFO_URL = 'https://www.googleapis.com/oauth2/v2/userinfo'


class GoogleOAuthStartView(APIView):
    """
    GET /api/users/oauth/google/
    Redirige vers la page de consentement Google.
    """
    permission_classes = [AllowAny]

    def get(self, request):
        client_id = getattr(settings, 'GOOGLE_OAUTH_CLIENT_ID', '')
        if not client_id:
            return Response(
                {'detail': 'Google OAuth non configuré.'},
                status=status.HTTP_501_NOT_IMPLEMENTED,
            )

        callback_url = f"{BACKEND_URL}/api/users/oauth/google/callback/"
        params = {
            'client_id': client_id,
            'redirect_uri': callback_url,
            'response_type': 'code',
            'scope': 'openid email profile',
            'access_type': 'offline',
            'prompt': 'select_account',
        }
        return HttpResponseRedirect(f"{GOOGLE_AUTH_URL}?{urlencode(params)}")


class GoogleOAuthCallbackView(APIView):
    """
    GET /api/users/oauth/google/callback/?code=...
    Échange le code Google contre un token, récupère le profil, connecte l'utilisateur.
    """
    permission_classes = [AllowAny]

    def get(self, request):
        code = request.query_params.get('code')
        error = request.query_params.get('error')

        if error or not code:
            return _oauth_error_redirect('Autorisation Google refusée.')

        client_id = getattr(settings, 'GOOGLE_OAUTH_CLIENT_ID', '')
        client_secret = getattr(settings, 'GOOGLE_OAUTH_CLIENT_SECRET', '')
        callback_url = f"{BACKEND_URL}/api/users/oauth/google/callback/"

        # Échanger le code contre un access token
        try:
            token_response = http_requests.post(GOOGLE_TOKEN_URL, data={
                'code': code,
                'client_id': client_id,
                'client_secret': client_secret,
                'redirect_uri': callback_url,
                'grant_type': 'authorization_code',
            }, timeout=10)
            token_data = token_response.json()

            if 'access_token' not in token_data:
                logger.error(f"Google OAuth token error: {token_data}")
                return _oauth_error_redirect('Erreur d\'échange de token Google.')

            # Récupérer le profil utilisateur
            userinfo_response = http_requests.get(GOOGLE_USERINFO_URL, headers={
                'Authorization': f"Bearer {token_data['access_token']}",
            }, timeout=10)
            userinfo = userinfo_response.json()

            if 'email' not in userinfo:
                return _oauth_error_redirect('Email non disponible depuis Google.')

            user = _get_or_create_social_user(
                provider='GOOGLE',
                provider_uid=userinfo['id'],
                email=userinfo['email'],
                first_name=userinfo.get('given_name', ''),
                last_name=userinfo.get('family_name', ''),
                extra_data=userinfo,
            )

            return _login_social_user(user, request, 'GOOGLE')

        except Exception as e:
            logger.exception(f"Google OAuth error: {e}")
            return _oauth_error_redirect('Erreur de connexion avec Google.')


# ══════════════════════════════════════════════════
# FACEBOOK OAUTH
# ══════════════════════════════════════════════════

FB_AUTH_URL = 'https://www.facebook.com/v19.0/dialog/oauth'
FB_TOKEN_URL = 'https://graph.facebook.com/v19.0/oauth/access_token'
FB_USERINFO_URL = 'https://graph.facebook.com/v19.0/me'


class FacebookOAuthStartView(APIView):
    """
    GET /api/users/oauth/facebook/
    Redirige vers la page de consentement Facebook.
    """
    permission_classes = [AllowAny]

    def get(self, request):
        client_id = getattr(settings, 'FACEBOOK_OAUTH_APP_ID', '')
        if not client_id:
            return Response(
                {'detail': 'Facebook OAuth non configuré.'},
                status=status.HTTP_501_NOT_IMPLEMENTED,
            )

        callback_url = f"{BACKEND_URL}/api/users/oauth/facebook/callback/"
        params = {
            'client_id': client_id,
            'redirect_uri': callback_url,
            'scope': 'email,public_profile',
            'response_type': 'code',
        }
        return HttpResponseRedirect(f"{FB_AUTH_URL}?{urlencode(params)}")


class FacebookOAuthCallbackView(APIView):
    """
    GET /api/users/oauth/facebook/callback/?code=...
    Échange le code Facebook contre un token, récupère le profil, connecte l'utilisateur.
    """
    permission_classes = [AllowAny]

    def get(self, request):
        code = request.query_params.get('code')
        error = request.query_params.get('error')

        if error or not code:
            return _oauth_error_redirect('Autorisation Facebook refusée.')

        client_id = getattr(settings, 'FACEBOOK_OAUTH_APP_ID', '')
        client_secret = getattr(settings, 'FACEBOOK_OAUTH_APP_SECRET', '')
        callback_url = f"{BACKEND_URL}/api/users/oauth/facebook/callback/"

        try:
            # Échanger le code contre un access token
            token_response = http_requests.get(FB_TOKEN_URL, params={
                'client_id': client_id,
                'client_secret': client_secret,
                'redirect_uri': callback_url,
                'code': code,
            }, timeout=10)
            token_data = token_response.json()

            if 'access_token' not in token_data:
                logger.error(f"Facebook OAuth token error: {token_data}")
                return _oauth_error_redirect('Erreur d\'échange de token Facebook.')

            # Récupérer le profil utilisateur
            userinfo_response = http_requests.get(FB_USERINFO_URL, params={
                'fields': 'id,email,first_name,last_name,name',
                'access_token': token_data['access_token'],
            }, timeout=10)
            userinfo = userinfo_response.json()

            if 'email' not in userinfo:
                return _oauth_error_redirect('Email non disponible depuis Facebook. Vérifiez vos paramètres de confidentialité.')

            user = _get_or_create_social_user(
                provider='FACEBOOK',
                provider_uid=userinfo['id'],
                email=userinfo['email'],
                first_name=userinfo.get('first_name', ''),
                last_name=userinfo.get('last_name', ''),
                extra_data=userinfo,
            )

            return _login_social_user(user, request, 'FACEBOOK')

        except Exception as e:
            logger.exception(f"Facebook OAuth error: {e}")
            return _oauth_error_redirect('Erreur de connexion avec Facebook.')


# ══════════════════════════════════════════════════
# STATUS CHECK (pour le frontend)
# ══════════════════════════════════════════════════

class OAuthFinalizeView(APIView):
    """
    GET /api/users/oauth/finalize/?token=<uuid>
    Appelé via redirect navigateur (pas AJAX).
    Pose les cookies JWT (même domaine = ça marche) puis redirige vers le frontend.
    """
    permission_classes = [AllowAny]

    def get(self, request):
        token_value = request.query_params.get('token')
        if not token_value:
            return _oauth_error_redirect()

        try:
            exchange = OAuthExchangeToken.objects.select_related('user').get(token=token_value)
        except OAuthExchangeToken.DoesNotExist:
            return _oauth_error_redirect()

        if exchange.is_expired:
            exchange.delete()
            return _oauth_error_redirect()

        user = exchange.user
        session_key = exchange.session_key
        exchange.delete()  # Usage unique

        # Poser les cookies JWT et rediriger vers le frontend
        refresh = _generate_tokens_with_session(user, session_key)
        response = HttpResponseRedirect(f"{FRONTEND_URL}/?oauth=success")
        _set_auth_cookies(response, str(refresh.access_token), str(refresh))
        return response


class OAuthProvidersView(APIView):
    """
    GET /api/users/oauth/providers/
    Retourne quels providers OAuth sont configurés.
    """
    permission_classes = [AllowAny]

    def get(self, request):
        return Response({
            'google': bool(getattr(settings, 'GOOGLE_OAUTH_CLIENT_ID', '')),
            'facebook': bool(getattr(settings, 'FACEBOOK_OAUTH_APP_ID', '')),
        })
