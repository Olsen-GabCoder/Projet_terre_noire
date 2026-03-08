from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator


class Coupon(models.Model):
    """Code promo pour reduction sur les commandes."""
    code = models.CharField(max_length=50, unique=True, verbose_name="Code")
    discount_percent = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        validators=[MinValueValidator(0), MaxValueValidator(100)],
        null=True,
        blank=True,
        verbose_name="Reduction (%)"
    )
    discount_amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(0)],
        null=True,
        blank=True,
        default=0,
        verbose_name="Reduction fixe (FCFA)"
    )
    valid_from = models.DateTimeField(null=True, blank=True, verbose_name="Valide a partir de")
    valid_until = models.DateTimeField(null=True, blank=True, verbose_name="Valide jusqu'a")
    is_active = models.BooleanField(default=True, verbose_name="Actif")
    max_uses = models.PositiveIntegerField(null=True, blank=True, verbose_name="Nombre max d'utilisations")
    usage_count = models.PositiveIntegerField(default=0, verbose_name="Utilisations")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Code promo"
        verbose_name_plural = "Codes promo"
        ordering = ['-created_at']

    def __str__(self):
        pct = self.discount_percent
        amt = self.discount_amount
        return f"{self.code} ({pct or 0}% / {amt or 0} FCFA)"
