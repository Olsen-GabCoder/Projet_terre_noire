"""
Configuration principale des URLs du projet.
"""
import config.admin  # noqa: F401 — personnalisation admin Frollot
from django.contrib import admin
from django.urls import path, include, re_path
from django.views.generic import RedirectView
from django.conf import settings
from django.conf.urls.static import static
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView, SpectacularRedocView

from apps.users.jwt_cookie_views import CookieTokenObtainPairView, CookieTokenRefreshView, LogoutView
from .views import api_root, health_check, admin_backup, admin_dashboard_stats, csrf_token_view

urlpatterns = [
    # Racine : redirection vers la doc API (évite 404 sur GET /)
    path('', RedirectView.as_view(url='/api/docs/', permanent=False)),
    # Accueil admin → Groupes par défaut
    path('admin/', RedirectView.as_view(url='/admin/auth/group/', permanent=False)),
    # Backup admin
    path('admin/backup/', admin_backup, name='admin-backup'),
    # Admin Django
    path('admin/', admin.site.urls),
    
    # Documentation API (OpenAPI / Swagger / ReDoc)
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    path('api/redoc/', SpectacularRedocView.as_view(url_name='schema'), name='redoc'),
    
    # API Racine et santé (routes spécifiques AVANT les routes générales)
    path('api/root/', api_root, name='api-root'),
    path('api/health/', health_check, name='health-check'),
    path('api/', api_root),  # GET /api/ sans auth (découverte des endpoints)
    
    # API Admin Dashboard
    path('api/admin/dashboard/', admin_dashboard_stats, name='admin-dashboard-stats'),

    # CSRF token (defense-in-depth)
    path('api/csrf/', csrf_token_view, name='csrf-token'),

    # API Authentication JWT (cookies HttpOnly)
    path('api/token/', CookieTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', CookieTokenRefreshView.as_view(), name='token_refresh'),
    
    # API Users (routes spécifiques)
    path('api/users/', include('apps.users.urls')),
    
    # API Orders (routes spécifiques)
    path('api/', include('apps.orders.urls')),

    # API Manuscripts (routes spécifiques)
    path('api/manuscripts/', include('apps.manuscripts.urls')),
    
    # API Newsletter et Contact
    path('api/newsletter/', include('apps.newsletter.urls')),
    path('api/contact/', include('apps.contact.urls')),
    path('api/wishlist/', include('apps.wishlist.urls')),
    path('api/coupons/', include('apps.coupons.urls')),
    path('api/config/', include('apps.core.urls')),

    # API Organizations
    path('api/organizations/', include('apps.organizations.urls')),

    # Frollot Connect — Annuaire Professionnels
    path('api/professionals/', include('apps.organizations.urls_professionals')),

    # Frollot Connect — Demandes de renseignement
    path('api/inquiries/', include('apps.organizations.urls_inquiries')),

    # API Marketplace
    path('api/marketplace/', include('apps.marketplace.urls')),

    # API Social
    path('api/social/', include('apps.social.urls')),

    # API Services
    path('api/services/', include('apps.services.urls')),

    # API Library (Bibliothèques)
    path('api/library/', include('apps.library.urls')),

    # API Books (routes avec regex - doit être EN DERNIER)
    # IMPORTANT: Pas de slash final avant include !
    re_path(r'^api/', include('apps.books.urls')),
]

# Servir les fichiers média en développement
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)