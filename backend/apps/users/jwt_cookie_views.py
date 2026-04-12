"""
Vues JWT qui stockent les tokens dans des cookies HttpOnly.
"""
import uuid
from datetime import timedelta

from rest_framework import status
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from rest_framework.throttling import AnonRateThrottle
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken, AccessToken
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.exceptions import InvalidToken
from django.conf import settings
from django.utils import timezone

from .token_serializers import EmailTokenObtainPairSerializer
from .serializers import UserDetailSerializer
from .auth_security import get_client_ip
from .session_manager import create_session, parse_device_info
from .models import LoginHistory, TOTPChallenge


class LoginRateThrottle(AnonRateThrottle):
    """Limite les tentatives de connexion a 5/minute par IP."""
    rate = '5/minute'


def _set_auth_cookies(response, access_token, refresh_token=None, remember_me=False):
    """Configure les cookies HttpOnly pour les tokens."""
    secure = not getattr(settings, 'DEBUG', True)
    samesite = 'Lax'

    if remember_me:
        access_max_age = int(timedelta(days=30).total_seconds())
        refresh_max_age = int(timedelta(days=30).total_seconds())
    else:
        access_max_age = int(settings.SIMPLE_JWT['ACCESS_TOKEN_LIFETIME'].total_seconds())
        refresh_max_age = int(settings.SIMPLE_JWT['REFRESH_TOKEN_LIFETIME'].total_seconds())

    cookie_opts = {
        'httponly': True,
        'secure': secure,
        'samesite': samesite,
        'path': '/',
        'max_age': access_max_age,
    }
    access_name = getattr(settings, 'JWT_ACCESS_COOKIE_NAME', 'access_token')
    response.set_cookie(access_name, str(access_token), **cookie_opts)

    if refresh_token:
        refresh_opts = {
            'httponly': True,
            'secure': secure,
            'samesite': samesite,
            'path': '/',
            'max_age': refresh_max_age,
        }
        refresh_name = getattr(settings, 'JWT_REFRESH_COOKIE_NAME', 'refresh_token')
        response.set_cookie(refresh_name, str(refresh_token), **refresh_opts)


def _clear_auth_cookies(response):
    """Supprime les cookies d'authentification."""
    access_name = getattr(settings, 'JWT_ACCESS_COOKIE_NAME', 'access_token')
    refresh_name = getattr(settings, 'JWT_REFRESH_COOKIE_NAME', 'refresh_token')
    for name in (access_name, refresh_name):
        response.delete_cookie(name, path='/', samesite='Lax')


def _create_login_history(user, email, request, login_status, failure_reason=None):
    """Helper pour creer un enregistrement LoginHistory."""
    user_agent = request.META.get('HTTP_USER_AGENT', '')
    info = parse_device_info(user_agent)
    LoginHistory.objects.create(
        user=user,
        email_used=email,
        ip_address=get_client_ip(request),
        device_info=info['device_name'],
        user_agent=user_agent,
        status=login_status,
        failure_reason=failure_reason,
    )


def _generate_tokens_with_session(user, session_key):
    """Genere access + refresh tokens avec session_key dans le payload."""
    refresh = RefreshToken.for_user(user)
    refresh['token_version'] = user.token_version
    refresh['session_key'] = str(session_key)
    refresh.access_token['token_version'] = user.token_version
    refresh.access_token['session_key'] = str(session_key)
    return refresh


class CookieTokenObtainPairView(TokenObtainPairView):
    """
    Connexion JWT : retourne les tokens + user en JSON ET les definit en cookies HttpOnly.
    Supporte TOTP 2FA : si active, retourne un challenge_token au lieu des cookies.
    """
    serializer_class = EmailTokenObtainPairSerializer
    throttle_classes = [LoginRateThrottle]

    def post(self, request, *args, **kwargs):
        from .auth_security import check_account_lockout, record_failed_attempt, clear_failed_attempts
        email = (request.data.get('username') or '').strip().lower()
        check_account_lockout(email)

        response = super().post(request, *args, **kwargs)
        remember_me = request.data.get('remember_me', False)

        if response.status_code == 200:
            clear_failed_attempts(email)
            access = response.data.get('access')
            refresh = response.data.get('refresh')

            if access:
                try:
                    user_id = AccessToken(access)['user_id']
                    from .models import User
                    user = User.objects.get(id=user_id)
                except Exception:
                    response.data.pop('access', None)
                    response.data.pop('refresh', None)
                    return response

                # Check if TOTP 2FA is enabled
                if user.totp_enabled:
                    # Don't set cookies yet — require TOTP verification
                    challenge = TOTPChallenge.objects.create(
                        user=user,
                        expires_at=timezone.now() + timedelta(minutes=5),
                    )
                    _create_login_history(user, email, request, 'TOTP_PENDING')
                    response.status_code = 202
                    response.data = {
                        'totp_required': True,
                        'challenge_token': str(challenge.token),
                        'user_id': user.id,
                    }
                    return response

                # No TOTP: normal login flow with session
                session_key = uuid.uuid4()
                session = create_session(user, request, session_key=session_key)
                new_refresh = _generate_tokens_with_session(user, session_key)
                _set_auth_cookies(
                    response,
                    str(new_refresh.access_token),
                    str(new_refresh),
                    remember_me=remember_me,
                )
                _create_login_history(user, email, request, 'SUCCESS')
                response.data = {
                    'user': UserDetailSerializer(user, context={'request': request}).data,
                }
        else:
            # Login failed
            record_failed_attempt(email, request)
            _create_login_history(None, email, request, 'FAILED', failure_reason='INVALID_PASSWORD')
        return response


