from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import OrderViewSet, PaymentViewSet, PaymentInitiateView, PaymentCheckStatusView, PaymentWebhookView

router = DefaultRouter()
router.register(r'orders', OrderViewSet, basename='order')
router.register(r'payments', PaymentViewSet, basename='payment')

urlpatterns = [
    path('', include(router.urls)),
    path('payments/initiate/', PaymentInitiateView.as_view(), name='payment-initiate'),
    path('payments/check-status/<str:bamboo_ref>/', PaymentCheckStatusView.as_view(), name='payment-check-status'),
    path('payments/webhook/', PaymentWebhookView.as_view(), name='payment-webhook'),
]