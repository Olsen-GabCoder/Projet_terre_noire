"""
E2E tests for payment flow — Mobicash & Airtel Money.

All HTTP calls to external providers are mocked via unittest.mock.patch.
No real network calls are made.
"""
import hashlib
import hmac
import json
from decimal import Decimal
from unittest.mock import patch, MagicMock

from django.contrib.auth import get_user_model
from django.test import TestCase, override_settings
from rest_framework import status
from rest_framework.test import APIClient

from apps.books.models import Book, Category, Author
from apps.core.models import SiteConfig
from apps.orders.models import Order, Payment

User = get_user_model()

WEBHOOK_SECRET = 'test-webhook-secret-for-hmac'


class PaymentE2ETestBase(TestCase):
    """Shared setup for payment E2E tests."""

    def setUp(self):
        SiteConfig.get_config()
        self.user = User.objects.create_user(
            username='payer', email='payer@test.com', password='TestPass123!',
        )
        cat = Category.objects.create(name='Fiction', slug='fiction')
        author = Author.objects.create(full_name='Test Author', slug='test-author')
        self.book = Book.objects.create(
            title='Test Book', slug='test-book-pay',
            reference='PAY-TEST-001',
            price=Decimal('5000'), category=cat, author=author,
            description='A test book',
        )
        self.order = Order.objects.create(
            user=self.user,
            status='PENDING',
            subtotal=Decimal('5000'),
            total_amount=Decimal('5500'),
            shipping_cost=Decimal('500'),
            shipping_address='123 Rue Test',
            shipping_phone='074000000',
            shipping_city='Libreville',
        )
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)


@override_settings(
    MOBICASH_API_URL='https://api.mobicash.test',
    MOBICASH_API_SECRET='test-secret',
    MOBICASH_MERCHANT_ID='test-merchant',
    MOBICASH_WEBHOOK_SECRET=WEBHOOK_SECRET,
    PAYMENT_WEBHOOK_SECRET=WEBHOOK_SECRET,
    BACKEND_URL='https://api.frollot.test',
)
class MobicashE2ETest(PaymentE2ETestBase):
    """Full payment cycle: initiate → webhook → order PAID."""

    @patch('apps.orders.payment_gateway.requests.post')
    def test_full_payment_cycle_mobicash(self, mock_post):
        # 1. Mock Mobicash initiate response
        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_resp.json.return_value = {
            'transaction_id': 'MOB-REAL-TX-001',
            'reference': f'FRL-{self.order.id:06d}',
            'message': 'USSD push sent.',
        }
        mock_resp.raise_for_status = MagicMock()
        mock_post.return_value = mock_resp

        # 2. Initiate payment
        resp = self.client.post('/api/payments/initiate/', {
            'order_id': self.order.id,
            'provider': 'MOBICASH',
            'phone_number': '074123456',
        })
        self.assertIn(resp.status_code, [status.HTTP_200_OK, status.HTTP_201_CREATED])
        self.assertEqual(resp.data['status'], 'PENDING')
        self.assertEqual(resp.data['transaction_id'], 'MOB-REAL-TX-001')

        # 3. Verify Payment record created
        payment = Payment.objects.get(order=self.order)
        self.assertEqual(payment.transaction_id, 'MOB-REAL-TX-001')
        self.assertEqual(payment.status, 'PENDING')

        # 4. Simulate webhook callback
        webhook_payload = json.dumps({
            'transaction_id': 'MOB-REAL-TX-001',
            'status': 'completed',
            'reference': f'FRL-{self.order.id:06d}',
            'amount': '5500',
        })
        signature = hmac.new(
            WEBHOOK_SECRET.encode(), webhook_payload.encode(), hashlib.sha256
        ).hexdigest()

        anon_client = APIClient()
        resp = anon_client.post(
            '/api/payments/webhook/mobicash/',
            data=webhook_payload,
            content_type='application/json',
            HTTP_X_WEBHOOK_SIGNATURE=signature,
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)

        # 5. Verify order is PAID
        self.order.refresh_from_db()
        payment.refresh_from_db()
        # PAID or DELIVERED (orders without physical items auto-complete to DELIVERED)
        self.assertIn(self.order.status, ('PAID', 'DELIVERED'))
        self.assertEqual(payment.status, 'SUCCESS')


