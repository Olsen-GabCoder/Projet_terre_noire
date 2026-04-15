from django.conf import settings
from django.db import models


class Notification(models.Model):
    """Notification in-app pour les utilisateurs Frollot."""

    NOTIFICATION_TYPES = [
        ('ORDER_CREATED', 'Commande créée'),
        ('ORDER_PAID', 'Paiement confirmé'),
        ('PAYMENT_FAILED', 'Paiement échoué'),
        ('SUBORDER_STATUS', 'Statut commande mis à jour'),
        ('ORDER_DELIVERED', 'Commande livrée'),
        ('DELIVERY_ATTEMPTED', 'Tentative de livraison'),
        ('ORG_INVITATION', 'Invitation organisation'),
        ('MANUSCRIPT_STATUS', 'Statut manuscrit'),
        ('COUPON_RECEIVED', 'Coupon reçu'),
        ('COUPON_REVOKED', 'Coupon révoqué'),
    ]

    recipient = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
        related_name='notifications', verbose_name='Destinataire',
    )
    notification_type = models.CharField(
        max_length=30, choices=NOTIFICATION_TYPES,
        verbose_name='Type',
    )
    title = models.CharField(max_length=200, verbose_name='Titre')
    message = models.TextField(blank=True, verbose_name='Message')
    link = models.CharField(max_length=300, blank=True, verbose_name='Lien')
    is_read = models.BooleanField(default=False, verbose_name='Lu')
    read_at = models.DateTimeField(null=True, blank=True, verbose_name='Lu le')
    metadata = models.JSONField(default=dict, blank=True, verbose_name='Métadonnées')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='Créée le')

    class Meta:
        verbose_name = 'Notification'
        verbose_name_plural = 'Notifications'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['recipient', 'is_read']),
            models.Index(fields=['recipient', '-created_at']),
        ]

    def __str__(self):
        return f"[{self.notification_type}] {self.title} → {self.recipient}"
