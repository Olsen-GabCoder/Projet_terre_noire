"""
Passerelle de paiement Frollot — Mobicash & Airtel Money.

Architecture :
1. Le frontend initie un paiement → POST /api/payments/initiate/
2. Le backend contacte l'API du provider (Mobicash/Airtel)
3. L'utilisateur confirme sur son téléphone (USSD push)
4. Le provider envoie un webhook → POST /api/payments/webhook/{provider}/
5. Le backend met à jour le Payment et la commande

Mode simulation : quand l'API_URL du provider est vide, les méthodes
_simulate_* retournent des réponses synthétiques sans appel réseau.
Quand les credentials sont configurés, les vrais appels HTTP sont activés.
"""
import hashlib
import hmac
import logging
import uuid

import requests
from django.conf import settings

logger = logging.getLogger(__name__)


class PaymentError(Exception):
    """Erreur lors du traitement d'un paiement."""
    pass


class BasePaymentProvider:
    """Interface commune pour tous les providers de paiement."""

    name = 'base'

    def initiate(self, order, phone_number):
        """
        Initie une demande de paiement.
        Retourne un dict : {transaction_id, status, provider_ref, message}
        """
        raise NotImplementedError

    def verify(self, transaction_id):
        """
        Vérifie le statut d'une transaction auprès du provider.
        Retourne : 'SUCCESS', 'PENDING' ou 'FAILED'
        """
        raise NotImplementedError

    def validate_webhook(self, payload, signature):
        """
        Valide la signature d'un webhook entrant.
        Retourne True si valide.
        """
        raise NotImplementedError

    def parse_webhook(self, payload):
        """
        Parse le payload du webhook.
        Retourne un dict : {transaction_id, status, provider_ref, amount}
        """
        raise NotImplementedError

    def disburse(self, phone_number, amount, currency, reference):
        """
        Envoie de l'argent vers un numero Mobile Money (retrait wallet).
        Retourne un dict : {transaction_id, status, message}
        """
        raise NotImplementedError