@override_settings(
    AIRTEL_API_URL='https://openapi.airtel.test',
    AIRTEL_CLIENT_ID='test-client',
    AIRTEL_CLIENT_SECRET='test-secret',
    AIRTEL_WEBHOOK_SECRET=WEBHOOK_SECRET,
    PAYMENT_WEBHOOK_SECRET=WEBHOOK_SECRET,
    BACKEND_URL='https://api.frollot.test',
)
class AirtelE2ETest(PaymentE2ETestBase):
    """Full payment cycle for Airtel Money."""

    @patch('apps.orders.payment_gateway.requests.get')
    @patch('apps.orders.payment_gateway.requests.post')
    def test_full_payment_cycle_airtel(self, mock_post, mock_get):
        # Mock OAuth token
        token_resp = MagicMock()
        token_resp.json.return_value = {'access_token': 'test-oauth-token'}
        token_resp.raise_for_status = MagicMock()

        # Mock payment initiate
        pay_resp = MagicMock()
        pay_resp.json.return_value = {
            'data': {'transaction': {'id': 'AIR-REAL-TX-001'}},
        }
        pay_resp.raise_for_status = MagicMock()

        mock_post.side_effect = [token_resp, pay_resp]

        # 1. Initiate
        resp = self.client.post('/api/payments/initiate/', {
            'order_id': self.order.id,
            'provider': 'AIRTEL',
            'phone_number': '077654321',
        })
        self.assertIn(resp.status_code, [status.HTTP_200_OK, status.HTTP_201_CREATED])
        self.assertEqual(resp.data['status'], 'PENDING')

        payment = Payment.objects.get(order=self.order)
        self.assertEqual(payment.status, 'PENDING')

        # 2. Webhook
        webhook_payload = json.dumps({
            'transaction': {
                'id': payment.transaction_id,
                'status_code': 'TS',
                'amount': '5500',
            },
        })
        signature = hmac.new(
            WEBHOOK_SECRET.encode(), webhook_payload.encode(), hashlib.sha256
        ).hexdigest()

        anon_client = APIClient()
        resp = anon_client.post(
            '/api/payments/webhook/airtel/',
            data=webhook_payload,
            content_type='application/json',
            HTTP_X_WEBHOOK_SIGNATURE=signature,
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)

        self.order.refresh_from_db()
        payment.refresh_from_db()
        # PAID or DELIVERED (orders without physical items auto-complete to DELIVERED)
        self.assertIn(self.order.status, ('PAID', 'DELIVERED'))
        self.assertEqual(payment.status, 'SUCCESS')


@override_settings(
    MOBICASH_WEBHOOK_SECRET=WEBHOOK_SECRET,
    PAYMENT_WEBHOOK_SECRET=WEBHOOK_SECRET,
)
class WebhookSecurityTest(PaymentE2ETestBase):
    """Webhook security: invalid signature and unknown transaction."""

    def test_webhook_invalid_signature_rejected(self):
        # Create a payment first
        payment = Payment.objects.create(
            order=self.order,
            transaction_id='MOB-SEC-001',
            provider='MOBICASH',
            status='PENDING',
            amount=self.order.total_amount,
        )

        webhook_payload = json.dumps({
            'transaction_id': 'MOB-SEC-001',
            'status': 'completed',
            'reference': f'FRL-{self.order.id:06d}',
        })

        anon_client = APIClient()
        resp = anon_client.post(
            '/api/payments/webhook/mobicash/',
            data=webhook_payload,
            content_type='application/json',
            HTTP_X_WEBHOOK_SIGNATURE='invalid-signature-000',
        )
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)

        # Payment should still be PENDING
        payment.refresh_from_db()
        self.assertEqual(payment.status, 'PENDING')

    def test_webhook_unknown_transaction_rejected(self):
        webhook_payload = json.dumps({
            'transaction_id': 'MOB-UNKNOWN-999',
            'status': 'completed',
        })
        signature = hmac.new(
            WEBHOOK_SECRET.encode(), webhook_payload.encode(), hashlib.sha256
        ).hexdigest()

        anon_client = APIClient()
        resp = anon_client.post(
            '/api/payments/webhook/mobicash/',
            data=webhook_payload,
            content_type='application/json',
            HTTP_X_WEBHOOK_SIGNATURE=signature,
        )
        self.assertEqual(resp.status_code, status.HTTP_404_NOT_FOUND)


@override_settings(
    MOBICASH_API_URL='https://api.mobicash.test',
    MOBICASH_API_SECRET='test-secret',
    MOBICASH_MERCHANT_ID='test-merchant',
)
class DisburseE2ETest(PaymentE2ETestBase):
    """Disbursement test with mocked HTTP."""

    @patch('apps.orders.payment_gateway.requests.post')
    def test_disburse_withdrawal_cycle(self, mock_post):
        mock_resp = MagicMock()
        mock_resp.json.return_value = {
            'transaction_id': 'DMOB-REAL-001',
            'status': 'completed',
            'message': 'Disbursement successful.',
        }
        mock_resp.raise_for_status = MagicMock()
        mock_post.return_value = mock_resp

        from apps.orders.payment_gateway import get_provider
        provider = get_provider('MOBICASH')
        result = provider.disburse(
            phone_number='074000000',
            amount=10000,
            currency='XAF',
            reference='WDR-000001',
        )

        self.assertEqual(result['status'], 'SUCCESS')
        self.assertEqual(result['transaction_id'], 'DMOB-REAL-001')
        mock_post.assert_called_once()
        call_url = mock_post.call_args[0][0]
        self.assertIn('/api/v1/disbursement', call_url)
