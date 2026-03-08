"""
URLs pour l'application users (utilisateurs).
"""
from django.urls import path
from . import views
from .jwt_cookie_views import LogoutView

app_name = 'users'

urlpatterns = [
    # Inscription
    path('register/', views.UserRegistrationView.as_view(), name='register'),
    
    # Profil utilisateur (route corrigée pour correspondre au frontend)
    path('me/', views.UserProfileView.as_view(), name='profile_me'),
    path('me/change-password/', views.ChangePasswordView.as_view(), name='change_password'),
    path('forgot-password/', views.ForgotPasswordView.as_view(), name='forgot_password'),
    path('reset-password/', views.ResetPasswordView.as_view(), name='reset_password'),
    path('check-auth/', views.CheckAuthView.as_view(), name='check_auth'),
    path('logout/', LogoutView.as_view(), name='logout'),
    
    # Administration (protégé par IsAdminUser)
    path('', views.UserListView.as_view(), name='user_list'),
    path('<int:id>/', views.UserDetailAdminView.as_view(), name='user_detail'),
]