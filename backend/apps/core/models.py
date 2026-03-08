from django.db import models
from django.core.cache import cache
from django.core.validators import MinValueValidator


class SiteConfig(models.Model):
    """
    Configuration du site modifiable par l'admin.
    Une seule instance (singleton) pour les paramètres globaux.
    """
    shipping_free_threshold = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(0)],
        default=25000,
        verbose_name="Seuil livraison gratuite (FCFA)",
        help_text="Montant minimum du panier pour la livraison gratuite"
    )
    shipping_cost = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(0)],
        default=2000,
        verbose_name="Frais de livraison (FCFA)",
        help_text="Frais si le panier est inférieur au seuil"
    )
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Configuration du site"
        verbose_name_plural = "Configuration du site"

    def __str__(self):
        return f"Livraison: {self.shipping_cost} FCFA (gratuit dès {self.shipping_free_threshold} FCFA)"

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        cache.delete('delivery_config')

    @classmethod
    def get_config(cls):
        """Retourne la config (crée une instance par défaut si aucune n'existe)."""
        config = cls.objects.first()
        if config is None:
            config = cls.objects.create()
        return config
