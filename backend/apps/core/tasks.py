"""
Tâches Celery — wrappers asynchrones pour l'envoi d'emails.
Chaque tâche appelle la fonction synchrone correspondante dans email.py.
Usage : send_order_confirmation_task.delay(order_id)

Si Celery n'est pas installé, les tâches s'exécutent de manière synchrone
grâce au fallback ci-dessous.
"""
import logging

logger = logging.getLogger(__name__)

try:
    from celery import shared_task
except ImportError:
    # Fallback : exécution synchrone si Celery n'est pas installé
    def shared_task(func=None, **kwargs):
        def decorator(f):
            def delay(*args, **kw):
                try:
                    return f(None, *args, **kw)
                except Exception:
                    logger.exception("Erreur dans la tâche %s", f.__name__)
            f.delay = delay
            f.apply_async = lambda args=(), kwargs=None, **kw: delay(*args)
            return f
        if func is not None:
            return decorator(func)
        return decorator


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def send_order_confirmation_task(self, order_id):
    try:
        from apps.orders.models import Order
        from apps.core.email import send_order_confirmation
        order = Order.objects.select_related('user').prefetch_related('items__book').get(pk=order_id)
        send_order_confirmation(order)
    except Exception as exc:
        self.retry(exc=exc)


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def send_order_paid_task(self, order_id):
    try:
        from apps.orders.models import Order
        from apps.core.email import send_order_paid
        order = Order.objects.select_related('user').prefetch_related('items__book').get(pk=order_id)
        send_order_paid(order)
    except Exception as exc:
        self.retry(exc=exc)


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def send_order_cancelled_task(self, order_id):
    try:
        from apps.orders.models import Order
        from apps.core.email import send_order_cancelled
        order = Order.objects.select_related('user').prefetch_related('items__book').get(pk=order_id)
        send_order_cancelled(order)
    except Exception as exc:
        self.retry(exc=exc)


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def send_order_shipped_task(self, order_id):
    try:
        from apps.orders.models import Order
        from apps.core.email import send_order_shipped
        order = Order.objects.select_related('user').prefetch_related('items__book').get(pk=order_id)
        send_order_shipped(order)
    except Exception as exc:
        self.retry(exc=exc)


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def send_newsletter_welcome_task(self, email):
    try:
        from apps.core.email import send_newsletter_welcome
        send_newsletter_welcome(email)
    except Exception as exc:
        self.retry(exc=exc)


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def send_contact_notification_task(self, message_id):
    try:
        from apps.contact.models import ContactMessage
        from apps.core.email import send_contact_notification
        msg = ContactMessage.objects.get(pk=message_id)
        send_contact_notification(msg)
    except Exception as exc:
        self.retry(exc=exc)


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def send_manuscript_acknowledgment_task(self, manuscript_id):
    try:
        from apps.manuscripts.models import Manuscript
        from apps.core.email import send_manuscript_acknowledgment
        ms = Manuscript.objects.select_related('target_organization').get(pk=manuscript_id)
        send_manuscript_acknowledgment(ms)
    except Exception as exc:
        self.retry(exc=exc)


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def send_manuscript_org_notification_task(self, manuscript_id):
    try:
        from apps.manuscripts.models import Manuscript
        from apps.core.email import send_manuscript_org_notification
        ms = Manuscript.objects.select_related('target_organization').get(pk=manuscript_id)
        send_manuscript_org_notification(ms)
    except Exception as exc:
        self.retry(exc=exc)


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def send_manuscript_status_update_task(self, manuscript_id):
    try:
        from apps.manuscripts.models import Manuscript
        from apps.core.email import send_manuscript_status_update
        ms = Manuscript.objects.select_related('target_organization').get(pk=manuscript_id)
        send_manuscript_status_update(ms)
    except Exception as exc:
        self.retry(exc=exc)


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def send_editorial_quote_task(self, quote_id):
    try:
        from apps.services.models import Quote
        from apps.core.email import send_editorial_quote
        quote = Quote.objects.select_related(
            'provider_organization', 'client', 'manuscript',
        ).get(pk=quote_id)
        send_editorial_quote(quote)
    except Exception as exc:
        self.retry(exc=exc)


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def send_quote_response_notification_task(self, quote_id, action, reason=''):
    try:
        from apps.services.models import Quote
        from apps.core.email import send_quote_response_notification
        quote = Quote.objects.select_related(
            'provider_organization', 'client', 'manuscript', 'created_by',
        ).get(pk=quote_id)
        send_quote_response_notification(quote, action, reason)
    except Exception as exc:
        self.retry(exc=exc)


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def send_welcome_registration_task(self, user_id):
    try:
        from django.contrib.auth import get_user_model
        from apps.core.email import send_welcome_registration
        User = get_user_model()
        user = User.objects.get(pk=user_id)
        send_welcome_registration(user)
    except Exception as exc:
        self.retry(exc=exc)


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def send_organization_invitation_task(self, invitation_id):
    try:
        from apps.organizations.models import Invitation
        from apps.core.email import send_organization_invitation
        invitation = Invitation.objects.select_related('organization', 'invited_by').get(pk=invitation_id)
        send_organization_invitation(invitation)
    except Exception as exc:
        self.retry(exc=exc)


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def send_order_delivered_task(self, order_id, agent_name=None):
    try:
        from apps.orders.models import Order
        from apps.core.email import send_order_delivered
        order = Order.objects.select_related('user').prefetch_related('items__book').get(pk=order_id)
        send_order_delivered(order, agent_name=agent_name)
    except Exception as exc:
        self.retry(exc=exc)


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def send_delivery_assignment_task(self, sub_order_id):
    try:
        from apps.marketplace.models import SubOrder
        from apps.core.email import send_delivery_assignment
        sub_order = SubOrder.objects.select_related(
            'delivery_agent__user', 'order__user', 'vendor',
        ).get(pk=sub_order_id)
        send_delivery_assignment(sub_order)
    except Exception as exc:
        self.retry(exc=exc)


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def send_service_order_status_task(self, order_id, recipient_role='client', message=''):
    try:
        from apps.services.models import ServiceOrder
        from apps.core.email import send_service_order_status
        order = ServiceOrder.objects.select_related(
            'client', 'provider__user', 'request__listing',
        ).get(pk=order_id)
        send_service_order_status(order, recipient_role=recipient_role, message=message)
    except Exception as exc:
        self.retry(exc=exc)


