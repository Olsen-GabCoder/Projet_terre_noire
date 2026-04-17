"""
Passerelle de paiement Frollot — Mobicash & Airtel Money.

Architecture :
1. Le frontend initie un paiement → POST /api/payments/initiate/
2. Le backend contacte l'API du provider (Mobicash/Airtel)
3. L'utilisateur confirme sur son téléphone (USSD push)
4. Le provider envoie un webhook → POST /api/payments/webhook/{provider}/
5. Le backend met à jour le Payment et la commande

En attendant l'intégration réelle des SDK, ce module simule le flux
et expose les points d'entrée prêts à brancher.
"""
import hashlib
import hmac
import logging
import uuid

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
    - MOBICASH_API_URL (sandbox/production)
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
            return self._simulate(order, phone_number)

        # TODO: Appel réel à l'API Mobicash
        # import requests
        # response = requests.post(f'{self.api_url}/payment/init', json={
        #     'merchant_id': self.merchant_id,
        #     'amount': str(order.total_amount),
        #     'currency': 'XAF',
        #     'phone': phone_number,
        #     'reference': f'FRL-{order.id:06d}',
        #     'callback_url': f'{settings.BACKEND_URL}/api/payments/webhook/mobicash/',
        # }, headers={'Authorization': f'Bearer {self.api_key}'})
        # data = response.json()
        # return {
        #     'transaction_id': data['transaction_id'],
        #     'status': 'PENDING',
        #     'provider_ref': data['reference'],
        #     'message': 'Confirmez le paiement sur votre téléphone.',
        # }
        return self._simulate(order, phone_number)

    def _simulate(self, order, phone_number):
        return {
            'transaction_id': f'MOB-{uuid.uuid4().hex[:12].upper()}',
            'status': 'PENDING',
            'provider_ref': f'FRL-{order.id:06d}',
            'message': f'[SIMULATION] USSD push envoyé au {phone_number}. Confirmez le paiement.',
        }

    def verify(self, transaction_id):
        if not self.api_url:
            return 'SUCCESS'  # Simulation
        # TODO: GET {api_url}/payment/status/{transaction_id}
        return 'PENDING'

    def validate_webhook(self, payload, signature):
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
        if not self.api_url:
            logger.warning("Mobicash non configure — simulation retrait")
            return {
                'transaction_id': f'DMOB-{uuid.uuid4().hex[:12].upper()}',
                'status': 'SUCCESS',
                'message': f'[SIMULATION] {amount} {currency} envoye au {phone_number}.',
            }
        # TODO: Appel reel a l'API Mobicash disbursement
        return {
            'transaction_id': f'DMOB-{uuid.uuid4().hex[:12].upper()}',
            'status': 'SUCCESS',
            'message': f'[SIMULATION] {amount} {currency} envoye au {phone_number}.',
        }


class AirtelMoneyProvider(BasePaymentProvider):
    """
    Intégration Airtel Money (Gabon).
    Documentation : https://developers.airtel.africa/

    Variables d'environnement requises :
    - AIRTEL_CLIENT_ID
    - AIRTEL_CLIENT_SECRET
    - AIRTEL_API_URL (sandbox/production)
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

    def initiate(self, order, phone_number):
        if not self.api_url:
            logger.warning("Airtel Money non configuré — simulation activée")
            return self._simulate(order, phone_number)

        # TODO: Appel réel à l'API Airtel Money
        # 1. Obtenir un access_token via POST /auth/oauth2/token
        # 2. Initier le paiement via POST /merchant/v2/payments/
        # import requests
        # token_res = requests.post(f'{self.api_url}/auth/oauth2/token', json={
        #     'client_id': self.client_id, 'client_secret': self.client_secret,
        #     'grant_type': 'client_credentials',
        # })
        # access_token = token_res.json()['access_token']
        # pay_res = requests.post(f'{self.api_url}/merchant/v2/payments/', json={
        #     'reference': f'FRL-{order.id:06d}',
        #     'subscriber': {'country': 'GA', 'currency': 'XAF', 'msisdn': phone_number},
        #     'transaction': {'amount': str(order.total_amount), 'country': 'GA', 'currency': 'XAF'},
        # }, headers={'Authorization': f'Bearer {access_token}', 'X-Country': 'GA', 'X-Currency': 'XAF'})
        # data = pay_res.json()['data']['transaction']
        # return {
        #     'transaction_id': data['id'],
        #     'status': 'PENDING',
        #     'provider_ref': data['id'],
        #     'message': 'Confirmez le paiement sur votre téléphone.',
        # }
        return self._simulate(order, phone_number)

    def _simulate(self, order, phone_number):
        return {
            'transaction_id': f'AIR-{uuid.uuid4().hex[:12].upper()}',
            'status': 'PENDING',
            'provider_ref': f'FRL-{order.id:06d}',
            'message': f'[SIMULATION] STK push envoyé au {phone_number}. Confirmez le paiement.',
        }

    def verify(self, transaction_id):
        if not self.api_url:
            return 'SUCCESS'
        # TODO: GET /standard/v2/payments/{transaction_id}
        return 'PENDING'

    def validate_webhook(self, payload, signature):
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
        if not self.api_url:
            logger.warning("Airtel Money non configure — simulation retrait")
            return {
                'transaction_id': f'DAIR-{uuid.uuid4().hex[:12].upper()}',
                'status': 'SUCCESS',
                'message': f'[SIMULATION] {amount} {currency} envoye au {phone_number}.',
            }
        # TODO: Appel reel a l'API Airtel Money disbursement
        # POST /standard/v2/disbursements/
        return {
            'transaction_id': f'DAIR-{uuid.uuid4().hex[:12].upper()}',
            'status': 'SUCCESS',
            'message': f'[SIMULATION] {amount} {currency} envoye au {phone_number}.',
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
