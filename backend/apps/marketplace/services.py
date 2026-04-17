"""Services métier de la marketplace — split payment, etc."""
from decimal import Decimal

from .models import (
    CommissionConfig, VendorWallet, WalletTransaction,
)


def split_payment(order):
    """
    Appelé quand un paiement est confirmé (SUCCESS).
    Crédite le portefeuille de chaque vendeur pour ses sous-commandes.

    Note : le wallet livreur est crédité séparément par le signal
    pre_save sur SubOrder (quand le statut passe à DELIVERED).
    Le livreur est payé à la livraison, pas au paiement client.
    """
    config = CommissionConfig.get_config()
    commission_rate = config.platform_commission_percent / Decimal('100')

    for sub_order in order.sub_orders.select_related('vendor').all():
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