@shared_task(bind=True, max_retries=1)
def cancel_stale_pending_orders(self):
    """
    Annule automatiquement les commandes PENDING depuis plus de 24 heures.
    Restaure le stock des listings marketplace si applicable.
    Prévu pour être lancé par Celery Beat toutes les heures.
    """
    from datetime import timedelta
    from django.utils import timezone
    from apps.orders.models import Order, OrderItem

    cutoff = timezone.now() - timedelta(hours=24)
    stale_orders = Order.objects.filter(status='PENDING', created_at__lt=cutoff)
    cancelled_count = 0

    for order in stale_orders.select_related('user').prefetch_related('items__listing'):
        # Restaurer le stock des listings
        for item in order.items.all():
            if item.listing and item.listing.book.format != 'EBOOK':
                item.listing.stock += item.quantity
                item.listing.save(update_fields=['stock'])

        order.status = 'CANCELLED'
        order.save(update_fields=['status', 'updated_at'])
        cancelled_count += 1

        # Notifier le client
        try:
            from apps.core.email import send_order_cancelled
            send_order_cancelled(order)
        except Exception:
            logger.warning("Email annulation échoué pour commande #%s", order.id)

    logger.info("cancel_stale_pending_orders: %d commande(s) annulée(s)", cancelled_count)
    return cancelled_count


@shared_task(bind=True, max_retries=1)
def expire_overdue_quotes(self):
    """
    Passe en EXPIRED les devis DQE dont la date de validité est dépassée.
    Pour chaque manuscrit affecté, vérifie si tous les devis sont terminaux
    et repasse le manuscrit en REVIEWING le cas échéant.

    Prévu pour être lancé par Celery Beat une fois par jour (2h UTC).

    NOTE : les notifications email (auteur + éditeur) pour l'expiration
    ne sont pas encore implémentées — à ajouter dans une passe ultérieure.
    """
    from django.utils import timezone
    from apps.services.models import Quote

    today = timezone.now().date()

    # 1. Identifier les devis SENT dont la validité est dépassée
    overdue = Quote.objects.filter(
        status='SENT',
        valid_until__lt=today,
        manuscript__isnull=False,
    )

    # 2. Collecter les manuscript_id distincts AVANT le bulk update
    manuscript_ids = list(
        overdue.values_list('manuscript_id', flat=True).distinct()
    )

    # 3. Bulk update
    expired_count = overdue.update(status='EXPIRED')

    if expired_count == 0:
        logger.info("expire_overdue_quotes: aucun devis expiré.")
        return 0

    logger.info("expire_overdue_quotes: %d devis passé(s) en EXPIRED.", expired_count)

    # 4. Pour chaque manuscrit affecté, déclencher la logique métier
    #    (repasse en REVIEWING si tous les devis sont terminaux)
    from apps.manuscripts.signals import _handle_quote_expired

    for ms_id in manuscript_ids:
        try:
            _handle_quote_expired(ms_id)
        except Exception:
            logger.exception(
                "expire_overdue_quotes: erreur traitement manuscrit %s.", ms_id
            )

    return expired_count
