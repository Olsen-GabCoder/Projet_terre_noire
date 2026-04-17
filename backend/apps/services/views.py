from django.db import models
from django.shortcuts import get_object_or_404
from rest_framework import generics, permissions, status
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.organizations.models import Organization, OrganizationMembership
from apps.users.models import UserProfile

from .models import (
    ServiceListing, ServiceRequest, ServiceQuote, ServiceOrder,
    EditorialProject, ProjectTask, PrintRequest,
    ProfessionalWallet, ProfessionalWalletTransaction,
    QuoteTemplate, Quote, QuoteLot, QuoteItem,
)
from .permissions import (
    IsServiceProvider, IsListingProvider, IsServiceParticipant, IsPublisherMember,
)
from .serializers import (
    ServiceListingSerializer, ServiceListingCreateSerializer,
    ServiceRequestSerializer, ServiceRequestCreateSerializer,
    ServiceQuoteSerializer, ServiceQuoteCreateSerializer, ServiceQuoteRespondSerializer,
    ServiceOrderSerializer, ServiceOrderStatusSerializer,
    EditorialProjectSerializer, EditorialProjectCreateSerializer,
    ProjectTaskSerializer, ProjectTaskCreateSerializer, ProjectTaskStatusSerializer,
    PrintRequestSerializer, PrintRequestCreateSerializer, PrintRequestStatusSerializer,
    ProfessionalWalletSerializer, ProfessionalWalletTransactionSerializer,
    QuoteTemplateListSerializer, QuoteTemplateDetailSerializer, QuoteTemplatePublicSerializer,
    QuoteListSerializer, QuoteDetailSerializer, QuoteCreateSerializer,
)
from .services import accept_quote, complete_service_order


# ── Helpers ──

def _get_user_professional_profile(user):
    """Retourne le premier profil professionnel actif de l'utilisateur."""
    return UserProfile.objects.filter(
        user=user,
        profile_type__in=['CORRECTEUR', 'ILLUSTRATEUR', 'TRADUCTEUR'],
        is_active=True,
    ).first()


def _get_user_publisher(user):
    """Retourne la première organisation maison d'édition de l'utilisateur."""
    membership = OrganizationMembership.objects.filter(
        user=user, is_active=True,
        organization__org_type='MAISON_EDITION',
    ).select_related('organization').first()
    return membership.organization if membership else None


# ══════════════════════════════════════════════════════════════
# ServiceListing
# ══════════════════════════════════════════════════════════════

class ServiceListingListView(generics.ListAPIView):
    """Toutes les offres de services actives (public, filtrable)."""
    serializer_class = ServiceListingSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        qs = ServiceListing.objects.filter(is_active=True).select_related(
            'provider__user',
        )
        service_type = self.request.query_params.get('service_type')
        language = self.request.query_params.get('language')
        if service_type:
            qs = qs.filter(service_type=service_type)
        if language:
            qs = qs.filter(languages__contains=language)
        return qs


class ServiceListingCreateView(generics.CreateAPIView):
    """Créer une offre de service (prestataire authentifié)."""
    serializer_class = ServiceListingCreateSerializer
    permission_classes = [permissions.IsAuthenticated, IsServiceProvider]

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx['provider'] = _get_user_professional_profile(self.request.user)
        return ctx

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        listing = serializer.save()
        return Response(
            {
                'message': f"Offre de service « {listing.title} » créée.",
                'listing': ServiceListingSerializer(listing).data,
            },
            status=status.HTTP_201_CREATED,
        )


class ServiceListingPublicDetailView(generics.RetrieveAPIView):
    """Voir une offre de service (public, par slug ou pk)."""
    queryset = ServiceListing.objects.filter(is_active=True).select_related('provider__user')
    serializer_class = ServiceListingSerializer
    permission_classes = [permissions.AllowAny]

    def get_object(self):
        identifier = self.kwargs['identifier']
        qs = self.get_queryset()
        if identifier.isdigit():
            obj = get_object_or_404(qs, pk=int(identifier))
        else:
            obj = get_object_or_404(qs, slug=identifier)
        return obj


class ServiceListingDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Modifier ou désactiver une offre de service (propriétaire)."""
    queryset = ServiceListing.objects.select_related('provider__user')
    serializer_class = ServiceListingSerializer
    permission_classes = [permissions.IsAuthenticated, IsListingProvider]

    def perform_destroy(self, instance):
        instance.is_active = False
        instance.save(update_fields=['is_active', 'updated_at'])

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        self.perform_destroy(instance)
        return Response({'message': 'Offre de service désactivée.'})


class MyServiceListingsView(generics.ListAPIView):
    """Mes offres de service (prestataire connecté, tous profils pro)."""
    serializer_class = ServiceListingSerializer
    permission_classes = [permissions.IsAuthenticated, IsServiceProvider]

    def get_queryset(self):
        profiles = UserProfile.objects.filter(
            user=self.request.user,
            profile_type__in=['CORRECTEUR', 'ILLUSTRATEUR', 'TRADUCTEUR'],
            is_active=True,
        )
        if not profiles.exists():
            return ServiceListing.objects.none()
        return ServiceListing.objects.filter(provider__in=profiles).select_related('provider__user')


# ══════════════════════════════════════════════════════════════
# ServiceRequest
# ══════════════════════════════════════════════════════════════

class ServiceRequestCreateView(generics.CreateAPIView):
    """Créer une demande de service."""
    serializer_class = ServiceRequestCreateSerializer
    permission_classes = [permissions.IsAuthenticated]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        service_request = serializer.save()
        return Response(
            {
                'message': 'Demande de service créée.',
                'request': ServiceRequestSerializer(service_request).data,
            },
            status=status.HTTP_201_CREATED,
        )


class ServiceRequestListView(generics.ListAPIView):
    """
    Liste des demandes de service.
    ?role=provider → demandes reçues par le prestataire connecté.
    Par défaut → demandes envoyées par le client connecté.
    """
    serializer_class = ServiceRequestSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        role = self.request.query_params.get('role', 'client')
        if role == 'provider':
            profiles = UserProfile.objects.filter(
                user=user,
                profile_type__in=['CORRECTEUR', 'ILLUSTRATEUR', 'TRADUCTEUR'],
                is_active=True,
            )
            if not profiles.exists():
                return ServiceRequest.objects.none()
            return ServiceRequest.objects.filter(
                provider_profile__in=profiles,
            ).select_related('client', 'provider_profile__user', 'listing').prefetch_related('quotes')
        return ServiceRequest.objects.filter(
            client=user,
        ).select_related('client', 'provider_profile__user', 'listing').prefetch_related('quotes')


class ServiceRequestDetailView(generics.RetrieveAPIView):
    """Détail d'une demande de service."""
    serializer_class = ServiceRequestSerializer
    permission_classes = [permissions.IsAuthenticated]
    queryset = ServiceRequest.objects.select_related(
        'client', 'provider_profile__user', 'listing',
    )

    def get_object(self):
        obj = super().get_object()
        user = self.request.user
        if not user.is_platform_admin:
            profile = _get_user_professional_profile(user)
            if obj.client != user and (not profile or obj.provider_profile != profile):
                self.permission_denied(self.request)
        return obj


# ══════════════════════════════════════════════════════════════
# ServiceQuote
# ══════════════════════════════════════════════════════════════

class ServiceQuoteCreateView(APIView):
    """Prestataire crée un devis pour une demande."""
    permission_classes = [permissions.IsAuthenticated, IsServiceProvider]

    def post(self, request):
        serializer = ServiceQuoteCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        # Vérifier que le prestataire est bien celui de la demande
        service_request = serializer.validated_data['request']
        profile = _get_user_professional_profile(request.user)
        if not request.user.is_platform_admin and service_request.provider_profile != profile:
            return Response(
                {'message': 'Vous n\'êtes pas le prestataire de cette demande.'},
                status=status.HTTP_403_FORBIDDEN,
            )
        quote = serializer.save()
        return Response(
            {
                'message': 'Devis créé.',
                'quote': ServiceQuoteSerializer(quote).data,
            },
            status=status.HTTP_201_CREATED,
        )


