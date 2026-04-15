from decimal import Decimal

from rest_framework import serializers

from .models import Coupon, CouponTemplate
from .services import get_emitter_name


# ── Mixin émetteur ──

class EmitterNameMixin:
    def get_emitter_name(self, obj):
        return get_emitter_name(obj)


# ── Mixin template visuel (pour propager icon/color/category des coupons) ──

class TemplateVisualMixin:
    def get_template_icon(self, obj):
        return obj.template.icon if obj.template_id else 'fas fa-ticket-alt'

    def get_template_accent_color(self, obj):
        return obj.template.accent_color if obj.template_id else '#5b5eea'

    def get_template_category(self, obj):
        return obj.template.category if obj.template_id else None

    def get_template_commercial_title(self, obj):
        return obj.template.commercial_title if obj.template_id else None

    def get_template_subtitle(self, obj):
        return obj.template.subtitle if obj.template_id else None


# ── Template CRUD (personnel) ──

class CouponTemplateSerializer(EmitterNameMixin, serializers.ModelSerializer):
    emitter_name = serializers.SerializerMethodField()
    cloned_from_name = serializers.SerializerMethodField()

    class Meta:
        model = CouponTemplate
        fields = [
            'id', 'name', 'commercial_title', 'subtitle', 'marketing_description',
            'category', 'tags', 'icon', 'accent_color',
            'discount_type', 'discount_value', 'min_order_amount', 'max_discount_amount',
            'first_order_only', 'min_customer_age_days',
            'default_expiry_days', 'valid_from', 'valid_until',
            'total_quota', 'quota_used', 'per_customer_limit',
            'is_published', 'cloned_from', 'cloned_from_name',
            'is_active', 'emitter_name', 'created_at', 'updated_at',
        ]
        read_only_fields = [
            'id', 'emitter_name', 'quota_used', 'cloned_from', 'cloned_from_name',
            'created_at', 'updated_at',
            # Champs système verrouillés pour les non-admin
            'is_system', 'system_slug', 'clone_count', 'target_emitter_type', 'display_order',
        ]

    def get_cloned_from_name(self, obj):
        if obj.cloned_from_id:
            return obj.cloned_from.commercial_title or obj.cloned_from.name
        return None

    def validate_icon(self, value):
        if value and value not in CouponTemplate.ICON_PALETTE:
            raise serializers.ValidationError(f"Icône invalide. Choix autorisés : {', '.join(CouponTemplate.ICON_PALETTE)}")
        return value

    def validate_accent_color(self, value):
        if value and value not in CouponTemplate.COLOR_PALETTE:
            raise serializers.ValidationError(f"Couleur invalide. Choix autorisés : {', '.join(CouponTemplate.COLOR_PALETTE)}")
        return value

    def validate(self, attrs):
        discount_type = attrs.get('discount_type', getattr(self.instance, 'discount_type', None))
        discount_value = attrs.get('discount_value', getattr(self.instance, 'discount_value', Decimal('0')))
        if discount_type == 'PERCENT' and (discount_value < 0 or discount_value > 100):
            raise serializers.ValidationError({'discount_value': "Le pourcentage doit être entre 0 et 100."})
        if discount_type == 'FREE_SHIPPING' and discount_value != 0:
            attrs['discount_value'] = Decimal('0')
        valid_from = attrs.get('valid_from', getattr(self.instance, 'valid_from', None))
        valid_until = attrs.get('valid_until', getattr(self.instance, 'valid_until', None))
        if valid_from and valid_until and valid_from >= valid_until:
            raise serializers.ValidationError({'valid_until': "La date de fin doit être postérieure à la date de début."})
        return attrs


# ── Bibliothèque système (lecture seule) ──

class SystemTemplateSerializer(serializers.ModelSerializer):
    class Meta:
        model = CouponTemplate
        fields = [
            'id', 'system_slug', 'commercial_title', 'subtitle', 'marketing_description',
            'category', 'icon', 'accent_color', 'tags',
            'discount_type', 'discount_value', 'min_order_amount', 'max_discount_amount',
            'first_order_only', 'min_customer_age_days',
            'default_expiry_days', 'valid_from', 'valid_until',
            'total_quota', 'per_customer_limit',
            'clone_count', 'target_emitter_type', 'display_order',
        ]
        read_only_fields = fields


# ── Clone ──

class CloneTemplateSerializer(serializers.Serializer):
    system_template_id = serializers.IntegerField()

    def validate_system_template_id(self, value):
        try:
            tpl = CouponTemplate.objects.get(id=value)
        except CouponTemplate.DoesNotExist:
            raise serializers.ValidationError("Template introuvable.")
        if not tpl.is_system:
            raise serializers.ValidationError("Seuls les templates système peuvent être clonés via cet endpoint.")
        if not tpl.is_published:
            raise serializers.ValidationError("Ce template système n'est plus disponible.")
        return value


# ── Envoi de coupons ──

class CouponSendSerializer(serializers.Serializer):
    template_id = serializers.PrimaryKeyRelatedField(queryset=CouponTemplate.objects.all())
    recipient_emails = serializers.ListField(
        child=serializers.EmailField(), min_length=1, max_length=20,
    )
    custom_message = serializers.CharField(required=False, allow_blank=True, default='')
    custom_expiry_days = serializers.IntegerField(required=False, min_value=1, max_value=365, allow_null=True, default=None)

    def validate_template_id(self, template):
        ctx = self.context.get('emitter_context')
        if ctx:
            if ctx['type'] == 'organization':
                if template.organization_id != (ctx['organization'].id if ctx['organization'] else None):
                    raise serializers.ValidationError("Ce template n'appartient pas à votre organisation.")
            elif ctx['type'] == 'provider_profile':
                if template.provider_profile_id != (ctx['provider_profile'].id if ctx['provider_profile'] else None):
                    raise serializers.ValidationError("Ce template n'appartient pas à votre profil prestataire.")
        if not template.is_active:
            raise serializers.ValidationError("Ce template est désactivé.")
        if not template.is_published:
            raise serializers.ValidationError("Ce template est désactivé.")
        if not template.has_quota_remaining:
            raise serializers.ValidationError("Le quota de ce template est épuisé.")
        return template

    def validate_recipient_emails(self, emails):
        return list({e.lower() for e in emails})


