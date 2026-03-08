from django.urls import path
from .views import CouponValidateView

app_name = 'coupons'

urlpatterns = [
    path('validate/', CouponValidateView.as_view(), name='validate'),
]
