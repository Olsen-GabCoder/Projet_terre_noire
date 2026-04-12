import logging

from django.shortcuts import get_object_or_404
from django.utils import timezone

logger = logging.getLogger(__name__)
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.organizations.models import Organization, OrganizationMembership
from apps.users.models import UserProfile

from .models import (
    BookListing, SubOrder, VendorWallet, WalletTransaction, DeliveryWallet,
)
from .permissions import (
    IsVendorMember, IsListingOwner, IsSubOrderVendor, IsDeliveryAgent,
)
from .serializers import (
    BookListingSerializer, BookListingCreateSerializer, BookListingUpdateSerializer,
    SubOrderSerializer, SubOrderStatusSerializer,
    VendorWalletSerializer, WalletTransactionSerializer,
    DeliveryWalletSerializer, AssignDeliverySerializer,
)


def _get_user_vendor(user):
    """Retourne la première organisation vendeur de l'utilisateur (pour les créations)."""
    membership = OrganizationMembership.objects.filter(
        user=user, is_active=True,
        organization__org_type__in=['MAISON_EDITION', 'LIBRAIRIE'],
        role__in=['PROPRIETAIRE', 'ADMINISTRATEUR', 'COMMERCIAL'],
    ).select_related('organization').first()
    return membership.organization if membership else None


def _get_user_vendor_orgs(user):
    """Retourne toutes les organisations vendeuses de l'utilisateur (pour les lectures agrégées)."""
    return Organization.objects.filter(
        org_type__in=['MAISON_EDITION', 'LIBRAIRIE'],
        memberships__user=user,
        memberships__is_active=True,
        memberships__role__in=['PROPRIETAIRE', 'ADMINISTRATEUR', 'COMMERCIAL'],
    ).distinct()


# ── BookListing ──

class BookListingListView(generics.ListAPIView):
    """Toutes les offres actives (public, filtrable)."""
    serializer_class = BookListingSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        qs = BookListing.objects.filter(is_active=True).select_related('book', 'vendor')
        vendor_id = self.request.query_params.get('vendor')
        city = self.request.query_params.get('city')
        book_id = self.request.query_params.get('book')
        if vendor_id:
            qs = qs.filter(vendor_id=vendor_id)
        if city:
            qs = qs.filter(vendor__city__icontains=city)
        if book_id:
            qs = qs.filter(book_id=book_id)
        return qs


class BookListingCreateView(generics.CreateAPIView):
    """Créer une offre (vendeur authentifié). Accepte organization_id dans le payload."""
    serializer_class = BookListingCreateSerializer
    permission_classes = [permissions.IsAuthenticated, IsVendorMember]

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        # Résoudre l'organisation cible
        vendor_orgs = _get_user_vendor_orgs(self.request.user)
        org_id = self.request.data.get('organization_id')
        if org_id:
            vendor = vendor_orgs.filter(id=org_id).first()
            if not vendor:
                ctx['vendor'] = None
                ctx['vendor_error'] = "Organisation non trouvée ou vous n'en êtes pas responsable."
            else:
                ctx['vendor'] = vendor
        elif vendor_orgs.count() == 1:
            ctx['vendor'] = vendor_orgs.first()
        else:
            ctx['vendor'] = None
            ctx['vendor_error'] = (
                "Vous gérez plusieurs organisations. "
                "Précisez organization_id pour indiquer laquelle doit porter cette offre."
            )
        return ctx

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        # Vérifier l'erreur vendor avant validation du serializer
        vendor_error = serializer.context.get('vendor_error')
        if vendor_error:
            return Response({'message': vendor_error}, status=status.HTTP_400_BAD_REQUEST)
        serializer.is_valid(raise_exception=True)
        listing = serializer.save()
        return Response(
            {
                'message': f"Offre créée pour « {listing.book.title} ».",
                'listing': BookListingSerializer(listing).data,
            },
            status=status.HTTP_201_CREATED,
        )


class BookListingDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Voir, modifier ou désactiver une offre."""
    queryset = BookListing.objects.select_related('book', 'vendor')
    permission_classes = [permissions.IsAuthenticated, IsListingOwner]

    def get_serializer_class(self):
        if self.request.method in ['PUT', 'PATCH']:
            return BookListingUpdateSerializer
        return BookListingSerializer

    def perform_destroy(self, instance):
        instance.is_active = False
        instance.save()

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        self.perform_destroy(instance)
        return Response({'message': 'Offre désactivée.'})


class VendorListingsView(generics.ListAPIView):
    """Offres d'un vendeur spécifique (public)."""
    serializer_class = BookListingSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        return BookListing.objects.filter(
            vendor__slug=self.kwargs['slug'], is_active=True,
        ).select_related('book', 'vendor')


class MyListingsView(generics.ListAPIView):
    """Offres de toutes les organisations vendeuses de l'utilisateur."""
    serializer_class = BookListingSerializer
    permission_classes = [permissions.IsAuthenticated, IsVendorMember]

    def get_queryset(self):
        vendor_orgs = _get_user_vendor_orgs(self.request.user)
        if not vendor_orgs.exists():
            return BookListing.objects.none()
        return BookListing.objects.filter(vendor__in=vendor_orgs).select_related('book', 'vendor')


# ── SubOrder ──

class VendorSubOrderListView(generics.ListAPIView):
    """Sous-commandes de toutes les organisations vendeuses de l'utilisateur."""
    serializer_class = SubOrderSerializer
    permission_classes = [permissions.IsAuthenticated, IsVendorMember]

    def get_queryset(self):
        vendor_orgs = _get_user_vendor_orgs(self.request.user)
        if not vendor_orgs.exists():
            return SubOrder.objects.none()
        return SubOrder.objects.filter(vendor__in=vendor_orgs).select_related(
            'order__user', 'vendor', 'delivery_agent__user',
        ).order_by('-created_at')


class SubOrderStatusUpdateView(APIView):
    """Vendeur met à jour le statut d'une sous-commande."""
    permission_classes = [permissions.IsAuthenticated]

    def patch(self, request, pk):
        sub_order = get_object_or_404(SubOrder, pk=pk)
        # Vérifier que l'utilisateur est membre du vendeur
        if not request.user.is_platform_admin:
            if not OrganizationMembership.objects.filter(
                user=request.user, organization=sub_order.vendor,
                is_active=True, role__in=['PROPRIETAIRE', 'ADMINISTRATEUR', 'COMMERCIAL'],
            ).exists():
                return Response({'message': 'Non autorisé.'}, status=status.HTTP_403_FORBIDDEN)

        serializer = SubOrderStatusSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        new_status = serializer.validated_data['status']

        # A1 : validation stricte de la machine à états
        from .utils import validate_suborder_transition
        actor_type = 'admin' if request.user.is_platform_admin else 'vendor'
        valid, error_msg = validate_suborder_transition(sub_order.status, new_status, actor_type)
        if not valid:
            return Response({'message': error_msg}, status=status.HTTP_400_BAD_REQUEST)

        old_status = sub_order.status
        sub_order.status = new_status
        if new_status == 'READY' and not sub_order.ready_at:
            sub_order.ready_at = timezone.now()
        if new_status == 'DELIVERED':
            sub_order.delivered_at = timezone.now()

        # Restaurer le stock si annulation vendeur
        if new_status == 'CANCELLED':
            from django.db import transaction
            from django.db.models import F
            from apps.orders.models import OrderItem
            with transaction.atomic():
                sub_order.save()
                for item in OrderItem.objects.filter(sub_order=sub_order).select_related('listing', 'listing__book'):
                    if item.listing and item.listing.book.format != 'EBOOK':
                        item.listing.stock = F('stock') + item.quantity
                        item.listing.save(update_fields=['stock'])
                        logger.info("Stock restauré : listing #%s +%s (annulation vendeur SubOrder #%s)",
                                    item.listing_id, item.quantity, sub_order.id)
        else:
            sub_order.save()

        # Notifier le client sur les transitions visibles
        if new_status in ('CONFIRMED', 'PREPARING', 'READY', 'SHIPPED', 'CANCELLED'):
            try:
                from apps.core.tasks import send_suborder_update_task
                send_suborder_update_task.delay(sub_order.id, new_status)
            except Exception:
                logger.exception("Erreur notification sous-commande #%s %s", sub_order.id, new_status)

        # C3 : journal d'activité
        from apps.orders.utils import log_order_event
        from .utils import get_transition_description
        evt = 'CANCELLATION' if new_status == 'CANCELLED' else 'STATUS_CHANGE'
        desc = get_transition_description(old_status, new_status, actor_type)
        log_order_event(sub_order.order, evt, desc,
                        actor=request.user, actor_role=actor_type,
                        sub_order=sub_order, from_status=old_status, to_status=new_status)

        return Response({
            'message': f'Statut mis à jour : {sub_order.get_status_display()}.',
            'sub_order': SubOrderSerializer(sub_order).data,
        })


