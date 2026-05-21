from django.urls import path
from .views import CouponValidateView, CouponListCreateView, CouponDetailView

app_name = 'coupons'

urlpatterns = [
    path('validate/', CouponValidateView.as_view(), name='validate'),
    path('', CouponListCreateView.as_view(), name='list-create'),
    path('<int:pk>/', CouponDetailView.as_view(), name='detail'),
]
