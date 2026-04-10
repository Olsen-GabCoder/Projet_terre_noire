from rest_framework import serializers
from .models import Order, OrderItem, Payment
from apps.books.serializers import BookListSerializer
from apps.books.models import Book
from apps.coupons.models import Coupon
from apps.core.models import SiteConfig
from django.db import transaction
from django.utils import timezone
from decimal import Decimal

import logging
logger = logging.getLogger(__name__)


class OrderItemSerializer(serializers.ModelSerializer):
    book = BookListSerializer(read_only=True)
    book_id = serializers.PrimaryKeyRelatedField(
        queryset=Book.objects.all(),
        source='book',
        write_only=True
    )
    # Infos vendeur marketplace (null si achat catalogue direct)
    vendor_id = serializers.PrimaryKeyRelatedField(source='vendor', read_only=True)
    vendor_name = serializers.SerializerMethodField()
    listing_id = serializers.PrimaryKeyRelatedField(source='listing', read_only=True)

    class Meta:
        model = OrderItem
        fields = [
            'id', 'book', 'book_id', 'quantity', 'price',
            'vendor_id', 'vendor_name', 'listing_id',
        ]
        read_only_fields = ['id', 'price', 'vendor_id', 'vendor_name', 'listing_id']

    def get_vendor_name(self, obj):
        return obj.vendor.name if obj.vendor else None


