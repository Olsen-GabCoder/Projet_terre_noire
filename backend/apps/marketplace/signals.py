"""
Signaux marketplace — créditage automatique du wallet livreur.

Quand une SubOrder passe au statut DELIVERED et qu'un livreur est assigné,
on crédite son DeliveryWallet du montant delivery_fee.
"""
from django.db.models.signals import pre_save
from django.dispatch import receiver

from .models import SubOrder


@receiver(pre_save, sender=SubOrder)
def credit_delivery_wallet_on_delivered(sender, instance, **kwargs):
    """Crédite le wallet livreur quand la sous-commande passe à DELIVERED."""
    if not instance.pk:
        return  # Nouvelle instance, pas de changement de statut

    if instance.status != 'DELIVERED':
        return

    if not instance.delivery_agent_id:
        return

    # Vérifier que le statut a réellement changé
    try:
        old = SubOrder.objects.only('status').get(pk=instance.pk)
    except SubOrder.DoesNotExist:
        return

    if old.status == 'DELIVERED':
        return  # Pas de changement

    # Créditer le wallet
    from .models import DeliveryWallet, DeliveryWalletTransaction

    fee = instance.delivery_fee or 0
    if fee <= 0:
        return

    wallet, _ = DeliveryWallet.objects.get_or_create(agent=instance.delivery_agent)
    wallet.balance += fee
    wallet.total_earned += fee
    wallet.save(update_fields=['balance', 'total_earned', 'updated_at'])

    DeliveryWalletTransaction.objects.create(
        wallet=wallet,
        sub_order=instance,
        transaction_type='CREDIT_DELIVERY',
        amount=fee,
        description=f'Livraison commande #{instance.order_id} — {instance.vendor.name}',
    )
