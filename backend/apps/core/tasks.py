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
        from apps.core.email import send_order_paid, send_vendor_payment_received
        order = Order.objects.select_related('user').prefetch_related('items__book').get(pk=order_id)
        send_order_paid(order)
        # U2 : notifier chaque vendeur que le paiement est reçu
        for sub_order in order.sub_orders.select_related('vendor', 'order__user').all():
            try:
                send_vendor_payment_received(sub_order)
            except Exception:
                logger.exception("Erreur email vendeur paiement SubOrder #%s", sub_order.id)
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
def send_vendor_new_order_task(self, sub_order_id):
    """U2 : notifier le vendeur qu'une nouvelle sous-commande a été créée."""
    try:
        from apps.marketplace.models import SubOrder
        from apps.core.email import send_vendor_new_order
        sub_order = SubOrder.objects.select_related(
            'vendor', 'order__user',
        ).get(pk=sub_order_id)
        send_vendor_new_order(sub_order)
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
            'provider_organization', 'client', 'manuscript', 'parent_quote',
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
def send_suborder_update_task(self, sub_order_id, new_status):
    try:
        from apps.marketplace.models import SubOrder
        from apps.core.email import send_suborder_update
        sub_order = SubOrder.objects.select_related(
            'order__user', 'vendor',
        ).prefetch_related('items__book').get(pk=sub_order_id)
        send_suborder_update(sub_order, new_status)
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
    Restaure le stock des listings marketplace (F() pour éviter les race conditions).
    Annule les SubOrders enfants non livrées.
    Chaque commande est traitée dans un bloc atomique (P12).
    Prévu pour être lancé par Celery Beat toutes les heures.
    """
    from datetime import timedelta
    from django.db import transaction
    from django.db.models import F
    from django.utils import timezone
    from apps.orders.models import Order

    cutoff = timezone.now() - timedelta(hours=24)
    stale_orders = Order.objects.filter(status='PENDING', created_at__lt=cutoff)
    cancelled_count = 0

    for order in stale_orders.select_related('user').prefetch_related('items__listing'):
        try:
            with transaction.atomic():
                # P3 : restaurer le stock des listings avec F() (race-condition safe)
                for item in order.items.all():
                    if item.listing and item.listing.book.format != 'EBOOK':
                        item.listing.stock = F('stock') + item.quantity
                        item.listing.save(update_fields=['stock'])

                order.status = 'CANCELLED'
                order.save(update_fields=['status', 'updated_at'])

                # P4 : annuler les SubOrders enfants non livrées
                from apps.marketplace.models import SubOrder
                SubOrder.objects.filter(order=order).exclude(
                    status__in=['DELIVERED', 'CANCELLED'],
                ).update(status='CANCELLED')

            cancelled_count += 1
        except Exception:
            logger.exception("Erreur annulation commande périmée #%s", order.id)
            continue

        # Notifier le client (hors transaction pour ne pas bloquer en cas d'erreur email)
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


@shared_task(bind=True, max_retries=1)
def auto_complete_reviewed_orders(self):
    """
    Auto-complète les commandes de service en REVIEW depuis plus de 14 jours.
    Envoie des préavis à J-7 et J-1 avant l'auto-complétion.

    Prévu pour Celery Beat une fois par jour à 3h UTC.
    """
    from django.utils import timezone
    from apps.services.models import ServiceOrder

    now = timezone.now()
    completed_count = 0
    warned_count = 0

    orders_in_review = (
        ServiceOrder.objects
        .filter(status='REVIEW', delivered_at__isnull=False)
        .select_related('client', 'provider__user', 'request', 'quote')
    )

    for order in orders_in_review:
        delta_days = (now - order.delivered_at).days

        # 1. Auto-complétion à 14 jours
        if delta_days >= 14:
            try:
                from apps.services.services import complete_service_order
                complete_service_order(order)
                completed_count += 1

                # Notifier client et prestataire
                try:
                    send_service_order_status_task.delay(
                        order.id, recipient_role='client',
                        message="Cette commande a été automatiquement validée après 14 jours sans action de votre part.",
                    )
                    send_service_order_status_task.delay(
                        order.id, recipient_role='provider',
                        message="Cette commande a été validée par validation automatique. Votre portefeuille a été crédité.",
                    )
                except Exception:
                    pass

                logger.info(
                    "auto_complete_reviewed_orders: commande #%s auto-complétée (livrée il y a %s jours).",
                    order.id, delta_days,
                )
            except Exception:
                logger.exception(
                    "auto_complete_reviewed_orders: erreur auto-complétion commande #%s.", order.id
                )
            continue

        # 2. Préavis J-1 (delta >= 13 jours)
        if delta_days >= 13 and order.auto_complete_notified < 2:
            try:
                from apps.core.email import send_auto_complete_warning
                send_auto_complete_warning(order, days_remaining=1)
                order.auto_complete_notified = 2
                order.save(update_fields=['auto_complete_notified'])
                warned_count += 1
            except Exception:
                logger.exception(
                    "auto_complete_reviewed_orders: erreur préavis J-1 commande #%s.", order.id
                )
            continue

        # 3. Préavis J-7 (delta >= 7 jours)
        if delta_days >= 7 and order.auto_complete_notified < 1:
            try:
                from apps.core.email import send_auto_complete_warning
                send_auto_complete_warning(order, days_remaining=7)
                order.auto_complete_notified = 1
                order.save(update_fields=['auto_complete_notified'])
                warned_count += 1
            except Exception:
                logger.exception(
                    "auto_complete_reviewed_orders: erreur préavis J-7 commande #%s.", order.id
                )

    logger.info(
        "auto_complete_reviewed_orders: %d complétée(s), %d préavis envoyé(s).",
        completed_count, warned_count,
    )
    return {'completed': completed_count, 'warned': warned_count}


@shared_task(bind=True, max_retries=1)
def send_loan_reminders(self):
    """
    Envoie les rappels d'échéance de prêt de bibliothèque.
    - J-3 : rappel informatif (reminder_sent 0 → 1)
    - Jour J (ou rattrapage J+N) : rappel pressant (reminder_sent < 2 → 2)
    Prévu pour Celery Beat une fois par jour à 8h UTC (9h Libreville).
    """
    from django.utils import timezone
    from apps.library.models import BookLoan
    from apps.core.email import send_loan_reminder

    today = timezone.now().date()
    reminded_count = 0

    active_loans = (
        BookLoan.objects
        .filter(status='ACTIVE', due_date__isnull=False, borrower__isnull=False, reminder_sent__lt=2)
        .select_related('borrower', 'catalog_item__book', 'catalog_item__library')
    )

    for loan in active_loans:
        days_until_due = (loan.due_date.date() - today).days

        try:
            if days_until_due <= 0 and loan.reminder_sent < 2:
                send_loan_reminder(loan, days_remaining=0)
                loan.reminder_sent = 2
                loan.save(update_fields=['reminder_sent'])
                reminded_count += 1
            elif days_until_due <= 3 and loan.reminder_sent < 1:
                send_loan_reminder(loan, days_remaining=days_until_due)
                loan.reminder_sent = 1
                loan.save(update_fields=['reminder_sent'])
                reminded_count += 1
        except Exception:
            logger.exception("Erreur rappel prêt #%s", loan.id)

    logger.info("send_loan_reminders: %d rappel(s) envoyé(s).", reminded_count)
    return {'reminded': reminded_count}


@shared_task(bind=True, max_retries=1)
def alert_unassigned_suborders(self):
    """
    Alerte les vendeurs et l'admin quand une sous-commande est en statut READY
    sans livreur attribué depuis plus de 24h.
    Prévu pour Celery Beat une fois par jour à 9h UTC (10h Libreville).
    """
    from datetime import timedelta
    from django.utils import timezone
    from django.conf import settings as django_settings
    from apps.marketplace.models import SubOrder
    from apps.organizations.models import OrganizationMembership
    from apps.core.email import send_unassigned_suborder_alert

    cutoff = timezone.now() - timedelta(hours=24)
    alerted_count = 0

    suborders = (
        SubOrder.objects
        .filter(
            status='READY',
            delivery_agent__isnull=True,
            ready_at__isnull=False,
            ready_at__lte=cutoff,
            unassigned_alert_sent=False,
        )
        .select_related('order__user', 'vendor')
        .prefetch_related('items__book')
    )

    admin_email = getattr(django_settings, 'ADMIN_EMAIL', None)

    for sub_order in suborders:
        try:
            # Emails des responsables du vendeur
            vendor_emails = list(
                OrganizationMembership.objects.filter(
                    organization=sub_order.vendor,
                    role__in=['PROPRIETAIRE', 'ADMINISTRATEUR'],
                    is_active=True,
                ).select_related('user').values_list('user__email', flat=True)
            )

            # Ajouter l'admin plateforme
            if admin_email and admin_email not in vendor_emails:
                vendor_emails.append(admin_email)

            if vendor_emails:
                send_unassigned_suborder_alert(sub_order, vendor_emails)

            sub_order.unassigned_alert_sent = True
            sub_order.save(update_fields=['unassigned_alert_sent'])
            alerted_count += 1
        except Exception:
            logger.exception("Erreur alerte sous-commande #%s sans livreur", sub_order.id)

    logger.info("alert_unassigned_suborders: %d alerte(s) envoyée(s).", alerted_count)
    return {'alerted': alerted_count}
