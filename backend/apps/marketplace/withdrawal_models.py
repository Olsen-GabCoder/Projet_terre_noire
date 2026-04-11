"""
Demandes de retrait wallet vers Mobile Money.
Unifie pour les 3 types de wallet (vendeur, livreur, professionnel).
"""
from decimal import Decimal
from django.conf import settings
from django.db import models
from django.core.validators import MinValueValidator


WALLET_TYPE_CHOICES = [
    ('VENDOR', 'Vendeur'),
    ('DELIVERY', 'Livreur'),
    ('PROFESSIONAL', 'Professionnel'),
]

PROVIDER_CHOICES = [
    ('MOBICASH', 'Mobicash (Gabon Telecom)'),
    ('AIRTEL', 'Airtel Money'),
]

STATUS_CHOICES = [
    ('PENDING', 'En attente'),
    ('PROCESSING', 'En cours'),
    ('COMPLETED', 'Termine'),
    ('FAILED', 'Echoue'),
    ('CANCELLED', 'Annule'),
]

# Montant minimum de retrait
MIN_WITHDRAWAL_AMOUNT = Decimal('1000')


class WithdrawalRequest(models.Model):
    """Demande de retrait d'un wallet vers Mobile Money."""
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='withdrawal_requests',
    )
    wallet_type = models.CharField(max_length=20, choices=WALLET_TYPE_CHOICES)
    amount = models.DecimalField(
        max_digits=12, decimal_places=2,
        validators=[MinValueValidator(MIN_WITHDRAWAL_AMOUNT)],
        verbose_name="Montant",
    )
    currency = models.CharField(max_length=3, default='XAF')
    provider = models.CharField(max_length=20, choices=PROVIDER_CHOICES)
    phone_number = models.CharField(max_length=20, verbose_name="Numero Mobile Money")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING')
    transaction_id = models.CharField(
        max_length=100, blank=True, null=True,
        verbose_name="Reference transaction provider",
    )
    failure_reason = models.TextField(blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)
    processed_at = models.DateTimeField(blank=True, null=True)

    class Meta:
        verbose_name = "Demande de retrait"
        verbose_name_plural = "Demandes de retrait"
        ordering = ['-created_at']

    def __str__(self):
        return f"Retrait {self.amount} {self.currency} — {self.get_wallet_type_display()} — {self.get_status_display()}"