# ── Delivery ──

class DeliveryAgentListView(generics.ListAPIView):
    """Liste des livreurs disponibles, filtrable par ville."""
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        city = request.query_params.get('city', '')
        agents = UserProfile.objects.filter(
            profile_type='LIVREUR', is_active=True,
        ).select_related('user')
        if city:
            agents = agents.filter(metadata__coverage_zones__contains=city)
        data = [
            {
                'id': a.id,
                'name': a.user.get_full_name(),
                'city': a.user.city,
                'metadata': a.metadata,
                'is_verified': a.is_verified,
            }
            for a in agents
        ]
        return Response(data)


class AssignDeliveryView(APIView):
    """Assigner un livreur à une sous-commande."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        sub_order = get_object_or_404(SubOrder, pk=pk)
        # Vérifier droits vendeur ou admin
        if not request.user.is_platform_admin:
            if not OrganizationMembership.objects.filter(
                user=request.user, organization=sub_order.vendor,
                is_active=True, role__in=['PROPRIETAIRE', 'ADMINISTRATEUR'],
            ).exists():
                return Response({'message': 'Non autorisé.'}, status=status.HTTP_403_FORBIDDEN)

        serializer = AssignDeliverySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        agent = UserProfile.objects.get(id=serializer.validated_data['agent_profile_id'])
        sub_order.delivery_agent = agent
        if 'delivery_fee' in serializer.validated_data:
            sub_order.delivery_fee = serializer.validated_data['delivery_fee']
        sub_order.save()

        # Notifier le livreur par email
        try:
            from apps.core.tasks import send_delivery_assignment_task
            send_delivery_assignment_task.delay(sub_order.id)
        except Exception:
            pass

        return Response({
            'message': f'Livreur {agent.user.get_full_name()} assigné.',
            'sub_order': SubOrderSerializer(sub_order).data,
        })


class MyDeliveryAssignmentsView(generics.ListAPIView):
    """Sous-commandes assignées au livreur connecté."""
    serializer_class = SubOrderSerializer
    permission_classes = [permissions.IsAuthenticated, IsDeliveryAgent]

    def get_queryset(self):
        livreur_profile = UserProfile.objects.filter(
            user=self.request.user, profile_type='LIVREUR', is_active=True,
        ).first()
        if not livreur_profile:
            return SubOrder.objects.none()
        return SubOrder.objects.filter(
            delivery_agent=livreur_profile,
        ).select_related('order__user', 'vendor').order_by('-created_at')


class DeliveryStatusUpdateView(APIView):
    """Livreur confirme la livraison."""
    permission_classes = [permissions.IsAuthenticated, IsDeliveryAgent]

    def patch(self, request, pk):
        sub_order = get_object_or_404(SubOrder, pk=pk)
        livreur_profile = UserProfile.objects.filter(
            user=request.user, profile_type='LIVREUR', is_active=True,
        ).first()
        if sub_order.delivery_agent != livreur_profile and not request.user.is_platform_admin:
            return Response({'message': 'Non autorisé.'}, status=status.HTTP_403_FORBIDDEN)

        serializer = SubOrderStatusSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        new_status = serializer.validated_data['status']

        # A1 : validation stricte de la machine à états
        from .utils import validate_suborder_transition
        actor_type = 'admin' if request.user.is_platform_admin else 'delivery'
        valid, error_msg = validate_suborder_transition(sub_order.status, new_status, actor_type)
        if not valid:
            return Response({'message': error_msg}, status=status.HTTP_400_BAD_REQUEST)

        old_status = sub_order.status
        sub_order.status = new_status
        if new_status == 'DELIVERED':
            sub_order.delivered_at = timezone.now()
        if new_status == 'ATTEMPTED':
            sub_order.attempt_count += 1
            sub_order.last_attempt_at = timezone.now()
            sub_order.last_attempt_reason = request.data.get('attempt_reason', '')
        sub_order.save()

        # Email au client
        if new_status in ('SHIPPED', 'ATTEMPTED'):
            try:
                from apps.core.tasks import send_suborder_update_task
                send_suborder_update_task.delay(sub_order.id, new_status)
            except Exception:
                logger.exception("Erreur notification sous-commande #%s %s", sub_order.id, new_status)

        # C1 : alerte admin après 3 tentatives
        if new_status == 'ATTEMPTED' and sub_order.attempt_count >= 3:
            try:
                from apps.core.tasks import send_max_attempts_alert_task
                send_max_attempts_alert_task.delay(sub_order.id)
            except Exception:
                logger.exception("Erreur alerte max tentatives SubOrder #%s", sub_order.id)

        if new_status == 'DELIVERED':
            try:
                from apps.core.tasks import send_order_delivered_task
                agent_name = livreur_profile.user.get_full_name() if livreur_profile else None
                send_order_delivered_task.delay(sub_order.order_id, agent_name=agent_name)
            except Exception:
                logger.exception("Erreur notification commande #%s DELIVERED", sub_order.order_id)

            # A3 : notifier le vendeur que la livraison est terminée
            try:
                from apps.core.tasks import send_vendor_delivery_completed_task
                send_vendor_delivery_completed_task.delay(sub_order.id)
            except Exception:
                logger.exception("Erreur notification vendeur livraison SubOrder #%s", sub_order.id)

            # P1 : propager le statut vers l'Order parent
            try:
                order = sub_order.order
                sibling_statuses = set(
                    order.sub_orders.values_list('status', flat=True)
                )
                if sibling_statuses == {'DELIVERED'}:
                    order.status = 'DELIVERED'
                    order.save(update_fields=['status', 'updated_at'])
                elif 'DELIVERED' in sibling_statuses and sibling_statuses - {'DELIVERED', 'CANCELLED'}:
                    order.status = 'PARTIAL'
                    order.save(update_fields=['status', 'updated_at'])
            except Exception:
                logger.exception(
                    "Erreur propagation statut Order #%s après livraison SubOrder #%s",
                    sub_order.order_id, sub_order.id,
                )

        # C3 : journal d'activité
        from apps.orders.utils import log_order_event
        from .utils import get_transition_description
        evt = 'DELIVERY_ATTEMPTED' if new_status == 'ATTEMPTED' else 'STATUS_CHANGE'
        desc = get_transition_description(old_status, new_status, actor_type)
        if new_status == 'ATTEMPTED' and sub_order.last_attempt_reason:
            desc += f" — {sub_order.last_attempt_reason}"
        meta = {}
        if new_status == 'ATTEMPTED':
            meta = {'attempt_count': sub_order.attempt_count, 'reason': sub_order.last_attempt_reason}
        log_order_event(sub_order.order, evt, desc,
                        actor=request.user, actor_role=actor_type,
                        sub_order=sub_order, from_status=old_status, to_status=new_status, metadata=meta)

        return Response({
            'message': f'Statut mis à jour : {sub_order.get_status_display()}.',
        })


# ── Wallet ──

class VendorWalletView(APIView):
    """Portefeuilles de toutes les organisations vendeuses de l'utilisateur."""
    permission_classes = [permissions.IsAuthenticated, IsVendorMember]

    def get(self, request):
        vendor_orgs = _get_user_vendor_orgs(request.user)
        if not vendor_orgs.exists():
            return Response({'message': 'Aucune organisation vendeur.'}, status=404)
        wallets = []
        for org in vendor_orgs:
            wallet, _ = VendorWallet.objects.get_or_create(vendor=org)
            wallets.append(wallet)
        return Response(VendorWalletSerializer(wallets, many=True).data)


