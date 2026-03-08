from django.urls import path
from .views import DeliveryConfigView

app_name = 'core'

urlpatterns = [
    path('delivery/', DeliveryConfigView.as_view(), name='delivery_config'),
]
