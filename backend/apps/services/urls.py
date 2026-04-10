from django.urls import path
from . import views
from .views import (
    QuoteTemplateListView, QuoteTemplateDetailView,
    QuoteListView, QuoteDetailView, QuoteCreateView,
    QuoteSendView, QuoteRespondView,
)
from apps.organizations.views import ServiceRecommendationsView

app_name = 'services'

urlpatterns = [
    # Service Listings
    path('listings/', views.ServiceListingListView.as_view(), name='listing-list'),
    path('listings/create/', views.ServiceListingCreateView.as_view(), name='listing-create'),
    path('listings/mine/', views.MyServiceListingsView.as_view(), name='my-listings'),
    path('listings/<int:pk>/manage/', views.ServiceListingDetailView.as_view(), name='listing-detail'),
    path('listings/<str:identifier>/', views.ServiceListingPublicDetailView.as_view(), name='listing-public-detail'),

    # Service Requests
    path('requests/', views.ServiceRequestListView.as_view(), name='request-list'),
    path('requests/create/', views.ServiceRequestCreateView.as_view(), name='request-create'),
    path('requests/<int:pk>/', views.ServiceRequestDetailView.as_view(), name='request-detail'),

    # Service Quotes (ancien système — devis simples pour demandes de service)
    path('service-quotes/create/', views.ServiceQuoteCreateView.as_view(), name='service-quote-create'),
    path('service-quotes/<int:pk>/respond/', views.ServiceQuoteRespondView.as_view(), name='service-quote-respond'),
    path('service-quotes/<int:pk>/pdf/', views.ServiceQuotePDFView.as_view(), name='service-quote-pdf'),

    # Service Orders
    path('orders/', views.ServiceOrderListView.as_view(), name='order-list'),
    path('orders/<int:pk>/', views.ServiceOrderDetailView.as_view(), name='order-detail'),
    path('orders/<int:pk>/status/', views.ServiceOrderStatusUpdateView.as_view(), name='order-status'),
    path('orders/<int:pk>/deliver/', views.ServiceOrderDeliverView.as_view(), name='order-deliver'),

    # Editorial Projects
    path('projects/', views.EditorialProjectListView.as_view(), name='project-list'),
    path('projects/create/', views.EditorialProjectCreateView.as_view(), name='project-create'),
    path('projects/<int:pk>/', views.EditorialProjectDetailView.as_view(), name='project-detail'),
    path('projects/from-manuscript/<int:manuscript_id>/', views.CreateProjectFromManuscriptView.as_view(), name='project-from-manuscript'),
    path('projects/<int:pk>/publish/', views.PublishProjectAsBookView.as_view(), name='project-publish'),

    # Project Tasks
    path('tasks/create/', views.ProjectTaskCreateView.as_view(), name='task-create'),
    path('tasks/<int:pk>/status/', views.ProjectTaskStatusUpdateView.as_view(), name='task-status'),

    # Print
    path('printers/', views.PrinterListView.as_view(), name='printer-list'),
    path('print-requests/', views.PrintRequestListView.as_view(), name='print-request-list'),
    path('print-requests/create/', views.PrintRequestCreateView.as_view(), name='print-request-create'),
    path('print-requests/<int:pk>/', views.PrintRequestDetailView.as_view(), name='print-request-detail'),
    path('print-requests/<int:pk>/status/', views.PrintRequestStatusUpdateView.as_view(), name='print-request-status'),

    # Wallet
    path('wallet/', views.ProfessionalWalletView.as_view(), name='wallet'),
    path('wallet/transactions/', views.ProfessionalWalletTransactionListView.as_view(), name='wallet-transactions'),

    # Avis prestataires
    path('reviews/', views.ServiceProviderReviewListView.as_view(), name='provider-reviews'),
    path('reviews/create/', views.ServiceProviderReviewCreateView.as_view(), name='provider-review-create'),

    # Factures PDF
    path('orders/<int:pk>/invoice/', views.ServiceOrderInvoiceView.as_view(), name='service-order-invoice'),
    path('print-requests/<int:pk>/quote-pdf/', views.PrintRequestQuotePDFView.as_view(), name='print-request-quote-pdf'),

    # Frollot Connect — Recommandations de prestataires
    path('recommendations/', ServiceRecommendationsView.as_view(), name='service-recommendations'),

    # DQE — Templates
    path('quotes/templates/', QuoteTemplateListView.as_view(), name='dqe-template-list'),
    path('quotes/templates/<int:pk>/', QuoteTemplateDetailView.as_view(), name='dqe-template-detail'),

    # DQE — Devis
    path('quotes/', QuoteListView.as_view(), name='dqe-list'),
    path('quotes/create/', QuoteCreateView.as_view(), name='dqe-create'),
    path('quotes/<int:pk>/', QuoteDetailView.as_view(), name='dqe-detail'),
    path('quotes/<int:pk>/send/', QuoteSendView.as_view(), name='dqe-send'),
    path('quotes/<int:pk>/respond/', QuoteRespondView.as_view(), name='dqe-respond'),
]
