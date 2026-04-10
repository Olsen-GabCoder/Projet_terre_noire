"""
URLs pour l'application users (utilisateurs).
"""
from django.urls import path
from . import views
from .jwt_cookie_views import LogoutView, TOTPVerifyLoginView
from .oauth_views import (
    GoogleOAuthStartView, GoogleOAuthCallbackView,
    FacebookOAuthStartView, FacebookOAuthCallbackView,
    OAuthProvidersView, OAuthFinalizeView,
)

app_name = 'users'

urlpatterns = [
    # Inscription
    path('register/', views.UserRegistrationView.as_view(), name='register'),

    # Profil utilisateur (route corrigee pour correspondre au frontend)
    path('me/', views.UserProfileView.as_view(), name='profile_me'),
    path('me/profiles/', views.UserProfileListCreateView.as_view(), name='user_profiles'),
    path('me/profiles/<int:pk>/', views.UserProfileDetailView.as_view(), name='user_profile_detail'),
    path('me/change-password/', views.ChangePasswordView.as_view(), name='change_password'),
    path('me/login-history/', views.LoginHistoryView.as_view(), name='login_history'),
    path('forgot-password/', views.ForgotPasswordView.as_view(), name='forgot_password'),
    path('reset-password/', views.ResetPasswordView.as_view(), name='reset_password'),
    path('verify-email/', views.VerifyEmailView.as_view(), name='verify_email'),
    path('resend-verification/', views.ResendVerificationView.as_view(), name='resend_verification'),
    path('check-auth/', views.CheckAuthView.as_view(), name='check_auth'),
    path('logout/', LogoutView.as_view(), name='logout'),

    # TOTP 2FA
    path('totp/setup/', views.TOTPSetupView.as_view(), name='totp_setup'),
    path('totp/verify-setup/', views.TOTPVerifySetupView.as_view(), name='totp_verify_setup'),
    path('totp/verify/', TOTPVerifyLoginView.as_view(), name='totp_verify_login'),
    path('totp/disable/', views.TOTPDisableView.as_view(), name='totp_disable'),
    path('totp/backup-codes/', views.TOTPBackupCodesView.as_view(), name='totp_backup_codes'),
    path('totp/regenerate-codes/', views.TOTPRegenerateCodesView.as_view(), name='totp_regenerate_codes'),

    # OAuth (Google & Facebook)
    path('oauth/providers/', OAuthProvidersView.as_view(), name='oauth_providers'),
    path('oauth/google/', GoogleOAuthStartView.as_view(), name='oauth_google'),
    path('oauth/google/callback/', GoogleOAuthCallbackView.as_view(), name='oauth_google_callback'),
    path('oauth/facebook/', FacebookOAuthStartView.as_view(), name='oauth_facebook'),
    path('oauth/facebook/callback/', FacebookOAuthCallbackView.as_view(), name='oauth_facebook_callback'),
    path('oauth/finalize/', OAuthFinalizeView.as_view(), name='oauth_finalize'),

    # Sessions
    path('sessions/', views.ActiveSessionListView.as_view(), name='sessions_list'),
    path('sessions/revoke-all/', views.RevokeAllSessionsView.as_view(), name='sessions_revoke_all'),
    path('sessions/<uuid:session_key>/', views.RevokeSessionView.as_view(), name='session_revoke'),

    # Dashboard counts
    path('dashboard-counts/', views.DashboardCountsView.as_view(), name='dashboard_counts'),

    # Administration (protege par IsAdminUser)
    path('', views.UserListView.as_view(), name='user_list'),
    path('<int:id>/', views.UserDetailAdminView.as_view(), name='user_detail'),
]