class WalletTransactionListView(generics.ListAPIView):
    """Historique des transactions de toutes les organisations vendeuses de l'utilisateur."""
    serializer_class = WalletTransactionSerializer
    permission_classes = [permissions.IsAuthenticated, IsVendorMember]

    def get_queryset(self):
        vendor_orgs = _get_user_vendor_orgs(self.request.user)
        if not vendor_orgs.exists():
            return WalletTransaction.objects.none()
        return WalletTransaction.objects.filter(
            wallet__vendor__in=vendor_orgs,
        ).order_by('-created_at')


class DeliveryWalletView(APIView):
    """Portefeuille du livreur connecté."""
    permission_classes = [permissions.IsAuthenticated, IsDeliveryAgent]

    def get(self, request):
        profile = UserProfile.objects.filter(
            user=request.user, profile_type='LIVREUR', is_active=True,
        ).first()
        if not profile:
            return Response({'message': 'Profil livreur introuvable.'}, status=404)
        wallet, _ = DeliveryWallet.objects.get_or_create(agent=profile)
        return Response(DeliveryWalletSerializer(wallet).data)


class DeliveryWalletTransactionListView(generics.ListAPIView):
    """Historique des transactions du livreur connecté."""
    permission_classes = [permissions.IsAuthenticated, IsDeliveryAgent]

    def get(self, request):
        from .models import DeliveryWalletTransaction
        from .serializers import DeliveryWalletTransactionSerializer
        profile = UserProfile.objects.filter(
            user=request.user, profile_type='LIVREUR', is_active=True,
        ).first()
        if not profile:
            return Response([])
        txs = DeliveryWalletTransaction.objects.filter(
            wallet__agent=profile,
        ).order_by('-created_at')
        return Response(DeliveryWalletTransactionSerializer(txs, many=True).data)


