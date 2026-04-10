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


class DeliveryZone(models.Model):
    """
    Zone de livraison avec tarif spécifique.
    L'admin crée des zones (villes/régions) avec un frais de livraison adapté.
    La zone avec name="default" sert de tarif par défaut si aucune zone ne correspond.
    """
    name = models.CharField(max_length=100, unique=True, verbose_name="Nom de la zone")
    cities = models.JSONField(
        default=list, blank=True,
        verbose_name="Villes couvertes",
        help_text='Liste de noms de villes. Ex: ["Libreville", "Owendo", "Akanda"]',
    )
    shipping_cost = models.DecimalField(
        max_digits=10, decimal_places=2,
        validators=[MinValueValidator(0)],
        default=2000,
        verbose_name="Frais de livraison (FCFA)",
    )
    shipping_free_threshold = models.DecimalField(
        max_digits=10, decimal_places=2,
        validators=[MinValueValidator(0)],
        default=25000,
        verbose_name="Seuil livraison gratuite (FCFA)",
    )
    estimated_days_min = models.PositiveIntegerField(default=1, verbose_name="Délai min (jours)")
    estimated_days_max = models.PositiveIntegerField(default=3, verbose_name="Délai max (jours)")
    is_active = models.BooleanField(default=True)

    class Meta:
        verbose_name = "Zone de livraison"
        verbose_name_plural = "Zones de livraison"
        ordering = ['name']

    def __str__(self):
        return f"{self.name} — {self.shipping_cost} FCFA"

    @classmethod
    def get_zone_for_city(cls, city):
        """Trouve la zone correspondant à une ville. Retourne la zone default si aucune ne correspond."""
        if city:
            city_lower = city.strip().lower()
            for zone in cls.objects.filter(is_active=True):
                if any(c.strip().lower() == city_lower for c in (zone.cities or [])):
                    return zone
        return cls.objects.filter(name='default', is_active=True).first()
