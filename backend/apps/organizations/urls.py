from django.urls import path, include
from rest_framework.routers import DefaultRouter

from . import views
from apps.manuscripts import views as manuscript_views
from apps.services.views import PublicQuoteTemplateListView

app_name = 'organizations'

router = DefaultRouter()
router.register(r'', views.OrganizationViewSet, basename='organization')

urlpatterns = [
    # Invitations de l'utilisateur connecté
    path('invitations/mine/', views.MyInvitationsView.as_view(), name='my-invitations'),
    path('invitations/respond/', views.InvitationResponseView.as_view(), name='invitation-respond'),

    # Frollot Connect — Annuaire & Vitrines Organisations
    path('directory/', views.OrganizationDirectoryView.as_view(), name='org-directory'),
    path('<slug:slug>/storefront/', views.OrganizationStorefrontView.as_view(), name='org-storefront'),
    path('<slug:slug>/catalog/', views.OrganizationCatalogView.as_view(), name='org-catalog'),
    path('<slug:slug>/team/', views.OrganizationTeamView.as_view(), name='org-team'),
    path('<slug:slug>/reviews/', views.OrganizationReviewListCreateView.as_view(), name='org-reviews'),

    # Membres et invitations d'une organisation spécifique
    path('<int:org_id>/members/', views.OrganizationMemberListView.as_view(), name='org-members'),
    path('<int:org_id>/members/add/', views.OrganizationMemberAddView.as_view(), name='org-member-add'),
    path('<int:org_id>/members/<int:pk>/', views.OrganizationMemberDetailView.as_view(), name='org-member-detail'),
    path('<int:org_id>/invitations/', views.InvitationCreateView.as_view(), name='org-invite'),
    path('<int:org_id>/books/', views.OrganizationBookCreateView.as_view(), name='org-books'),
    path('<int:org_id>/books/<int:book_id>/', views.OrganizationBookDetailView.as_view(), name='org-book-detail'),
    path('<int:org_id>/dashboard/', views.OrganizationDashboardView.as_view(), name='org-dashboard'),

    # Inbox manuscrits pour l'organisation
    path('<int:org_id>/manuscripts/', manuscript_views.OrganizationManuscriptInboxView.as_view(), name='org-manuscripts'),
    path('<int:org_id>/manuscripts/<int:pk>/', manuscript_views.OrganizationManuscriptDetailView.as_view(), name='org-manuscript-detail'),

    # Vitrine publique des modèles de devis éditoriaux
    path('<int:org_id>/quote-templates/public/', PublicQuoteTemplateListView.as_view(), name='org-public-quote-templates'),

    # CRUD organisations (router)
    path('', include(router.urls)),
]
