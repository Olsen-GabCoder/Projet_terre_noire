from django.urls import path
from . import views

app_name = 'marketplace'

urlpatterns = [
    # Listings (offres vendeurs)
    path('listings/', views.BookListingListView.as_view(), name='listing-list'),
    path('listings/create/', views.BookListingCreateView.as_view(), name='listing-create'),
    path('listings/mine/', views.MyListingsView.as_view(), name='my-listings'),
    path('listings/<int:pk>/', views.BookListingDetailView.as_view(), name='listing-detail'),
    path('vendors/<slug:slug>/listings/', views.VendorListingsView.as_view(), name='vendor-listings'),

    # Sous-commandes vendeur
    path('vendor/orders/', views.VendorSubOrderListView.as_view(), name='vendor-orders'),
    path('sub-orders/<int:pk>/status/', views.SubOrderStatusUpdateView.as_view(), name='sub-order-status'),
    path('sub-orders/<int:pk>/assign-delivery/', views.AssignDeliveryView.as_view(), name='assign-delivery'),

    # Livraison
    path('delivery/agents/', views.DeliveryAgentListView.as_view(), name='delivery-agents'),
    path('delivery/my-assignments/', views.MyDeliveryAssignmentsView.as_view(), name='my-deliveries'),
    path('delivery/sub-orders/<int:pk>/status/', views.DeliveryStatusUpdateView.as_view(), name='delivery-status'),
    path('delivery/wallet/', views.DeliveryWalletView.as_view(), name='delivery-wallet'),
    path('delivery/wallet/transactions/', views.DeliveryWalletTransactionListView.as_view(), name='delivery-wallet-transactions'),
    path('delivery/rates/', views.MyDeliveryRatesView.as_view(), name='my-delivery-rates'),
    path('delivery/rates/<int:pk>/', views.DeliveryRateDetailView.as_view(), name='delivery-rate-detail'),
    path('delivery/search/', views.SearchDeliveryRatesView.as_view(), name='search-delivery-rates'),
    path('delivery/reference/', views.DeliveryReferenceDataView.as_view(), name='delivery-reference'),

    # Wallet vendeur
    path('vendor/wallet/', views.VendorWalletView.as_view(), name='vendor-wallet'),
    path('vendor/wallet/transactions/', views.WalletTransactionListView.as_view(), name='wallet-transactions'),

    # Retrait wallet (unifie)
    path('wallet/withdraw/', views.WithdrawView.as_view(), name='wallet-withdraw'),
    path('wallet/withdrawals/', views.WithdrawalListView.as_view(), name='wallet-withdrawals'),
]
