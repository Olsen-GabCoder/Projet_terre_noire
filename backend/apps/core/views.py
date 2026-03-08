from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from django.conf import settings
from django.core.cache import cache

from .models import SiteConfig


class DeliveryConfigView(APIView):
    """
    Configuration livraison (public, pour le panier).
    GET /api/config/delivery/
    """
    permission_classes = [AllowAny]

    def get(self, request):
        cache_key = 'delivery_config'
        data = cache.get(cache_key)
        if data is None:
            config = SiteConfig.get_config()
            data = {
                'shipping_free_threshold': float(config.shipping_free_threshold),
                'shipping_cost': float(config.shipping_cost),
            }
            cache.set(cache_key, data, getattr(settings, 'CACHE_DELIVERY_TTL', 600))
        return Response(data)