class TOTPVerifyLoginView(APIView):
    """
    Verification TOTP lors de la connexion 2FA.
    POST /api/users/totp/verify/ avec { challenge_token, code }
    """
    permission_classes = [AllowAny]

    def post(self, request):
        from .totp_manager import verify_totp_code, check_backup_code

        challenge_token = request.data.get('challenge_token')
        code = request.data.get('code', '').strip()
        remember_me = request.data.get('remember_me', False)

        if not challenge_token or not code:
            return Response(
                {'detail': 'challenge_token et code sont requis.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            challenge = TOTPChallenge.objects.select_related('user').get(token=challenge_token)
        except TOTPChallenge.DoesNotExist:
            return Response(
                {'detail': 'Challenge TOTP invalide.'},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        if challenge.is_expired:
            challenge.delete()
            return Response(
                {'detail': 'Challenge TOTP expire. Veuillez vous reconnecter.'},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        user = challenge.user

        # Try TOTP code first, then backup code
        is_valid = False
        if user.totp_secret:
            is_valid = verify_totp_code(user.totp_secret, code)
        if not is_valid:
            is_valid = check_backup_code(user, code)

        if not is_valid:
            _create_login_history(user, user.email, request, 'FAILED', failure_reason='INVALID_TOTP')
            return Response(
                {'detail': 'Code TOTP invalide.'},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        # Valid — delete challenge, create session, set cookies
        challenge.delete()
        session_key = uuid.uuid4()
        session = create_session(user, request, session_key=session_key)
        refresh = _generate_tokens_with_session(user, session_key)

        response = Response({
            'user': UserDetailSerializer(user, context={'request': request}).data,
        }, status=status.HTTP_200_OK)
        _set_auth_cookies(response, str(refresh.access_token), str(refresh), remember_me=remember_me)
        _create_login_history(user, user.email, request, 'SUCCESS')
        return response


class CookieTokenRefreshView(APIView):
    """
    Rafraichissement JWT : lit le refresh token depuis le cookie HttpOnly uniquement.
    Definit le nouveau access token en cookie.
    """
    permission_classes = [AllowAny]

    def post(self, request):
        refresh_name = getattr(settings, 'JWT_REFRESH_COOKIE_NAME', 'refresh_token')
        refresh_value = request.COOKIES.get(refresh_name)
        if not refresh_value:
            return Response(
                {'detail': 'Token de rafraichissement manquant.'},
                status=status.HTTP_401_UNAUTHORIZED
            )
        try:
            refresh = RefreshToken(refresh_value)
            access = str(refresh.access_token)
            new_refresh = None
            if getattr(settings.SIMPLE_JWT, 'ROTATE_REFRESH_TOKENS', False):
                new_refresh = RefreshToken.for_user(refresh.user)
                new_refresh = str(new_refresh)
            response = Response({'refreshed': True})
            _set_auth_cookies(response, access, new_refresh)
            return response
        except InvalidToken:
            # NE PAS clear les cookies ici — ils expireront naturellement.
            # Sinon, un refresh concurrent écrase les cookies posés par OAuth exchange.
            return Response(
                {'detail': 'Token invalide ou expire.'},
                status=status.HTTP_401_UNAUTHORIZED
            )


class LogoutView(APIView):
    """
    Deconnexion : supprime les cookies JWT et revoque la session active.
    POST /api/users/logout/
    """
    permission_classes = [AllowAny]

    def post(self, request):
        from .models import ActiveSession
        # Try to revoke the current session if user is authenticated
        if hasattr(request, 'auth') and request.auth:
            session_key = request.auth.get('session_key')
            if session_key:
                ActiveSession.objects.filter(session_key=session_key).delete()
        response = Response({'message': 'Deconnexion reussie.'}, status=status.HTTP_200_OK)
        _clear_auth_cookies(response)
        return response