class MobicashProvider(BasePaymentProvider):
    """
    Intégration Mobicash (Gabon Telecom).
    Documentation API : à obtenir auprès de Gabon Telecom.

    Variables d'environnement requises :
    - MOBICASH_MERCHANT_ID
    - MOBICASH_API_KEY
    - MOBICASH_API_SECRET
    - MOBICASH_API_URL (sandbox/production — vide = mode simulation)
    - MOBICASH_WEBHOOK_SECRET (ou PAYMENT_WEBHOOK_SECRET en fallback)
    """

    name = 'MOBICASH'

    def __init__(self):
        self.merchant_id = getattr(settings, 'MOBICASH_MERCHANT_ID', '')
        self.api_key = getattr(settings, 'MOBICASH_API_KEY', '')
        self.api_secret = getattr(settings, 'MOBICASH_API_SECRET', '')
        self.api_url = getattr(settings, 'MOBICASH_API_URL', '')
        self.webhook_secret = (
            getattr(settings, 'MOBICASH_WEBHOOK_SECRET', '')
            or getattr(settings, 'PAYMENT_WEBHOOK_SECRET', '')
        )

    def initiate(self, order, phone_number):
        if not self.api_url:
            logger.warning("Mobicash non configuré — simulation activée")
            return self._simulate_payment(order, phone_number)

        payload = {
            'merchant_id': self.merchant_id,
            'amount': float(order.total_amount),
            'currency': 'XAF',
            'phone_number': phone_number,
            'reference': f'FRL-{order.id:06d}',
            'callback_url': f'{settings.BACKEND_URL}/api/orders/webhook/mobicash/',
            'description': f'Commande Frollot #{order.id}',
        }
        headers = {
            'Authorization': f'Bearer {self.api_secret}',
            'Content-Type': 'application/json',
        }
        try:
            resp = requests.post(
                f'{self.api_url}/api/v1/payment/initiate',
                json=payload, headers=headers, timeout=30,
            )
            resp.raise_for_status()
            data = resp.json()
            return {
                'transaction_id': data.get('transaction_id', ''),
                'status': 'PENDING',
                'provider_ref': data.get('reference', f'FRL-{order.id:06d}'),
                'message': data.get('message', 'Confirmez le paiement sur votre téléphone.'),
            }
        except requests.RequestException as e:
            logger.error("Mobicash initiate failed: %s", e)
            return {'status': 'FAILED', 'transaction_id': '', 'message': str(e)}

    def _simulate_payment(self, order, phone_number):
        """
        Simulation mode — used when MOBICASH_API_URL is empty (development/testing).
        Returns SUCCESS immediately (no phone to confirm in simulation).
        Will be bypassed automatically when API credentials are configured.
        """
        return {
            'transaction_id': f'MOB-{uuid.uuid4().hex[:12].upper()}',
            'status': 'SUCCESS',
            'provider_ref': f'FRL-{order.id:06d}',
            'message': '[SIMULATION] Paiement accepté automatiquement.',
        }

    def verify(self, transaction_id):
        if not self.api_url:
            return 'SUCCESS'  # Simulation

        try:
            headers = {'Authorization': f'Bearer {self.api_secret}'}
            resp = requests.get(
                f'{self.api_url}/api/v1/payment/status/{transaction_id}',
                headers=headers, timeout=15,
            )
            resp.raise_for_status()
            data = resp.json()
            status_map = {'completed': 'SUCCESS', 'pending': 'PENDING', 'failed': 'FAILED'}
            return status_map.get(data.get('status'), 'PENDING')
        except requests.RequestException as e:
            logger.error("Mobicash verify failed: %s", e)
            return 'PENDING'

    def validate_webhook(self, payload, signature):
        """
        Validate incoming webhook from Mobicash.

        Production setup:
        1. Set MOBICASH_WEBHOOK_SECRET (or PAYMENT_WEBHOOK_SECRET) in .env
        2. Mobicash sends X-Webhook-Signature header with HMAC-SHA256 of the raw body
        3. This method compares the expected HMAC with the received signature

        Without a secret configured, ALL webhooks are rejected (safe-by-default).
        """
        if not self.webhook_secret:
            logger.warning(
                "Mobicash validate_webhook called without webhook secret "
                "configured. Rejecting for safety."
            )
            return False
        if not signature:
            return False
        body = payload.encode('utf-8') if isinstance(payload, str) else payload
        expected = hmac.new(
            self.webhook_secret.encode('utf-8'),
            body,
            hashlib.sha256,
        ).hexdigest()
        return hmac.compare_digest(expected, signature)

    def parse_webhook(self, payload):
        return {
            'transaction_id': payload.get('transaction_id'),
            'status': 'SUCCESS' if payload.get('status') == 'completed' else 'FAILED',
            'provider_ref': payload.get('reference'),
            'amount': payload.get('amount'),
        }

    def disburse(self, phone_number, amount, currency, reference):
        """
        Disburse funds to a mobile money number (wallet withdrawal).
        Simulation mode when MOBICASH_API_URL is empty.
        """
        if not self.api_url:
            logger.warning("Mobicash non configuré — simulation retrait")
            return self._simulate_disburse(phone_number, amount, currency)

        payload = {
            'merchant_id': self.merchant_id,
            'phone_number': phone_number,
            'amount': float(amount),
            'currency': currency,
            'reference': reference,
        }
        headers = {
            'Authorization': f'Bearer {self.api_secret}',
            'Content-Type': 'application/json',
        }
        try:
            resp = requests.post(
                f'{self.api_url}/api/v1/disbursement',
                json=payload, headers=headers, timeout=30,
            )
            resp.raise_for_status()
            data = resp.json()
            return {
                'transaction_id': data.get('transaction_id', ''),
                'status': 'SUCCESS' if data.get('status') == 'completed' else 'PENDING',
                'message': data.get('message', 'Décaissement initié.'),
            }
        except requests.RequestException as e:
            logger.error("Mobicash disburse failed: %s", e)
            return {'transaction_id': '', 'status': 'FAILED', 'message': str(e)}

    def _simulate_disburse(self, phone_number, amount, currency):
        """
        Simulation mode for disbursement — no network call.
        """
        return {
            'transaction_id': f'DMOB-{uuid.uuid4().hex[:12].upper()}',
            'status': 'SUCCESS',
            'message': f'[SIMULATION] {amount} {currency} envoyé au {phone_number}.',
        }


