from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import OrderViewSet, PaymentViewSet, PaymentInitiateView, PaymentWebhookView, EbookAccessCheckView

router = DefaultRouter()
router.register(r'orders', OrderViewSet, basename='order')
router.register(r'payments', PaymentViewSet, basename='payment')

urlpatterns = [
    # Explicit payment routes BEFORE router to avoid pk="initiate" conflict
    path('payments/initiate/', PaymentInitiateView.as_view(), name='payment-initiate'),
    path('payments/webhook/<str:provider_name>/', PaymentWebhookView.as_view(), name='payment-webhook'),
    path('orders/access-check/<int:book_id>/', EbookAccessCheckView.as_view(), name='ebook-access-check'),
    path('', include(router.urls)),
]
