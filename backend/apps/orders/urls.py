from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    OrderViewSet, PaymentViewSet, PaymentInitiateView, PaymentWebhookView,
    EbookAccessCheckView, RefundCreateView, RefundListView,
    RefundAdminListView, RefundAdminActionView,
)

router = DefaultRouter()
router.register(r'orders', OrderViewSet, basename='order')
router.register(r'payments', PaymentViewSet, basename='payment')

urlpatterns = [
    # Explicit payment routes BEFORE router to avoid pk="initiate" conflict
    path('payments/initiate/', PaymentInitiateView.as_view(), name='payment-initiate'),
    path('payments/webhook/<str:provider_name>/', PaymentWebhookView.as_view(), name='payment-webhook'),
    path('orders/access-check/<int:book_id>/', EbookAccessCheckView.as_view(), name='ebook-access-check'),
    # Refunds
    path('orders/refunds/', RefundListView.as_view(), name='refund-list'),
    path('orders/refunds/create/', RefundCreateView.as_view(), name='refund-create'),
    path('orders/refunds/admin/', RefundAdminListView.as_view(), name='refund-admin-list'),
    path('orders/refunds/admin/<int:pk>/', RefundAdminActionView.as_view(), name='refund-admin-action'),
    path('', include(router.urls)),
]
