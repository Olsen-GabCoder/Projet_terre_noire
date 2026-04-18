from datetime import timedelta

from django.db.models import F
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import generics, permissions, status
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response
from rest_framework.views import APIView


class StandardPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100

from apps.organizations.models import Organization, OrganizationMembership

from .models import (
    LibraryCatalogItem, LibraryMembership, BookLoan,
    LoanExtension, BookReservation,
)
from .permissions import IsLibraryAdmin, IsLibraryMember
from .serializers import (
    LibraryCatalogItemSerializer, LibraryCatalogItemCreateSerializer,
    LibraryMembershipSerializer, LibraryMembershipCreateSerializer,
    BookLoanSerializer, BookLoanCreateSerializer,
    LoanExtensionSerializer, LoanExtensionCreateSerializer,
    BookReservationSerializer, BookReservationCreateSerializer,
)


ALLOWED_LOAN_TRANSITIONS = {
    'REQUESTED': ['ACTIVE', 'REJECTED'],
    'ACTIVE': ['RETURNED', 'OVERDUE'],
    'OVERDUE': ['RETURNED'],
    'RETURNED': [],   # état final
    'REJECTED': [],   # état final
    'CANCELLED': [],  # état final
}


def _get_library_or_404(org_id):
    """Retourne l'organisation BIBLIOTHEQUE ou 404."""
    return get_object_or_404(Organization, pk=org_id, org_type='BIBLIOTHEQUE')


# ═══════════════════════════════════════════════════════════════════
# Catalogue
# ═══════════════════════════════════════════════════════════════════

class LibraryCatalogListView(generics.ListAPIView):
    """Catalogue d'une bibliothèque (public)."""
    serializer_class = LibraryCatalogItemSerializer
    permission_classes = [permissions.AllowAny]
    pagination_class = StandardPagination

    def get_queryset(self):
        library = _get_library_or_404(self.kwargs['org_id'])
        qs = LibraryCatalogItem.objects.filter(
            library=library, is_active=True,
        ).select_related('book', 'book__author', 'library')

        category = self.request.query_params.get('category')
        search = self.request.query_params.get('search')
        if category:
            qs = qs.filter(book__category__icontains=category)
        if search:
            qs = qs.filter(book__title__icontains=search)
        return qs


class LibraryCatalogCreateView(generics.CreateAPIView):
    """Ajouter un livre au catalogue (admin bibliothèque)."""
    serializer_class = LibraryCatalogItemCreateSerializer
    permission_classes = [permissions.IsAuthenticated, IsLibraryAdmin]

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx['library'] = _get_library_or_404(self.kwargs['org_id'])
        return ctx

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        item = serializer.save()
        return Response(
            {
                'message': f"« {item.book.title} » ajouté au catalogue.",
                'item': LibraryCatalogItemSerializer(item).data,
            },
            status=status.HTTP_201_CREATED,
        )


class LibraryCatalogDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Détail d'un élément du catalogue."""
    serializer_class = LibraryCatalogItemSerializer

    def get_permissions(self):
        if self.request.method in permissions.SAFE_METHODS:
            return [permissions.AllowAny()]
        return [permissions.IsAuthenticated(), IsLibraryAdmin()]

    def get_queryset(self):
        return LibraryCatalogItem.objects.filter(
            library_id=self.kwargs['org_id'],
        ).select_related('book', 'book__author', 'library')

    def perform_destroy(self, instance):
        instance.is_active = False
        instance.save()


# ═══════════════════════════════════════════════════════════════════
# Adhésions
# ═══════════════════════════════════════════════════════════════════

class LibraryMemberListView(generics.ListAPIView):
    """Liste des adhérents d'une bibliothèque (admin)."""
    serializer_class = LibraryMembershipSerializer
    permission_classes = [permissions.IsAuthenticated, IsLibraryAdmin]
    pagination_class = StandardPagination

    def get_queryset(self):
        library = _get_library_or_404(self.kwargs['org_id'])
        return LibraryMembership.objects.filter(
            library=library,
        ).select_related('user', 'library')


class LibraryMemberCreateView(generics.CreateAPIView):
    """S'inscrire à une bibliothèque."""
    serializer_class = LibraryMembershipCreateSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx['library'] = _get_library_or_404(self.kwargs['org_id'])
        return ctx

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        membership = serializer.save()
        return Response(
            {
                'message': f"Inscription à {membership.library.name} validée.",
                'membership': LibraryMembershipSerializer(membership).data,
            },
            status=status.HTTP_201_CREATED,
        )


class LibraryMemberDetailView(generics.RetrieveUpdateAPIView):
    """Détail / mise à jour d'une adhésion (admin)."""
    serializer_class = LibraryMembershipSerializer
    permission_classes = [permissions.IsAuthenticated, IsLibraryAdmin]

    def get_queryset(self):
        return LibraryMembership.objects.filter(
            library_id=self.kwargs['org_id'],
        ).select_related('user', 'library')


