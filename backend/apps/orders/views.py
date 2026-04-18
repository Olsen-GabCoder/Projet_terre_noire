import json
import logging

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, IsAdminUser, AllowAny
from rest_framework.pagination import PageNumberPagination
from rest_framework.views import APIView

from django.db.models import Prefetch
from django.http import HttpResponse

from rest_framework import generics, permissions

from .models import Order, OrderItem, Payment, Refund
from apps.core.invoice import generate_order_invoice_pdf


def _process_successful_payment(order):
    """
    Traitement commun après un paiement réussi.
    Appelé par PaymentViewSet, PaymentInitiateView, et PaymentWebhookView.

    Idempotent : si la commande est déjà PAID/SHIPPED/DELIVERED, ne fait rien.
    Atomique : verrouille la commande pour éviter le double-traitement
    en cas de webhooks concurrents.
    """
    from django.db import transaction

    with transaction.atomic():
        # Verrouiller la commande pour éviter le double-traitement
        order = Order.objects.select_for_update().get(pk=order.pk)
        if order.status in ('PAID', 'DELIVERED', 'SHIPPED', 'PARTIAL'):
            return  # Déjà traitée — ignore le doublon silencieusement

        order.status = 'PAID'
        order.save(update_fields=['status', 'updated_at'])

        try:
            from apps.marketplace.services import split_payment
            split_payment(order)
        except Exception:
            pass

        from apps.books.signals import update_sales_after_payment
        update_sales_after_payment(order)

    # Emails hors transaction (non bloquant) — envoyés UNIQUEMENT après paiement confirmé
    try:
        from apps.core.tasks import (
            send_order_paid_task,
            send_order_confirmation_task,
            send_vendor_new_order_task,
            send_delivery_assignment_task,
        )
        send_order_paid_task.delay(order.id)
        send_order_confirmation_task.delay(order.id)

        # Notifier chaque vendeur + livreur assigné
        from apps.marketplace.models import SubOrder
        for so in SubOrder.objects.filter(order=order).select_related('delivery_agent'):
            send_vendor_new_order_task.delay(so.id)
            if so.delivery_agent_id:
                send_delivery_assignment_task.delay(so.id)
    except Exception:
        pass
from apps.users.throttles import OrderCreateThrottle
from .serializers import (
    OrderCreateSerializer,
    OrderListSerializer,
    OrderStatusUpdateSerializer,
    PaymentSerializer,
    RefundSerializer,
    RefundCreateSerializer,
    RefundAdminSerializer,
)

