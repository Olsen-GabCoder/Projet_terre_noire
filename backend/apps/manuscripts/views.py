import logging
from pathlib import Path

from django.http import FileResponse, Http404
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.utils.text import slugify

logger = logging.getLogger(__name__)
from rest_framework import generics, status, permissions
from rest_framework.permissions import AllowAny, IsAdminUser, IsAuthenticated
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.views import APIView

from apps.core.throttling import PublicEndpointThrottle
from apps.organizations.models import Organization, OrganizationMembership
from apps.organizations.permissions import IsOrganizationEditor, IsOrganizationMember, user_has_org_permission
from .models import Manuscript
from .serializers import ManuscriptSerializer, ManuscriptListSerializer, ManuscriptStatusSerializer


# Rôles autorisés à consulter les manuscrits d'une organisation
MANUSCRIPT_ACCESS_ROLES = ['PROPRIETAIRE', 'ADMINISTRATEUR', 'EDITEUR']


def user_can_access_manuscript(user, manuscript):
    """
    Vérifie si un utilisateur a le droit de télécharger un manuscrit.
    Réutilisé par ManuscriptDownloadView et potentiellement d'autres vues.
    Retourne (bool, str) — (autorisé, raison).
    """
    # Admin plateforme
    if getattr(user, 'is_platform_admin', False) or getattr(user, 'is_staff', False):
        return True, 'admin'

    # Submitter (l'auteur)
    if manuscript.submitter_id and manuscript.submitter_id == user.id:
        return True, 'submitter'

    # Membre autorisé de l'organisation destinataire (soumission ciblée)
    if manuscript.target_organization_id:
        if OrganizationMembership.objects.filter(
            user=user,
            organization_id=manuscript.target_organization_id,
            role__in=MANUSCRIPT_ACCESS_ROLES,
            is_active=True,
        ).exists():
            return True, 'org_editor'

    # Marché ouvert : membre autorisé d'une org dont les genres acceptés correspondent
    if manuscript.is_open_market:
        user_org_ids = OrganizationMembership.objects.filter(
            user=user,
            role__in=MANUSCRIPT_ACCESS_ROLES,
            is_active=True,
            organization__org_type='MAISON_EDITION',
            organization__is_active=True,
        ).values_list('organization_id', flat=True)

        if user_org_ids:
            matching = Organization.objects.filter(
                id__in=user_org_ids,
            ).filter(
                # Org sans genres acceptés → accepte tout ; sinon genre doit matcher
                accepted_genres__contains=[manuscript.genre],
            ).exists()

            # Aussi accepter les orgs sans filtre de genre
            no_filter = Organization.objects.filter(
                id__in=user_org_ids,
                accepted_genres=[],
            ).exists() or Organization.objects.filter(
                id__in=user_org_ids,
                accepted_genres__isnull=True,
            ).exists()

            if matching or no_filter:
                return True, 'open_market_editor'

    return False, 'denied'