class OrderCreateSerializer(serializers.Serializer):
    items = serializers.ListField(
        child=serializers.DictField(child=serializers.IntegerField()),
        write_only=True
    )
    shipping_address = serializers.CharField(max_length=500)
    shipping_phone = serializers.CharField(max_length=20)
    shipping_city = serializers.CharField(max_length=100)
    coupon_code = serializers.CharField(max_length=50, required=False, allow_blank=True)
    delivery_rate_id = serializers.IntegerField(required=False, allow_null=True)

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
        from apps.marketplace.models import BookListing, SubOrder

        items_data = validated_data.pop('items')
        user = self.context['request'].user

        subtotal = Decimal('0')
        order_items = []
        book_ids = [item['book_id'] for item in items_data]
        books_map = {b.id: b for b in Book.objects.filter(id__in=book_ids).select_related('category', 'author')}

        # Résoudre les listings si fournis
        listing_ids = [item['listing_id'] for item in items_data if item.get('listing_id')]
        listings_map = {}
        if listing_ids:
            listings_map = {
                l.id: l for l in BookListing.objects.select_for_update().filter(
                    id__in=listing_ids, is_active=True,
                ).select_related('vendor')
            }

        for item_data in items_data:
            book = books_map.get(item_data['book_id'])
            if not book:
                raise serializers.ValidationError(f"Livre id={item_data['book_id']} introuvable.")
            if not book.available:
                raise serializers.ValidationError(f"Le livre '{book.title}' n'est plus disponible.")

            quantity = item_data['quantity']
            listing = None
            vendor = None

            # Si un listing_id est fourni, utiliser le prix et stock du listing
            listing_id = item_data.get('listing_id')
            if listing_id:
                listing = listings_map.get(listing_id)
                if not listing:
                    raise serializers.ValidationError(
                        f"Offre vendeur id={listing_id} introuvable ou inactive."
                    )
                if listing.book_id != book.id:
                    raise serializers.ValidationError(
                        f"L'offre vendeur ne correspond pas au livre."
                    )
                # Vérifier stock (ebooks : stock illimité)
                if book.format != 'EBOOK' and listing.stock < quantity:
                    raise serializers.ValidationError(
                        f"Stock insuffisant pour « {book.title} » "
                        f"chez {listing.vendor.name} ({listing.stock} disponible(s))."
                    )
                # Décrémenter le stock
                if book.format != 'EBOOK':
                    listing.stock -= quantity
                    listing.save()
                price = listing.price
                vendor = listing.vendor
            else:
                price = book.price

            subtotal += price * quantity
            order_items.append({
                'book': book,
                'quantity': quantity,
                'price': price,
                'listing': listing,
                'vendor': vendor,
            })

        # Calcul des frais de livraison
        delivery_rate_id = validated_data.get('delivery_rate_id')
        selected_rate = None
        if delivery_rate_id:
            from apps.marketplace.delivery_models import DeliveryRate
            try:
                selected_rate = DeliveryRate.objects.select_related('agent').get(
                    pk=delivery_rate_id, is_active=True,
                )
                shipping_cost = selected_rate.price
            except DeliveryRate.DoesNotExist:
                shipping_cost = Decimal('0')
        else:
            # Fallback : config globale
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

        # Info livreur pour la facture
        agent_name = ''
        agent_phone = ''
        if selected_rate:
            agent_user = selected_rate.agent.user
            agent_name = agent_user.get_full_name()
            agent_phone = getattr(agent_user, 'phone_number', '') or ''

        order = Order.objects.create(
            user=user,
            subtotal=subtotal,
            shipping_cost=shipping_cost,
            discount_amount=discount_amount,
            coupon_code=coupon_code or None,
            total_amount=total_amount,
            shipping_address=validated_data['shipping_address'],
            shipping_phone=validated_data['shipping_phone'],
            shipping_city=validated_data['shipping_city'],
            delivery_agent_name=agent_name,
            delivery_agent_phone=agent_phone,
        )

        # Créer les OrderItems
        created_items = []
        for item_data in order_items:
            oi = OrderItem.objects.create(
                order=order,
                book=item_data['book'],
                quantity=item_data['quantity'],
                price=item_data['price'],
                listing=item_data.get('listing'),
                vendor=item_data.get('vendor'),
            )
            created_items.append((oi, item_data.get('vendor')))

        # Grouper par vendeur et créer les SubOrders
        vendor_groups = {}
        for oi, vendor in created_items:
            vkey = vendor.id if vendor else None
            if vkey not in vendor_groups:
                vendor_groups[vkey] = {'vendor': vendor, 'items': [], 'subtotal': Decimal('0')}
            vendor_groups[vkey]['items'].append(oi)
            vendor_groups[vkey]['subtotal'] += oi.price * oi.quantity

        for vkey, vgroup in vendor_groups.items():
            if vgroup['vendor'] is not None:
                sub_kwargs = {
                    'order': order,
                    'vendor': vgroup['vendor'],
                    'subtotal': vgroup['subtotal'],
                }
                # Assigner le livreur choisi par le client
                if selected_rate:
                    sub_kwargs['delivery_agent'] = selected_rate.agent
                    sub_kwargs['delivery_fee'] = selected_rate.price
                sub_order = SubOrder.objects.create(**sub_kwargs)
                OrderItem.objects.filter(
                    id__in=[oi.id for oi in vgroup['items']],
                ).update(sub_order=sub_order)

        # Envoi email de confirmation
        try:
            from apps.core.email import send_order_confirmation
            send_order_confirmation(order)
        except Exception:
            pass

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
    sub_orders = serializers.SerializerMethodField()

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
            'delivery_agent_name',
            'delivery_agent_phone',
            'created_at',
            'updated_at',
            'items',
            'user',
            'sub_orders',
        ]
        read_only_fields = [
            'id', 'status_display', 'subtotal', 'shipping_cost', 'discount_amount', 'coupon_code',
            'total_amount', 'shipping_address', 'shipping_phone', 'shipping_city',
            'created_at', 'updated_at', 'items', 'user', 'sub_orders',
        ]

    def get_sub_orders(self, obj):
        from apps.marketplace.serializers import SubOrderSerializer
        sub_orders = obj.sub_orders.select_related('vendor', 'delivery_agent__user').all()
        if sub_orders.exists():
            return SubOrderSerializer(sub_orders, many=True).data
        return []


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