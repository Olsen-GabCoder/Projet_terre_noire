"""Tests for delivery wallet: signal credit on DELIVERED, API access."""
from decimal import Decimal
from unittest.mock import patch

from rest_framework import status

from apps.marketplace.models import SubOrder, DeliveryWallet, DeliveryWalletTransaction
from .test_base import MarketplaceTestBase


class DeliveryWalletSignalTests(MarketplaceTestBase):
    """Tests for the pre_save signal that credits delivery wallet."""

    def test_delivery_wallet_credited_on_delivered(self):
        """Signal credits wallet when SubOrder transitions to DELIVERED."""
        _, so = self._create_order_with_suborder(
            status='SHIPPED', delivery_agent=self.delivery_profile,
            delivery_fee=Decimal('2000'),
        )
        so.status = 'DELIVERED'
        so.save()
        wallet = DeliveryWallet.objects.get(agent=self.delivery_profile)
        self.assertEqual(wallet.balance, Decimal('2000'))

    def test_delivery_wallet_not_credited_on_shipped(self):
        """SHIPPED status does NOT credit wallet."""
        _, so = self._create_order_with_suborder(
            status='READY', delivery_agent=self.delivery_profile,
            delivery_fee=Decimal('2000'),
        )
        so.status = 'SHIPPED'
        so.save()
        self.assertFalse(DeliveryWallet.objects.filter(agent=self.delivery_profile).exists())

    def test_delivery_wallet_amount_equals_delivery_fee(self):
        """Credited amount equals the SubOrder delivery_fee."""
        fee = Decimal('3500')
        _, so = self._create_order_with_suborder(
            status='SHIPPED', delivery_agent=self.delivery_profile,
            delivery_fee=fee,
        )
        so.status = 'DELIVERED'
        so.save()
        wallet = DeliveryWallet.objects.get(agent=self.delivery_profile)
        self.assertEqual(wallet.balance, fee)

    def test_delivery_wallet_auto_created(self):
        """Wallet is auto-created on first DELIVERED signal."""
        self.assertFalse(DeliveryWallet.objects.filter(agent=self.delivery_profile).exists())
        _, so = self._create_order_with_suborder(
            status='SHIPPED', delivery_agent=self.delivery_profile,
            delivery_fee=Decimal('1500'),
        )
        so.status = 'DELIVERED'
        so.save()
        self.assertTrue(DeliveryWallet.objects.filter(agent=self.delivery_profile).exists())

    def test_no_double_credit_if_already_delivered(self):
        """Re-saving a DELIVERED SubOrder does NOT double-credit the wallet."""
        _, so = self._create_order_with_suborder(
            status='SHIPPED', delivery_agent=self.delivery_profile,
            delivery_fee=Decimal('2000'),
        )
        so.status = 'DELIVERED'
        so.save()
        wallet = DeliveryWallet.objects.get(agent=self.delivery_profile)
        self.assertEqual(wallet.balance, Decimal('2000'))
        # Save again (e.g. admin edits notes)
        so.delivery_notes = 'Updated notes'
        so.save()
        wallet.refresh_from_db()
        self.assertEqual(wallet.balance, Decimal('2000'))

    def test_no_credit_without_delivery_agent(self):
        """No credit if no delivery agent is assigned."""
        _, so = self._create_order_with_suborder(
            status='SHIPPED', delivery_agent=None, delivery_fee=Decimal('2000'),
        )
        so.status = 'DELIVERED'
        so.save()
        self.assertEqual(DeliveryWallet.objects.count(), 0)

    def test_no_credit_with_zero_fee(self):
        """No credit if delivery_fee is 0."""
        _, so = self._create_order_with_suborder(
            status='SHIPPED', delivery_agent=self.delivery_profile,
            delivery_fee=Decimal('0'),
        )
        so.status = 'DELIVERED'
        so.save()
        self.assertFalse(DeliveryWallet.objects.filter(agent=self.delivery_profile).exists())

    def test_transaction_created_on_credit(self):
        """A CREDIT_DELIVERY transaction is created on DELIVERED."""
        _, so = self._create_order_with_suborder(
            status='SHIPPED', delivery_agent=self.delivery_profile,
            delivery_fee=Decimal('1500'),
        )
        so.status = 'DELIVERED'
        so.save()
        txs = DeliveryWalletTransaction.objects.filter(
            wallet__agent=self.delivery_profile,
            transaction_type='CREDIT_DELIVERY',
        )
        self.assertEqual(txs.count(), 1)
        self.assertEqual(txs.first().amount, Decimal('1500'))


class DeliveryWalletAPITests(MarketplaceTestBase):
    """API endpoint tests for delivery wallet."""

    def test_delivery_wallet_view_returns_balance(self):
        self._auth(self.delivery_user)
        DeliveryWallet.objects.create(
            agent=self.delivery_profile, balance=Decimal('3000'),
        )
        resp = self.client.get('/api/marketplace/delivery/wallet/')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(Decimal(str(resp.data['balance'])), Decimal('3000'))

    def test_delivery_wallet_forbidden_non_livreur(self):
        self._auth(self.random_user)
        resp = self.client.get('/api/marketplace/delivery/wallet/')
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)