# ══════════════════════════════════════════════════════════════
# Tarifs de livraison (livreurs)
# ══════════════════════════════════════════════════════════════

class MyDeliveryRatesView(APIView):
    """CRUD des tarifs du livreur connecté."""
    permission_classes = [permissions.IsAuthenticated, IsDeliveryAgent]

    def _get_profile(self, request):
        return UserProfile.objects.filter(user=request.user, profile_type='LIVREUR', is_active=True).first()

    def get(self, request):
        from .delivery_models import DeliveryRate
        profile = self._get_profile(request)
        if not profile:
            return Response([])
        rates = DeliveryRate.objects.filter(agent=profile).order_by('country', 'zone_name')
        return Response([{
            'id': r.id, 'zone_name': r.zone_name, 'country': r.country,
            'country_display': r.get_country_display(),
            'cities': r.cities, 'price': float(r.price), 'currency': r.currency,
            'currency_display': r.get_currency_display(),
            'estimated_days_min': r.estimated_days_min, 'estimated_days_max': r.estimated_days_max,
            'is_active': r.is_active,
        } for r in rates])

    def post(self, request):
        from .delivery_models import DeliveryRate
        profile = self._get_profile(request)
        if not profile:
            return Response({'message': 'Profil livreur introuvable.'}, status=status.HTTP_404_NOT_FOUND)
        data = request.data
        rate = DeliveryRate.objects.create(
            agent=profile,
            zone_name=data.get('zone_name', ''),
            country=data.get('country', 'GA'),
            cities=data.get('cities', []),
            price=data.get('price', 0),
            currency=data.get('currency', 'XAF'),
            estimated_days_min=data.get('estimated_days_min', 1),
            estimated_days_max=data.get('estimated_days_max', 3),
        )
        return Response({'message': 'Tarif créé.', 'id': rate.id}, status=status.HTTP_201_CREATED)


class DeliveryRateDetailView(APIView):
    """Modifier/supprimer un tarif du livreur connecté."""
    permission_classes = [permissions.IsAuthenticated, IsDeliveryAgent]

    def patch(self, request, pk):
        from .delivery_models import DeliveryRate
        profile = UserProfile.objects.filter(user=request.user, profile_type='LIVREUR', is_active=True).first()
        rate = get_object_or_404(DeliveryRate, pk=pk, agent=profile)
        for field in ['zone_name', 'country', 'cities', 'price', 'currency', 'estimated_days_min', 'estimated_days_max', 'is_active']:
            if field in request.data:
                setattr(rate, field, request.data[field])
        rate.save()
        return Response({'message': 'Tarif mis à jour.'})

    def delete(self, request, pk):
        from .delivery_models import DeliveryRate
        profile = UserProfile.objects.filter(user=request.user, profile_type='LIVREUR', is_active=True).first()
        rate = get_object_or_404(DeliveryRate, pk=pk, agent=profile)
        rate.delete()
        return Response({'message': 'Tarif supprimé.'})


