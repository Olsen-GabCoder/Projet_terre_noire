"""Vues API pour le système de coupons Frollot (organisations + prestataires)."""
from decimal import Decimal

from django.db.models import Count, Sum, Q
from django.utils import timezone
from rest_framework import generics, status
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import AllowAny, IsAdminUser, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.core.throttling import PublicEndpointThrottle

from .models import Coupon, CouponTemplate
from .permissions import (
    COUPON_MANAGER_ROLES,
    IsCouponEmitter,
    _get_orgs,
    _get_provider_profile,
    get_user_emitter_context,
)
from .serializers import (
    CloneTemplateSerializer,
    CouponAdminSerializer,
    CouponApplicableSerializer,
    CouponIssuedSerializer,
    CouponReceivedSerializer,
    CouponSendSerializer,
    CouponTemplateSerializer,
    CouponValidateSerializer,
    SystemTemplateSerializer,
)
from .throttles import CouponSendThrottle


class SmallPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100


def _get_emitter_ctx_or_400(request):
    """Extracts emitter context or returns error string (400)."""
    emitter_type = request.query_params.get('emitter_type') or request.data.get('emitter_type')
    raw_org_id = request.query_params.get('organization_id') or request.data.get('organization_id')
    organization_id = None
    if raw_org_id is not None:
        try:
            organization_id = int(raw_org_id)
        except (ValueError, TypeError):
            return "organization_id doit être un entier."
    try:
        ctx = get_user_emitter_context(
            request.user, emitter_type=emitter_type, organization_id=organization_id,
        )
    except ValueError as e:
        return str(e)
    if ctx is None and not request.user.is_platform_admin:
        return "Vous n'avez pas de rôle émetteur de coupons."
    return ctx


def _emitter_filter(ctx):
    """Returns Q filter for the emitter context."""
    if ctx is None:
        return Q(pk__in=[])  # empty
    if ctx['type'] == 'organization':
        return Q(organization=ctx['organization'])
    return Q(provider_profile=ctx['provider_profile'])



# ── Templates CRUD ──

class CouponTemplateListCreateView(generics.ListCreateAPIView):
    serializer_class = CouponTemplateSerializer
    permission_classes = [IsAuthenticated, IsCouponEmitter]

    def get_queryset(self):
        ctx = _get_emitter_ctx_or_400(self.request)
        if isinstance(ctx, str):
            return CouponTemplate.objects.none()
        if ctx is None:
            return CouponTemplate.objects.none()
        return CouponTemplate.objects.filter(
            _emitter_filter(ctx), is_system=False,
        ).select_related('organization', 'provider_profile__user', 'cloned_from')

    def list(self, request, *args, **kwargs):
        ctx = _get_emitter_ctx_or_400(request)
        if isinstance(ctx, str):
            return Response({'error': ctx}, status=status.HTTP_400_BAD_REQUEST)
        return super().list(request, *args, **kwargs)

    def perform_create(self, serializer):
        ctx = _get_emitter_ctx_or_400(self.request)
        if isinstance(ctx, str):
            return
        kwargs = {
            'created_by': self.request.user,
            'is_system': False,
            'system_slug': None,
            'cloned_from': None,
            'clone_count': 0,
        }
        if ctx and ctx['type'] == 'organization':
            kwargs['organization'] = ctx['organization']
        elif ctx and ctx['type'] == 'provider_profile':
            kwargs['provider_profile'] = ctx['provider_profile']
        serializer.save(**kwargs)

    def create(self, request, *args, **kwargs):
        ctx = _get_emitter_ctx_or_400(request)
        if isinstance(ctx, str):
            return Response({'error': ctx}, status=status.HTTP_400_BAD_REQUEST)
        return super().create(request, *args, **kwargs)


class CouponTemplateDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = CouponTemplateSerializer
    permission_classes = [IsAuthenticated, IsCouponEmitter]

    def get_queryset(self):
        ctx = _get_emitter_ctx_or_400(self.request)
        if isinstance(ctx, str) or ctx is None:
            return CouponTemplate.objects.none()
        return CouponTemplate.objects.filter(
            _emitter_filter(ctx), is_system=False,
        ).select_related('cloned_from')

    def perform_update(self, serializer):
        if self.get_object().is_system and not self.request.user.is_platform_admin:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Les templates système ne sont pas modifiables.")
        serializer.save()


# ── Bibliothèque système ──

class SystemTemplateListView(generics.ListAPIView):
    """GET /api/coupons/templates/system/ — bibliothèque de templates Frollot."""
    serializer_class = SystemTemplateSerializer
    permission_classes = [IsAuthenticated, IsCouponEmitter]

    def get_queryset(self):
        qs = CouponTemplate.objects.filter(is_system=True, is_published=True)
        ctx = _get_emitter_ctx_or_400(self.request)
        if isinstance(ctx, str) or ctx is None:
            qs = qs.filter(target_emitter_type='ALL')
        elif ctx['type'] == 'organization':
            qs = qs.filter(target_emitter_type__in=['ALL', 'ORGANIZATION'])
        else:
            qs = qs.filter(target_emitter_type__in=['ALL', 'PROVIDER_PROFILE'])
        category = self.request.query_params.get('category')
        if category:
            qs = qs.filter(category=category.upper())
        return qs.order_by('display_order', '-clone_count')

    def list(self, request, *args, **kwargs):
        ctx = _get_emitter_ctx_or_400(request)
        if isinstance(ctx, str):
            return Response({'error': ctx}, status=status.HTTP_400_BAD_REQUEST)
        return super().list(request, *args, **kwargs)


# ── Clonage de template système ──

class CloneTemplateView(APIView):
    """POST /api/coupons/templates/clone/ — clone un template système."""
    permission_classes = [IsAuthenticated, IsCouponEmitter]

    def post(self, request):
        ctx = _get_emitter_ctx_or_400(request)
        if isinstance(ctx, str):
            return Response({'error': ctx}, status=status.HTTP_400_BAD_REQUEST)

        serializer = CloneTemplateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        source = CouponTemplate.objects.get(id=serializer.validated_data['system_template_id'])
        clone = self._clone_template(source, ctx, request.user)

        from django.db.models import F
        CouponTemplate.objects.filter(id=source.id).update(clone_count=F('clone_count') + 1)

        return Response(CouponTemplateSerializer(clone).data, status=status.HTTP_201_CREATED)

    def _clone_template(self, source, ctx, user):
        clone = CouponTemplate()
        # Copier les champs métier
        for field in [
            'name', 'commercial_title', 'subtitle', 'marketing_description',
            'category', 'tags', 'icon', 'accent_color',
            'discount_type', 'discount_value', 'min_order_amount', 'max_discount_amount',
            'first_order_only', 'min_customer_age_days',
            'default_expiry_days', 'valid_from', 'valid_until',
            'total_quota', 'per_customer_limit',
        ]:
            setattr(clone, field, getattr(source, field))
        # Champs système réinitialisés
        clone.is_system = False
        clone.system_slug = None
        clone.clone_count = 0
        clone.quota_used = 0
        clone.display_order = 100
        clone.is_published = True
        clone.is_active = True
        clone.cloned_from = source
        clone.created_by = user
        # Émetteur selon contexte
        if ctx and ctx['type'] == 'organization':
            clone.organization = ctx['organization']
        elif ctx and ctx['type'] == 'provider_profile':
            clone.provider_profile = ctx['provider_profile']
        clone.save()
        return clone



# ── Envoi de coupons ──

