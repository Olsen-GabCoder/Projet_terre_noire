from django.db import models
from django.core.validators import MinValueValidator


class Coupon(models.Model):
    """Code promo pour reduction sur les commandes."""
    DISCOUNT_TYPE_CHOICES = [
        ('percent', 'Pourcentage'),
        ('fixed', 'Montant fixe'),
    ]

    code = models.CharField(max_length=50, unique=True, verbose_name="Code")
    discount_type = models.CharField(max_length=20, choices=DISCOUNT_TYPE_CHOICES, default='percent', verbose_name="Type de reduction")
    discount_value = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(0)], default=0, verbose_name="Valeur de reduction")
    min_order_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0, verbose_name="Montant min. commande")
    valid_from = models.DateTimeField(null=True, blank=True, verbose_name="Valide a partir de")
    valid_until = models.DateTimeField(null=True, blank=True, verbose_name="Valide jusqu'a")
    is_active = models.BooleanField(default=True, verbose_name="Actif")
    max_uses = models.PositiveIntegerField(null=True, blank=True, verbose_name="Nombre max d'utilisations")
    usage_count = models.PositiveIntegerField(default=0, verbose_name="Utilisations")
    status = models.CharField(max_length=20, default='active')
    custom_message = models.TextField(blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey('users.User', null=True, blank=True, on_delete=models.SET_NULL, related_name='created_coupons')
    recipient = models.ForeignKey('users.User', null=True, blank=True, on_delete=models.SET_NULL, related_name='received_coupons')
    recipient_email = models.EmailField(null=True, blank=True, db_index=True)
    used_by = models.ForeignKey('users.User', null=True, blank=True, on_delete=models.SET_NULL, related_name='used_coupons')
    used_at = models.DateTimeField(null=True, blank=True)
    used_on_order = models.ForeignKey('orders.Order', null=True, blank=True, on_delete=models.SET_NULL)
    organization = models.ForeignKey('users.User', null=True, blank=True, on_delete=models.SET_NULL, related_name='org_coupons')
    template = models.ForeignKey('self', null=True, blank=True, on_delete=models.SET_NULL, related_name='generated_coupons')
    provider_profile = models.ForeignKey('users.User', null=True, blank=True, on_delete=models.SET_NULL, related_name='provider_coupons')

    class Meta:
        verbose_name = "Code promo"
        verbose_name_plural = "Codes promo"
        ordering = ['-created_at']

    @property
    def discount_percent(self):
        return float(self.discount_value) if self.discount_type == 'percent' else None

    @property
    def discount_amount(self):
        return float(self.discount_value) if self.discount_type == 'fixed' else None

    def __str__(self):
        if self.discount_type == 'percent':
            return f"{self.code} (-{self.discount_value}%)"
        return f"{self.code} (-{self.discount_value} FCFA)"