logger = logging.getLogger(__name__)


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
    http_method_names = ['get', 'post', 'put', 'patch', 'head', 'options']

    def get_queryset(self):
        from django.db.models import Q
        from apps.marketplace.models import SubOrder
        from apps.orders.models import OrderEvent

        # Évite N+1 sur items → book/vendor, sub_orders → vendor/agent, events → actor
        items_prefetch = Prefetch(
            'items',
            queryset=OrderItem.objects.select_related('book__category', 'book__author', 'vendor')
        )
        suborders_prefetch = Prefetch(
            'sub_orders',
            queryset=SubOrder.objects.select_related('vendor', 'delivery_agent__user')
        )
        events_prefetch = Prefetch(
            'events',
            queryset=OrderEvent.objects.select_related('actor').order_by('-created_at')
        )
        qs = (
            Order.objects
            .select_related('user')
            .prefetch_related(items_prefetch, suborders_prefetch, events_prefetch)
            .order_by('-created_at')
        )
        # Admin voit toutes les commandes, utilisateur voit les siennes
        if not self.request.user.is_staff:
            return qs.filter(user=self.request.user)

        # C2 : filtres admin
        params = self.request.query_params
        status_filter = params.get('status', '').strip()
        if status_filter:
            qs = qs.filter(status__in=status_filter.split(','))

        search = params.get('search', '').strip()
        if search:
            qs = qs.filter(
                Q(id__icontains=search) |
                Q(user__first_name__icontains=search) |
                Q(user__last_name__icontains=search) |
                Q(user__email__icontains=search) |
                Q(shipping_city__icontains=search)
            )

        date_from = params.get('date_from', '').strip()
        if date_from:
            qs = qs.filter(created_at__date__gte=date_from)

        date_to = params.get('date_to', '').strip()
        if date_to:
            qs = qs.filter(created_at__date__lte=date_to)

        vendor = params.get('vendor', '').strip()
        if vendor:
            qs = qs.filter(sub_orders__vendor_id=vendor).distinct()

        return qs

    def get_serializer_class(self):
        if self.action == 'create':
            return OrderCreateSerializer
        if self.action in ('partial_update', 'update'):
            return OrderStatusUpdateSerializer
        return OrderListSerializer

    def get_throttles(self):
        if self.action == 'create':
            return [OrderCreateThrottle()]
        return super().get_throttles()

    @action(detail=False, methods=['get'], url_path='export', permission_classes=[IsAdminUser])
    def export_csv(self, request):
        """C2 : GET /api/orders/export/ — export CSV filtré (admin)."""
        import csv
        from io import StringIO

        qs = self.get_queryset()
        output = StringIO()
        writer = csv.writer(output)
        writer.writerow(['ID', 'Statut', 'Client', 'Email', 'Date', 'Total FCFA', 'Ville', 'Articles', 'SubOrders'])

        for order in qs[:500]:
            client_name = order.user.get_full_name() if order.user else '—'
            client_email = order.user.email if order.user else '—'
            items_summary = '; '.join(f"{i.book.title} x{i.quantity}" for i in order.items.all())
            sub_count = len(order.sub_orders.all())
            writer.writerow([
                order.id, order.get_status_display(), client_name, client_email,
                order.created_at.strftime('%Y-%m-%d'), float(order.total_amount),
                order.shipping_city, items_summary, sub_count,
            ])

        response = HttpResponse(output.getvalue(), content_type='text/csv; charset=utf-8')
        response['Content-Disposition'] = 'attachment; filename="commandes-frollot.csv"'
        return response

    def create(self, request, *args, **kwargs):
        import uuid as uuid_module
        from django.utils import timezone
        from datetime import timedelta

        # Idempotence : si client_request_id déjà connu pour cet utilisateur
        # dans les 5 dernières minutes, retourner la commande existante (HTTP 200)
        # au lieu d'en créer une nouvelle — évite les doublons en cas de timeout.
        client_request_id = None
        raw_crid = request.data.get('client_request_id')
        if raw_crid:
            try:
                client_request_id = uuid_module.UUID(str(raw_crid))
            except (ValueError, AttributeError):
                pass  # UUID invalide — ignoré silencieusement

        if client_request_id is not None:
            cutoff = timezone.now() - timedelta(seconds=300)
            existing = Order.objects.filter(
                user=request.user,
                client_request_id=client_request_id,
                created_at__gte=cutoff,
            ).first()
            if existing:
                logger.info(
                    "Idempotence : commande #%s retournée pour client_request_id=%s",
                    existing.id, client_request_id,
                )
                response_serializer = OrderListSerializer(existing, context={'request': request})
                return Response(response_serializer.data, status=status.HTTP_200_OK)

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        order = serializer.save()

        if client_request_id is not None:
            Order.objects.filter(pk=order.pk).update(client_request_id=client_request_id)
            order.client_request_id = client_request_id

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
        if old_status != 'SHIPPED' and instance.status == 'SHIPPED':
            from apps.core.tasks import send_order_shipped_task
            send_order_shipped_task.delay(instance.id)
        response_serializer = OrderListSerializer(instance, context={'request': request})
        return Response(response_serializer.data)

    @action(detail=True, methods=['post'], url_path='cancel')
    def cancel_order(self, request, pk=None):
        """
        Endpoint: POST /api/orders/{id}/cancel/
        Annuler une commande (uniquement si PENDING).
        Restaure le stock des listings marketplace.
        """
        order = self.get_object()

        if order.status != 'PENDING':
            return Response(
                {'error': 'Seules les commandes en attente peuvent être annulées.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        from django.db import transaction
        from django.db.models import F

        with transaction.atomic():
            # Restaurer le stock des listings marketplace (F() pour éviter les race conditions)
            for item in order.items.select_related('listing', 'listing__book'):
                if item.listing and item.listing.book.format != 'EBOOK':
                    item.listing.stock = F('stock') + item.quantity
                    item.listing.save(update_fields=['stock'])

            # A5 / P3.5 : restaurer le coupon
            if order.coupon_code:
                from apps.coupons.models import Coupon
                try:
                    coupon = Coupon.objects.get(code=order.coupon_code, status='USED')
                    coupon.restore()
                    logger.info("Coupon '%s' restauré (annulation commande #%s)", order.coupon_code, order.id)
                except Coupon.DoesNotExist:
                    # Legacy : fallback F() pour les anciens coupons sans statut
                    Coupon.objects.filter(code=order.coupon_code).update(
                        usage_count=F('usage_count') - 1
                    )

            order.status = 'CANCELLED'
            order.save(update_fields=['status', 'updated_at'])

            # P4 : annuler les SubOrders enfants non livrées
            from apps.marketplace.models import SubOrder
            # Remettre à zéro les discount_amount des SubOrders avec coupon
            SubOrder.objects.filter(order=order, coupon__isnull=False).update(
                discount_amount=0, coupon=None,
            )
            SubOrder.objects.filter(order=order).exclude(
                status__in=['DELIVERED', 'CANCELLED'],
            ).update(status='CANCELLED')

        # C3 : journal d'activité
        from apps.orders.utils import log_order_event
        log_order_event(order, 'CANCELLATION', f"Commande #{order.id} annulée par le client",
                        actor=request.user, actor_role='client', from_status='PENDING', to_status='CANCELLED')

        from apps.core.tasks import send_order_cancelled_task, send_cancellation_notice_task
        send_order_cancelled_task.delay(order.id)

        # A4 : notifier vendeurs et livreurs des SubOrders annulées
        from apps.marketplace.models import SubOrder as SO
        for so in SO.objects.filter(order=order, status='CANCELLED').select_related('vendor', 'delivery_agent'):
            try:
                if so.vendor:
                    send_cancellation_notice_task.delay(so.id, 'vendor')
                if so.delivery_agent:
                    send_cancellation_notice_task.delay(so.id, 'delivery')
            except Exception:
                logger.exception("Erreur notification annulation SubOrder #%s", so.id)

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

        # B5 : autoriser le retry si le paiement précédent a échoué
        if Payment.objects.filter(order=order, status='SUCCESS').exists():
            return Response(
                {'error': 'Cette commande a déjà été payée.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        # Supprimer les paiements FAILED pour permettre le retry
        Payment.objects.filter(order=order, status='FAILED').delete()

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        payment = serializer.save(order=order)

        if payment.status == 'FAILED':
            from apps.core.tasks import send_payment_failed_task
            send_payment_failed_task.delay(order.id)

        if payment.status == 'SUCCESS':
            _process_successful_payment(order)

        return Response(serializer.data, status=status.HTTP_201_CREATED)


class PaymentInitiateView(APIView):
    """
    POST /api/payments/initiate/
    Initie un paiement via le provider (Mobicash, Airtel, Cash).
    Body : { order_id, provider, phone_number }
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        order_id = request.data.get('order_id')
        provider_name = request.data.get('provider')
        phone_number = request.data.get('phone_number', '')

        if not order_id or not provider_name:
            return Response({'error': 'order_id et provider requis.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            order = Order.objects.get(id=order_id, user=request.user)
        except Order.DoesNotExist:
            return Response({'error': 'Commande introuvable.'}, status=status.HTTP_404_NOT_FOUND)

        if order.status != 'PENDING':
            return Response({'error': 'Cette commande ne peut plus être payée.'}, status=status.HTTP_400_BAD_REQUEST)

        # B5 : autoriser le retry si le paiement précédent a échoué
        if Payment.objects.filter(order=order, status='SUCCESS').exists():
            return Response({'error': 'Cette commande a déjà été payée.'}, status=status.HTTP_400_BAD_REQUEST)
        Payment.objects.filter(order=order, status='FAILED').delete()

        from .payment_gateway import get_provider, PaymentError
        try:
            provider = get_provider(provider_name)
            result = provider.initiate(order, phone_number)
        except PaymentError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

        payment = Payment.objects.create(
            order=order,
            transaction_id=result['transaction_id'],
            provider=provider_name,
            status=result['status'],
            amount=order.total_amount,
        )

        if result['status'] == 'FAILED':
            from apps.core.tasks import send_payment_failed_task
            send_payment_failed_task.delay(order.id)

        if result['status'] == 'SUCCESS':
            _process_successful_payment(order)

        return Response({
            'payment_id': payment.id,
            'transaction_id': result['transaction_id'],
            'status': result['status'],
            'message': result.get('message', ''),
        }, status=status.HTTP_201_CREATED)


class PaymentWebhookView(APIView):
    """
    POST /api/payments/webhook/<provider>/
    Webhook appelé par le provider de paiement (Mobicash, Airtel).
    Pas d'authentification JWT — validé par signature HMAC.
    """
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request, provider_name):
        from .payment_gateway import get_provider, PaymentError

        try:
            provider = get_provider(provider_name.upper())
        except PaymentError:
            return Response({'error': 'Provider inconnu.'}, status=status.HTTP_400_BAD_REQUEST)

        signature = request.headers.get('X-Webhook-Signature', '')
        raw_body = request.body.decode('utf-8') if isinstance(request.body, bytes) else json.dumps(request.data)

        if not provider.validate_webhook(raw_body, signature):
            logger.warning("Webhook %s : signature invalide", provider_name)
            return Response({'error': 'Signature invalide.'}, status=status.HTTP_403_FORBIDDEN)

        result = provider.parse_webhook(request.data)
        transaction_id = result.get('transaction_id')
        if not transaction_id:
            return Response({'error': 'transaction_id manquant.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            payment = Payment.objects.select_related('order').get(transaction_id=transaction_id)
        except Payment.DoesNotExist:
            logger.warning("Webhook %s : transaction %s inconnue", provider_name, transaction_id)
            return Response({'error': 'Transaction inconnue.'}, status=status.HTTP_404_NOT_FOUND)

        if payment.status != 'PENDING':
            return Response({'status': 'already_processed'})

        new_status = result.get('status', 'FAILED')
        payment.status = new_status
        payment.save()

        if new_status == 'SUCCESS':
            order = payment.order
            _process_successful_payment(order)
            logger.info("Paiement %s confirmé via webhook %s", transaction_id, provider_name)

        return Response({'status': 'ok'})


class EbookAccessCheckView(APIView):
    """
    B3 : GET /api/orders/access-check/<book_id>/
    Vérifie si l'utilisateur a acheté un ebook (ou si le livre est gratuit).
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, book_id):
        from apps.books.models import Book

        try:
            book = Book.objects.get(pk=book_id)
        except Book.DoesNotExist:
            return Response({'has_access': False})

        # Livre gratuit → accès libre
        if book.price == 0:
            return Response({'has_access': True})

        # Vérifie si l'utilisateur a un OrderItem payé pour ce livre
        has_access = OrderItem.objects.filter(
            order__user=request.user,
            book_id=book_id,
            order__status__in=['PAID', 'SHIPPED', 'DELIVERED', 'PARTIAL'],
        ).exists()

        return Response({'has_access': has_access})


# ══════════════════════════════════════════════════════════════
# Remboursements
# ══════════════════════════════════════════════════════════════

class RefundCreateView(generics.CreateAPIView):
    """Client demande un remboursement sur une commande PAID/DELIVERED."""
    serializer_class = RefundCreateSerializer
    permission_classes = [IsAuthenticated]

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class RefundListView(generics.ListAPIView):
    """Client voit ses demandes de remboursement."""
    serializer_class = RefundSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = StandardResultsSetPagination

    def get_queryset(self):
        return Refund.objects.filter(user=self.request.user).select_related('order')


class RefundAdminListView(generics.ListAPIView):
    """Admin voit toutes les demandes de remboursement."""
    serializer_class = RefundSerializer
    permission_classes = [IsAdminUser]
    pagination_class = StandardResultsSetPagination

    def get_queryset(self):
        qs = Refund.objects.select_related('order', 'user')
        status_filter = self.request.query_params.get('status')
        if status_filter:
            qs = qs.filter(status=status_filter)
        return qs


class RefundAdminActionView(APIView):
    """Admin approuve ou rejette un remboursement."""
    permission_classes = [IsAdminUser]

    def post(self, request, pk):
        from django.db import transaction
        from django.utils import timezone
        from django.shortcuts import get_object_or_404

        refund = get_object_or_404(Refund, pk=pk)
        if refund.status != 'REQUESTED':
            return Response(
                {'error': 'Ce remboursement a déjà été traité.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = RefundAdminSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        action = serializer.validated_data['action']
        admin_note = serializer.validated_data.get('admin_note', '')

        if action == 'reject':
            refund.status = 'REJECTED'
            refund.admin_note = admin_note
            refund.save(update_fields=['status', 'admin_note', 'updated_at'])
            return Response({'message': 'Remboursement rejeté.', 'status': 'REJECTED'})

        # Approuver + traiter le remboursement
        with transaction.atomic():
            refund.status = 'PROCESSED'
            refund.admin_note = admin_note
            refund.processed_at = timezone.now()
            refund.save(update_fields=['status', 'admin_note', 'processed_at', 'updated_at'])

            refund.order.status = 'REFUNDED'
            refund.order.save(update_fields=['status', 'updated_at'])

            # TODO: débiter les VendorWallets proportionnellement
            # TODO: initier le remboursement mobile money via payment_gateway.disburse()

        # Journal d'activité
        from apps.orders.utils import log_order_event
        log_order_event(
            refund.order, 'STATUS_CHANGE',
            f"Remboursement #{refund.pk} approuvé — {refund.amount} FCFA",
            actor=request.user, actor_role='admin',
            from_status='PAID', to_status='REFUNDED',
        )

        # Notifier le client
        try:
            from apps.core.email import send_async, send_templated_email
            send_async(
                send_templated_email,
                subject=f"Remboursement approuvé — Commande #{refund.order_id}",
                template_name='refund_approved',
                context={
                    'user': refund.user,
                    'refund': refund,
                    'order': refund.order,
                },
                to_emails=[refund.user.email],
            )
        except Exception:
            pass

        return Response({'message': 'Remboursement approuvé et traité.', 'status': 'PROCESSED'})
