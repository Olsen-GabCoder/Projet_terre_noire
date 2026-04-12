from decimal import Decimal

from django.core.validators import MinValueValidator
from django.db import models


class BookListing(models.Model):
    """
    Offre d'un vendeur (Organisation) pour un livre.
    Un même livre peut être vendu par plusieurs vendeurs à des prix différents.
    """
    CONDITION_CHOICES = [
        ('NEW', 'Neuf'),
        ('USED_GOOD', 'Bon état'),
        ('USED_FAIR', 'Acceptable'),
    ]

    book = models.ForeignKey(
        'books.Book', on_delete=models.CASCADE,
        related_name='listings', verbose_name="Livre",
    )
    vendor = models.ForeignKey(
        'organizations.Organization', on_delete=models.CASCADE,
        related_name='book_listings', verbose_name="Vendeur",
        limit_choices_to={'org_type__in': ['MAISON_EDITION', 'LIBRAIRIE']},
    )
    price = models.DecimalField(
        max_digits=10, decimal_places=2,
        validators=[MinValueValidator(0)],
        verbose_name="Prix vendeur (FCFA)",
    )
    original_price = models.DecimalField(
        max_digits=10, decimal_places=2,
        validators=[MinValueValidator(0)],
        null=True, blank=True,
        verbose_name="Prix d'origine (FCFA)",
    )
    stock = models.PositiveIntegerField(default=0, verbose_name="Stock disponible")
    is_active = models.BooleanField(default=True, verbose_name="Active")
    condition = models.CharField(
        max_length=20, choices=CONDITION_CHOICES, default='NEW',
        verbose_name="État",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Offre vendeur"
        verbose_name_plural = "Offres vendeurs"
        unique_together = [['book', 'vendor']]
        indexes = [
            models.Index(fields=['book', 'is_active']),
            models.Index(fields=['vendor', 'is_active']),
            models.Index(fields=['price']),
        ]
        ordering = ['price']

    def __str__(self):
        return f"{self.book.title} — {self.vendor.name} @ {self.price} FCFA"

    @property
    def has_discount(self):
        return self.original_price and self.original_price > self.price

    @property
    def discount_percentage(self):
        if self.has_discount:
            return round((self.original_price - self.price) / self.original_price * 100)
        return 0

    @property
    def in_stock(self):
        return self.stock > 0 or self.book.format == 'EBOOK'


class SubOrder(models.Model):
    """
    Sous-commande par vendeur. Chaque commande client est découpée
    en sous-commandes pour un suivi indépendant par vendeur.
    """
    STATUS_CHOICES = [
        ('PENDING', 'En attente'),
        ('CONFIRMED', 'Confirmé par le vendeur'),
        ('PREPARING', 'En préparation'),
        ('READY', 'Prêt pour livraison'),
        ('SHIPPED', 'Expédié'),
        ('ATTEMPTED', 'Tentative de livraison échouée'),
        ('DELIVERED', 'Livré'),
        ('CANCELLED', 'Annulé'),
    ]

    order = models.ForeignKey(
        'orders.Order', on_delete=models.CASCADE,
        related_name='sub_orders', verbose_name="Commande parente",
    )
    vendor = models.ForeignKey(
        'organizations.Organization', on_delete=models.PROTECT,
        related_name='sub_orders', verbose_name="Vendeur",
    )
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING')
    subtotal = models.DecimalField(
        max_digits=10, decimal_places=2,
        validators=[MinValueValidator(0)], default=0,
    )
    shipping_cost = models.DecimalField(
        max_digits=10, decimal_places=2, default=0,
    )

    # Livraison
    delivery_agent = models.ForeignKey(
        'users.UserProfile', on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='delivery_assignments',
        verbose_name="Livreur assigné",
        limit_choices_to={'profile_type': 'LIVREUR'},
    )
    delivery_fee = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    delivered_at = models.DateTimeField(null=True, blank=True)
    delivery_notes = models.TextField(blank=True)
    ready_at = models.DateTimeField(null=True, blank=True, verbose_name="Prêt depuis")
    unassigned_alert_sent = models.BooleanField(default=False, verbose_name="Alerte livreur envoyée")
    reminder_sent = models.BooleanField(default=False, verbose_name="Rappel vendeur envoyé")
    shipment_alert_sent = models.BooleanField(default=False, verbose_name="Alerte livraison en retard envoyée")

    # C1 — Suivi des tentatives de livraison
    attempt_count = models.PositiveIntegerField(default=0, verbose_name="Nombre de tentatives")
    last_attempt_at = models.DateTimeField(null=True, blank=True, verbose_name="Dernière tentative")
    last_attempt_reason = models.CharField(max_length=200, blank=True, verbose_name="Raison dernière tentative")

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Sous-commande"
        verbose_name_plural = "Sous-commandes"
        unique_together = [['order', 'vendor']]
        ordering = ['-created_at']

    def __str__(self):
        return f"SubOrder #{self.id} — {self.vendor.name} (Commande #{self.order_id})"


class CommissionConfig(models.Model):
    """Configuration des commissions plateforme (singleton)."""
    platform_commission_percent = models.DecimalField(
        max_digits=5, decimal_places=2, default=Decimal('10.00'),
        verbose_name="Commission plateforme (%)",
    )
    service_commission_percent = models.DecimalField(
        max_digits=5, decimal_places=2, default=Decimal('15.00'),
        verbose_name="Commission services (%)",
    )
    delivery_base_fee = models.DecimalField(
        max_digits=10, decimal_places=2, default=Decimal('1500'),
        verbose_name="Frais de livraison de base (FCFA)",
    )
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Configuration commissions"
        verbose_name_plural = "Configuration commissions"

    def __str__(self):
        return f"Commission : {self.platform_commission_percent}%"

    @classmethod
    def get_config(cls):
        config = cls.objects.first()
        if config is None:
            config = cls.objects.create()
        return config


class VendorWallet(models.Model):
    """Portefeuille d'un vendeur — suivi des gains et retraits."""
    vendor = models.OneToOneField(
        'organizations.Organization', on_delete=models.CASCADE,
        related_name='wallet', verbose_name="Vendeur",
    )
    balance = models.DecimalField(
        max_digits=12, decimal_places=2, default=Decimal('0'),
        verbose_name="Solde (FCFA)",
    )
    total_earned = models.DecimalField(
        max_digits=12, decimal_places=2, default=Decimal('0'),
        verbose_name="Total gagné (FCFA)",
    )
    total_withdrawn = models.DecimalField(
        max_digits=12, decimal_places=2, default=Decimal('0'),
        verbose_name="Total retiré (FCFA)",
    )
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Portefeuille vendeur"
        verbose_name_plural = "Portefeuilles vendeurs"

    def __str__(self):
        return f"Wallet {self.vendor.name} — {self.balance} FCFA"


class WalletTransaction(models.Model):
    """Entrée dans le portefeuille d'un vendeur."""
    TYPE_CHOICES = [
        ('CREDIT_SALE', 'Crédit — Vente'),
        ('DEBIT_COMMISSION', 'Débit — Commission plateforme'),
        ('DEBIT_WITHDRAWAL', 'Débit — Retrait'),
        ('CREDIT_REFUND', 'Crédit — Remboursement'),
    ]

    wallet = models.ForeignKey(
        VendorWallet, on_delete=models.CASCADE,
        related_name='transactions',
    )
    sub_order = models.ForeignKey(
        SubOrder, on_delete=models.SET_NULL,
        null=True, blank=True,
    )
    transaction_type = models.CharField(max_length=30, choices=TYPE_CHOICES)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    description = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Transaction portefeuille"
        verbose_name_plural = "Transactions portefeuille"
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.get_transaction_type_display()} — {self.amount} FCFA"