class MyLibraryMembershipsView(generics.ListAPIView):
    """Mes adhésions aux bibliothèques."""
    serializer_class = LibraryMembershipSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = StandardPagination

    def get_queryset(self):
        return LibraryMembership.objects.filter(
            user=self.request.user,
        ).select_related('user', 'library')


# ═══════════════════════════════════════════════════════════════════
# Prêts
# ═══════════════════════════════════════════════════════════════════

class BookLoanCreateView(APIView):
    """Demander un prêt."""
    permission_classes = [permissions.IsAuthenticated, IsLibraryMember]

    def post(self, request, org_id):
        _get_library_or_404(org_id)
        serializer = BookLoanCreateSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        loan = BookLoan.objects.create(
            catalog_item=data['catalog_item'],
            borrower=request.user,
            loan_type=data['loan_type'],
            status='REQUESTED',
        )
        return Response(
            {
                'message': 'Demande de prêt enregistrée.',
                'loan': BookLoanSerializer(loan).data,
            },
            status=status.HTTP_201_CREATED,
        )


class BookLoanListView(generics.ListAPIView):
    """Prêts d'une bibliothèque. Admin : tous. Membre : les siens."""
    serializer_class = BookLoanSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = StandardPagination

    def get_queryset(self):
        library = _get_library_or_404(self.kwargs['org_id'])
        qs = BookLoan.objects.filter(
            catalog_item__library=library,
        ).select_related('catalog_item__book', 'catalog_item__library', 'borrower')

        # Admin voit tout, membre voit ses prêts
        is_admin = self.request.user.is_platform_admin or OrganizationMembership.objects.filter(
            user=self.request.user,
            organization=library,
            is_active=True,
            role__in=['PROPRIETAIRE', 'ADMINISTRATEUR'],
        ).exists()

        if not is_admin:
            qs = qs.filter(borrower=self.request.user)
        return qs


