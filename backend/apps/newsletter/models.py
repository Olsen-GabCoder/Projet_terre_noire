import uuid

from django.db import models


class NewsletterSubscriber(models.Model):
    """Abonné à la newsletter Frollot."""
    email = models.EmailField(unique=True, verbose_name="Email")
    subscribed_at = models.DateTimeField(auto_now_add=True, verbose_name="Date d'inscription")
    is_active = models.BooleanField(default=True, verbose_name="Actif")
    confirmed = models.BooleanField(default=False, verbose_name="Confirmé")
    confirmation_token = models.UUIDField(default=uuid.uuid4, editable=False, verbose_name="Token de confirmation")

    class Meta:
        verbose_name = "Abonné newsletter"
        verbose_name_plural = "Abonnés newsletter"
        ordering = ['-subscribed_at']

    def __str__(self):
        return self.email
