"""Logique métier pour les services professionnels."""
from datetime import timedelta
from decimal import Decimal

from django.db import transaction
from django.utils import timezone

from apps.marketplace.models import CommissionConfig

from .models import (
    ServiceOrder, ProfessionalWallet, ProfessionalWalletTransaction,
)


def accept_quote(quote, coupon_code=None):
    """
    Accepte un devis : met à jour le statut du devis et de la demande,
    crée une commande de service avec commission plateforme.
    Si coupon_code fourni, applique la réduction.
    Retourne la commande créée. Atomique.
    """
    import logging
    logger = logging.getLogger(__name__)

    with transaction.atomic():
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

        # P3.5 : coupon prestataire
        discount_amount = Decimal('0')
        applied_coupon = None
        if coupon_code:
            coupon_code = coupon_code.strip().upper()
            try:
                from apps.coupons.models import Coupon
                from apps.coupons.services import calc_discount
                applied_coupon = Coupon.objects.select_for_update().get(code=coupon_code)
                if applied_coupon.is_valid_for(
                    request_obj.client,
                    scoped_subtotal=quote.price,
                    provider_profile_id=request_obj.provider_profile_id,
                ):
                    discount_amount = calc_discount(
                        applied_coupon.discount_type,
                        applied_coupon.discount_value,
                        quote.price,
                    )
                else:
                    applied_coupon = None
                    logger.info("Coupon %s non valide pour le devis #%s", coupon_code, quote.id)
            except Exception:
                applied_coupon = None
                logger.warning("Coupon %s introuvable ou erreur pour devis #%s", coupon_code, quote.id)

        order = ServiceOrder.objects.create(
            request=request_obj,
            quote=quote,
            client=request_obj.client,
            provider=request_obj.provider_profile,
            amount=quote.price,
            discount_amount=discount_amount,
            coupon=applied_coupon,
            platform_fee=platform_fee,
            deadline=deadline,
        )

        if applied_coupon:
            applied_coupon.apply(user=request_obj.client, order=None)

    return order


def complete_service_order(order):
    """
    Termine une commande de service : met à jour le statut,
    crédite le portefeuille du professionnel. Atomique.
    """
    with transaction.atomic():
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
