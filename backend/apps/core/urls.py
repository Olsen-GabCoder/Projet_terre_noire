from django.urls import path
from .views import DeliveryConfigView, GlobalSearchView

app_name = 'core'

urlpatterns = [
    path('delivery/', DeliveryConfigView.as_view(), name='delivery_config'),
    path('search/', GlobalSearchView.as_view(), name='global_search'),
]