class CouponSendView(APIView):
    permission_classes = [IsAuthenticated, IsCouponEmitter]
    throttle_classes = [CouponSendThrottle]

    def post(self, request):
        ctx = _get_emitter_ctx_or_400(request)
        if isinstance(ctx, str):
            return Response({'error': ctx}, status=status.HTTP_400_BAD_REQUEST)

        serializer = CouponSendSerializer(data=request.data, context={'emitter_context': ctx})
        serializer.is_valid(raise_exception=True)

        from .services import create_coupons_for_send
        coupon_ids = create_coupons_for_send(
            template=serializer.validated_data['template_id'],
            recipient_emails=serializer.validated_data['recipient_emails'],
            created_by=request.user,
            custom_message=serializer.validated_data.get('custom_message', ''),
            custom_expiry_days=serializer.validated_data.get('custom_expiry_days'),
        )

        from .tasks import send_coupons_batch_task
        send_coupons_batch_task.delay(coupon_ids)

        return Response({'queued': True, 'count': len(coupon_ids)}, status=status.HTTP_202_ACCEPTED)


# ── Historiques ──

class CouponIssuedListView(generics.ListAPIView):
    serializer_class = CouponIssuedSerializer
    permission_classes = [IsAuthenticated, IsCouponEmitter]
    pagination_class = SmallPagination

    def get_queryset(self):
        ctx = _get_emitter_ctx_or_400(self.request)
        if isinstance(ctx, str) or ctx is None:
            return Coupon.objects.none()
        qs = Coupon.objects.filter(_emitter_filter(ctx)).select_related(
            'template', 'used_by', 'organization', 'provider_profile__user',
        )
        stat = self.request.query_params.get('status')
        if stat:
            qs = qs.filter(status=stat.upper())
        search = self.request.query_params.get('search')
        if search:
            qs = qs.filter(Q(code__icontains=search) | Q(recipient_email__icontains=search))
        return qs

    def list(self, request, *args, **kwargs):
        ctx = _get_emitter_ctx_or_400(request)
        if isinstance(ctx, str):
            return Response({'error': ctx}, status=status.HTTP_400_BAD_REQUEST)
        return super().list(request, *args, **kwargs)


class CouponReceivedListView(generics.ListAPIView):
    serializer_class = CouponReceivedSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = SmallPagination

    def get_queryset(self):
        user = self.request.user
        qs = Coupon.objects.filter(
            Q(recipient=user) | Q(recipient_email__iexact=user.email),
        ).select_related('organization', 'provider_profile__user', 'template')
        stat = self.request.query_params.get('status')
        if stat:
            qs = qs.filter(status=stat.upper())
        return qs


# ── Coupons applicables ──

