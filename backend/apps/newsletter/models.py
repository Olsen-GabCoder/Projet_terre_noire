import uuid

from django.db import models


def _default_token():
    return uuid.uuid4().hex


class NewsletterSubscriber(models.Model):
    """Abonné à la newsletter Terre Noire Éditions."""
    email = models.EmailField(unique=True, verbose_name="Email")
    subscribed_at = models.DateTimeField(auto_now_add=True, verbose_name="Date d'inscription")
    is_active = models.BooleanField(default=True, verbose_name="Actif")
    confirmation_token = models.CharField(
        max_length=32, default=_default_token, verbose_name="Token de confirmation"
    )
    confirmed = models.BooleanField(default=False, verbose_name="Confirmé")
    confirmed_at = models.DateTimeField(null=True, blank=True, verbose_name="Date de confirmation")

    class Meta:
        verbose_name = "Abonné newsletter"
        verbose_name_plural = "Abonnés newsletter"
        ordering = ['-subscribed_at']

    def __str__(self):
        status = "confirmé" if self.confirmed else "en attente"
        return f"{self.email} ({status})"
