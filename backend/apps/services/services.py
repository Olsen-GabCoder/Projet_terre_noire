"""Logique métier pour les services professionnels."""
from datetime import timedelta
from decimal import Decimal

from django.utils import timezone

from apps.marketplace.models import CommissionConfig

from .models import (
    ServiceOrder, ProfessionalWallet, ProfessionalWalletTransaction,
)


def accept_quote(quote):
    """
    Accepte un devis : met à jour le statut du devis et de la demande,
    crée une commande de service avec commission plateforme.
    Retourne la commande créée.
    """
    quote.status = 'ACCEPTED'
    quote.save(update_fields=['status'])

    request_obj = quote.request
    request_obj.status = 'ACCEPTED'
    request_obj.save(update_fields=['status', 'updated_at'])

    # Calculer la commission plateforme
    config = CommissionConfig.get_config()
    commission_percent = getattr(config, 'service_commission_percent', None)
    if commission_percent is None:
        commission_percent = config.platform_commission_percent
    platform_fee = (quote.price * commission_percent / Decimal('100')).quantize(Decimal('0.01'))

    # Calculer la deadline
    deadline = timezone.now() + timedelta(days=quote.turnaround_days)

    order = ServiceOrder.objects.create(
        request=request_obj,
        quote=quote,
        client=request_obj.client,
        provider=request_obj.provider_profile,
        amount=quote.price,
        platform_fee=platform_fee,
        deadline=deadline,
    )

    return order


def complete_service_order(order):
    """
    Termine une commande de service : met à jour le statut,
    crédite le portefeuille du professionnel.
    """
    order.status = 'COMPLETED'
    order.completed_at = timezone.now()
    order.save(update_fields=['status', 'completed_at', 'updated_at'])

    # Montant net pour le professionnel
    pro_amount = order.amount - order.platform_fee

    # Créer ou récupérer le portefeuille
    wallet, _ = ProfessionalWallet.objects.get_or_create(
        professional=order.provider,
    )
    wallet.balance += pro_amount
    wallet.total_earned += pro_amount
    wallet.save(update_fields=['balance', 'total_earned', 'updated_at'])

    # Créer la transaction
    ProfessionalWalletTransaction.objects.create(
        wallet=wallet,
        service_order=order,
        transaction_type='CREDIT_SERVICE',
        amount=pro_amount,
        description=f"Paiement pour commande de service #{order.pk} — {order.request.title}",
    )

    return order
