from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from rest_framework.pagination import PageNumberPagination

from django.db.models import Prefetch
from django.http import HttpResponse

from .models import Order, OrderItem, Payment
from apps.core.invoice import generate_order_invoice_pdf
from .serializers import (
    OrderCreateSerializer,
    OrderListSerializer,
    OrderStatusUpdateSerializer,
    PaymentSerializer
)


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
        serializer = self.get_serializer(instance, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
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