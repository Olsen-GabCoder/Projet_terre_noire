from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from django.conf import settings
from django.core.cache import cache

from .models import SiteConfig, DeliveryZone


class DeliveryConfigView(APIView):
    """
    Configuration livraison (public, pour le panier).
    GET /api/config/delivery/?city=Libreville
    Si city est fourni, retourne les frais de la zone correspondante.
    Sinon, retourne la config globale par défaut.
    """
    permission_classes = [AllowAny]

    def get(self, request):
        city = request.query_params.get('city', '').strip()

        if city:
            zone = DeliveryZone.get_zone_for_city(city)
            if zone:
                return Response({
                    'zone': zone.name,
                    'shipping_cost': float(zone.shipping_cost),
                    'shipping_free_threshold': float(zone.shipping_free_threshold),
                    'estimated_days_min': zone.estimated_days_min,
                    'estimated_days_max': zone.estimated_days_max,
                })

        # Fallback : config globale
        cache_key = 'delivery_config'
        data = cache.get(cache_key)
        if data is None:
            config = SiteConfig.get_config()
            data = {
                'zone': 'default',
                'shipping_cost': float(config.shipping_cost),
                'shipping_free_threshold': float(config.shipping_free_threshold),
                'estimated_days_min': 1,
                'estimated_days_max': 5,
            }
            cache.set(cache_key, data, getattr(settings, 'CACHE_DELIVERY_TTL', 600))
        return Response(data)


class DeliveryZoneListView(APIView):
    """
    Liste des zones de livraison actives (public).
    GET /api/config/delivery/zones/
    """
    permission_classes = [AllowAny]

    def get(self, request):
        zones = DeliveryZone.objects.filter(is_active=True)
        return Response([
            {
                'name': z.name,
                'cities': z.cities,
                'shipping_cost': float(z.shipping_cost),
                'shipping_free_threshold': float(z.shipping_free_threshold),
                'estimated_days_min': z.estimated_days_min,
                'estimated_days_max': z.estimated_days_max,
            }
            for z in zones
        ])