class AirtelMoneyProvider(BasePaymentProvider):
    """
    Intégration Airtel Money (Gabon).
    Documentation : https://developers.airtel.africa/

    Variables d'environnement requises :
    - AIRTEL_CLIENT_ID
    - AIRTEL_CLIENT_SECRET
    - AIRTEL_API_URL (sandbox/production — vide = mode simulation)
    - AIRTEL_WEBHOOK_SECRET
    """

    name = 'AIRTEL'

    def __init__(self):
        self.client_id = getattr(settings, 'AIRTEL_CLIENT_ID', '')
        self.client_secret = getattr(settings, 'AIRTEL_CLIENT_SECRET', '')
        self.api_url = getattr(settings, 'AIRTEL_API_URL', '')
        self.webhook_secret = (
            getattr(settings, 'AIRTEL_WEBHOOK_SECRET', '')
            or getattr(settings, 'PAYMENT_WEBHOOK_SECRET', '')
        )

    def _get_token(self):
        """Obtain OAuth2 access token via client_credentials grant."""
        resp = requests.post(
            f'{self.api_url}/auth/oauth2/token',
            json={
                'client_id': self.client_id,
                'client_secret': self.client_secret,
                'grant_type': 'client_credentials',
            },
            timeout=15,
        )
        resp.raise_for_status()
        return resp.json()['access_token']

    def initiate(self, order, phone_number):
        if not self.api_url:
            logger.warning("Airtel Money non configuré — simulation activée")
            return self._simulate_payment(order, phone_number)

        try:
            token = self._get_token()
            payload = {
                'reference': f'FRL-{order.id:06d}',
                'subscriber': {
                    'country': 'GA',
                    'currency': 'XAF',
                    'msisdn': phone_number,
                },
                'transaction': {
                    'amount': float(order.total_amount),
                    'country': 'GA',
                    'currency': 'XAF',
                    'id': f'FRL-{order.id:06d}',
                },
            }
            headers = {
                'Authorization': f'Bearer {token}',
                'X-Country': 'GA',
                'X-Currency': 'XAF',
                'Content-Type': 'application/json',
            }
            resp = requests.post(
                f'{self.api_url}/merchant/v2/payments/',
                json=payload, headers=headers, timeout=30,
            )
            resp.raise_for_status()
            data = resp.json().get('data', {}).get('transaction', {})
            return {
                'transaction_id': data.get('id', ''),
                'status': 'PENDING',
                'provider_ref': data.get('id', ''),
                'message': 'Confirmez le paiement sur votre téléphone.',
            }
        except requests.RequestException as e:
            logger.error("Airtel initiate failed: %s", e)
            return {'status': 'FAILED', 'transaction_id': '', 'message': str(e)}

    def _simulate_payment(self, order, phone_number):
        """
        Simulation mode — used when AIRTEL_API_URL is empty (development/testing).
        Returns SUCCESS immediately (no phone to confirm in simulation).
        Will be bypassed automatically when API credentials are configured.
        """
        return {
            'transaction_id': f'AIR-{uuid.uuid4().hex[:12].upper()}',
            'status': 'SUCCESS',
            'provider_ref': f'FRL-{order.id:06d}',
            'message': '[SIMULATION] Paiement accepté automatiquement.',
        }

    def verify(self, transaction_id):
        if not self.api_url:
            return 'SUCCESS'

        try:
            token = self._get_token()
            headers = {
                'Authorization': f'Bearer {token}',
                'X-Country': 'GA',
                'X-Currency': 'XAF',
            }
            resp = requests.get(
                f'{self.api_url}/standard/v2/payments/{transaction_id}',
                headers=headers, timeout=15,
            )
            resp.raise_for_status()
            data = resp.json().get('data', {}).get('transaction', {})
            status_map = {'TS': 'SUCCESS', 'TF': 'FAILED', 'TA': 'PENDING'}
            return status_map.get(data.get('status'), 'PENDING')
        except requests.RequestException as e:
            logger.error("Airtel verify failed: %s", e)
            return 'PENDING'

    def validate_webhook(self, payload, signature):
        """
        Validate incoming webhook from Airtel Money.

        Production setup:
        1. Set AIRTEL_WEBHOOK_SECRET (or PAYMENT_WEBHOOK_SECRET) in .env
        2. Airtel sends X-Webhook-Signature header with HMAC-SHA256 of the raw body
        3. This method compares the expected HMAC with the received signature

        Without a secret configured, ALL webhooks are rejected (safe-by-default).
        """
        if not self.webhook_secret:
            logger.warning(
                "Airtel validate_webhook called without webhook secret "
                "configured. Rejecting for safety."
            )
            return False
        if not signature:
            return False
        body = payload.encode('utf-8') if isinstance(payload, str) else payload
        expected = hmac.new(
            self.webhook_secret.encode('utf-8'),
            body,
            hashlib.sha256,
        ).hexdigest()
        return hmac.compare_digest(expected, signature)

    def parse_webhook(self, payload):
        transaction = payload.get('transaction', {})
        status_map = {'TS': 'SUCCESS', 'TF': 'FAILED', 'TA': 'PENDING'}
        return {
            'transaction_id': transaction.get('id'),
            'status': status_map.get(transaction.get('status_code'), 'FAILED'),
            'provider_ref': transaction.get('id'),
            'amount': transaction.get('amount'),
        }

    def disburse(self, phone_number, amount, currency, reference):
        """
        Disburse funds via Airtel Money (wallet withdrawal).
        Simulation mode when AIRTEL_API_URL is empty.
        """
        if not self.api_url:
            logger.warning("Airtel Money non configuré — simulation retrait")
            return self._simulate_disburse(phone_number, amount, currency)

        try:
            token = self._get_token()
            payload = {
                'payee': {
                    'msisdn': phone_number,
                },
                'reference': reference,
                'transaction': {
                    'amount': float(amount),
                    'id': reference,
                },
            }
            headers = {
                'Authorization': f'Bearer {token}',
                'X-Country': 'GA',
                'X-Currency': currency,
                'Content-Type': 'application/json',
            }
            resp = requests.post(
                f'{self.api_url}/standard/v2/disbursements/',
                json=payload, headers=headers, timeout=30,
            )
            resp.raise_for_status()
            data = resp.json().get('data', {}).get('transaction', {})
            return {
                'transaction_id': data.get('id', ''),
                'status': 'SUCCESS' if data.get('status') == 'TS' else 'PENDING',
                'message': 'Décaissement initié.',
            }
        except requests.RequestException as e:
            logger.error("Airtel disburse failed: %s", e)
            return {'transaction_id': '', 'status': 'FAILED', 'message': str(e)}

    def _simulate_disburse(self, phone_number, amount, currency):
        """
        Simulation mode for disbursement — no network call.
        """
        return {
            'transaction_id': f'DAIR-{uuid.uuid4().hex[:12].upper()}',
            'status': 'SUCCESS',
            'message': f'[SIMULATION] {amount} {currency} envoyé au {phone_number}.',
        }


class CashProvider(BasePaymentProvider):
    """Paiement en espèces — confirmé manuellement par un admin."""

    name = 'CASH'

    def initiate(self, order, phone_number):
        return {
            'transaction_id': f'CASH-{uuid.uuid4().hex[:12].upper()}',
            'status': 'PENDING',
            'provider_ref': f'FRL-{order.id:06d}',
            'message': 'Paiement en espèces à confirmer à la livraison.',
        }

    def verify(self, transaction_id):
        return 'PENDING'

    def validate_webhook(self, payload, signature):
        return False  # Pas de webhook pour le cash

    def parse_webhook(self, payload):
        return {}


def get_provider(provider_name):
    """Factory pour obtenir le bon provider."""
    providers = {
        'MOBICASH': MobicashProvider,
        'AIRTEL': AirtelMoneyProvider,
        'CASH': CashProvider,
    }
    cls = providers.get(provider_name)
    if not cls:
        raise PaymentError(f"Provider inconnu : {provider_name}")
    return cls()