class CouponApplicableListView(APIView):
    """GET /api/coupons/applicable/?cart_item_ids=... ou ?service_quote_id=..."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        raw_cart = request.query_params.get('cart_item_ids', '')
        raw_quote = request.query_params.get('service_quote_id', '')

        cart_item_ids = None
        service_quote_id = None

        if raw_cart and raw_quote:
            return Response(
                {'error': 'cart_item_ids et service_quote_id sont mutuellement exclusifs.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if raw_cart:
            try:
                cart_item_ids = [int(x) for x in raw_cart.split(',') if x.strip()]
            except ValueError:
                return Response({'error': 'cart_item_ids invalide.'}, status=status.HTTP_400_BAD_REQUEST)
            if not cart_item_ids:
                return Response([])

        if raw_quote:
            try:
                service_quote_id = int(raw_quote)
            except ValueError:
                return Response({'error': 'service_quote_id invalide.'}, status=status.HTTP_400_BAD_REQUEST)

        from .services import get_applicable_coupons
        coupons = get_applicable_coupons(
            request.user, cart_item_ids=cart_item_ids, service_quote_id=service_quote_id,
        )
        serializer = CouponApplicableSerializer(coupons, many=True)
        return Response(serializer.data)


# ── Validation (enrichi) ──

class CouponValidateView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [PublicEndpointThrottle]

    def post(self, request):
        serializer = CouponValidateSerializer(data=request.data)
        if not serializer.is_valid():
            errors = serializer.errors
            msg = errors.get('code', errors.get('cart_items', errors.get('non_field_errors', ['Code promo invalide.'])))
            if isinstance(msg, list):
                msg = msg[0]
            return Response({'valid': False, 'message': str(msg)}, status=status.HTTP_400_BAD_REQUEST)

        code = serializer.validated_data['code']
        cart_items = serializer.validated_data.get('cart_items', [])
        service_quote_id = serializer.validated_data.get('service_quote_id')

        try:
            coupon = Coupon.objects.select_related('organization', 'provider_profile__user').get(code=code)
        except Coupon.DoesNotExist:
            return Response({'valid': False, 'message': 'Code promo invalide.'}, status=status.HTTP_400_BAD_REQUEST)

        user = request.user if request.user.is_authenticated else None

        # Scope org (livres)
        scoped_subtotal = None
        provider_profile_id = None

        if cart_items and coupon.organization_id:
            scoped_subtotal = self._compute_scoped_subtotal(coupon, cart_items)
            if scoped_subtotal == Decimal('0'):
                return Response({'valid': False, 'message': "Ce coupon n'est pas applicable aux articles de votre panier."}, status=status.HTTP_400_BAD_REQUEST)

        # Scope provider (services)
        if service_quote_id and coupon.provider_profile_id:
            from apps.services.models import ServiceQuote
            try:
                quote = ServiceQuote.objects.select_related('request__provider_profile').get(id=service_quote_id)
                provider_profile_id = quote.request.provider_profile_id
                scoped_subtotal = quote.price
            except ServiceQuote.DoesNotExist:
                return Response({'valid': False, 'message': 'Devis introuvable.'}, status=status.HTTP_400_BAD_REQUEST)

        if user:
            if not coupon.is_valid_for(user, scoped_subtotal=scoped_subtotal, provider_profile_id=provider_profile_id):
                return Response({'valid': False, 'message': self._get_invalid_reason(coupon, user, scoped_subtotal)}, status=status.HTTP_400_BAD_REQUEST)
        else:
            now = timezone.now()
            if coupon.status != 'SENT' or not coupon.is_active:
                return Response({'valid': False, 'message': 'Ce code promo n\'est plus actif.'}, status=status.HTTP_400_BAD_REQUEST)
            if coupon.valid_until and now > coupon.valid_until:
                return Response({'valid': False, 'message': 'Ce code promo a expiré.'}, status=status.HTTP_400_BAD_REQUEST)
            if coupon.max_uses is not None and coupon.usage_count >= coupon.max_uses:
                return Response({'valid': False, 'message': 'Ce code promo a atteint sa limite.'}, status=status.HTTP_400_BAD_REQUEST)

        from .services import get_emitter_name
        resp = {
            'valid': True,
            'discount_type': coupon.discount_type,
            'discount_value': float(coupon.discount_value),
            'message': self._success_message(coupon),
        }
        emitter = get_emitter_name(coupon)
        if emitter != 'Frollot':
            resp['scoped_to'] = emitter
        return Response(resp)

    def _compute_scoped_subtotal(self, coupon, cart_items):
        from apps.books.models import Book
        from apps.marketplace.models import BookListing
        book_ids = [item['book_id'] for item in cart_items]
        listing_ids = [item['listing_id'] for item in cart_items if item.get('listing_id')]
        books_map = {b.id: b for b in Book.objects.filter(id__in=book_ids).select_related('publisher_organization')}
        listings_map = {}
        if listing_ids:
            listings_map = {l.id: l for l in BookListing.objects.filter(id__in=listing_ids).select_related('vendor')}
        subtotal = Decimal('0')
        for item in cart_items:
            book = books_map.get(item['book_id'])
            if not book:
                continue
            quantity = item['quantity']
            listing_id = item.get('listing_id')
            listing = listings_map.get(listing_id) if listing_id else None
            vendor_id = listing.vendor_id if listing else book.publisher_organization_id
            price = listing.price if listing else book.price
            if vendor_id == coupon.organization_id:
                subtotal += price * quantity
        return subtotal

    def _success_message(self, coupon):
        if coupon.discount_type == 'PERCENT':
            return f"{int(coupon.discount_value)}% de réduction appliqué"
        elif coupon.discount_type == 'FIXED':
            return f"{int(coupon.discount_value)} FCFA de réduction appliqué"
        return "Livraison offerte"

    def _get_invalid_reason(self, coupon, user, scoped_subtotal):
        now = timezone.now()
        if coupon.status != 'SENT':
            return "Ce code promo n'est plus actif."
        if not coupon.is_active:
            return "Ce code promo n'est plus actif."
        if coupon.valid_until and now > coupon.valid_until:
            return "Ce code promo a expiré."
        if coupon.max_uses is not None and coupon.usage_count >= coupon.max_uses:
            return "Ce code promo a atteint sa limite."
        if coupon.recipient_id and coupon.recipient_id != user.id:
            return "Ce code promo ne vous est pas destiné."
        if coupon.recipient_email and not coupon.recipient_id:
            if user.email.lower() != coupon.recipient_email.lower():
                return "Ce code promo ne vous est pas destiné."
        if scoped_subtotal is not None and scoped_subtotal < coupon.min_order_amount:
            return f"Montant minimum requis : {int(coupon.min_order_amount)} FCFA."
        return "Code promo invalide."


# ── Révocation ──

class CouponRevokeView(APIView):
    permission_classes = [IsAuthenticated, IsCouponEmitter]

    def post(self, request, pk):
        ctx = _get_emitter_ctx_or_400(request)
        if isinstance(ctx, str):
            return Response({'error': ctx}, status=status.HTTP_400_BAD_REQUEST)
        try:
            coupon = Coupon.objects.get(pk=pk, **{
                k: v for k, v in [
                    ('organization', ctx['organization'] if ctx else None),
                    ('provider_profile', ctx['provider_profile'] if ctx else None),
                ] if v is not None
            })
        except Coupon.DoesNotExist:
            return Response({'error': 'Coupon introuvable.'}, status=status.HTTP_404_NOT_FOUND)

        if coupon.status not in ('SENT', 'PENDING'):
            return Response({'error': 'Seuls les coupons SENT ou PENDING peuvent être révoqués.'}, status=status.HTTP_400_BAD_REQUEST)

        from .services import revoke_coupon
        revoke_coupon(coupon, revoked_by=request.user)
        return Response({'status': 'REVOKED'})


# ── Retry (FAILED → PENDING) ──

class CouponRetryView(APIView):
    permission_classes = [IsAuthenticated, IsCouponEmitter]

    def post(self, request, pk):
        ctx = _get_emitter_ctx_or_400(request)
        if isinstance(ctx, str):
            return Response({'error': ctx}, status=status.HTTP_400_BAD_REQUEST)
        try:
            coupon = Coupon.objects.get(pk=pk, **{
                k: v for k, v in [
                    ('organization', ctx['organization'] if ctx else None),
                    ('provider_profile', ctx['provider_profile'] if ctx else None),
                ] if v is not None
            })
        except Coupon.DoesNotExist:
            return Response({'error': 'Coupon introuvable.'}, status=status.HTTP_404_NOT_FOUND)

        if coupon.status != 'FAILED':
            return Response(
                {'error': 'Seuls les coupons en échec peuvent être réessayés.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        coupon.status = 'PENDING'
        coupon.save(update_fields=['status', 'updated_at'])

        # TODO: passer en send_async une fois disponible (signal agent-infra)
        from .tasks import send_single_coupon_task
        send_single_coupon_task.delay(coupon.id)

        return Response({'status': coupon.status}, status=status.HTTP_202_ACCEPTED)


# ── Clients vendeur ──

class VendorCustomerListView(APIView):
    permission_classes = [IsAuthenticated, IsCouponEmitter]

    def get(self, request):
        ctx = _get_emitter_ctx_or_400(request)
        if isinstance(ctx, str):
            return Response({'error': ctx}, status=status.HTTP_400_BAD_REQUEST)
        if ctx is None or ctx['type'] != 'organization':
            return Response([])
        org = ctx['organization']
        from apps.marketplace.models import SubOrder
        customers = (
            SubOrder.objects.filter(vendor=org)
            .select_related('order__user')
            .values('order__user__email', 'order__user__first_name', 'order__user__last_name')
            .annotate(order_count=Count('order', distinct=True))
            .order_by('-order_count')
        )
        return Response([
            {'email': c['order__user__email'], 'first_name': c['order__user__first_name'] or '', 'last_name': c['order__user__last_name'] or '', 'order_count': c['order_count']}
            for c in customers if c['order__user__email']
        ])


class ServiceCustomerListView(APIView):
    """GET /api/coupons/service-customers/ — Clients du prestataire."""
    permission_classes = [IsAuthenticated, IsCouponEmitter]

    def get(self, request):
        profile = _get_provider_profile(request.user)
        if not profile:
            return Response([])
        from apps.services.models import ServiceOrder
        customers = (
            ServiceOrder.objects.filter(provider=profile)
            .select_related('client')
            .values('client__email', 'client__first_name', 'client__last_name')
            .annotate(order_count=Count('id', distinct=True))
            .order_by('-order_count')
        )
        return Response([
            {'email': c['client__email'], 'first_name': c['client__first_name'] or '', 'last_name': c['client__last_name'] or '', 'order_count': c['order_count']}
            for c in customers if c['client__email']
        ])


# ── Contexte émetteur (source de vérité unique) ──

class EmitterContextView(APIView):
    """GET /api/coupons/emitter-context/ — contexte émetteur du user connecté."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        from apps.organizations.models import OrganizationMembership
        orgs_qs = _get_orgs(request.user)
        organizations = []
        for org in orgs_qs:
            membership = OrganizationMembership.objects.filter(
                user=request.user, organization=org, is_active=True,
                role__in=COUPON_MANAGER_ROLES,
            ).first()
            organizations.append({
                'id': org.id,
                'name': org.name,
                'org_type': org.org_type,
                'role': membership.role if membership else None,
            })

        profile = _get_provider_profile(request.user)
        provider_profile = None
        if profile:
            provider_profile = {
                'id': profile.id,
                'profile_type': profile.profile_type,
                'display_name': profile.user.get_full_name() or profile.user.username,
            }

        can_emit = len(organizations) > 0 or provider_profile is not None

        return Response({
            'organizations': organizations,
            'provider_profile': provider_profile,
            'can_emit': can_emit,
        })


