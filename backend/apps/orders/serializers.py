from rest_framework import serializers
from .models import Order, OrderItem, Payment
from apps.books.serializers import BookListSerializer
from apps.books.models import Book
from apps.coupons.models import Coupon
from apps.core.models import SiteConfig
from django.db import transaction
from django.utils import timezone
from decimal import Decimal


class OrderItemSerializer(serializers.ModelSerializer):
    book = BookListSerializer(read_only=True)
    book_id = serializers.PrimaryKeyRelatedField(
        queryset=Book.objects.all(),
        source='book',
        write_only=True
    )
    
    class Meta:
        model = OrderItem
        fields = ['id', 'book', 'book_id', 'quantity', 'price']
        read_only_fields = ['id', 'price']


class OrderCreateSerializer(serializers.Serializer):
    items = serializers.ListField(
        child=serializers.DictField(child=serializers.IntegerField()),
        write_only=True
    )
    shipping_address = serializers.CharField(max_length=500)
    shipping_phone = serializers.CharField(max_length=20)
    shipping_city = serializers.CharField(max_length=100)
    coupon_code = serializers.CharField(max_length=50, required=False, allow_blank=True)
    
    def validate_items(self, value):
        if not value:
            raise serializers.ValidationError("La commande doit contenir au moins un article.")
        
        for item in value:
            if 'book_id' not in item or 'quantity' not in item:
                raise serializers.ValidationError("Chaque article doit avoir book_id et quantity.")
            if item['quantity'] < 1:
                raise serializers.ValidationError("La quantité doit être au moins 1.")
        
        return value

    @transaction.atomic
    def create(self, validated_data):
        items_data = validated_data.pop('items')
        user = self.context['request'].user

        subtotal = 0
        order_items = []
        book_ids = [item['book_id'] for item in items_data]
        books_map = {b.id: b for b in Book.objects.filter(id__in=book_ids).select_related('category', 'author')}

        for item_data in items_data:
            book = books_map.get(item_data['book_id'])
            if not book:
                raise serializers.ValidationError(f"Livre id={item_data['book_id']} introuvable.")
            if not book.available:
                raise serializers.ValidationError(f"Le livre '{book.title}' n'est plus disponible.")

            quantity = item_data['quantity']
            price = book.price
            subtotal += price * quantity

            order_items.append({
                'book': book,
                'quantity': quantity,
                'price': price
            })

        config = SiteConfig.get_config()
        shipping_free_threshold = config.shipping_free_threshold
        shipping_cost_default = config.shipping_cost
        shipping_cost = Decimal('0') if subtotal >= shipping_free_threshold else shipping_cost_default
        discount_amount = Decimal('0')
        coupon_code = validated_data.get('coupon_code', '').strip().upper()

        if coupon_code:
            try:
                coupon = Coupon.objects.select_for_update().get(code=coupon_code)
                if coupon.is_active:
                    now = timezone.now()
                    if (not coupon.valid_from or now >= coupon.valid_from) and (not coupon.valid_until or now <= coupon.valid_until):
                        if coupon.max_uses is None or coupon.usage_count < coupon.max_uses:
                            if coupon.discount_percent is not None:
                                discount_amount = subtotal * (coupon.discount_percent / 100)
                            elif coupon.discount_amount:
                                discount_amount = min(coupon.discount_amount, subtotal)
                            coupon.usage_count += 1
                            coupon.save()
            except Coupon.DoesNotExist:
                pass

        total_amount = max(Decimal('0'), subtotal - discount_amount + shipping_cost)

        order = Order.objects.create(
            user=user,
            subtotal=subtotal,
            shipping_cost=shipping_cost,
            discount_amount=discount_amount,
            coupon_code=coupon_code or None,
            total_amount=total_amount,
            shipping_address=validated_data['shipping_address'],
            shipping_phone=validated_data['shipping_phone'],
            shipping_city=validated_data['shipping_city']
        )

        for item_data in order_items:
            OrderItem.objects.create(order=order, **item_data)

        # Envoi email de confirmation
        try:
            from apps.core.email import send_order_confirmation
            send_order_confirmation(order)
        except Exception:
            pass  # Ne pas bloquer la commande si l'email échoue

        return order


class OrderUserSerializer(serializers.Serializer):
    def to_representation(self, instance):
        return {
            'id': instance.id,
            'username': instance.username,
            'email': instance.email or '',
            'first_name': getattr(instance, 'first_name', '') or '',
            'last_name': getattr(instance, 'last_name', '') or '',
            'phone_number': getattr(instance, 'phone_number', '') or '',
            'full_name': instance.get_full_name() or instance.username,
        }


class OrderListSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    user = OrderUserSerializer(read_only=True)
    
    class Meta:
        model = Order
        fields = [
            'id',
            'status',
            'status_display',
            'subtotal',
            'shipping_cost',
            'discount_amount',
            'coupon_code',
            'total_amount',
            'shipping_address',
            'shipping_phone',
            'shipping_city',
            'created_at',
            'updated_at',
            'items',
            'user',
        ]
        read_only_fields = [
            'id', 'status_display', 'subtotal', 'shipping_cost', 'discount_amount', 'coupon_code',
            'total_amount', 'shipping_address', 'shipping_phone', 'shipping_city',
            'created_at', 'updated_at', 'items', 'user',
        ]


class OrderStatusUpdateSerializer(serializers.ModelSerializer):
    """Serializer minimal pour la mise à jour du statut par l'admin."""
    class Meta:
        model = Order
        fields = ['status']


class PaymentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Payment
        fields = ['id', 'transaction_id', 'provider', 'status', 'amount', 'created_at']
        read_only_fields = ['id', 'created_at']