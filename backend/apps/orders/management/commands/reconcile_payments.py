"""
Management command: reconcile_payments

R4.1 - Verifie les Payment PENDING/EXPIRED > 15 min via Bamboo check_status.
       Si Bamboo dit completed/success -> Payment=SUCCESS + Order=PAID.
R4.2 - Auto-annule les Order PENDING sans aucun paiement > 48h.

Usage:
  python manage.py reconcile_payments
  python manage.py reconcile_payments --dry-run
"""

import logging
from datetime import timedelta

from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

from apps.orders.models import Order, Payment
from apps.orders.services.bamboo_pay import get_bamboo_service, BambooPayError

logger = logging.getLogger('bamboo_pay')

STATUS_MAP = {
    'completed': 'SUCCESS',
    'success': 'SUCCESS',
    'successful': 'SUCCESS',
    'approved': 'SUCCESS',
    'paid': 'SUCCESS',
    'failed': 'FAILED',
    'rejected': 'FAILED',
    'cancelled': 'FAILED',
    'expired': 'EXPIRED',
    'timeout': 'EXPIRED',
    'pending': 'PENDING',
    'processing': 'PENDING',
}


class Command(BaseCommand):
    help = 'Reconcilie les paiements orphelins via Bamboo Pay et annule les commandes abandonnees.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Affiche les actions sans les executer.',
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        prefix = '[DRY-RUN] ' if dry_run else ''

        self.stdout.write(f'{prefix}=== Reconciliation des paiements ===')

        # R4.1 — Paiements PENDING/EXPIRED > 15 min
        cutoff = timezone.now() - timedelta(minutes=15)
        stale_payments = Payment.objects.filter(
            status__in=['PENDING', 'EXPIRED'],
            created_at__lt=cutoff,
        ).select_related('order')

        self.stdout.write(f'{prefix}Paiements a verifier: {stale_payments.count()}')

        reconciled = 0
        errors = 0

        try:
            service = get_bamboo_service()
        except RuntimeError as e:
            self.stderr.write(f'Bamboo Pay non configure: {e}')
            self.stderr.write('Etape R4.1 ignoree (pas de service Bamboo).')
            service = None

        if service:
            for payment in stale_payments:
                try:
                    result = service.check_status(payment.transaction_id)
                    tx = result.get('transaction', {})
                    bamboo_status = tx.get('status', 'pending').lower().strip()
                    new_status = STATUS_MAP.get(bamboo_status, 'PENDING')

                    if new_status == 'PENDING':
                        continue

                    self.stdout.write(
                        f'{prefix}Payment {payment.transaction_id}: '
                        f'{payment.status} -> {new_status} (bamboo: {bamboo_status})'
                    )

                    if not dry_run:
                        with transaction.atomic():
                            payment.status = new_status
                            payment.bamboo_response = result
                            payment.finalized_at = timezone.now()
                            payment.save()

                            if new_status == 'SUCCESS' and payment.order.status == 'PENDING':
                                payment.order.status = 'PAID'
                                payment.order.save()
                                try:
                                    from apps.core.email import send_order_paid
                                    send_order_paid(payment.order)
                                except Exception:
                                    pass

                        logger.info(
                            "reconcile.finalized ref=%s status=%s order=%d",
                            payment.transaction_id, new_status, payment.order.id
                        )

                    reconciled += 1

                except BambooPayError as e:
                    errors += 1
                    logger.warning(
                        "reconcile.check_failed ref=%s err=%s",
                        payment.transaction_id, str(e)
                    )
                    self.stderr.write(
                        f'{prefix}Erreur check_status {payment.transaction_id}: {e}'
                    )

        # R4.2 — Commandes PENDING sans paiement > 48h
        cutoff_48h = timezone.now() - timedelta(hours=48)
        abandoned_orders = Order.objects.filter(
            status='PENDING',
            created_at__lt=cutoff_48h,
        ).exclude(
            payments__status='SUCCESS',
        )

        abandoned_count = abandoned_orders.count()
        self.stdout.write(f'{prefix}Commandes abandonnees (>48h sans paiement): {abandoned_count}')

        if abandoned_count > 0 and not dry_run:
            # Expirer les paiements PENDING associes
            Payment.objects.filter(
                order__in=abandoned_orders,
                status='PENDING',
            ).update(status='EXPIRED', finalized_at=timezone.now())

            updated = abandoned_orders.update(status='CANCELLED')
            logger.info("reconcile.cancelled_abandoned count=%d", updated)
            self.stdout.write(f'Commandes annulees: {updated}')
        elif abandoned_count > 0 and dry_run:
            for order in abandoned_orders[:10]:
                self.stdout.write(
                    f'  -> Commande #{order.id} du {order.created_at:%Y-%m-%d %H:%M} '
                    f'({order.total_amount} FCFA)'
                )

        self.stdout.write(
            f'{prefix}=== Termine: {reconciled} reconcilie(s), '
            f'{abandoned_count} abandonnee(s), {errors} erreur(s) ==='
        )
