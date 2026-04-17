"""Tests for wallet withdrawal (Mobile Money)."""
from decimal import Decimal
from unittest.mock import patch

from rest_framework import status

from apps.marketplace.models import VendorWallet, WalletTransaction
from apps.marketplace.withdrawal_models import WithdrawalRequest
from apps.organizations.models import OrganizationMembership
from .test_base import MarketplaceTestBase


class WithdrawalTests(MarketplaceTestBase):

    def setUp(self):
        super().setUp()
        self.wallet = VendorWallet.objects.create(
            vendor=self.vendor_org, balance=Decimal('10000'),
            total_earned=Decimal('10000'),
        )
        self._auth(self.vendor_user)

    def _withdraw(self, amount='5000', **kwargs):
        data = {
            'wallet_type': 'VENDOR',
            'amount': amount,
            'provider': 'MOBICASH',
            'phone_number': '+24177123456',
            **kwargs,
        }
        return self.client.post('/api/marketplace/wallet/withdraw/', data)

    @patch('apps.orders.payment_gateway.MobicashProvider.disburse')
    def test_withdrawal_request_success(self, mock_disburse):
        mock_disburse.return_value = {
            'transaction_id': 'DMOB-TEST123', 'status': 'SUCCESS',
            'message': 'OK',
        }
        resp = self._withdraw('5000')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data['status'], 'COMPLETED')

    @patch('apps.orders.payment_gateway.MobicashProvider.disburse')
    def test_withdrawal_insufficient_balance(self, mock_disburse):
        resp = self._withdraw('99999')
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('Solde insuffisant', resp.data.get('message', ''))
        mock_disburse.assert_not_called()

    @patch('apps.orders.payment_gateway.MobicashProvider.disburse')
    def test_withdrawal_below_minimum_rejected(self, mock_disburse):
        """Amount below MIN_WITHDRAWAL_AMOUNT (1000) is rejected."""
        resp = self._withdraw('500')
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        mock_disburse.assert_not_called()

    @patch('apps.orders.payment_gateway.MobicashProvider.disburse')
    def test_withdrawal_debits_wallet(self, mock_disburse):
        mock_disburse.return_value = {
            'transaction_id': 'DMOB-TEST456', 'status': 'SUCCESS',
            'message': 'OK',
        }
        self._withdraw('3000')
        self.wallet.refresh_from_db()
        self.assertEqual(self.wallet.balance, Decimal('7000'))

    @patch('apps.orders.payment_gateway.MobicashProvider.disburse')
    def test_withdrawal_creates_transaction_record(self, mock_disburse):
        mock_disburse.return_value = {
            'transaction_id': 'DMOB-TEST789', 'status': 'SUCCESS',
            'message': 'OK',
        }
        self._withdraw('2000')
        tx = WalletTransaction.objects.filter(
            wallet=self.wallet, transaction_type='DEBIT_WITHDRAWAL',
        )
        self.assertEqual(tx.count(), 1)
        self.assertEqual(tx.first().amount, Decimal('2000'))

    @patch('apps.orders.payment_gateway.MobicashProvider.disburse')
    def test_pending_withdrawal_blocks_new_one(self, mock_disburse):
        """A PENDING withdrawal blocks creating another."""
        WithdrawalRequest.objects.create(
            user=self.vendor_user, wallet_type='VENDOR',
            amount=Decimal('1000'), provider='MOBICASH',
            phone_number='+24177123456', status='PENDING',
        )
        resp = self._withdraw('2000')
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('retrait en cours', resp.data.get('message', ''))
        mock_disburse.assert_not_called()

    def test_withdrawal_history_listed(self):
        WithdrawalRequest.objects.create(
            user=self.vendor_user, wallet_type='VENDOR',
            amount=Decimal('2000'), provider='MOBICASH',
            phone_number='+24177123456', status='COMPLETED',
        )
        resp = self.client.get('/api/marketplace/wallet/withdrawals/')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(len(resp.data), 1)

    def test_withdrawal_forbidden_for_unauthenticated(self):
        self.client.force_authenticate(user=None)
        resp = self._withdraw('1000')
        self.assertEqual(resp.status_code, status.HTTP_401_UNAUTHORIZED)
