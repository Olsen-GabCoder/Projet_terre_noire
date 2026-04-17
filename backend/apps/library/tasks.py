"""Tâches périodiques pour la bibliothèque."""
import logging

from django.utils import timezone

try:
    from celery import shared_task
except ImportError:
    def shared_task(func=None, **kwargs):
        if func is None:
            return lambda f: f
        return func

logger = logging.getLogger(__name__)


@shared_task
def mark_overdue_loans():
    """Marque les prêts ACTIVE dont due_date est passé comme OVERDUE."""
    from apps.library.models import BookLoan
    count = BookLoan.objects.filter(
        status='ACTIVE',
        due_date__lt=timezone.now(),
    ).update(status='OVERDUE')
    logger.info('%d prêt(s) marqué(s) OVERDUE', count)
    return f'{count} prêt(s) marqué(s) OVERDUE'


@shared_task
def expire_notified_reservations():
    """Expire les réservations NOTIFIED dont expires_at est passé."""
    from apps.library.models import BookReservation
    count = BookReservation.objects.filter(
        status='NOTIFIED',
        expires_at__lt=timezone.now(),
    ).update(status='EXPIRED')
    logger.info('%d réservation(s) expirée(s)', count)
    return f'{count} réservation(s) expirée(s)'
