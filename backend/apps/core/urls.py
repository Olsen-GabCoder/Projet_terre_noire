from django.urls import path
from .views import DeliveryConfigView, DeliveryZoneListView

app_name = 'core'

urlpatterns = [
    path('delivery/', DeliveryConfigView.as_view(), name='delivery_config'),
    path('delivery/zones/', DeliveryZoneListView.as_view(), name='delivery_zones'),
]
