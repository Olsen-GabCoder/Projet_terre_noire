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
            raise serializers.ValidationError("Ce code promo a expire.")

        if coupon.max_uses is not None and coupon.usage_count >= coupon.max_uses:
            raise serializers.ValidationError("Ce code promo a atteint sa limite d'utilisation.")

        return code


class CouponSerializer(serializers.ModelSerializer):
    """Serializer complet pour CRUD admin."""
    discount_percent = serializers.SerializerMethodField()
    discount_amount = serializers.SerializerMethodField()

    class Meta:
        model = Coupon
        fields = [
            'id', 'code', 'discount_type', 'discount_value',
            'discount_percent', 'discount_amount',
            'min_order_amount', 'recipient_email', 'custom_message',
            'valid_from', 'valid_until',
            'is_active', 'max_uses', 'usage_count',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'usage_count', 'created_at', 'updated_at', 'discount_percent', 'discount_amount']

    def get_discount_percent(self, obj):
        return float(obj.discount_value) if obj.discount_type == 'percent' else None

    def get_discount_amount(self, obj):
        return float(obj.discount_value) if obj.discount_type == 'fixed' else None

    def validate_code(self, value):
        return value.upper().strip()
