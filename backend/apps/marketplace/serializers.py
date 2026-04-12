from rest_framework import serializers

from .models import (
    BookListing, SubOrder, CommissionConfig,
    VendorWallet, WalletTransaction, DeliveryWallet,
)


# ── BookListing ──

class BookListingSerializer(serializers.ModelSerializer):
    vendor_name = serializers.CharField(source='vendor.name', read_only=True)
    vendor_slug = serializers.SlugField(source='vendor.slug', read_only=True)
    vendor_city = serializers.CharField(source='vendor.city', read_only=True)
    vendor_is_verified = serializers.BooleanField(source='vendor.is_verified', read_only=True)
    book_title = serializers.CharField(source='book.title', read_only=True)
    has_discount = serializers.BooleanField(read_only=True)
    discount_percentage = serializers.IntegerField(read_only=True)
    in_stock = serializers.BooleanField(read_only=True)
    condition_display = serializers.CharField(source='get_condition_display', read_only=True)

    class Meta:
        model = BookListing
        fields = [
            'id', 'book', 'vendor', 'vendor_name', 'vendor_slug',
            'vendor_city', 'vendor_is_verified', 'book_title',
            'price', 'original_price', 'stock', 'is_active', 'condition',
            'condition_display', 'has_discount', 'discount_percentage', 'in_stock',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class BookListingCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = BookListing
        fields = ['book', 'price', 'original_price', 'stock', 'condition']

    def validate(self, attrs):
        vendor = self.context.get('vendor')
        if vendor and BookListing.objects.filter(book=attrs['book'], vendor=vendor).exists():
            raise serializers.ValidationError(
                "Vous avez déjà une offre pour ce livre."
            )
        return attrs

    def create(self, validated_data):
        validated_data['vendor'] = self.context['vendor']
        return super().create(validated_data)


class BookListingUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = BookListing
        fields = ['price', 'original_price', 'stock', 'condition', 'is_active']


# ── SubOrder ──

class SubOrderSerializer(serializers.ModelSerializer):
    vendor_name = serializers.CharField(source='vendor.name', read_only=True)
    vendor_slug = serializers.SlugField(source='vendor.slug', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    delivery_agent_name = serializers.SerializerMethodField()
    items = serializers.SerializerMethodField()

    # U3 — Coordonnées client pour vendeur et livreur
    client_full_name = serializers.SerializerMethodField()
    client_email = serializers.SerializerMethodField()
    client_phone = serializers.SerializerMethodField()
    shipping_address = serializers.CharField(source='order.shipping_address', read_only=True)
    shipping_city = serializers.CharField(source='order.shipping_city', read_only=True)

    class Meta:
        model = SubOrder
        fields = [
            'id', 'order', 'vendor', 'vendor_name', 'vendor_slug',
            'status', 'status_display', 'subtotal', 'shipping_cost',
            'delivery_agent', 'delivery_agent_name', 'delivery_fee',
            'delivered_at', 'delivery_notes',
            'client_full_name', 'client_email', 'client_phone',
            'shipping_address', 'shipping_city',
            'items', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'order', 'vendor', 'subtotal', 'created_at', 'updated_at']

    def get_delivery_agent_name(self, obj):
        if obj.delivery_agent:
            return obj.delivery_agent.user.get_full_name()
        return None

    def get_client_full_name(self, obj):
        user = obj.order.user if obj.order else None
        if user:
            return user.get_full_name() or user.username
        return None

    def get_client_email(self, obj):
        user = obj.order.user if obj.order else None
        return user.email if user else None

    def get_client_phone(self, obj):
        return obj.order.shipping_phone if obj.order else None

    def get_items(self, obj):
        from apps.orders.models import OrderItem
        items = OrderItem.objects.filter(sub_order=obj).select_related('book')
        return [
            {
                'id': item.id,
                'book_id': item.book_id,
                'book_title': item.book.title,
                'quantity': item.quantity,
                'price': str(item.price),
            }
            for item in items
        ]


class SubOrderStatusSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=SubOrder.STATUS_CHOICES)


# ── Wallet ──

class VendorWalletSerializer(serializers.ModelSerializer):
    vendor_name = serializers.CharField(source='vendor.name', read_only=True)

    class Meta:
        model = VendorWallet
        fields = ['id', 'vendor', 'vendor_name', 'balance', 'total_earned', 'total_withdrawn', 'updated_at']
        read_only_fields = fields


class WalletTransactionSerializer(serializers.ModelSerializer):
    type_display = serializers.CharField(source='get_transaction_type_display', read_only=True)

    class Meta:
        model = WalletTransaction
        fields = ['id', 'transaction_type', 'type_display', 'amount', 'description', 'sub_order', 'created_at']
        read_only_fields = fields


class DeliveryWalletSerializer(serializers.ModelSerializer):
    class Meta:
        model = DeliveryWallet
        fields = ['id', 'balance', 'total_earned', 'total_withdrawn', 'updated_at']
        read_only_fields = fields


class DeliveryWalletTransactionSerializer(serializers.ModelSerializer):
    type_display = serializers.CharField(source='get_transaction_type_display', read_only=True)

    class Meta:
        from .models import DeliveryWalletTransaction
        model = DeliveryWalletTransaction
        fields = ['id', 'transaction_type', 'type_display', 'amount', 'description', 'sub_order', 'created_at']
        read_only_fields = fields


# ── Commission ──

class CommissionConfigSerializer(serializers.ModelSerializer):
    class Meta:
        model = CommissionConfig
        fields = ['platform_commission_percent', 'delivery_base_fee', 'updated_at']


# ── Delivery assignment ──

class AssignDeliverySerializer(serializers.Serializer):
    agent_profile_id = serializers.IntegerField()
    delivery_fee = serializers.DecimalField(max_digits=10, decimal_places=2, required=False)

    def validate_agent_profile_id(self, value):
        from apps.users.models import UserProfile
        if not UserProfile.objects.filter(id=value, profile_type='LIVREUR', is_active=True).exists():
            raise serializers.ValidationError("Profil livreur introuvable ou inactif.")
        return value
