"""Throttle anti-abus pour l'envoi de coupons."""
from django.conf import settings
from rest_framework.throttling import UserRateThrottle


class CouponSendThrottle(UserRateThrottle):
    """Limite à 5 envois par heure par user."""
    scope = 'coupon_send'

    def allow_request(self, request, view):
        if getattr(settings, 'TESTING', False):
            return True
        return super().allow_request(request, view)
