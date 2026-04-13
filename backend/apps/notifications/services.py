"""Helper de création de notifications in-app."""
import logging

logger = logging.getLogger(__name__)


def create_notification(recipient, notification_type, title, message='', link='', metadata=None):
    """
    Crée une notification in-app. Ne lève jamais d'exception
    pour ne pas casser les requêtes métier appelantes.

    Args:
        recipient: User instance (le destinataire)
        notification_type: str (clé dans Notification.NOTIFICATION_TYPES)
        title: str (texte court affiché dans le dropdown)
        message: str (texte détaillé optionnel)
        link: str (URL relative pour le clic, ex: '/dashboard/orders')
        metadata: dict (données contextuelles libres)

    Returns:
        Notification instance ou None si échec
    """
    if not recipient:
        return None
    try:
        from .models import Notification
        return Notification.objects.create(
            recipient=recipient,
            notification_type=notification_type,
            title=title,
            message=message,
            link=link,
            metadata=metadata or {},
        )
    except Exception:
        logger.exception(
            "Erreur create_notification pour user #%s: %s",
            getattr(recipient, 'id', '?'), title,
        )
        return None
