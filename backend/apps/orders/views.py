import logging
import uuid
from datetime import timedelta
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from rest_framework.pagination import PageNumberPagination
from rest_framework.views import APIView
from rest_framework.throttling import UserRateThrottle

from django.db import transaction
from django.db.models import Prefetch
from django.http import HttpResponse
from django.utils import timezone

from .models import Order, OrderItem, Payment
from apps.core.invoice import generate_order_invoice_pdf
from .serializers import (
    OrderCreateSerializer,
    OrderListSerializer,
    OrderStatusUpdateSerializer,
    PaymentSerializer
)
from .services.bamboo_pay import get_bamboo_service, BambooPayError

logger = logging.getLogger('bamboo_pay')


class StandardResultsSetPagination(PageNumberPagination):
    page_size = 10
    page_size_query_param = 'page_size'
    max_page_size = 50


class OrderViewSet(viewsets.ModelViewSet):
    """
    ViewSet pour la gestion des commandes
    
    Actions:
    - list: GET /api/orders/ - Historique des commandes
    - retrieve: GET /api/orders/{id}/ - Détail d'une commande
    - create: POST /api/orders/ - Créer une commande
    """
    
    permission_classes = [IsAuthenticated]
    pagination_class = StandardResultsSetPagination
    
    def get_queryset(self):
        items_prefetch = Prefetch(
            'items',
            queryset=OrderItem.objects.select_related('book__category', 'book__author')
        )
        qs = Order.objects.select_related('user').prefetch_related(items_prefetch).order_by('-created_at')
        # Admin voit toutes les commandes, utilisateur voit les siennes
        if self.request.user.is_staff:
            return qs
        return qs.filter(user=self.request.user)
    
    def get_serializer_class(self):
        if self.action == 'create':
            return OrderCreateSerializer
        if self.action in ('partial_update', 'update'):
            return OrderStatusUpdateSerializer
        return OrderListSerializer
    
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        order = serializer.save()
        
        response_serializer = OrderListSerializer(order, context={'request': request})
        return Response(response_serializer.data, status=status.HTTP_201_CREATED)

    def partial_update(self, request, *args, **kwargs):
        """Mise à jour du statut (admin uniquement). Retourne la commande complète."""
        if not request.user.is_staff:
            return Response(
                {'error': 'Seuls les administrateurs peuvent modifier le statut.'},
                status=status.HTTP_403_FORBIDDEN
            )
        instance = self.get_object()
        old_status = instance.status
        serializer = self.get_serializer(instance, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        new_status = instance.status
        if old_status != new_status:
            try:
                from apps.core.email import send_order_shipped, send_order_paid, send_order_cancelled, send_order_status_changed
                if new_status == 'SHIPPED':
                    send_order_shipped(instance)
                elif new_status == 'PAID':
                    send_order_paid(instance)
                elif new_status == 'CANCELLED':
                    send_order_cancelled(instance)
                else:
                    send_order_status_changed(instance, old_status, new_status)
            except Exception as e:
                import logging
                logging.getLogger(__name__).error(f"[EMAIL] Echec notification statut commande #{instance.id}: {e}", exc_info=True)
        response_serializer = OrderListSerializer(instance, context={'request': request})
        return Response(response_serializer.data)
    
    @action(detail=True, methods=['post'], url_path='cancel')
    def cancel_order(self, request, pk=None):
        """
        Endpoint: POST /api/orders/{id}/cancel/
        Annuler une commande (uniquement si PENDING)
        """
        order = self.get_object()
        
        if order.status != 'PENDING':
            return Response(
                {'error': 'Seules les commandes en attente peuvent être annulées.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        order.status = 'CANCELLED'
        order.save()

        try:
            from apps.core.email import send_order_cancelled, send_order_cancelled_admin
            send_order_cancelled(order)
            send_order_cancelled_admin(order)
        except Exception as e:
            import logging
            logging.getLogger(__name__).error(f"[EMAIL] Echec notification annulation commande #{order.id}: {e}", exc_info=True)

        serializer = OrderListSerializer(order, context={'request': request})
        return Response(serializer.data)

    @action(detail=True, methods=['get'], url_path='invoice')
    def download_invoice(self, request, pk=None):
        """
        GET /api/orders/{id}/invoice/
        Télécharge la facture PDF de la commande (authentifié, ses commandes uniquement).
        """
        order = self.get_object()
        pdf_buffer = generate_order_invoice_pdf(order)
        filename = f"facture-commande-{order.id:06d}.pdf"
        response = HttpResponse(pdf_buffer.getvalue(), content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        return response


class PaymentViewSet(viewsets.ModelViewSet):
    """
    ViewSet pour la gestion des paiements
    
    Actions:
    - create: POST /api/payments/ - Enregistrer un paiement
    - retrieve: GET /api/payments/{id}/ - Détail d'un paiement
    """
    
    permission_classes = [IsAuthenticated]
    serializer_class = PaymentSerializer
    http_method_names = ['get', 'post']
    
    def get_queryset(self):
        return Payment.objects.filter(order__user=self.request.user).select_related('order')
    
    def create(self, request, *args, **kwargs):
        order_id = request.data.get('order_id')
        
        if not order_id:
            return Response(
                {'error': 'order_id requis'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            order = Order.objects.get(id=order_id, user=request.user)
        except Order.DoesNotExist:
            return Response(
                {'error': 'Commande introuvable'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        if order.status != 'PENDING':
            return Response(
                {'error': 'Cette commande ne peut plus être payée'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if order.payments.filter(status='SUCCESS').exists():
            return Response(
                {'error': 'Cette commande a déjà été payée'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        payment = serializer.save(order=order)
        
        if payment.status == 'SUCCESS':
            order.status = 'PAID'
            order.save()
            # Envoi email de confirmation de paiement
            try:
                from apps.core.email import send_order_paid
                send_order_paid(order)
            except Exception:
                pass
        
        return Response(serializer.data, status=status.HTTP_201_CREATED)


# =============================================
#  BAMBOO PAY — Paiement Mobile Money
# =============================================

class PaymentCheckStatusThrottle(UserRateThrottle):
    # Le polling client = 1 req/5s = 12/min exact.
    # La fenetre glissante DRF peut throttler a 12/min.
    # 20/min donne une marge confortable sans risquer d'abus.
    rate = '20/min'


class PaymentInitiateView(APIView):
    """POST /api/payments/initiate/ — Initie un paiement Bamboo Pay."""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        order_id = request.data.get('order_id')
        operator = request.data.get('operator')  # moov_money | airtel_money
        phone = request.data.get('phone')

        # Validation
        if not all([order_id, operator, phone]):
            return Response(
                {'error': 'order_id, operator et phone sont requis.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if operator not in ('moov_money', 'airtel_money'):
            return Response(
                {'error': "operator doit etre 'moov_money' ou 'airtel_money'."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Validation du numero de telephone
        phone_digits = ''.join(c for c in phone if c.isdigit())
        if len(phone_digits) < 8 or len(phone_digits) > 9:
            return Response(
                {'error': 'Le numéro de téléphone doit comporter 8 ou 9 chiffres.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        if len(phone_digits) == 8:
            phone_digits = '0' + phone_digits
        if not phone_digits[0] == '0':
            return Response(
                {'error': 'Le numéro de téléphone doit commencer par 0.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        phone = phone_digits

        # Verifier la commande
        try:
            order = Order.objects.get(id=order_id, user=request.user)
        except Order.DoesNotExist:
            return Response(
                {'error': 'Commande introuvable.'},
                status=status.HTTP_404_NOT_FOUND
            )

        if order.status != 'PENDING':
            return Response(
                {'error': 'Cette commande ne peut plus etre payee.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Si la commande est deja payee, refuser
        if order.payments.filter(status='SUCCESS').exists():
            return Response(
                {'error': 'Cette commande a déjà été payée.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Si un paiement PENDING existe, verifier s'il est expire ou reutilisable
        current_payment = order.payments.filter(status='PENDING').order_by('-created_at').first()
        if current_payment:
            if current_payment.created_at < timezone.now() - timedelta(minutes=10):
                # Expirer le paiement obsolete
                with transaction.atomic():
                    current_payment.status = 'EXPIRED'
                    current_payment.finalized_at = timezone.now()
                    current_payment.save()
                logger.info("payment.auto_expired_on_retry ref=%s", current_payment.transaction_id)
            else:
                # Reutiliser le paiement pending actif
                return Response({
                    'bamboo_ref': current_payment.transaction_id,
                    'status': 'PENDING',
                    'message': 'Paiement déjà initié. Vérifiez votre téléphone.',
                })

        # Appeler Bamboo Pay
        try:
            service = get_bamboo_service()
            reference = f"TN-{order.id}-{uuid.uuid4().hex[:8]}"
            payer_name = request.user.get_full_name() or request.user.username

            result = service.initiate_instant_payment(
                phone=phone,
                amount=int(order.total_amount),
                payer_name=payer_name,
                reference=reference,
                operator=operator,
            )

            # Creer le Payment en DB
            bamboo_ref = result.get('reference_bp', reference)
            provider = Payment.BAMBOO_OPERATOR_MAP.get(operator, 'MOBICASH')

            payment = Payment.objects.create(
                order=order,
                transaction_id=bamboo_ref,
                provider=provider,
                status='PENDING',
                amount=order.total_amount,
                phone_number=phone,
                bamboo_response=result,
            )

            logger.info(
                "payment.created order=%d ref=%s provider=%s amount=%s",
                order.id, bamboo_ref, provider, order.total_amount
            )

            return Response({
                'bamboo_ref': bamboo_ref,
                'merchant_ref': reference,
                'status': 'PENDING',
                'message': 'Paiement initie. Validez sur votre telephone.',
            }, status=status.HTTP_202_ACCEPTED)

        except BambooPayError as e:
            logger.error("payment.initiate_failed order=%d err=%s", order.id, str(e))
            return Response(
                {'error': 'Le service de paiement est temporairement indisponible. Veuillez réessayer dans quelques instants.'},
                status=status.HTTP_502_BAD_GATEWAY
            )


class PaymentCheckStatusView(APIView):
    """POST /api/payments/check-status/<bamboo_ref>/ — Verifie le statut."""
    permission_classes = [IsAuthenticated]
    throttle_classes = [PaymentCheckStatusThrottle]

    def post(self, request, bamboo_ref):
        # Trouver le payment
        try:
            payment = Payment.objects.select_related('order').get(
                transaction_id=bamboo_ref,
                order__user=request.user
            )
        except Payment.DoesNotExist:
            return Response(
                {'error': 'Paiement introuvable.'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Auto-expiration : PENDING > 10 minutes
        EXPIRATION_DELAY = timedelta(minutes=10)
        if payment.status == 'PENDING' and \
           payment.created_at < timezone.now() - EXPIRATION_DELAY:
            with transaction.atomic():
                payment.status = 'EXPIRED'
                payment.finalized_at = timezone.now()
                payment.save()
            logger.info(
                "payment.auto_expired ref=%s age=%s",
                bamboo_ref, timezone.now() - payment.created_at
            )
            return Response({
                'bamboo_ref': payment.transaction_id,
                'status': 'EXPIRED',
                'finalized_at': payment.finalized_at,
                'message': 'Paiement expiré après 10 minutes sans confirmation.',
            })

        # Idempotence : si deja final, retourner sans re-appeler Bamboo
        if payment.is_final:
            return Response({
                'bamboo_ref': payment.transaction_id,
                'status': payment.status,
                'finalized_at': payment.finalized_at,
            })

        # Appeler Bamboo Pay check-status
        try:
            service = get_bamboo_service()
            result = service.check_status(bamboo_ref)

            # Handle transaction not found at Bamboo
            if result.get('code') == 404 or not result.get('transaction'):
                logger.error("bamboo.transaction_not_found ref=%s", bamboo_ref)
                return Response(
                    {'error': 'Transaction introuvable côté Bamboo Pay.'},
                    status=status.HTTP_404_NOT_FOUND
                )

            tx = result.get('transaction', {})
            bamboo_status = tx.get('status', 'pending').lower().strip()

            # Mapper le statut Bamboo -> statut Payment
            STATUS_MAP = {
                'completed': 'SUCCESS',
                'success': 'SUCCESS',
                'successful': 'SUCCESS',
                'approved': 'SUCCESS',
                'paid': 'SUCCESS',
                'failed': 'FAILED',
                'rejected': 'FAILED',
                'cancelled': 'FAILED',
                'expired': 'EXPIRED',
                'timeout': 'EXPIRED',
                'pending': 'PENDING',
                'processing': 'PENDING',
            }
            new_status = STATUS_MAP.get(bamboo_status)
            if new_status is None:
                logger.warning(
                    "bamboo.unknown_status ref=%s raw_status=%r — fallback PENDING",
                    bamboo_ref, bamboo_status
                )
                new_status = 'PENDING'

            # Mettre a jour si le statut a change vers un etat final
            if new_status != 'PENDING' and payment.status == 'PENDING':
                with transaction.atomic():
                    payment.status = new_status
                    payment.bamboo_response = result
                    payment.finalized_at = timezone.now()
                    payment.save()

                    if new_status == 'SUCCESS':
                        payment.order.status = 'PAID'
                        payment.order.save()
                        # Email confirmation
                        try:
                            from apps.core.email import send_order_paid
                            send_order_paid(payment.order)
                        except Exception:
                            pass

                    logger.info(
                        "payment.finalized ref=%s status=%s order=%d",
                        bamboo_ref, new_status, payment.order.id
                    )

            return Response({
                'bamboo_ref': payment.transaction_id,
                'status': payment.status,
                'finalized_at': payment.finalized_at,
            })

        except BambooPayError as e:
            logger.warning(
                "payment.check_temporary_error ref=%s err=%s — returning PENDING",
                bamboo_ref, str(e)
            )
            return Response({
                'bamboo_ref': bamboo_ref,
                'status': 'PENDING',
                'message': 'Verification temporairement indisponible, nouvelle tentative en cours.',
            })


class PaymentWebhookView(APIView):
    """POST /api/payments/webhook/ — Notification asynchrone Bamboo Pay.

    Bamboo Pay appelle cette URL quand le statut d'une transaction change.
    Pas d'auth utilisateur (Bamboo appelle directement).
    """
    permission_classes = []
    authentication_classes = []

    def post(self, request):
        data = request.data
        reference = data.get('reference') or data.get('billingId')
        bamboo_status = (data.get('status') or 'pending').lower().strip()

        logger.info("webhook.received ref=%s status=%s", reference, bamboo_status)

        if not reference:
            logger.warning("webhook.invalid_payload data=%r", data)
            return Response({'error': 'reference manquante'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            payment = Payment.objects.select_related('order').get(
                transaction_id=reference
            )
        except Payment.DoesNotExist:
            logger.warning("webhook.payment_not_found ref=%s", reference)
            return Response({'error': 'payment introuvable'}, status=status.HTTP_404_NOT_FOUND)

        STATUS_MAP = {
            'completed': 'SUCCESS',
            'success': 'SUCCESS',
            'successful': 'SUCCESS',
            'approved': 'SUCCESS',
            'paid': 'SUCCESS',
            'failed': 'FAILED',
            'rejected': 'FAILED',
            'cancelled': 'FAILED',
            'expired': 'EXPIRED',
            'timeout': 'EXPIRED',
            'pending': 'PENDING',
            'processing': 'PENDING',
        }
        new_status = STATUS_MAP.get(bamboo_status)
        if new_status is None:
            logger.warning("webhook.unknown_status ref=%s status=%r", reference, bamboo_status)
            return Response({'status': 'unknown_status_logged'})

        # Cas special : Payment EXPIRED mais Bamboo confirme SUCCESS.
        # L'expiration est un timeout applicatif de notre cote, pas un echec
        # de paiement reel. On rattrape pour eviter que le client paie sans rien recevoir.
        if payment.status == 'EXPIRED' and new_status == 'SUCCESS':
            logger.warning(
                "webhook.recovering_expired ref=%s payment=%d — "
                "was EXPIRED but Bamboo confirms SUCCESS, recovering",
                reference, payment.id
            )
            with transaction.atomic():
                payment.status = 'SUCCESS'
                payment.bamboo_response = data
                payment.finalized_at = timezone.now()
                payment.save()

                if payment.order.status != 'PAID':
                    payment.order.status = 'PAID'
                    payment.order.save()
                    try:
                        from apps.core.email import send_order_paid
                        send_order_paid(payment.order)
                    except Exception:
                        pass

            return Response({'status': 'recovered'})

        # Idempotence : si deja final (SUCCESS, FAILED), ignorer
        if payment.is_final:
            logger.info("webhook.already_final ref=%s status=%s", reference, payment.status)
            return Response({'status': 'already_processed'})

        if new_status != 'PENDING':
            with transaction.atomic():
                payment.status = new_status
                payment.bamboo_response = data
                payment.finalized_at = timezone.now()
                payment.save()

                if new_status == 'SUCCESS':
                    payment.order.status = 'PAID'
                    payment.order.save()
                    try:
                        from apps.core.email import send_order_paid
                        send_order_paid(payment.order)
                    except Exception:
                        pass

                logger.info(
                    "webhook.finalized ref=%s status=%s order=%d",
                    reference, new_status, payment.order.id
                )

        return Response({'status': 'processed'})