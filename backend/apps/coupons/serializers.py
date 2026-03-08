from rest_framework import serializers
from .models import Coupon


class CouponValidateSerializer(serializers.Serializer):
    """Validation d'un code promo."""
    code = serializers.CharField(max_length=50, trim_whitespace=True)

    def validate_code(self, value):
        from django.utils import timezone
        code = value.upper().strip()
        try:
            coupon = Coupon.objects.get(code=code)
        except Coupon.DoesNotExist:
            raise serializers.ValidationError("Code promo invalide.")

        if not coupon.is_active:
            raise serializers.ValidationError("Ce code promo n'est plus actif.")

        now = timezone.now()
        if coupon.valid_from and now < coupon.valid_from:
            raise serializers.ValidationError("Ce code promo n'est pas encore valide.")
        if coupon.valid_until and now > coupon.valid_until:
            raise serializers.ValidationError("Ce code promo a expiré.")

        if coupon.max_uses is not None and coupon.usage_count >= coupon.max_uses:
            raise serializers.ValidationError("Ce code promo a atteint sa limite d'utilisation.")

        return code
