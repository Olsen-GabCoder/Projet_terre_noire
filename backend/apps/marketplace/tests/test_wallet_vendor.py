"""Tests for vendor wallet: split_payment, commissions, balance, API."""
from decimal import Decimal

from rest_framework import status

from apps.marketplace.models import VendorWallet, WalletTransaction
from apps.marketplace.services import split_payment
from .test_base import MarketplaceTestBase


class SplitPaymentTests(MarketplaceTestBase):
    """Unit tests for split_payment service."""

    def test_split_payment_credits_vendor_wallet(self):
        """After split_payment, vendor wallet is credited."""
        order, so = self._create_order_with_suborder(subtotal=Decimal('10000'))
        split_payment(order)
        wallet = VendorWallet.objects.get(vendor=self.vendor_org)
        # 10000 - 10% commission = 9000
        self.assertEqual(wallet.balance, Decimal('9000'))

    def test_split_payment_commission_deducted(self):
        """Commission is correctly deducted from vendor amount."""
        order, so = self._create_order_with_suborder(subtotal=Decimal('5000'))
        split_payment(order)
        wallet = VendorWallet.objects.get(vendor=self.vendor_org)
        expected = Decimal('5000') * Decimal('0.90')  # 10% commission
        self.assertEqual(wallet.balance, expected)

    def test_split_payment_creates_transaction(self):
        """A CREDIT_SALE transaction is created."""
        order, so = self._create_order_with_suborder(subtotal=Decimal('5000'))
        split_payment(order)
        tx = WalletTransaction.objects.filter(
            wallet__vendor=self.vendor_org, transaction_type='CREDIT_SALE',
        )
        self.assertEqual(tx.count(), 1)
        self.assertEqual(tx.first().amount, Decimal('4500'))

    def test_split_payment_multiple_suborders(self):
        """Two SubOrders from different vendors → two distinct credits."""
        from apps.organizations.models import Organization, OrganizationMembership
        vendor2 = Organization.objects.create(
            name='Librairie 2', org_type='LIBRAIRIE', email='lib2@test.com',
            owner=self.random_user,
        )
        order = self._create_order(total=Decimal('10000'))
        self._create_suborder(order=order, vendor=self.vendor_org, subtotal=Decimal('5000'))
        self._create_suborder(order=order, vendor=vendor2, subtotal=Decimal('5000'))
        split_payment(order)
        w1 = VendorWallet.objects.get(vendor=self.vendor_org)
        w2 = VendorWallet.objects.get(vendor=vendor2)
        self.assertEqual(w1.balance, Decimal('4500'))
        self.assertEqual(w2.balance, Decimal('4500'))

    def test_vendor_wallet_get_or_create(self):
        """Wallet is auto-created on first split_payment."""
        self.assertFalse(VendorWallet.objects.filter(vendor=self.vendor_org).exists())
        order, so = self._create_order_with_suborder(subtotal=Decimal('1000'))
        split_payment(order)
        self.assertTrue(VendorWallet.objects.filter(vendor=self.vendor_org).exists())

    def test_wallet_balance_after_multiple_credits(self):
        """Balance accumulates across multiple orders."""
        for _ in range(3):
            order, so = self._create_order_with_suborder(subtotal=Decimal('1000'))
            split_payment(order)
        wallet = VendorWallet.objects.get(vendor=self.vendor_org)
        self.assertEqual(wallet.balance, Decimal('2700'))  # 3 × 900

    def test_transaction_history_chronological(self):
        """Transactions are listed in reverse chronological order."""
        for i in range(3):
            order, so = self._create_order_with_suborder(subtotal=Decimal('1000'))
            split_payment(order)
        txs = WalletTransaction.objects.filter(wallet__vendor=self.vendor_org)
        self.assertEqual(txs.count(), 3)
        # Default ordering is -created_at
        dates = list(txs.values_list('created_at', flat=True))
        self.assertEqual(dates, sorted(dates, reverse=True))


class VendorWalletAPITests(MarketplaceTestBase):
    """API endpoint tests for vendor wallet."""

    def test_vendor_wallet_view_returns_balance(self):
        self._auth(self.vendor_user)
        VendorWallet.objects.create(vendor=self.vendor_org, balance=Decimal('5000'))
        resp = self.client.get('/api/marketplace/vendor/wallet/')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        data = resp.data if isinstance(resp.data, list) else [resp.data]
        self.assertEqual(Decimal(str(data[0]['balance'])), Decimal('5000'))

    def test_vendor_wallet_forbidden_for_non_vendor(self):
        self._auth(self.random_user)
        resp = self.client.get('/api/marketplace/vendor/wallet/')
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)