class ManuscriptCreateView(generics.CreateAPIView):
    queryset = Manuscript.objects.all()
    serializer_class = ManuscriptSerializer
    permission_classes = [IsAuthenticated]
    throttle_classes = [PublicEndpointThrottle]
    parser_classes = [MultiPartParser, FormParser]

    def create(self, request, *args, **kwargs):
        # Vérifier que l'utilisateur a le profil AUTEUR activé
        profile_types = getattr(request.user, 'profile_types', None) or []
        if 'AUTEUR' not in profile_types:
            return Response(
                {
                    'code': 'AUTHOR_PROFILE_REQUIRED',
                    'detail': 'Vous devez activer le profil Auteur pour soumettre un manuscrit.',
                    'action_url': '/dashboard/settings',
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        manuscript = serializer.instance

        # Lier systématiquement au soumetteur (authentifié garanti)
        manuscript.submitter = request.user
        manuscript.save(update_fields=['submitter'])

        # Répondre immédiatement, puis envoyer les emails en arrière-plan
        headers = self.get_success_headers(serializer.data)
        response = Response(
            {
                'success': True,
                'message': 'Votre manuscrit a été soumis avec succès.',
                'data': serializer.data
            },
            status=status.HTTP_201_CREATED,
            headers=headers
        )

        # Emails en arrière-plan (non-bloquant via thread si Celery absent)
        import threading
        from apps.core.tasks import send_manuscript_acknowledgment_task, send_manuscript_org_notification_task

        def _send_emails():
            try:
                from apps.core.email import send_manuscript_org_notification

                # 1. Accusé de réception à l'auteur
                send_manuscript_acknowledgment_task.delay(manuscript.id)

                # 2. Notification à l'organisation ciblée
                if manuscript.target_organization:
                    send_manuscript_org_notification_task.delay(manuscript.id)

                # 3. Marché ouvert : notifier toutes les maisons d'édition qui acceptent ce genre
                elif manuscript.is_open_market:
                    from apps.organizations.models import Organization
                    eligible_orgs = Organization.objects.filter(
                        org_type='MAISON_EDITION',
                        is_active=True,
                    ).exclude(email='').exclude(email__isnull=True)
                    # Filtrer par genre si l'org a des genres acceptés
                    for org in eligible_orgs:
                        if org.accepted_genres and manuscript.genre not in org.accepted_genres:
                            continue
                        try:
                            send_manuscript_org_notification(manuscript, org_override=org)
                        except Exception:
                            logger.warning("Échec notification org %s pour manuscrit %s", org.id, manuscript.id)
            except Exception:
                logger.exception("Erreur envoi emails manuscrit %s", manuscript.id)

        threading.Thread(target=_send_emails, daemon=True).start()

        return response


class ManuscriptListView(generics.ListAPIView):
    """Liste tous les manuscrits (Admin plateforme)."""
    queryset = Manuscript.objects.all().select_related(
        'submitter', 'target_organization', 'reviewed_by'
    ).order_by('-submitted_at')
    serializer_class = ManuscriptListSerializer
    permission_classes = [IsAdminUser]


class ManuscriptDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Voir, modifier ou supprimer un manuscrit (Admin plateforme)."""
    queryset = Manuscript.objects.select_related(
        'submitter', 'target_organization', 'reviewed_by'
    )
    serializer_class = ManuscriptSerializer
    permission_classes = [IsAdminUser]
    parser_classes = [MultiPartParser, FormParser]

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        return Response({
            'success': True,
            'message': 'Manuscrit mis à jour avec succès.',
            'data': serializer.data
        })

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        self.perform_destroy(instance)
        return Response(
            {'success': True, 'message': 'Manuscrit supprimé avec succès.'},
            status=status.HTTP_200_OK
        )


class ManuscriptStatusUpdateView(APIView):
    """
    Mettre à jour le statut d'un manuscrit avec feedback optionnel.
    Passe désormais par transition_status() pour bénéficier de tous les verrous.
    Accessible par admin plateforme OU membre d'org avec permission manage_manuscripts.
    """
    permission_classes = [IsAuthenticated]

    def patch(self, request, pk):
        from django.core.exceptions import ValidationError

        manuscript = get_object_or_404(Manuscript, pk=pk)

        # Vérifier autorisation : admin plateforme OU membre de l'org ciblée avec permission
        user = request.user
        is_authorized = user.is_staff
        if not is_authorized and manuscript.target_organization:
            is_authorized = user_has_org_permission(
                user, manuscript.target_organization, 'org.manage_manuscripts'
            )
        if not is_authorized:
            return Response(
                {'error': 'Non autorisé.'},
                status=status.HTTP_403_FORBIDDEN
            )

        serializer = ManuscriptStatusSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        old_status = manuscript.status
        new_status = serializer.validated_data['status']
        rejection_reason = serializer.validated_data.get('rejection_reason', '')

        try:
            manuscript.transition_status(new_status, user, rejection_reason=rejection_reason)
        except ValidationError as e:
            return Response(
                {'error': e.message if hasattr(e, 'message') else str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Notifier l'auteur du changement de statut
        if old_status != new_status:
            try:
                from apps.core.email import send_manuscript_status_update
                send_manuscript_status_update(manuscript)
            except Exception:
                pass

        return Response({
            'success': True,
            'message': f'Statut du manuscrit mis à jour à "{manuscript.get_status_display()}"',
            'data': ManuscriptSerializer(manuscript, context={'request': request}).data
        })


# ══════════════════════════════════════════════════════════════
# Inbox Manuscrits pour Organisation
# ══════════════════════════════════════════════════════════════

class OrganizationManuscriptInboxView(generics.ListAPIView):
    """
    Liste les manuscrits reçus par une organisation (ciblés + marché ouvert compatible).
    GET /api/organizations/{org_id}/manuscripts/
    Filtre : ?status=PENDING&type=targeted|open
    """
    serializer_class = ManuscriptListSerializer
    permission_classes = [IsAuthenticated, IsOrganizationEditor]

    def get_queryset(self):
        from apps.organizations.models import Organization
        from django.db.models import Q

        org_id = self.kwargs['org_id']
        org = get_object_or_404(Organization, pk=org_id)

        # Manuscrits ciblés directement à cette org
        q = Q(target_organization=org)

        # Manuscrits marché ouvert dont le genre correspond aux genres acceptés
        if org.accepted_genres:
            q |= Q(is_open_market=True, genre__in=org.accepted_genres)

        qs = Manuscript.objects.filter(q).select_related(
            'submitter', 'target_organization'
        ).distinct().order_by('-submitted_at')

        # Filtres optionnels
        params = self.request.query_params
        status_filter = params.get('status')
        if status_filter:
            qs = qs.filter(status=status_filter)

        type_filter = params.get('type')
        if type_filter == 'targeted':
            qs = qs.filter(target_organization=org)
        elif type_filter == 'open':
            qs = qs.filter(is_open_market=True).exclude(target_organization=org)

        return qs


class OrganizationManuscriptDetailView(generics.RetrieveAPIView):
    """
    Détail d'un manuscrit pour un membre d'organisation.
    GET /api/organizations/{org_id}/manuscripts/{pk}/
    """
    serializer_class = ManuscriptSerializer
    permission_classes = [IsAuthenticated, IsOrganizationEditor]

    def get_queryset(self):
        from apps.organizations.models import Organization
        from django.db.models import Q

        org_id = self.kwargs['org_id']
        org = get_object_or_404(Organization, pk=org_id)

        q = Q(target_organization=org)
        if org.accepted_genres:
            q |= Q(is_open_market=True, genre__in=org.accepted_genres)

        return Manuscript.objects.filter(q).select_related(
            'submitter', 'target_organization', 'reviewed_by'
        ).distinct()


# ══════════════════════════════════════════════════════════════
# Mes Soumissions (auteur connecté)
# ══════════════════════════════════════════════════════════════

class MyManuscriptsView(generics.ListAPIView):
    """
    Liste les manuscrits soumis par l'utilisateur connecté.
    GET /api/manuscripts/mine/
    """
    serializer_class = ManuscriptListSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Manuscript.objects.filter(
            submitter=self.request.user
        ).select_related('target_organization').order_by('-submitted_at')


class MyManuscriptDetailView(generics.RetrieveAPIView):
    """
    Détail d'un manuscrit soumis par l'utilisateur connecté.
    GET /api/manuscripts/mine/{pk}/
    """
    serializer_class = ManuscriptSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Manuscript.objects.filter(
            submitter=self.request.user
        ).select_related('target_organization', 'reviewed_by')


# ══════════════════════════════════════════════════════��═══════
# Marché ouvert — Verrouillage / déverrouillage
# ══════════════════════════════════════════════════════════════

class OpenMarketLockView(APIView):
    """
    L'auteur déclare avoir reçu toutes les offres attendues.
    Démarre la fenêtre de 15 jours pour comparer les devis.
    POST /api/manuscripts/mine/{pk}/lock-market/
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        from datetime import timedelta

        manuscript = get_object_or_404(
            Manuscript, pk=pk, submitter=request.user
        )

        if not manuscript.is_open_market:
            return Response(
                {'error': "Ce manuscrit n'est pas en marché ouvert."},
                status=status.HTTP_400_BAD_REQUEST
            )

        if manuscript.open_market_locked:
            return Response(
                {'error': 'Le marché ouvert est déjà verrouillé.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        manuscript.open_market_locked = True
        manuscript.open_market_deadline = timezone.now() + timedelta(days=15)
        manuscript.save(update_fields=['open_market_locked', 'open_market_deadline'])

        # Aligner la validité des devis SENT sur la deadline si elle est plus tard
        from apps.services.models import Quote
        active_quotes = Quote.objects.filter(
            manuscript=manuscript,
            status='SENT',
        )
        for quote in active_quotes:
            if quote.valid_until and quote.valid_until < manuscript.open_market_deadline.date():
                quote.valid_until = manuscript.open_market_deadline.date()
                quote.save(update_fields=['valid_until'])

        return Response({
            'success': True,
            'message': (
                f"Marché ouvert verrouillé. Vous avez jusqu'au "
                f"{manuscript.open_market_deadline.strftime('%d/%m/%Y')} pour choisir."
            ),
            'open_market_deadline': manuscript.open_market_deadline.isoformat(),
        })


class OpenMarketUnlockView(APIView):
    """
    L'auteur déverrouille le marché ouvert pour attendre d'autres offres.
    Interdit si un devis a déjà été accepté.
    POST /api/manuscripts/mine/{pk}/unlock-market/
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        manuscript = get_object_or_404(
            Manuscript, pk=pk, submitter=request.user
        )

        if not manuscript.is_open_market:
            return Response(
                {'error': "Ce manuscrit n'est pas en marché ouvert."},
                status=status.HTTP_400_BAD_REQUEST
            )

        if not manuscript.open_market_locked:
            return Response(
                {'error': "Le marché ouvert n'est pas verrouillé."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Verrou définitif si un devis est déjà accepté
        if manuscript._has_accepted_quote():
            return Response(
                {'error': "Impossible de déverrouiller : un devis a déjà été accepté."},
                status=status.HTTP_400_BAD_REQUEST
            )

        manuscript.open_market_locked = False
        manuscript.open_market_deadline = None
        manuscript.save(update_fields=['open_market_locked', 'open_market_deadline'])

        return Response({
            'success': True,
            'message': "Marché ouvert déverrouillé. Vous pouvez attendre d'autres offres.",
        })


# ══════════════════════════════════════════════════════════════
# Téléchargement protégé du fichier manuscrit
# ══════════════════════════════════════════════════════════════

class ManuscriptDownloadView(APIView):
    """
    GET /api/manuscripts/{pk}/download/
    Sert le fichier manuscrit en streaming après vérification des permissions.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        manuscript = get_object_or_404(Manuscript, pk=pk)

        if not manuscript.file:
            raise Http404("Aucun fichier attaché à ce manuscrit.")

        authorized, reason = user_can_access_manuscript(request.user, manuscript)
        if not authorized:
            return Response(
                {'detail': 'Vous n\'avez pas accès à ce manuscrit.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        logger.info(
            "Téléchargement manuscrit %s par user %s (%s)",
            pk, request.user.id, reason,
        )

        try:
            f = manuscript.file.open('rb')
        except Exception as e:
            logger.warning("Ouverture fichier manuscrit %s échouée: %s", pk, e)
            raise Http404("Fichier inaccessible.") from e

        ext = Path(manuscript.file.name).suffix or '.pdf'
        safe_title = slugify(manuscript.title)[:50] or f'manuscrit-{pk}'
        filename = f"{safe_title}{ext}"

        response = FileResponse(f, content_type='application/octet-stream')
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        return response