class SearchDeliveryRatesView(APIView):
    """
    Recherche publique de livreurs disponibles pour une ville.
    GET /api/marketplace/delivery/search/?city=Libreville&country=GA
    """
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        from .delivery_models import DeliveryRate
        city = request.query_params.get('city', '')
        country = request.query_params.get('country', '')
        rates = DeliveryRate.find_for_city(city, country or None)
        return Response([{
            'id': r.id,
            'agent_id': r.agent_id,
            'agent_name': r.agent.user.get_full_name(),
            'agent_rating': float(r.agent.avg_rating) if r.agent.avg_rating else None,
            'agent_verified': r.agent.is_verified,
            'zone_name': r.zone_name,
            'country': r.country,
            'price': float(r.price),
            'currency': r.currency,
            'currency_display': r.get_currency_display(),
            'estimated_days_min': r.estimated_days_min,
            'estimated_days_max': r.estimated_days_max,
        } for r in rates])


class DeliveryReferenceDataView(APIView):
    """
    Données de référence pour les tarifs de livraison (pays, devises, villes).
    GET /api/marketplace/delivery/reference/
    """
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        from .delivery_models import COUNTRY_CHOICES, CURRENCY_CHOICES, CITIES_BY_COUNTRY
        return Response({
            'countries': [{'code': c, 'name': n} for c, n in COUNTRY_CHOICES],
            'currencies': [{'code': c, 'name': n} for c, n in CURRENCY_CHOICES],
            'cities_by_country': CITIES_BY_COUNTRY,
        })


# ══════════════════════════════════════════════════════════════
# Retrait wallet → Mobile Money
# ══════════════════════════════════════════════════════════════