class ServiceQuoteRespondView(APIView):
    """Client accepte ou rejette un devis."""
    permission_classes = [permissions.IsAuthenticated]

    def patch(self, request, pk):
        quote = get_object_or_404(ServiceQuote, pk=pk)
        # Seul le client de la demande peut répondre
        if not request.user.is_platform_admin and quote.request.client != request.user:
            return Response(
                {'message': 'Non autorisé.'},
                status=status.HTTP_403_FORBIDDEN,
            )
        if quote.status != 'PENDING':
            return Response(
                {'message': 'Ce devis n\'est plus en attente.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        serializer = ServiceQuoteRespondSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        if serializer.validated_data['accept']:
            coupon_code = serializer.validated_data.get('coupon_code', '').strip()
            order = accept_quote(quote, coupon_code=coupon_code or None)
            return Response({
                'message': 'Devis accepté. Commande de service créée.',
                'order': ServiceOrderSerializer(order).data,
            })
        else:
            quote.status = 'REJECTED'
            quote.save(update_fields=['status'])
            return Response({'message': 'Devis rejeté.'})


# ══════════════════════════════════════════════════════════════
# ServiceOrder
# ══════════════════════════════════════════════════════════════

class ServiceOrderListView(generics.ListAPIView):
    """Liste des commandes de service de l'utilisateur connecté."""
    serializer_class = ServiceOrderSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        profile = _get_user_professional_profile(user)
        from django.db.models import Q
        q = Q(client=user)
        if profile:
            q |= Q(provider=profile)
        return ServiceOrder.objects.filter(q).select_related(
            'client', 'provider__user', 'request', 'quote',
        ).distinct()


class ServiceOrderDetailView(generics.RetrieveAPIView):
    """Détail d'une commande de service."""
    serializer_class = ServiceOrderSerializer
    permission_classes = [permissions.IsAuthenticated, IsServiceParticipant]
    queryset = ServiceOrder.objects.select_related(
        'client', 'provider__user', 'request', 'quote',
    )


ALLOWED_SERVICE_ORDER_TRANSITIONS = {
    'PENDING': ['IN_PROGRESS', 'CANCELLED'],
    'IN_PROGRESS': ['REVIEW', 'CANCELLED', 'REVISION'],
    'REVISION': ['IN_PROGRESS', 'CANCELLED'],
    'REVIEW': ['COMPLETED', 'REVISION', 'CANCELLED'],
    'COMPLETED': [],   # état final
    'CANCELLED': [],   # état final
}


class ServiceOrderStatusUpdateView(APIView):
    """Met à jour le statut d'une commande de service."""
    permission_classes = [permissions.IsAuthenticated]

    def patch(self, request, pk):
        order = get_object_or_404(ServiceOrder, pk=pk)
        # Vérifier droits
        if not request.user.is_platform_admin:
            profile = _get_user_professional_profile(request.user)
            if order.client != request.user and (not profile or order.provider != profile):
                return Response(
                    {'message': 'Non autorisé.'},
                    status=status.HTTP_403_FORBIDDEN,
                )

        serializer = ServiceOrderStatusSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        new_status = serializer.validated_data['status']

        # Validation de la machine à états
        allowed = ALLOWED_SERVICE_ORDER_TRANSITIONS.get(order.status, [])
        if new_status not in allowed:
            return Response(
                {'message': f'Transition {order.status} → {new_status} non autorisée.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Seul le client ou un admin peut valider la livraison
        if new_status == 'COMPLETED' and order.client != request.user and not request.user.is_platform_admin:
            return Response(
                {'message': 'Seul le client peut valider la livraison.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        if new_status == 'COMPLETED':
            complete_service_order(order)
        else:
            # P3.5 : restaurer le coupon si annulation
            if new_status == 'CANCELLED' and order.coupon_id:
                order.coupon.restore()
                order.discount_amount = 0
                order.coupon = None
            order.status = new_status
            update_fields = ['status', 'updated_at']
            if new_status == 'CANCELLED':
                update_fields += ['discount_amount', 'coupon']
                # Remettre la ServiceRequest en état réutilisable
                order.request.status = 'SUBMITTED'
                order.request.save(update_fields=['status', 'updated_at'])
            order.save(update_fields=update_fields)

        # Notifier les deux parties par email
        try:
            from apps.core.tasks import send_service_order_status_task
            send_service_order_status_task.delay(order.id, recipient_role='client')
            send_service_order_status_task.delay(order.id, recipient_role='provider')
        except Exception:
            pass

        return Response({
            'message': f'Statut mis à jour : {order.get_status_display()}.',
            'order': ServiceOrderSerializer(order).data,
        })


class ServiceOrderDeliverView(APIView):
    """Prestataire livre un fichier pour une commande de service."""
    permission_classes = [permissions.IsAuthenticated, IsServiceProvider]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request, pk):
        order = get_object_or_404(ServiceOrder, pk=pk)
        # Vérifier que c'est le prestataire
        profile = _get_user_professional_profile(request.user)
        if not request.user.is_platform_admin and order.provider != profile:
            return Response(
                {'message': 'Non autorisé.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        file = request.FILES.get('file')
        if not file:
            return Response(
                {'message': 'Aucun fichier fourni.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Validation taille, extension, magic bytes
        from apps.core.validators import validate_deliverable_file
        from django.core.exceptions import ValidationError as DjangoValidationError
        try:
            validate_deliverable_file(file)
        except DjangoValidationError as e:
            return Response(
                {'message': e.message if hasattr(e, 'message') else str(e)},
                status=status.HTTP_400_BAD_REQUEST,
            )

        from django.utils import timezone as tz
        order.deliverable_file = file
        order.status = 'REVIEW'
        order.delivered_at = tz.now()
        order.auto_complete_notified = 0  # Reset le timer à chaque (re-)livraison
        order.save(update_fields=['deliverable_file', 'status', 'delivered_at', 'auto_complete_notified', 'updated_at'])

        # Notifier le client que le livrable est disponible
        try:
            from apps.core.tasks import send_service_order_status_task
            send_service_order_status_task.delay(order.id, recipient_role='client')
        except Exception:
            pass

        return Response({
            'message': 'Livrable envoyé. Commande en révision.',
            'order': ServiceOrderSerializer(order).data,
        })


class ServiceOrderDeliverableDownloadView(APIView):
    """Téléchargement sécurisé du fichier livrable d'une commande de service."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pk):
        order = get_object_or_404(ServiceOrder, pk=pk)

        # Vérifier que l'utilisateur est participant à la commande ou admin
        if not request.user.is_platform_admin:
            profile = _get_user_professional_profile(request.user)
            is_client = order.client == request.user
            is_provider = profile and order.provider == profile
            if not is_client and not is_provider:
                return Response(
                    {'message': 'Non autorisé.'},
                    status=status.HTTP_403_FORBIDDEN,
                )

        if not order.deliverable_file:
            return Response(
                {'message': 'Aucun livrable disponible.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        import mimetypes
        import os
        filename = os.path.basename(order.deliverable_file.name)
        content_type = mimetypes.guess_type(filename)[0] or 'application/octet-stream'

        from django.http import FileResponse
        return FileResponse(
            order.deliverable_file.open('rb'),
            as_attachment=True,
            filename=filename,
            content_type=content_type,
        )


class ServiceOrderRequestRevisionView(APIView):
    """Le client demande une révision sur un livrable en cours de revue."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        order = get_object_or_404(ServiceOrder, pk=pk)

        # Seul le client peut demander une révision
        if order.client != request.user:
            return Response(
                {'message': 'Seul le client peut demander une révision.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        # Vérifier le statut
        if order.status != 'REVIEW':
            return Response(
                {'message': 'Une révision ne peut être demandée que lorsque le livrable est en cours de revue.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Valider le motif
        reason = (request.data.get('reason') or '').strip()
        if len(reason) < 10:
            return Response(
                {'message': 'Le motif doit contenir au moins 10 caractères.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if len(reason) > 2000:
            return Response(
                {'message': 'Le motif ne peut pas dépasser 2 000 caractères.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Vérifier le compteur de révisions
        max_rounds = order.quote.revision_rounds if order.quote else 1
        if order.revision_count >= max_rounds:
            return Response(
                {'message': f'Vous avez atteint le nombre maximum de révisions incluses dans le devis ({max_rounds} révision{"s" if max_rounds > 1 else ""}).'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Appliquer la révision
        order.status = 'REVISION'
        order.revision_count += 1
        order.last_revision_reason = reason
        order.save(update_fields=['status', 'revision_count', 'last_revision_reason', 'updated_at'])

        # Notifier le prestataire avec le motif
        try:
            from apps.core.tasks import send_service_order_status_task
            send_service_order_status_task.delay(order.id, recipient_role='provider', message=reason)
        except Exception:
            pass

        return Response({
            'message': 'Demande de révision envoyée au prestataire.',
            'order': ServiceOrderSerializer(order).data,
        })


# ══════════════════════════════════════════════════════════════
# EditorialProject
# ══════════════════════════════════════════════════════════════

class EditorialProjectListView(generics.ListAPIView):
    """Liste des projets éditoriaux de la maison d'édition de l'utilisateur."""
    serializer_class = EditorialProjectSerializer
    permission_classes = [permissions.IsAuthenticated, IsPublisherMember]

    def get_queryset(self):
        publisher = _get_user_publisher(self.request.user)
        if not publisher:
            return EditorialProject.objects.none()
        return EditorialProject.objects.filter(
            organization=publisher,
        ).select_related('organization', 'manuscript', 'book')


class EditorialProjectCreateView(generics.CreateAPIView):
    """Créer un projet éditorial (auto-set organisation)."""
    serializer_class = EditorialProjectCreateSerializer
    permission_classes = [permissions.IsAuthenticated, IsPublisherMember]

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx['organization'] = _get_user_publisher(self.request.user)
        return ctx

    def create(self, request, *args, **kwargs):
        org = _get_user_publisher(request.user)
        if not org:
            return Response(
                {'message': 'Aucune maison d\'édition trouvée.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        project = serializer.save()
        return Response(
            {
                'message': 'Projet éditorial créé.',
                'project': EditorialProjectSerializer(project).data,
            },
            status=status.HTTP_201_CREATED,
        )


class EditorialProjectDetailView(generics.RetrieveUpdateAPIView):
    """Détail et mise à jour d'un projet éditorial."""
    serializer_class = EditorialProjectSerializer
    permission_classes = [permissions.IsAuthenticated, IsPublisherMember]

    def get_queryset(self):
        publisher = _get_user_publisher(self.request.user)
        if not publisher:
            return EditorialProject.objects.none()
        return EditorialProject.objects.filter(
            organization=publisher,
        ).select_related('organization', 'manuscript', 'book')


class ProjectTaskCreateView(generics.CreateAPIView):
    """Créer une tâche dans un projet éditorial."""
    serializer_class = ProjectTaskCreateSerializer
    permission_classes = [permissions.IsAuthenticated, IsPublisherMember]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        # Vérifier que le projet appartient à la maison d'édition de l'utilisateur
        project = serializer.validated_data['project']
        publisher = _get_user_publisher(request.user)
        if not request.user.is_platform_admin and project.organization != publisher:
            return Response(
                {'message': 'Non autorisé.'},
                status=status.HTTP_403_FORBIDDEN,
            )
        task = serializer.save()
        return Response(
            {
                'message': 'Tâche créée.',
                'task': ProjectTaskSerializer(task).data,
            },
            status=status.HTTP_201_CREATED,
        )


class ProjectTaskStatusUpdateView(APIView):
    """Met à jour le statut d'une tâche de projet."""
    permission_classes = [permissions.IsAuthenticated]

    def patch(self, request, pk):
        task = get_object_or_404(ProjectTask, pk=pk)
        # Vérifier droits : membre de l'organisation ou assigné
        if not request.user.is_platform_admin:
            publisher = _get_user_publisher(request.user)
            profile = _get_user_professional_profile(request.user)
            is_org_member = publisher and task.project.organization == publisher
            is_assigned = profile and task.assigned_to == profile
            if not is_org_member and not is_assigned:
                return Response(
                    {'message': 'Non autorisé.'},
                    status=status.HTTP_403_FORBIDDEN,
                )

        serializer = ProjectTaskStatusSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        task.status = serializer.validated_data['status']
        task.save(update_fields=['status', 'updated_at'])
        return Response({
            'message': f'Statut mis à jour : {task.get_status_display()}.',
            'task': ProjectTaskSerializer(task).data,
        })


class CreateProjectFromManuscriptView(APIView):
    """Créer un projet éditorial à partir d'un manuscrit accepté."""
    permission_classes = [permissions.IsAuthenticated, IsPublisherMember]

    def post(self, request, manuscript_id):
        from apps.manuscripts.models import Manuscript
        manuscript = get_object_or_404(Manuscript, pk=manuscript_id)

        if manuscript.status != 'ACCEPTED':
            return Response(
                {'message': 'Le manuscrit doit être accepté pour créer un projet.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        publisher = _get_user_publisher(request.user)
        if not publisher:
            return Response({'message': 'Aucune maison d\'édition trouvée.'}, status=status.HTTP_400_BAD_REQUEST)

        # Vérifier qu'un projet n'existe pas déjà pour ce manuscrit
        if EditorialProject.objects.filter(manuscript=manuscript, organization=publisher).exists():
            return Response({'message': 'Un projet existe déjà pour ce manuscrit.'}, status=status.HTTP_409_CONFLICT)

        project = EditorialProject.objects.create(
            manuscript=manuscript,
            organization=publisher,
            title=manuscript.title,
            description=f'Projet éditorial pour « {manuscript.title} » de {manuscript.author_name}.',
            status='DRAFT',
        )

        return Response({
            'message': f'Projet « {project.title} » créé avec succès.',
            'project': EditorialProjectSerializer(project).data,
        }, status=status.HTTP_201_CREATED)


class PublishProjectAsBookView(APIView):
    """Publier un projet éditorial terminé en tant que livre."""
    permission_classes = [permissions.IsAuthenticated, IsPublisherMember]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request, pk):
        project = get_object_or_404(EditorialProject, pk=pk)
        publisher = _get_user_publisher(request.user)

        if not publisher or project.organization != publisher:
            return Response({'message': 'Non autorisé.'}, status=status.HTTP_403_FORBIDDEN)

        if project.status not in ('APPROVED', 'PRINTING'):
            return Response(
                {'message': 'Le projet doit être approuvé ou en impression pour être publié.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if project.book:
            return Response({'message': 'Ce projet a déjà un livre associé.'}, status=status.HTTP_409_CONFLICT)

        from apps.books.serializers import BookCreateUpdateSerializer
        serializer = BookCreateUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        book = serializer.save(publisher_organization=publisher)

        project.book = book
        project.status = 'PUBLISHED'
        project.save(update_fields=['book', 'status', 'updated_at'])

        return Response({
            'message': f'Livre « {book.title} » publié avec succès.',
            'book_id': book.id,
            'book_slug': book.slug,
            'project': EditorialProjectSerializer(project).data,
        }, status=status.HTTP_201_CREATED)


# ══════════════════════════════════════════════════════════════
# PrintRequest
# ══════════════════════════════════════════════════════════════

class PrinterListView(generics.ListAPIView):
    """Liste des imprimeries (public)."""
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        printers = Organization.objects.filter(
            org_type='IMPRIMERIE', is_active=True,
        )
        data = [
            {
                'id': p.id,
                'name': p.name,
                'slug': p.slug,
                'city': p.city,
                'country': p.country,
                'is_verified': p.is_verified,
                'description': p.description,
            }
            for p in printers
        ]
        return Response(data)


class PrintRequestCreateView(generics.CreateAPIView):
    """Créer une demande d'impression."""
    serializer_class = PrintRequestCreateSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx['requester_org'] = _get_user_publisher(self.request.user)
        return ctx

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        print_request = serializer.save()
        return Response(
            {
                'message': 'Demande d\'impression créée.',
                'print_request': PrintRequestSerializer(print_request).data,
            },
            status=status.HTTP_201_CREATED,
        )


class PrintRequestListView(generics.ListAPIView):
    """Liste des demandes d'impression de l'utilisateur."""
    serializer_class = PrintRequestSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        from django.db.models import Q
        q = Q(requester=user)
        # Si membre d'une imprimerie, voir aussi les demandes reçues
        printer_membership = OrganizationMembership.objects.filter(
            user=user, is_active=True,
            organization__org_type='IMPRIMERIE',
        ).select_related('organization').first()
        if printer_membership:
            q |= Q(printer=printer_membership.organization)
        # Si membre d'une maison d'édition, voir les demandes envoyées par l'org
        publisher = _get_user_publisher(user)
        if publisher:
            q |= Q(requester_org=publisher)
        return PrintRequest.objects.filter(q).select_related(
            'book', 'printer', 'requester', 'requester_org', 'project',
        ).distinct()


class PrintRequestDetailView(generics.RetrieveAPIView):
    """Détail d'une demande d'impression."""
    serializer_class = PrintRequestSerializer
    permission_classes = [permissions.IsAuthenticated]
    queryset = PrintRequest.objects.select_related(
        'book', 'printer', 'requester', 'requester_org', 'project',
    )

    def get_object(self):
        obj = super().get_object()
        user = self.request.user
        if not user.is_platform_admin:
            is_requester = obj.requester == user
            is_printer_member = OrganizationMembership.objects.filter(
                user=user, organization=obj.printer, is_active=True,
            ).exists()
            publisher = _get_user_publisher(user)
            is_org_requester = publisher and obj.requester_org == publisher
            if not is_requester and not is_printer_member and not is_org_requester:
                self.permission_denied(self.request)
        return obj


class PrintRequestStatusUpdateView(APIView):
    """Met à jour le statut d'une demande d'impression."""
    permission_classes = [permissions.IsAuthenticated]

    def patch(self, request, pk):
        print_req = get_object_or_404(PrintRequest, pk=pk)
        # Vérifier droits
        if not request.user.is_platform_admin:
            is_requester = print_req.requester == request.user
            is_printer_member = OrganizationMembership.objects.filter(
                user=request.user, organization=print_req.printer, is_active=True,
            ).exists()
            if not is_requester and not is_printer_member:
                return Response(
                    {'message': 'Non autorisé.'},
                    status=status.HTTP_403_FORBIDDEN,
                )

        serializer = PrintRequestStatusSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        print_req.status = serializer.validated_data['status']
        update_fields = ['status', 'updated_at']
        if 'unit_price' in serializer.validated_data:
            print_req.unit_price = serializer.validated_data['unit_price']
            update_fields.append('unit_price')
        if 'total_price' in serializer.validated_data:
            print_req.total_price = serializer.validated_data['total_price']
            update_fields.append('total_price')
        print_req.save(update_fields=update_fields)
        return Response({
            'message': f'Statut mis à jour : {print_req.get_status_display()}.',
            'print_request': PrintRequestSerializer(print_req).data,
        })


# ══════════════════════════════════════════════════════════════
# Factures PDF
# ══════════════════════════════════════════════════════════════

class ServiceOrderInvoiceView(APIView):
    """Télécharger la facture PDF d'une commande de service."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pk):
        order = get_object_or_404(ServiceOrder, pk=pk)
        profile = _get_user_professional_profile(request.user)
        if not request.user.is_platform_admin and order.client != request.user and (not profile or order.provider != profile):
            return Response({'message': 'Non autorisé.'}, status=status.HTTP_403_FORBIDDEN)
        from apps.core.invoice import generate_service_order_invoice_pdf
        from django.http import FileResponse
        pdf = generate_service_order_invoice_pdf(order)
        return FileResponse(pdf, content_type='application/pdf', filename=f'facture-service-{order.id:06d}.pdf')


class ServiceQuotePDFView(APIView):
    """Télécharger le devis PDF d'une prestation de service."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pk):
        quote = get_object_or_404(ServiceQuote, pk=pk)
        profile = _get_user_professional_profile(request.user)
        if not request.user.is_platform_admin and quote.request.client != request.user and (not profile or quote.request.provider_profile != profile):
            return Response({'message': 'Non autorisé.'}, status=status.HTTP_403_FORBIDDEN)
        from apps.core.invoice import generate_service_quote_pdf
        from django.http import FileResponse
        pdf = generate_service_quote_pdf(quote)
        return FileResponse(pdf, content_type='application/pdf', filename=f'devis-service-{quote.id:06d}.pdf')


class PrintRequestQuotePDFView(APIView):
    """Télécharger le devis PDF d'une demande d'impression."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pk):
        print_req = get_object_or_404(PrintRequest, pk=pk)
        if not request.user.is_platform_admin:
            is_requester = print_req.requester == request.user
            is_printer_member = OrganizationMembership.objects.filter(
                user=request.user, organization=print_req.printer, is_active=True,
            ).exists()
            if not is_requester and not is_printer_member:
                return Response({'message': 'Non autorisé.'}, status=status.HTTP_403_FORBIDDEN)
        from apps.core.invoice import generate_print_request_quote_pdf
        from django.http import FileResponse
        pdf = generate_print_request_quote_pdf(print_req)
        return FileResponse(pdf, content_type='application/pdf', filename=f'devis-impression-{print_req.id:06d}.pdf')


# ══════════════════════════════════════════════════════════════
# Wallet
# ══════════════════════════════════════════════════════════════

class ProfessionalWalletView(APIView):
    """Portefeuille du professionnel connecté."""
    permission_classes = [permissions.IsAuthenticated, IsServiceProvider]

    def get(self, request):
        profile = _get_user_professional_profile(request.user)
        if not profile:
            return Response(
                {'message': 'Aucun profil professionnel trouvé.'},
                status=status.HTTP_404_NOT_FOUND,
            )
        wallet, _ = ProfessionalWallet.objects.get_or_create(professional=profile)
        return Response(ProfessionalWalletSerializer(wallet).data)


class ProfessionalWalletTransactionListView(generics.ListAPIView):
    """Historique des transactions du professionnel."""
    serializer_class = ProfessionalWalletTransactionSerializer
    permission_classes = [permissions.IsAuthenticated, IsServiceProvider]

    def get_queryset(self):
        profile = _get_user_professional_profile(self.request.user)
        if not profile:
            return ProfessionalWalletTransaction.objects.none()
        return ProfessionalWalletTransaction.objects.filter(
            wallet__professional=profile,
        ).order_by('-created_at')


# ── Avis Prestataires ──

class ServiceProviderReviewListView(generics.ListAPIView):
    """Liste des avis sur un prestataire."""
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        from .models import ServiceProviderReview
        from .serializers import ServiceProviderReviewSerializer
        provider_id = request.query_params.get('provider')
        qs = ServiceProviderReview.objects.select_related('user', 'provider__user').order_by('-created_at')
        if provider_id:
            qs = qs.filter(provider_id=provider_id)
        return Response(ServiceProviderReviewSerializer(qs, many=True).data)


class ServiceProviderReviewCreateView(APIView):
    """Créer un avis sur un prestataire après une commande terminée."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        from .models import ServiceOrder
        from .serializers import ServiceProviderReviewCreateSerializer, ServiceProviderReviewSerializer

        order_id = request.data.get('service_order')
        if not order_id:
            return Response({'message': 'service_order requis.'}, status=status.HTTP_400_BAD_REQUEST)

        order = get_object_or_404(ServiceOrder, pk=order_id)
        if order.client != request.user:
            return Response({'message': 'Seul le client peut laisser un avis.'}, status=status.HTTP_403_FORBIDDEN)
        if order.status != 'COMPLETED':
            return Response({'message': 'La commande doit être terminée.'}, status=status.HTTP_400_BAD_REQUEST)

        serializer = ServiceProviderReviewCreateSerializer(
            data=request.data,
            context={'request': request, 'provider': order.provider},
        )
        serializer.is_valid(raise_exception=True)
        # Force service_order to the validated order to prevent injection
        review = serializer.save(service_order=order)
        return Response(
            {'message': 'Avis publié.', 'review': ServiceProviderReviewSerializer(review).data},
            status=status.HTTP_201_CREATED,
        )


# ═══════════════════════════════════════════════════
#  DQE — Views
# ═══════════════════════════════════════════════════


class QuoteTemplateListView(generics.ListAPIView):
    """Liste des modèles de devis disponibles."""
    serializer_class = QuoteTemplateListSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = QuoteTemplate.objects.filter(is_active=True)
        org_id = self.request.query_params.get('organization')
        if org_id:
            qs = qs.filter(models.Q(organization_id=org_id) | models.Q(organization__isnull=True))
        else:
            qs = qs.filter(organization__isnull=True)
        return qs.select_related('organization')

class QuoteTemplateDetailView(generics.RetrieveAPIView):
    """Détail d'un modèle de devis avec ses lots et postes."""
    serializer_class = QuoteTemplateDetailSerializer
    permission_classes = [IsAuthenticated]
    queryset = QuoteTemplate.objects.prefetch_related('lots__items')


class PublicQuoteTemplateListView(generics.ListAPIView):
    """
    Vitrine publique des modèles de devis d'une organisation.
    GET /api/organizations/{org_id}/quote-templates/public/
    Sans authentification. N'expose jamais les notes internes.
    """
    serializer_class = QuoteTemplatePublicSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        org_id = self.kwargs['org_id']
        return QuoteTemplate.objects.filter(
            organization_id=org_id,
            is_public=True,
            is_active=True,
        ).prefetch_related('lots__items').select_related('organization')


class QuoteListView(generics.ListAPIView):
    """Liste des devis émis ou reçus par l'utilisateur."""
    serializer_class = QuoteListSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        role = self.request.query_params.get('role', 'provider')
        if role == 'client':
            return Quote.objects.filter(client=user).select_related('provider_organization')
        # Provider : devis créés par l'utilisateur ou par son organisation
        from apps.organizations.models import OrganizationMembership
        org_ids = OrganizationMembership.objects.filter(
            user=user
        ).values_list('organization_id', flat=True)
        return Quote.objects.filter(
            models.Q(created_by=user) | models.Q(provider_organization_id__in=org_ids)
        ).select_related('provider_organization', 'client').distinct()

class QuoteDetailView(generics.RetrieveAPIView):
    """Détail complet d'un devis DQE."""
    serializer_class = QuoteDetailSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        from apps.organizations.models import OrganizationMembership
        org_ids = OrganizationMembership.objects.filter(
            user=user
        ).values_list('organization_id', flat=True)
        return Quote.objects.filter(
            models.Q(created_by=user) | models.Q(client=user) |
            models.Q(provider_organization_id__in=org_ids)
        ).prefetch_related('lots__items', 'revisions').select_related(
            'provider_organization', 'client', 'template'
        ).distinct()

class QuoteCreateView(generics.CreateAPIView):
    """Créer un devis DQE complet (quote + lots + items)."""
    serializer_class = QuoteCreateSerializer
    permission_classes = [IsAuthenticated]

    def create(self, request, *args, **kwargs):
        from django.db import transaction as db_transaction

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        # Fallback : hériter le publishing_model du template si non fourni
        publishing_model = data.get('publishing_model', '')
        template_id = data.get('template_id')
        if not publishing_model and template_id:
            try:
                tpl = QuoteTemplate.objects.get(pk=template_id)
                publishing_model = tpl.publishing_model or ''
            except QuoteTemplate.DoesNotExist:
                pass

        with db_transaction.atomic():
            # Créer le devis
            quote = Quote.objects.create(
                title=data['title'],
                template_id=template_id,
                manuscript_id=data.get('manuscript_id'),
                service_request_id=data.get('service_request_id'),
                provider_organization_id=data.get('organization_id'),
                created_by=request.user,
                client_id=data.get('client_id'),
                client_name=data.get('client_name', ''),
                client_email=data.get('client_email', ''),
                publishing_model=publishing_model,
                royalty_terms=data.get('royalty_terms', []),
                print_run=data.get('print_run'),
                retail_price=data.get('retail_price'),
                parent_quote_id=data.get('parent_quote_id'),
                discount_type=data.get('discount_type', 'PERCENT'),
                discount_value=data.get('discount_value', 0),
                tax_rate=data.get('tax_rate', 0),
                delivery_days=data.get('delivery_days', 30),
                validity_days=data.get('validity_days', 30),
                revision_rounds=data.get('revision_rounds', 1),
                notes=data.get('notes', ''),
                payment_schedule=data.get('payment_schedule', []),
            )

            # Créer les lots et leurs items
            for lot_data in data['lots']:
                lot = QuoteLot.objects.create(
                    quote=quote,
                    name=lot_data['name'],
                    order=lot_data.get('order', 0),
                )
                for item_data in lot_data['items']:
                    QuoteItem.objects.create(
                        lot=lot,
                        designation=item_data['designation'],
                        description=item_data.get('description', ''),
                        unit=item_data.get('unit', 'FORFAIT'),
                        quantity=item_data.get('quantity', 1),
                        unit_price=item_data.get('unit_price', 0),
                        order=item_data.get('order', 0),
                    )

            # Recalculer les totaux
            quote.recalculate()

        # Retourner le devis complet
        detail = QuoteDetailSerializer(quote).data
        return Response(detail, status=status.HTTP_201_CREATED)

class QuoteSendView(APIView):
    """Envoyer un devis au client (passe de DRAFT à SENT)."""
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        from django.core.exceptions import ValidationError
        from django.utils import timezone

        quote = get_object_or_404(Quote, pk=pk)
        if quote.status != 'DRAFT':
            return Response({'error': 'Ce devis a déjà été envoyé.'}, status=400)

        # Valider les règles métier si c'est un devis éditorial
        try:
            quote.validate_editorial_quote()
        except ValidationError as e:
            return Response({'error': e.message}, status=400)

        quote.status = 'SENT'
        quote.sent_at = timezone.now()
        if not quote.valid_until:
            quote.valid_until = (timezone.now() + timezone.timedelta(days=quote.validity_days)).date()
        quote.save(update_fields=['status', 'sent_at', 'valid_until'])

        # Passer le manuscrit en QUOTE_SENT si applicable
        if quote.manuscript and quote.manuscript.status == 'REVIEWING':
            try:
                quote.manuscript.transition_status('QUOTE_SENT', request.user)
            except ValidationError:
                pass  # Le manuscrit est peut-être déjà en QUOTE_SENT (autre devis)

        # Si le devis est une révision, passer le devis parent en SUPERSEDED
        if quote.parent_quote_id:
            try:
                parent = Quote.objects.filter(pk=quote.parent_quote_id, status='REVISION_REQUESTED').first()
                if parent:
                    parent.status = 'SUPERSEDED'
                    parent.save(update_fields=['status'])
            except Exception:
                pass  # Ne pas bloquer l'envoi sur une erreur de transition parent

        # Envoyer email avec PDF en pièce jointe (asynchrone)
        if quote.manuscript:
            from apps.core.tasks import send_editorial_quote_task
            send_editorial_quote_task.delay(quote.pk)

        return Response(QuoteDetailSerializer(quote).data)

class QuoteRespondView(APIView):
    """Le client accepte, refuse ou demande une révision d'un devis."""
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        from django.db import transaction
        from django.utils import timezone
        from apps.core.tasks import send_quote_response_notification_task

        quote = get_object_or_404(Quote, pk=pk, client=request.user)
        action = request.data.get('action')
        reason = request.data.get('reason', '').strip()

        if quote.status not in ('SENT', 'REVISION_REQUESTED'):
            return Response({'error': 'Ce devis ne peut plus être modifié.'}, status=400)

        # Seuls les devis SENT peuvent être acceptés ou recevoir une demande de révision
        if action == 'accept':
            if quote.status != 'SENT':
                return Response({'error': 'Seul un devis envoyé peut être accepté.'}, status=400)
            quote.status = 'ACCEPTED'
            quote.accepted_at = timezone.now()
            quote.save(update_fields=['status', 'accepted_at'])

        elif action == 'reject':
            quote.status = 'REJECTED'
            quote.rejected_at = timezone.now()
            quote.rejection_reason = reason
            quote.save(update_fields=['status', 'rejected_at', 'rejection_reason'])

        elif action == 'revision':
            if quote.status != 'SENT':
                return Response({'error': 'Seul un devis envoyé peut faire l\'objet d\'une contre-proposition.'}, status=400)
            if not reason:
                return Response(
                    {'error': 'Le motif de la demande de révision est obligatoire.'},
                    status=400,
                )
            quote.status = 'REVISION_REQUESTED'
            quote.rejection_reason = reason
            quote.save(update_fields=['status', 'rejection_reason'])

        else:
            return Response(
                {'error': 'Action invalide. Valeurs acceptées : accept, reject, revision.'},
                status=400,
            )

        # Notification email à l'éditeur (après commit réussi)
        quote_id = quote.id
        transaction.on_commit(
            lambda: send_quote_response_notification_task.delay(quote_id, action, reason)
        )

        return Response(QuoteDetailSerializer(quote).data)
