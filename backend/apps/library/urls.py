from django.urls import path
from . import views

app_name = 'library'

urlpatterns = [
    # ── User-scoped (pas de org_id) ──
    path('my-memberships/', views.MyLibraryMembershipsView.as_view(), name='my-memberships'),
    path('my-loans/', views.MyLoansView.as_view(), name='my-loans'),
    path('my-reservations/', views.MyReservationsView.as_view(), name='my-reservations'),

    # ── Loan actions (pas de org_id) ──
    path('loans/<int:pk>/approve/', views.BookLoanApproveView.as_view(), name='loan-approve'),
    path('loans/<int:pk>/return/', views.BookLoanReturnView.as_view(), name='loan-return'),
    path('loans/<int:pk>/extend/', views.LoanExtensionCreateView.as_view(), name='loan-extend'),

    # ── Reservation cancel ──
    path('reservations/<int:pk>/', views.BookReservationCancelView.as_view(), name='reservation-cancel'),

    # ── Library-scoped (org_id) ──
    # Catalogue
    path('<int:org_id>/catalog/', views.LibraryCatalogListView.as_view(), name='catalog-list'),
    path('<int:org_id>/catalog/create/', views.LibraryCatalogCreateView.as_view(), name='catalog-create'),
    path('<int:org_id>/catalog/<int:pk>/', views.LibraryCatalogDetailView.as_view(), name='catalog-detail'),

    # Membres
    path('<int:org_id>/members/', views.LibraryMemberListView.as_view(), name='member-list'),
    path('<int:org_id>/members/register/', views.LibraryMemberCreateView.as_view(), name='member-register'),
    path('<int:org_id>/members/<int:pk>/', views.LibraryMemberDetailView.as_view(), name='member-detail'),

    # Prêts
    path('<int:org_id>/loans/', views.BookLoanListView.as_view(), name='loan-list'),
    path('<int:org_id>/loans/create/', views.BookLoanCreateView.as_view(), name='loan-create'),

    # Réservations
    path('<int:org_id>/reservations/', views.BookReservationCreateView.as_view(), name='reservation-create'),

    # Dashboard
    path('<int:org_id>/dashboard/', views.LibraryDashboardView.as_view(), name='dashboard'),
]
