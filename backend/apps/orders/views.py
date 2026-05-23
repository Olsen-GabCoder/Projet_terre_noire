import logging
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
        
        if hasattr(order, 'payment'):
            return Response(
                {'error': 'Cette commande a déjà un paiement'},
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
    rate = '12/min'


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

        if hasattr(order, 'payment') and order.payment.is_final:
            return Response(
                {'error': 'Cette commande a deja un paiement finalise.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Si paiement pending existe deja, le reutiliser
        if hasattr(order, 'payment') and order.payment.status == 'PENDING':
            existing = order.payment
            return Response({
                'bamboo_ref': existing.transaction_id,
                'status': 'PENDING',
                'message': 'Paiement deja initie. Verifiez votre telephone.',
            })

        # Appeler Bamboo Pay
        try:
            service = get_bamboo_service()
            reference = f"TN-{order.id}"
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
                {'error': str(e)},
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

            tx = result.get('transaction', {})
            bamboo_status = tx.get('status', 'pending')

            # Mapper le statut Bamboo -> statut Payment
            status_map = {
                'completed': 'SUCCESS',
                'failed': 'FAILED',
                'pending': 'PENDING',
            }
            new_status = status_map.get(bamboo_status, 'PENDING')

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
            logger.error("payment.check_failed ref=%s err=%s", bamboo_ref, str(e))
            return Response(
                {'error': str(e)},
                status=status.HTTP_502_BAD_GATEWAY
            )