class DeliveryWallet(models.Model):
    """Portefeuille d'un livreur indépendant."""
    agent = models.OneToOneField(
        'users.UserProfile', on_delete=models.CASCADE,
        related_name='delivery_wallet',
        limit_choices_to={'profile_type': 'LIVREUR'},
        verbose_name="Livreur",
    )
    balance = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0'))
    total_earned = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0'))
    total_withdrawn = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0'))
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Portefeuille livreur"
        verbose_name_plural = "Portefeuilles livreurs"

    def __str__(self):
        return f"Wallet livreur {self.agent.user.get_full_name()} — {self.balance} FCFA"


class DeliveryWalletTransaction(models.Model):
    """Transaction dans le portefeuille d'un livreur."""
    TYPE_CHOICES = [
        ('CREDIT_DELIVERY', 'Crédit — Livraison'),
        ('DEBIT_WITHDRAWAL', 'Débit — Retrait'),
        ('CREDIT_BONUS', 'Crédit — Bonus'),
    ]

    wallet = models.ForeignKey(
        DeliveryWallet, on_delete=models.CASCADE,
        related_name='transactions',
    )
    sub_order = models.ForeignKey(
        SubOrder, on_delete=models.SET_NULL,
        null=True, blank=True,
    )
    transaction_type = models.CharField(max_length=30, choices=TYPE_CHOICES)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    description = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Transaction livreur"
        verbose_name_plural = "Transactions livreur"
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.get_transaction_type_display()} — {self.amount} FCFA"


# Import pour que Django découvre DeliveryRate et WithdrawalRequest
from .delivery_models import DeliveryRate  # noqa: E402, F401
from .withdrawal_models import WithdrawalRequest  # noqa: E402, F401