class BookLoanApproveView(APIView):
    """Approuver un prêt (admin bibliothèque)."""
    permission_classes = [permissions.IsAuthenticated]

    def patch(self, request, pk):
        loan = get_object_or_404(BookLoan, pk=pk)
        library = loan.catalog_item.library
        # Vérifier que l'utilisateur est admin de la bibliothèque
        if not request.user.is_platform_admin:
            if not OrganizationMembership.objects.filter(
                user=request.user, organization=library,
                is_active=True, role__in=['PROPRIETAIRE', 'ADMINISTRATEUR'],
            ).exists():
                return Response({'message': 'Non autorisé.'}, status=status.HTTP_403_FORBIDDEN)

        if 'ACTIVE' not in ALLOWED_LOAN_TRANSITIONS.get(loan.status, []):
            return Response(
                {'message': f'Transition {loan.status} → ACTIVE non autorisée.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        now = timezone.now()
        loan.status = 'ACTIVE'
        loan.borrowed_at = now
        loan.due_date = now + timedelta(days=loan.catalog_item.max_loan_days)
        loan.save()

        # Décrémenter les exemplaires pour les prêts physiques
        if loan.loan_type == 'PHYSICAL':
            from django.db import transaction
            with transaction.atomic():
                item = LibraryCatalogItem.objects.select_for_update().get(pk=loan.catalog_item_id)
                if item.available_copies <= 0:
                    # Rollback: revert loan to REQUESTED
                    loan.status = 'REQUESTED'
                    loan.borrowed_at = None
                    loan.due_date = None
                    loan.save(update_fields=['status', 'borrowed_at', 'due_date'])
                    return Response(
                        {'message': 'Aucun exemplaire disponible.'},
                        status=status.HTTP_409_CONFLICT,
                    )
                item.available_copies -= 1
                item.save(update_fields=['available_copies'])

        # Notifier l'emprunteur par email
        try:
            from apps.core.email import send_async, send_templated_email
            send_async(
                send_templated_email,
                subject=f"Prêt approuvé — {loan.catalog_item.book.title}",
                template_name='book_loan_approved',
                context={
                    'user': loan.borrower,
                    'book_title': loan.catalog_item.book.title,
                    'due_date': loan.due_date,
                    'library_name': loan.catalog_item.library.name,
                },
                to_emails=[loan.borrower.email],
            )
        except Exception:
            pass  # Email non bloquant

        return Response({
            'message': 'Prêt approuvé.',
            'loan': BookLoanSerializer(loan).data,
        })


class BookLoanReturnView(APIView):
    """Retourner un livre (admin bibliothèque)."""
    permission_classes = [permissions.IsAuthenticated]

    def patch(self, request, pk):
        loan = get_object_or_404(BookLoan, pk=pk)
        library = loan.catalog_item.library
        # Vérifier que l'utilisateur est admin de la bibliothèque
        if not request.user.is_platform_admin:
            if not OrganizationMembership.objects.filter(
                user=request.user, organization=library,
                is_active=True, role__in=['PROPRIETAIRE', 'ADMINISTRATEUR'],
            ).exists():
                return Response({'message': 'Non autorisé.'}, status=status.HTTP_403_FORBIDDEN)

        if 'RETURNED' not in ALLOWED_LOAN_TRANSITIONS.get(loan.status, []):
            return Response(
                {'message': f'Transition {loan.status} → RETURNED non autorisée.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        loan.status = 'RETURNED'
        loan.returned_at = timezone.now()
        loan.save()

        # Incrémenter les exemplaires pour les prêts physiques
        if loan.loan_type == 'PHYSICAL':
            LibraryCatalogItem.objects.filter(pk=loan.catalog_item_id).update(
                available_copies=F('available_copies') + 1,
            )

        # Notifier la première réservation en attente
        pending_reservation = BookReservation.objects.filter(
            catalog_item=loan.catalog_item,
            status='PENDING',
        ).order_by('created_at').first()
        if pending_reservation:
            pending_reservation.status = 'NOTIFIED'
            pending_reservation.notified_at = timezone.now()
            pending_reservation.expires_at = timezone.now() + timedelta(days=3)
            pending_reservation.save()

        return Response({
            'message': 'Livre retourné avec succès.',
            'loan': BookLoanSerializer(loan).data,
        })


class MyLoansView(generics.ListAPIView):
    """Tous mes prêts (toutes bibliothèques)."""
    serializer_class = BookLoanSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = StandardPagination

    def get_queryset(self):
        return BookLoan.objects.filter(
            borrower=self.request.user,
        ).select_related('catalog_item__book', 'catalog_item__library', 'borrower')


class LoanExtensionCreateView(APIView):
    """Demander une prolongation (emprunteur uniquement)."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        loan = get_object_or_404(BookLoan, pk=pk, borrower=request.user)
        serializer = LoanExtensionCreateSerializer(
            data=request.data,
            context={'loan': loan, 'request': request},
        )
        serializer.is_valid(raise_exception=True)
        extension = LoanExtension.objects.create(
            loan=loan,
            extended_days=serializer.validated_data['extended_days'],
            approved=True,
            approved_at=timezone.now(),
        )

        # Mettre à jour le due_date du prêt
        loan.due_date += timedelta(days=extension.extended_days)
        loan.save(update_fields=['due_date'])

        return Response(
            {
                'message': 'Prolongation accordée.',
                'extension': LoanExtensionSerializer(extension).data,
            },
            status=status.HTTP_201_CREATED,
        )


# ═══════════════════════════════════════════════════════════════════
# Réservations
# ═══════════════════════════════════════════════════════════════════

class BookReservationCreateView(APIView):
    """Réserver un livre indisponible."""
    permission_classes = [permissions.IsAuthenticated, IsLibraryMember]

    def post(self, request, org_id):
        _get_library_or_404(org_id)
        serializer = BookReservationCreateSerializer(
            data=request.data,
            context={'request': request},
        )
        serializer.is_valid(raise_exception=True)
        reservation = BookReservation.objects.create(
            catalog_item=serializer.validated_data['catalog_item'],
            user=request.user,
            status='PENDING',
        )
        return Response(
            {
                'message': 'Réservation enregistrée.',
                'reservation': BookReservationSerializer(reservation).data,
            },
            status=status.HTTP_201_CREATED,
        )


class MyReservationsView(generics.ListAPIView):
    """Mes réservations (toutes bibliothèques)."""
    serializer_class = BookReservationSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = StandardPagination

    def get_queryset(self):
        return BookReservation.objects.filter(
            user=self.request.user,
        ).select_related('catalog_item__book', 'catalog_item__library', 'user')


class BookReservationCancelView(APIView):
    """Annuler une réservation (propriétaire uniquement)."""
    permission_classes = [permissions.IsAuthenticated]

    def delete(self, request, pk):
        reservation = get_object_or_404(BookReservation, pk=pk, user=request.user)
        if reservation.status not in ('PENDING', 'NOTIFIED'):
            return Response(
                {'message': 'Cette réservation ne peut pas être annulée.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        reservation.status = 'CANCELLED'
        reservation.save()
        return Response({'message': 'Réservation annulée.'})


# ═══════════════════════════════════════════════════════════════════
# Dashboard
# ═══════════════════════════════════════════════════════════════════

class LibraryDashboardView(APIView):
    """Statistiques de la bibliothèque (admin)."""
    permission_classes = [permissions.IsAuthenticated, IsLibraryAdmin]

    def get(self, request, org_id):
        library = _get_library_or_404(org_id)

        catalog_count = LibraryCatalogItem.objects.filter(
            library=library, is_active=True,
        ).count()
        active_loans = BookLoan.objects.filter(
            catalog_item__library=library, status='ACTIVE',
        ).count()
        overdue_loans = BookLoan.objects.filter(
            catalog_item__library=library, status='ACTIVE',
            due_date__lt=timezone.now(),
        ).count()
        total_members = LibraryMembership.objects.filter(
            library=library, is_active=True,
        ).count()
        pending_reservations = BookReservation.objects.filter(
            catalog_item__library=library, status='PENDING',
        ).count()

        return Response({
            'catalog_count': catalog_count,
            'active_loans': active_loans,
            'overdue_loans': overdue_loans,
            'total_members': total_members,
            'pending_reservations': pending_reservations,
        })