# ── Validation coupon (enrichi) ──

class CouponValidateSerializer(serializers.Serializer):
    """Validation d'un code promo, avec scope org ou service."""
    code = serializers.CharField(max_length=50, trim_whitespace=True)
    cart_items = serializers.ListField(child=serializers.DictField(), required=False, default=list)
    service_quote_id = serializers.IntegerField(required=False, allow_null=True, default=None)

    def validate_code(self, value):
        return value.upper().strip()

    def validate_cart_items(self, items):
        for item in items:
            if 'book_id' not in item:
                raise serializers.ValidationError("Chaque item doit avoir un book_id.")
            if 'quantity' not in item:
                raise serializers.ValidationError("Chaque item doit avoir une quantity.")
            try:
                item['book_id'] = int(item['book_id'])
                item['quantity'] = int(item['quantity'])
            except (ValueError, TypeError):
                raise serializers.ValidationError("book_id et quantity doivent être des entiers.")
        return items

    def validate(self, attrs):
        if attrs.get('cart_items') and attrs.get('service_quote_id'):
            raise serializers.ValidationError("cart_items et service_quote_id sont mutuellement exclusifs.")
        return attrs


# ── Serializers lecture (enrichis avec template visuals) ──

class CouponIssuedSerializer(EmitterNameMixin, TemplateVisualMixin, serializers.ModelSerializer):
    template_name = serializers.CharField(source='template.name', default=None, read_only=True)
    used_by_name = serializers.SerializerMethodField()
    emitter_name = serializers.SerializerMethodField()
    template_icon = serializers.SerializerMethodField()
    template_accent_color = serializers.SerializerMethodField()
    template_category = serializers.SerializerMethodField()
    template_commercial_title = serializers.SerializerMethodField()
    template_subtitle = serializers.SerializerMethodField()

    class Meta:
        model = Coupon
        fields = [
            'id', 'code', 'discount_type', 'discount_value', 'min_order_amount',
            'status', 'recipient_email', 'used_by_name', 'used_at',
            'template_name', 'template_icon', 'template_accent_color',
            'template_category', 'template_commercial_title', 'template_subtitle',
            'emitter_name',
            'valid_from', 'valid_until', 'created_at', 'custom_message',
        ]

    def get_used_by_name(self, obj):
        if obj.used_by:
            return obj.used_by.get_full_name() or obj.used_by.username
        return None


class CouponReceivedSerializer(EmitterNameMixin, TemplateVisualMixin, serializers.ModelSerializer):
    emitter_name = serializers.SerializerMethodField()
    template_icon = serializers.SerializerMethodField()
    template_accent_color = serializers.SerializerMethodField()
    template_category = serializers.SerializerMethodField()
    template_commercial_title = serializers.SerializerMethodField()
    template_subtitle = serializers.SerializerMethodField()

    class Meta:
        model = Coupon
        fields = [
            'id', 'code', 'discount_type', 'discount_value', 'min_order_amount',
            'emitter_name', 'status', 'valid_until', 'custom_message', 'created_at',
            'template_icon', 'template_accent_color', 'template_category',
            'template_commercial_title', 'template_subtitle',
        ]


class CouponApplicableSerializer(EmitterNameMixin, TemplateVisualMixin, serializers.ModelSerializer):
    emitter_name = serializers.SerializerMethodField()
    organization_id = serializers.IntegerField(source='organization.id', default=None, read_only=True)
    provider_profile_id = serializers.IntegerField(source='provider_profile.id', default=None, read_only=True)
    template_icon = serializers.SerializerMethodField()
    template_accent_color = serializers.SerializerMethodField()
    template_category = serializers.SerializerMethodField()
    template_commercial_title = serializers.SerializerMethodField()
    template_subtitle = serializers.SerializerMethodField()

    class Meta:
        model = Coupon
        fields = [
            'id', 'code', 'discount_type', 'discount_value', 'min_order_amount',
            'emitter_name', 'organization_id', 'provider_profile_id', 'valid_until',
            'custom_message',
            'template_icon', 'template_accent_color',
            'template_category', 'template_commercial_title', 'template_subtitle',
        ]


# ── Admin ──

class CouponAdminSerializer(EmitterNameMixin, serializers.ModelSerializer):
    emitter_name = serializers.SerializerMethodField()
    created_by_name = serializers.SerializerMethodField()
    used_by_name = serializers.SerializerMethodField()

    class Meta:
        model = Coupon
        fields = [
            'id', 'code', 'discount_type', 'discount_value', 'min_order_amount',
            'emitter_name', 'status', 'recipient_email',
            'created_by_name', 'used_by_name', 'used_at', 'used_on_order',
            'valid_from', 'valid_until', 'created_at',
        ]

    def get_created_by_name(self, obj):
        if obj.created_by:
            return obj.created_by.get_full_name() or obj.created_by.username
        return None

    def get_used_by_name(self, obj):
        if obj.used_by:
            return obj.used_by.get_full_name() or obj.used_by.username
        return None