# ── Admin plateforme ──

class CouponAdminOverviewView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        qs = Coupon.objects.all()
        total_issued = qs.count()
        total_used = qs.filter(status='USED').count()
        total_discount = qs.filter(status='USED').aggregate(total=Sum('discount_value'))['total'] or Decimal('0')
        activation_rate = round(total_used / total_issued * 100, 1) if total_issued > 0 else 0
        top_orgs = (
            qs.filter(organization__isnull=False)
            .values('organization__name').annotate(count=Count('id')).order_by('-count')[:5]
        )
        return Response({
            'total_issued': total_issued,
            'total_used': total_used,
            'total_discount_value': float(total_discount),
            'activation_rate': activation_rate,
            'top_organizations': [{'name': o['organization__name'], 'count': o['count']} for o in top_orgs],
        })


class CouponAdminListView(generics.ListAPIView):
    serializer_class = CouponAdminSerializer
    permission_classes = [IsAdminUser]
    pagination_class = SmallPagination

    def get_queryset(self):
        qs = Coupon.objects.select_related('organization', 'provider_profile__user', 'created_by', 'used_by').all()
        org_id = self.request.query_params.get('org')
        if org_id:
            qs = qs.filter(organization_id=org_id)
        stat = self.request.query_params.get('status')
        if stat:
            qs = qs.filter(status=stat.upper())
        dtype = self.request.query_params.get('type')
        if dtype:
            qs = qs.filter(discount_type=dtype.upper())
        return qs
