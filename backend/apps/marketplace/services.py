"""Services métier de la marketplace — split payment, etc."""
from decimal import Decimal

from .models import (
    CommissionConfig, VendorWallet, WalletTransaction,
    DeliveryWallet, DeliveryWalletTransaction,
)


def split_payment(order):
    """
    Appelé quand un paiement est confirmé (SUCCESS).
    Crédite le portefeuille de chaque vendeur pour ses sous-commandes.
    """
    config = CommissionConfig.get_config()
    commission_rate = config.platform_commission_percent / Decimal('100')

    for sub_order in order.sub_orders.select_related('vendor', 'delivery_agent').all():
        # Montant vendeur = subtotal - commission
        vendor_amount = sub_order.subtotal * (Decimal('1') - commission_rate)

        # Créditer le portefeuille vendeur
        wallet, _ = VendorWallet.objects.get_or_create(vendor=sub_order.vendor)
        wallet.balance += vendor_amount
        wallet.total_earned += vendor_amount
        wallet.save()

        WalletTransaction.objects.create(
            wallet=wallet,
            sub_order=sub_order,
            transaction_type='CREDIT_SALE',
            amount=vendor_amount,
            description=(
                f"Vente commande #{order.id}, "
                f"sous-commande #{sub_order.id} — "
                f"commission {config.platform_commission_percent}%"
            ),
        )

        # Créditer le livreur si assigné
        if sub_order.delivery_agent and sub_order.delivery_fee > 0:
            d_wallet, _ = DeliveryWallet.objects.get_or_create(
                agent=sub_order.delivery_agent,
            )
            d_wallet.balance += sub_order.delivery_fee
            d_wallet.total_earned += sub_order.delivery_fee
            d_wallet.save()

            # A6 : créer la transaction pour l'audit trail
            DeliveryWalletTransaction.objects.create(
                wallet=d_wallet,
                sub_order=sub_order,
                transaction_type='CREDIT_DELIVERY',
                amount=sub_order.delivery_fee,
                description=(
                    f"Livraison commande #{order.id}, "
                    f"sous-commande #{sub_order.id}"
                ),
            )
