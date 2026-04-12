from django.db import models
from django.conf import settings
from django.core.validators import MinValueValidator
from apps.books.models import Book


class Order(models.Model):
    STATUS_CHOICES = [
        ('PENDING', 'En attente'),
        ('PAID', 'Payé'),
        ('SHIPPED', 'Expédié'),
        ('DELIVERED', 'Livré'),
        ('PARTIAL', 'Partiellement livré'),
        ('CANCELLED', 'Annulé'),
    ]

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='orders')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING')
    subtotal = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(0)], default=0)
    shipping_cost = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(0)], default=0)
    discount_amount = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(0)], default=0)
    coupon_code = models.CharField(max_length=50, blank=True, null=True)
    total_amount = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(0)])

    shipping_address = models.TextField()
    shipping_phone = models.CharField(max_length=20)
    shipping_city = models.CharField(max_length=100)

    # Livreur choisi par le client (optionnel)
    delivery_agent_name = models.CharField(max_length=200, blank=True, default='')
    delivery_agent_phone = models.CharField(max_length=20, blank=True, default='')

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', '-created_at']),
            models.Index(fields=['status']),
        ]

    def __str__(self):
        return f"Commande #{self.id} - {self.user.email}"


class OrderItem(models.Model):
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='items')
    book = models.ForeignKey(Book, on_delete=models.PROTECT)
    quantity = models.PositiveIntegerField(validators=[MinValueValidator(1)])
    price = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(0)])

    # Marketplace (nullable pour rétrocompatibilité)
    listing = models.ForeignKey(
        'marketplace.BookListing', on_delete=models.SET_NULL,
        null=True, blank=True, related_name='order_items',
        verbose_name="Offre vendeur",
    )
    sub_order = models.ForeignKey(
        'marketplace.SubOrder', on_delete=models.SET_NULL,
        null=True, blank=True, related_name='items',
        verbose_name="Sous-commande",
    )
    vendor = models.ForeignKey(
        'organizations.Organization', on_delete=models.SET_NULL,
        null=True, blank=True, verbose_name="Vendeur",
    )

    def __str__(self):
        return f"{self.book.title} x{self.quantity}"


class Payment(models.Model):
    PROVIDER_CHOICES = [
        ('MOBICASH', 'Mobicash'),
        ('AIRTEL', 'Airtel Money'),
        ('CASH', 'Espèces'),
        ('VISA', 'Carte Visa'),
    ]

    STATUS_CHOICES = [
        ('SUCCESS', 'Réussi'),
        ('FAILED', 'Échoué'),
        ('PENDING', 'En attente'),
    ]

    order = models.OneToOneField(Order, on_delete=models.CASCADE, related_name='payment')
    transaction_id = models.CharField(max_length=100, unique=True)
    provider = models.CharField(max_length=20, choices=PROVIDER_CHOICES)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING')
    amount = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(0)])
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Paiement {self.transaction_id} - {self.status}"


class OrderEvent(models.Model):
    """C3 : Journal d'activité — trace chaque changement sur une commande."""
    EVENT_TYPES = [
        ('ORDER_CREATED', 'Commande créée'),
        ('PAYMENT_RECEIVED', 'Paiement reçu'),
        ('PAYMENT_FAILED', 'Paiement échoué'),
        ('STATUS_CHANGE', 'Changement de statut'),
        ('DELIVERY_ASSIGNED', 'Livreur assigné'),
        ('DELIVERY_ATTEMPTED', 'Tentative de livraison'),
        ('CANCELLATION', 'Annulation'),
        ('STOCK_RESTORED', 'Stock restauré'),
        ('COUPON_RESTORED', 'Coupon restauré'),
        ('WALLET_CREDITED', 'Portefeuille crédité'),
    ]

    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='events')
    sub_order = models.ForeignKey(
        'marketplace.SubOrder', on_delete=models.SET_NULL,
        null=True, blank=True, related_name='events',
    )
    event_type = models.CharField(max_length=50, choices=EVENT_TYPES)
    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, blank=True, related_name='order_events',
    )
    actor_role = models.CharField(max_length=20, blank=True, default='system')
    from_status = models.CharField(max_length=20, blank=True)
    to_status = models.CharField(max_length=20, blank=True)
    metadata = models.JSONField(default=dict, blank=True)
    description = models.CharField(max_length=300)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Événement commande"
        verbose_name_plural = "Événements commandes"
        ordering = ['-created_at']
        indexes = [models.Index(fields=['order', '-created_at'])]

    def __str__(self):
        return f"[{self.event_type}] Order #{self.order_id} — {self.description}"
