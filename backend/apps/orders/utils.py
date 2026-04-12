"""Utilitaires métier des commandes."""
import logging

logger = logging.getLogger(__name__)


def log_order_event(order, event_type, description, actor=None, actor_role='system',
                    sub_order=None, from_status='', to_status='', metadata=None):
    """
    C3 : Crée un OrderEvent pour tracer une action sur une commande.
    Silencieux en cas d'erreur pour ne jamais bloquer le flux principal.
    """
    try:
        from .models import OrderEvent
        OrderEvent.objects.create(
            order=order,
            sub_order=sub_order,
            event_type=event_type,
            actor=actor,
            actor_role=actor_role,
            from_status=from_status,
            to_status=to_status,
            metadata=metadata or {},
            description=description,
        )
    except Exception:
        logger.exception("Erreur log_order_event Order #%s: %s", order.id, description)