class WithdrawView(APIView):
    """
    Demande de retrait d'un wallet vers Mobile Money.
    POST /api/marketplace/wallet/withdraw/
    Body: {wallet_type, amount, provider, phone_number}
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        from decimal import Decimal
        from django.utils import timezone as tz
        from .withdrawal_models import WithdrawalRequest, MIN_WITHDRAWAL_AMOUNT

        wallet_type = request.data.get('wallet_type', '')  # VENDOR | DELIVERY | PROFESSIONAL
        amount = Decimal(str(request.data.get('amount', 0)))
        provider = request.data.get('provider', '')  # MOBICASH | AIRTEL
        phone = request.data.get('phone_number', '').strip()

        # Validations
        if wallet_type not in ('VENDOR', 'DELIVERY', 'PROFESSIONAL'):
            return Response({'message': 'Type de wallet invalide.'}, status=status.HTTP_400_BAD_REQUEST)
        if provider not in ('MOBICASH', 'AIRTEL'):
            return Response({'message': 'Provider invalide. Choisissez Mobicash ou Airtel Money.'}, status=status.HTTP_400_BAD_REQUEST)
        if not phone:
            return Response({'message': 'Numero de telephone requis.'}, status=status.HTTP_400_BAD_REQUEST)
        if amount < MIN_WITHDRAWAL_AMOUNT:
            return Response({'message': f'Montant minimum : {MIN_WITHDRAWAL_AMOUNT} FCFA.'}, status=status.HTTP_400_BAD_REQUEST)

        # Verifier le solde
        wallet = self._get_wallet(request.user, wallet_type)
        if not wallet:
            return Response({'message': 'Wallet introuvable.'}, status=status.HTTP_404_NOT_FOUND)
        if wallet.balance < amount:
            return Response({'message': f'Solde insuffisant ({wallet.balance} FCFA disponible).'}, status=status.HTTP_400_BAD_REQUEST)

        # Verifier pas de retrait en cours
        pending = WithdrawalRequest.objects.filter(
            user=request.user, wallet_type=wallet_type, status__in=('PENDING', 'PROCESSING'),
        ).exists()
        if pending:
            return Response({'message': 'Vous avez deja un retrait en cours pour ce wallet.'}, status=status.HTTP_400_BAD_REQUEST)

        # Creer la demande
        withdrawal = WithdrawalRequest.objects.create(
            user=request.user,
            wallet_type=wallet_type,
            amount=amount,
            provider=provider,
            phone_number=phone,
        )

        # Executer le retrait (simulation pour l'instant)
        try:
            from apps.orders.payment_gateway import get_provider
            pay_provider = get_provider(provider)
            result = pay_provider.disburse(
                phone_number=phone,
                amount=float(amount),
                currency='XAF',
                reference=f'WDR-{withdrawal.id:06d}',
            )

            if result.get('status') == 'SUCCESS':
                withdrawal.status = 'COMPLETED'
                withdrawal.transaction_id = result.get('transaction_id', '')
                withdrawal.processed_at = tz.now()
                withdrawal.save()

                # Debiter le wallet
                wallet.balance -= amount
                wallet.total_withdrawn += amount
                wallet.save()

                # Enregistrer la transaction
                self._record_transaction(wallet, wallet_type, amount, withdrawal)

                return Response({
                    'message': f'Retrait de {amount} FCFA effectue avec succes.',
                    'withdrawal_id': withdrawal.id,
                    'transaction_id': result.get('transaction_id'),
                    'status': 'COMPLETED',
                })
            else:
                withdrawal.status = 'FAILED'
                withdrawal.failure_reason = result.get('message', 'Erreur inconnue')
                withdrawal.save()
                return Response({
                    'message': 'Le retrait a echoue. Reessayez plus tard.',
                    'status': 'FAILED',
                }, status=status.HTTP_502_BAD_GATEWAY)

        except Exception as e:
            withdrawal.status = 'FAILED'
            withdrawal.failure_reason = str(e)
            withdrawal.save()
            return Response({
                'message': 'Erreur lors du retrait. Reessayez plus tard.',
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def _get_wallet(self, user, wallet_type):
        if wallet_type == 'DELIVERY':
            profile = UserProfile.objects.filter(user=user, profile_type='LIVREUR', is_active=True).first()
            if not profile:
                return None
            return DeliveryWallet.objects.filter(agent=profile).first()
        elif wallet_type == 'VENDOR':
            from apps.organizations.models import OrganizationMembership
            membership = OrganizationMembership.objects.filter(user=user, is_active=True).first()
            if not membership:
                return None
            return VendorWallet.objects.filter(vendor=membership.organization).first()
        elif wallet_type == 'PROFESSIONAL':
            from apps.services.models import ProfessionalWallet
            profile = UserProfile.objects.filter(
                user=user, profile_type__in=['CORRECTEUR', 'ILLUSTRATEUR', 'TRADUCTEUR'], is_active=True,
            ).first()
            if not profile:
                return None
            return ProfessionalWallet.objects.filter(professional=profile).first()
        return None

    def _record_transaction(self, wallet, wallet_type, amount, withdrawal):
        if wallet_type == 'DELIVERY':
            from .models import DeliveryWalletTransaction
            DeliveryWalletTransaction.objects.create(
                wallet=wallet,
                transaction_type='DEBIT_WITHDRAWAL',
                amount=amount,
                description=f'Retrait Mobile Money #{withdrawal.id:06d}',
            )
        elif wallet_type == 'VENDOR':
            from .models import WalletTransaction
            WalletTransaction.objects.create(
                wallet=wallet,
                transaction_type='DEBIT_WITHDRAWAL',
                amount=amount,
                description=f'Retrait Mobile Money #{withdrawal.id:06d}',
            )
        elif wallet_type == 'PROFESSIONAL':
            from apps.services.models import ProfessionalWalletTransaction
            ProfessionalWalletTransaction.objects.create(
                wallet=wallet,
                transaction_type='DEBIT_WITHDRAWAL',
                amount=amount,
                description=f'Retrait Mobile Money #{withdrawal.id:06d}',
            )


class WithdrawalListView(APIView):
    """
    Historique des retraits de l'utilisateur connecte.
    GET /api/marketplace/wallet/withdrawals/
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        from .withdrawal_models import WithdrawalRequest
        withdrawals = WithdrawalRequest.objects.filter(user=request.user).order_by('-created_at')[:50]
        return Response([{
            'id': w.id,
            'wallet_type': w.wallet_type,
            'wallet_type_display': w.get_wallet_type_display(),
            'amount': float(w.amount),
            'currency': w.currency,
            'provider': w.provider,
            'provider_display': w.get_provider_display(),
            'phone_number': w.phone_number,
            'status': w.status,
            'status_display': w.get_status_display(),
            'transaction_id': w.transaction_id,
            'failure_reason': w.failure_reason,
            'created_at': w.created_at.isoformat(),
            'processed_at': w.processed_at.isoformat() if w.processed_at else None,
        } for w in withdrawals])
