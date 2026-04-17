from django.contrib.auth import get_user_model
from django.db import transaction
from django.db.models import Q
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import generics, permissions, status, viewsets
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.users.models import UserProfile

from .models import Organization, OrganizationMembership, Invitation, Inquiry
from .permissions import IsOrganizationAdmin, IsOrganizationMember
from rest_framework.parsers import MultiPartParser, FormParser
from .serializers import (
    InvitationCreateSerializer,
    InvitationListSerializer,
    InvitationResponseSerializer,
    InquiryCreateSerializer,
    InquiryDetailSerializer,
    InquiryListSerializer,
    InquiryRespondSerializer,
    MembershipCreateSerializer,
    OrganizationCreateSerializer,
    OrganizationDetailSerializer,
    OrganizationDirectorySerializer,
    OrganizationListSerializer,
    OrganizationMembershipSerializer,
    OrganizationReviewCreateSerializer,
    OrganizationReviewSerializer,
    OrganizationStorefrontSerializer,
    OrganizationUpdateSerializer,
    ProfessionalDirectorySerializer,
    ProfessionalStorefrontSerializer,
)

User = get_user_model()


# ── Organisations ──

class OrganizationViewSet(viewsets.ModelViewSet):
    """CRUD pour les organisations."""
    lookup_field = 'pk'
    parser_classes = [MultiPartParser, FormParser]

    def get_queryset(self):
        if self.action == 'list':
            return Organization.objects.filter(is_active=True)
        return Organization.objects.all()

    def get_serializer_class(self):
        if self.action == 'create':
            return OrganizationCreateSerializer
        if self.action == 'list':
            return OrganizationListSerializer
        if self.action in ['update', 'partial_update']:
            return OrganizationUpdateSerializer
        return OrganizationDetailSerializer

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [permissions.AllowAny()]
        if self.action == 'create':
            return [permissions.IsAuthenticated()]
        # update / destroy : admin de l'org
        return [permissions.IsAuthenticated(), IsOrganizationAdmin()]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        org = serializer.save()
        return Response(
            {
                'message': f"Organisation « {org.name} » créée avec succès.",
                'organization': OrganizationDetailSerializer(org).data,
            },
            status=status.HTTP_201_CREATED,
        )

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        return Response({
            'message': 'Organisation mise à jour avec succès.',
            'organization': OrganizationDetailSerializer(instance).data,
        })


# ── Membres ──

class OrganizationMemberListView(generics.ListAPIView):
    """Liste les membres actifs d'une organisation."""
    serializer_class = OrganizationMembershipSerializer
    permission_classes = [permissions.IsAuthenticated, IsOrganizationMember]

    def get_queryset(self):
        return OrganizationMembership.objects.filter(
            organization_id=self.kwargs['org_id'], is_active=True,
        ).select_related('user')


class OrganizationMemberAddView(APIView):
    """Ajouter un utilisateur à une organisation (admin/propriétaire)."""
    permission_classes = [permissions.IsAuthenticated, IsOrganizationAdmin]

    def post(self, request, org_id):
        org = get_object_or_404(Organization, pk=org_id)
        serializer = MembershipCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = User.objects.get(pk=serializer.validated_data['user_id'])
        role = serializer.validated_data['role']

        membership, created = OrganizationMembership.objects.get_or_create(
            organization=org, user=user,
            defaults={'role': role},
        )
        if not created:
            if membership.is_active:
                return Response(
                    {'message': 'Cet utilisateur est déjà membre.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            membership.is_active = True
            membership.role = role
            membership.save()

        return Response(
            {
                'message': f'{user.get_full_name()} ajouté comme {membership.get_role_display()}.',
                'membership': OrganizationMembershipSerializer(membership).data,
            },
            status=status.HTTP_201_CREATED,
        )


class OrganizationMemberDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Modifier le rôle ou retirer un membre."""
    serializer_class = OrganizationMembershipSerializer
    permission_classes = [permissions.IsAuthenticated, IsOrganizationAdmin]

    def get_queryset(self):
        return OrganizationMembership.objects.filter(
            organization_id=self.kwargs['org_id'],
        )

    def perform_destroy(self, instance):
        if instance.role == 'PROPRIETAIRE':
            from rest_framework.exceptions import ValidationError
            raise ValidationError("Le propriétaire ne peut pas être retiré de l'organisation.")
        instance.is_active = False
        instance.save()

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        self.perform_destroy(instance)
        return Response(
            {'message': f'{instance.user.get_full_name()} retiré de l\'organisation.'},
            status=status.HTTP_200_OK,
        )


# ── Invitations ──

class InvitationCreateView(generics.CreateAPIView):
    """Envoyer une invitation. Seuls PROPRIETAIRE/ADMINISTRATEUR peuvent inviter."""
    serializer_class = InvitationCreateSerializer
    permission_classes = [permissions.IsAuthenticated, IsOrganizationAdmin]

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx['organization'] = get_object_or_404(Organization, pk=self.kwargs['org_id'])
        return ctx

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        invitation = serializer.save()
        from apps.core.tasks import send_organization_invitation_task
        send_organization_invitation_task.delay(invitation.id)
        return Response(
            {
                'message': f"Invitation envoyée à {invitation.email}.",
                'invitation': InvitationListSerializer(invitation).data,
            },
            status=status.HTTP_201_CREATED,
        )


class MyInvitationsView(generics.ListAPIView):
    """Liste les invitations en attente pour l'utilisateur connecté (par email)."""
    serializer_class = InvitationListSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Invitation.objects.filter(
            email__iexact=self.request.user.email,
            status='PENDING',
        ).select_related('organization', 'invited_by')


class InvitationResponseView(APIView):
    """Accepter ou décliner une invitation par token."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = InvitationResponseSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        invitation = get_object_or_404(
            Invitation, token=serializer.validated_data['token'], status='PENDING',
        )

        if invitation.email.lower() != request.user.email.lower():
            return Response(
                {'error': "Cette invitation n'est pas destinée à votre compte."},
                status=status.HTTP_403_FORBIDDEN,
            )

        if invitation.is_expired:
            invitation.status = 'EXPIRED'
            invitation.save()
            return Response({'message': 'Invitation expirée.'}, status=status.HTTP_400_BAD_REQUEST)

        if serializer.validated_data['accept']:
            invitation.status = 'ACCEPTED'
            invitation.save()
            OrganizationMembership.objects.get_or_create(
                organization=invitation.organization,
                user=request.user,
                defaults={'role': invitation.role},
            )
            return Response({'message': f'Vous avez rejoint {invitation.organization.name}.'})
        else:
            invitation.status = 'DECLINED'
            invitation.save()
            return Response({'message': 'Invitation déclinée.'})


# ── Dashboard Organisation ──

class OrganizationBookCreateView(APIView):
    """
    POST /api/organizations/{org_id}/books/
    Permet aux membres de créer un livre rattaché à leur organisation.
    - MAISON_EDITION : crée un Book avec publisher_organization=org
    - LIBRAIRIE : crée un Book + BookListing (vendor=org)
    - BIBLIOTHEQUE : crée un Book + LibraryCatalogItem (library=org)
    """
    permission_classes = [permissions.IsAuthenticated, IsOrganizationMember]
    parser_classes = [MultiPartParser, FormParser]

    ALLOWED_ORG_TYPES = ('MAISON_EDITION', 'LIBRAIRIE', 'BIBLIOTHEQUE')

    def post(self, request, org_id):
        org = get_object_or_404(Organization, pk=org_id, is_active=True)
        if org.org_type not in self.ALLOWED_ORG_TYPES:
            return Response(
                {'error': "Ce type d'organisation ne peut pas ajouter de livres."},
                status=status.HTTP_403_FORBIDDEN,
            )

        from apps.books.serializers import BookCreateUpdateSerializer
        serializer = BookCreateUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        with transaction.atomic():
            if org.org_type == 'MAISON_EDITION':
                book = serializer.save(publisher_organization=org)
                msg = f'Livre « {book.title} » publié avec succès.'

            elif org.org_type == 'LIBRAIRIE':
                book = serializer.save()
                from apps.marketplace.models import BookListing
                BookListing.objects.create(
                    book=book,
                    vendor=org,
                    price=book.price or 0,
                    original_price=book.original_price,
                    stock=int(request.data.get('stock', 1)),
                    condition=request.data.get('condition', 'NEW'),
                )
                msg = f'Livre « {book.title} » ajouté au stock.'

            elif org.org_type == 'BIBLIOTHEQUE':
                book = serializer.save()
                from apps.library.models import LibraryCatalogItem
                total = int(request.data.get('total_copies', 1))
                LibraryCatalogItem.objects.create(
                    library=org,
                    book=book,
                    total_copies=total,
                    available_copies=total,
                    allows_digital_loan=request.data.get('allows_digital_loan', 'false').lower() == 'true',
                    max_loan_days=int(request.data.get('max_loan_days', 21)),
                )
                msg = f'Livre « {book.title} » ajouté au catalogue.'

        return Response({
            'message': msg,
            'book_id': book.id,
            'slug': book.slug,
        }, status=status.HTTP_201_CREATED)

    def get(self, request, org_id):
        """Liste les livres de cette organisation selon son type."""
        org = get_object_or_404(Organization, pk=org_id, is_active=True)
        from apps.books.models import Book
        from apps.books.serializers import BookListSerializer

        if org.org_type == 'MAISON_EDITION':
            books = Book.objects.filter(publisher_organization=org)
        elif org.org_type == 'LIBRAIRIE':
            from apps.marketplace.models import BookListing
            book_ids = BookListing.objects.filter(vendor=org).values_list('book_id', flat=True)
            books = Book.objects.filter(id__in=book_ids)
        elif org.org_type == 'BIBLIOTHEQUE':
            from apps.library.models import LibraryCatalogItem
            book_ids = LibraryCatalogItem.objects.filter(library=org).values_list('book_id', flat=True)
            books = Book.objects.filter(id__in=book_ids)
        else:
            books = Book.objects.none()

        books = books.select_related('author', 'category')
        serializer = BookListSerializer(books, many=True, context={'request': request})
        return Response(serializer.data)


class OrganizationBookDetailView(APIView):
    """
    GET/PATCH/DELETE /api/organizations/{org_id}/books/{book_id}/
    Permet aux membres de consulter, modifier ou supprimer un livre
    rattaché à leur organisation (quel que soit le type d'org).
    """
    permission_classes = [permissions.IsAuthenticated, IsOrganizationMember]
    parser_classes = [MultiPartParser, FormParser]

    def _get_book(self, org_id, book_id):
        org = get_object_or_404(Organization, pk=org_id, is_active=True)
        from apps.books.models import Book

        if org.org_type == 'MAISON_EDITION':
            book = get_object_or_404(Book, pk=book_id, publisher_organization=org)
        elif org.org_type == 'LIBRAIRIE':
            from apps.marketplace.models import BookListing
            listing = get_object_or_404(BookListing, book_id=book_id, vendor=org)
            book = listing.book
        elif org.org_type == 'BIBLIOTHEQUE':
            from apps.library.models import LibraryCatalogItem
            item = get_object_or_404(LibraryCatalogItem, book_id=book_id, library=org)
            book = item.book
        else:
            from django.http import Http404
            raise Http404
        return org, book

    def get(self, request, org_id, book_id):
        _, book = self._get_book(org_id, book_id)
        from apps.books.serializers import BookDetailSerializer
        serializer = BookDetailSerializer(book, context={'request': request})
        return Response(serializer.data)

    def patch(self, request, org_id, book_id):
        org, book = self._get_book(org_id, book_id)
        from apps.books.serializers import BookCreateUpdateSerializer
        serializer = BookCreateUpdateSerializer(book, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()

        # Mettre à jour les champs spécifiques à la relation org-livre
        if org.org_type == 'LIBRAIRIE':
            from apps.marketplace.models import BookListing
            listing = BookListing.objects.filter(book=book, vendor=org).first()
            if listing:
                if 'stock' in request.data:
                    listing.stock = int(request.data['stock'])
                if 'condition' in request.data:
                    listing.condition = request.data['condition']
                if 'listing_price' in request.data:
                    listing.price = request.data['listing_price']
                listing.save()

        elif org.org_type == 'BIBLIOTHEQUE':
            from apps.library.models import LibraryCatalogItem
            item = LibraryCatalogItem.objects.filter(book=book, library=org).first()
            if item:
                if 'total_copies' in request.data:
                    item.total_copies = int(request.data['total_copies'])
                if 'available_copies' in request.data:
                    item.available_copies = int(request.data['available_copies'])
                if 'allows_digital_loan' in request.data:
                    item.allows_digital_loan = request.data['allows_digital_loan'].lower() == 'true'
                if 'max_loan_days' in request.data:
                    item.max_loan_days = int(request.data['max_loan_days'])
                item.save()

        return Response({
            'message': f'Livre « {book.title} » mis à jour.',
            'book_id': book.id,
        })

    def delete(self, request, org_id, book_id):
        org, book = self._get_book(org_id, book_id)
        title = book.title

        if org.org_type == 'LIBRAIRIE':
            from apps.marketplace.models import BookListing
            BookListing.objects.filter(book=book, vendor=org).update(is_active=False)
            msg = f'Livre « {title} » retiré du stock.'
        elif org.org_type == 'BIBLIOTHEQUE':
            from apps.library.models import LibraryCatalogItem
            LibraryCatalogItem.objects.filter(book=book, library=org).update(is_active=False)
            msg = f'Livre « {title} » retiré du catalogue.'
        else:
            book.available = False
            book.save(update_fields=['available'])
            msg = f'Livre « {title} » retiré du catalogue.'

        return Response({'message': msg})


class OrganizationDashboardView(APIView):
    """Statistiques basiques pour le dashboard d'une organisation."""
    permission_classes = [permissions.IsAuthenticated, IsOrganizationMember]

    def get(self, request, org_id):
        org = get_object_or_404(Organization, pk=org_id)
        from apps.manuscripts.models import Manuscript
        from django.db.models import Q

        # Manuscrits : ciblés + marché ouvert compatible
        ms_q = Q(target_organization=org)
        if org.accepted_genres:
            ms_q |= Q(is_open_market=True, genre__in=org.accepted_genres)
        ms_qs = Manuscript.objects.filter(ms_q).distinct()

        # Nombre de livres selon le type d'org
        from apps.books.models import Book
        if org.org_type == 'MAISON_EDITION':
            book_count = Book.objects.filter(publisher_organization=org).count()
        elif org.org_type == 'LIBRAIRIE':
            from apps.marketplace.models import BookListing
            book_count = BookListing.objects.filter(vendor=org, is_active=True).count()
        elif org.org_type == 'BIBLIOTHEQUE':
            from apps.library.models import LibraryCatalogItem
            book_count = LibraryCatalogItem.objects.filter(library=org, is_active=True).count()
        else:
            book_count = 0

        # Commandes liees a cette organisation (SubOrders)
        from apps.marketplace.models import SubOrder
        from django.db.models import Sum
        sub_orders = SubOrder.objects.filter(vendor=org)
        orders_total = sub_orders.count()
        orders_pending = sub_orders.filter(status__in=('PENDING', 'CONFIRMED', 'PREPARING')).count()
        orders_shipped = sub_orders.filter(status__in=('READY', 'SHIPPED')).count()
        orders_delivered = sub_orders.filter(status='DELIVERED').count()
        revenue = sub_orders.filter(
            order__status__in=('PAID', 'SHIPPED', 'DELIVERED'),
        ).aggregate(total=Sum('subtotal'))['total'] or 0

        return Response({
            'organization': OrganizationListSerializer(org).data,
            'member_count': org.memberships.filter(is_active=True).count(),
            'pending_invitations': org.invitations.filter(status='PENDING').count(),
            'manuscripts_total': ms_qs.count(),
            'manuscripts_pending': ms_qs.filter(status='PENDING').count(),
            'manuscripts_reviewing': ms_qs.filter(status='REVIEWING').count(),
            'book_count': book_count,
            'orders_total': orders_total,
            'orders_pending': orders_pending,
            'orders_shipped': orders_shipped,
            'orders_delivered': orders_delivered,
            'revenue': float(revenue),
        })


# ══════════════════════════════════════════════════════════════
# Frollot Connect — Annuaire Organisations
# ══════════════════════════════════════════════════════════════

class OrganizationDirectoryView(generics.ListAPIView):
    """
    Annuaire public des organisations.
    Filtres : type, ville, genre, note minimum, accepte_manuscrits, vérifié.
    Tri : rating, created_at, review_count, name.
    """
    serializer_class = OrganizationDirectorySerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        qs = Organization.objects.filter(is_active=True)
        params = self.request.query_params

        # Filtres
        org_type = params.get('type')
        if org_type:
            qs = qs.filter(org_type=org_type)

        city = params.get('city')
        if city:
            qs = qs.filter(city__icontains=city)

        genre = params.get('genre')
        if genre:
            qs = qs.filter(accepted_genres__contains=genre)

        min_rating = params.get('min_rating')
        if min_rating:
            qs = qs.filter(avg_rating__gte=min_rating)

        accepting = params.get('accepting_manuscripts')
        if accepting in ('true', '1'):
            qs = qs.filter(is_accepting_manuscripts=True)

        verified = params.get('verified')
        if verified in ('true', '1'):
            qs = qs.filter(is_verified=True)

        search = params.get('search')
        if search:
            qs = qs.filter(
                Q(name__icontains=search) | Q(description__icontains=search)
            )

        # Tri
        ordering = params.get('ordering', '-avg_rating')
        allowed_orderings = {
            'rating': '-avg_rating',
            '-rating': 'avg_rating',
            'name': 'name',
            '-name': '-name',
            'recent': '-created_at',
            'reviews': '-review_count',
        }
        qs = qs.order_by(allowed_orderings.get(ordering, '-avg_rating'))
        return qs


class OrganizationStorefrontView(generics.RetrieveAPIView):
    """Vitrine publique complète d'une organisation (par slug)."""
    serializer_class = OrganizationStorefrontSerializer
    permission_classes = [permissions.AllowAny]
    lookup_field = 'slug'

    def get_queryset(self):
        return Organization.objects.filter(is_active=True)


class OrganizationCatalogView(APIView):
    """
    Catalogue d'une organisation — agrège 3 sources selon le type d'org :
    - MAISON_EDITION : livres publiés (publisher_organization) + EditorialProject + BookListing
    - LIBRAIRIE : livres en vente (BookListing)
    - BIBLIOTHEQUE : livres en collection (LibraryCatalogItem)
    """
    permission_classes = [permissions.AllowAny]

    def get(self, request, slug):
        org = get_object_or_404(Organization, slug=slug, is_active=True)
        from apps.books.models import Book

        book_ids = set()

        if org.org_type == 'MAISON_EDITION':
            # 1. Livres avec publisher_organization directe
            direct_ids = Book.objects.filter(
                publisher_organization=org,
            ).values_list('id', flat=True)
            book_ids.update(direct_ids)

            # 2. Livres via EditorialProject
            from apps.services.models import EditorialProject
            ep_ids = EditorialProject.objects.filter(
                organization=org, book__isnull=False,
            ).values_list('book_id', flat=True).distinct()
            book_ids.update(ep_ids)

            # 3. Livres via BookListing (si l'éditeur vend aussi)
            from apps.marketplace.models import BookListing
            bl_ids = BookListing.objects.filter(
                vendor=org, is_active=True,
            ).values_list('book_id', flat=True).distinct()
            book_ids.update(bl_ids)

        elif org.org_type == 'LIBRAIRIE':
            from apps.marketplace.models import BookListing
            listings = BookListing.objects.filter(
                vendor=org, is_active=True,
            ).select_related('book', 'book__author')

            data = [
                {
                    'id': listing.book.id,
                    'title': listing.book.title,
                    'slug': listing.book.slug,
                    'author': listing.book.author.full_name if listing.book.author else None,
                    'cover_image': request.build_absolute_uri(listing.book.cover_image.url) if listing.book.cover_image else None,
                    'format': listing.book.format,
                    'rating': str(listing.book.rating) if listing.book.rating else None,
                    'book_price': str(listing.book.price),
                    'listing_id': listing.id,
                    'price': str(listing.price),
                    'original_price': str(listing.original_price) if listing.original_price else None,
                    'condition': listing.condition,
                    'stock': listing.stock,
                    'in_stock': listing.stock > 0 if listing.book.format != 'EBOOK' else True,
                    'has_discount': listing.original_price and listing.price < listing.original_price,
                }
                for listing in listings
                if listing.book.available
            ]
            return Response(data)

        elif org.org_type == 'BIBLIOTHEQUE':
            from apps.library.models import LibraryCatalogItem
            items = LibraryCatalogItem.objects.filter(
                library=org, is_active=True,
            ).select_related('book', 'book__author')

            data = [
                {
                    'id': ci.book.id,
                    'title': ci.book.title,
                    'slug': ci.book.slug,
                    'author': ci.book.author.full_name if ci.book.author else None,
                    'cover_image': request.build_absolute_uri(ci.book.cover_image.url) if ci.book.cover_image else None,
                    'format': ci.book.format,
                    'rating': str(ci.book.rating) if ci.book.rating else None,
                    'catalog_item_id': ci.id,
                    'available_copies': ci.available_copies,
                    'total_copies': ci.total_copies,
                    'in_stock': ci.available_copies > 0,
                    'allows_digital_loan': ci.allows_digital_loan,
                    'max_loan_days': ci.max_loan_days,
                }
                for ci in items
                if ci.book.available
            ]
            return Response(data)

        elif org.org_type == 'IMPRIMERIE':
            from apps.services.models import PrintRequest
            # Return recent completed print projects as portfolio + service info
            recent_prints = PrintRequest.objects.filter(
                printer=org, status='DELIVERED',
            ).select_related('book', 'book__author').order_by('-created_at')[:20]

            data = {
                'type': 'IMPRIMERIE',
                'services': org.type_specific_data or {},
                'recent_projects': [
                    {
                        'id': pr.id,
                        'book_title': pr.book.title if pr.book else pr.id,
                        'book_cover': request.build_absolute_uri(pr.book.cover_image.url) if pr.book and pr.book.cover_image else None,
                        'quantity': pr.quantity,
                        'format_specs': pr.format_specs or {},
                        'delivered_at': pr.updated_at.isoformat() if pr.updated_at else None,
                    }
                    for pr in recent_prints
                ],
                'total_projects': PrintRequest.objects.filter(
                    printer=org, status='DELIVERED',
                ).count(),
            }
            return Response(data)

        books = Book.objects.filter(
            id__in=book_ids, available=True,
        ).select_related('author')

        data = [
            {
                'id': b.id,
                'title': b.title,
                'slug': b.slug,
                'author': b.author.full_name if b.author else None,
                'price': str(b.price),
                'cover_image': request.build_absolute_uri(b.cover_image.url) if b.cover_image else None,
                'format': b.format,
                'rating': str(b.rating) if b.rating else None,
            }
            for b in books
        ]
        return Response(data)


class OrganizationTeamView(APIView):
    """Membres publics d'une organisation."""
    permission_classes = [permissions.AllowAny]

    def get(self, request, slug):
        org = get_object_or_404(Organization, slug=slug, is_active=True)
        memberships = org.memberships.filter(is_active=True).select_related('user')
        data = [
            {
                'id': m.id,
                'user_name': m.user.get_full_name(),
                'role': m.role,
                'role_display': m.get_role_display(),
                'avatar': request.build_absolute_uri(m.user.profile_image.url) if m.user.profile_image else None,
                'joined_at': m.joined_at,
            }
            for m in memberships
        ]
        return Response(data)


class OrganizationReviewListCreateView(APIView):
    """
    GET : Liste des avis sur une organisation.
    POST : Laisser un avis (authentifié).
    """
    def get_permissions(self):
        if self.request.method == 'GET':
            return [permissions.AllowAny()]
        return [permissions.IsAuthenticated()]

    def get(self, request, slug):
        org = get_object_or_404(Organization, slug=slug, is_active=True)
        reviews = org.reviews.select_related('user').order_by('-created_at')
        serializer = OrganizationReviewSerializer(reviews, many=True)
        return Response({
            'count': reviews.count(),
            'avg_rating': str(org.avg_rating),
            'results': serializer.data,
        })

    def post(self, request, slug):
        org = get_object_or_404(Organization, slug=slug, is_active=True)
        serializer = OrganizationReviewCreateSerializer(
            data=request.data,
            context={'request': request, 'organization': org},
        )
        serializer.is_valid(raise_exception=True)
        review = serializer.save()
        # Note: avg_rating and review_count are updated by the post_save
        # signal on OrganizationReview (signals.py). No manual recalc needed.
        org.refresh_from_db(fields=['avg_rating', 'review_count'])

        return Response(
            OrganizationReviewSerializer(review).data,
            status=status.HTTP_201_CREATED,
        )


# ══════════════════════════════════════════════════════════════
# Frollot Connect — Annuaire Professionnels
# ══════════════════════════════════════════════════════════════

class ProfessionalDirectoryView(generics.ListAPIView):
    """
    Annuaire public des professionnels.
    Filtres : métier, langue, prix, note minimum, dispo, vérifié.
    """
    serializer_class = ProfessionalDirectorySerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        qs = UserProfile.objects.filter(
            is_active=True,
            profile_type__in=['CORRECTEUR', 'ILLUSTRATEUR', 'TRADUCTEUR'],
        ).select_related('user')

        params = self.request.query_params

        profile_type = params.get('type')
        if profile_type:
            qs = qs.filter(profile_type=profile_type)

        min_rating = params.get('min_rating')
        if min_rating:
            qs = qs.filter(avg_rating__gte=min_rating)

        verified = params.get('verified')
        if verified in ('true', '1'):
            qs = qs.filter(is_verified=True)

        city = params.get('city')
        if city:
            qs = qs.filter(user__city__icontains=city)

        search = params.get('search')
        if search:
            qs = qs.filter(
                Q(user__first_name__icontains=search)
                | Q(user__last_name__icontains=search)
                | Q(bio__icontains=search)
            )

        # Tri
        ordering = params.get('ordering', '-avg_rating')
        allowed = {
            'rating': '-avg_rating',
            'projects': '-completed_projects',
            'recent': '-created_at',
            'name': 'user__first_name',
        }
        qs = qs.order_by(allowed.get(ordering, '-avg_rating'))
        return qs


class ProfessionalStorefrontView(generics.RetrieveAPIView):
    """Vitrine publique complète d'un professionnel (par slug)."""
    serializer_class = ProfessionalStorefrontSerializer
    permission_classes = [permissions.AllowAny]
    lookup_field = 'slug'

    def get_queryset(self):
        return UserProfile.objects.filter(
            is_active=True,
            profile_type__in=['CORRECTEUR', 'ILLUSTRATEUR', 'TRADUCTEUR'],
        ).select_related('user')


class ProfessionalReviewListCreateView(APIView):
    """
    GET : Avis sur un professionnel.
    POST : Laisser un avis (authentifié).
    """
    def get_permissions(self):
        if self.request.method == 'GET':
            return [permissions.AllowAny()]
        return [permissions.IsAuthenticated()]

    def get(self, request, slug):
        from apps.services.models import ServiceProviderReview
        from apps.services.serializers import ServiceProviderReviewSerializer
        profile = get_object_or_404(UserProfile, slug=slug, is_active=True)
        reviews = ServiceProviderReview.objects.filter(
            provider=profile,
        ).select_related('user').order_by('-created_at')
        serializer = ServiceProviderReviewSerializer(reviews, many=True)
        return Response({
            'count': reviews.count(),
            'avg_rating': str(profile.avg_rating),
            'results': serializer.data,
        })

    def post(self, request, slug):
        from apps.services.models import ServiceProviderReview
        from apps.services.serializers import ServiceProviderReviewCreateSerializer
        profile = get_object_or_404(UserProfile, slug=slug, is_active=True)
        serializer = ServiceProviderReviewCreateSerializer(
            data=request.data,
            context={'request': request, 'provider': profile},
        )
        serializer.is_valid(raise_exception=True)
        review = serializer.save()

        # Mettre à jour les stats dénormalisées
        from django.db.models import Avg
        stats = ServiceProviderReview.objects.filter(provider=profile).aggregate(avg=Avg('rating'))
        profile.avg_rating = stats['avg'] or 0
        profile.review_count = ServiceProviderReview.objects.filter(provider=profile).count()
        profile.save(update_fields=['avg_rating', 'review_count'])

        from apps.services.serializers import ServiceProviderReviewSerializer
        return Response(
            ServiceProviderReviewSerializer(review).data,
            status=status.HTTP_201_CREATED,
        )


# ══════════════════════════════════════════════════════════════
# Frollot Connect — Demandes de renseignement (Inquiries)
# ══════════════════════════════════════════════════════════════

class InquiryCreateView(generics.CreateAPIView):
    """Envoyer une demande de renseignement."""
    serializer_class = InquiryCreateSerializer
    permission_classes = [permissions.IsAuthenticated]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        inquiry = serializer.save()
        return Response(
            {
                'message': 'Demande envoyée.',
                'inquiry': InquiryDetailSerializer(inquiry).data,
            },
            status=status.HTTP_201_CREATED,
        )


class InquiryListView(generics.ListAPIView):
    """Mes demandes : envoyées + reçues."""
    serializer_class = InquiryListSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        q = Q(sender=user)
        # Demandes reçues en tant que membre d'org
        org_ids = OrganizationMembership.objects.filter(
            user=user, is_active=True,
        ).values_list('organization_id', flat=True)
        if org_ids:
            q |= Q(target_org_id__in=org_ids)
        # Demandes reçues en tant que professionnel
        profile_ids = UserProfile.objects.filter(
            user=user, is_active=True,
            profile_type__in=['CORRECTEUR', 'ILLUSTRATEUR', 'TRADUCTEUR'],
        ).values_list('id', flat=True)
        if profile_ids:
            q |= Q(target_profile_id__in=profile_ids)
        return Inquiry.objects.filter(q).select_related(
            'sender', 'target_org', 'target_profile__user',
        ).distinct().order_by('-created_at')


class InquiryDetailView(generics.RetrieveAPIView):
    """Détail d'une demande de renseignement."""
    serializer_class = InquiryDetailSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        q = Q(sender=user)
        org_ids = OrganizationMembership.objects.filter(
            user=user, is_active=True,
        ).values_list('organization_id', flat=True)
        if org_ids:
            q |= Q(target_org_id__in=org_ids)
        profile_ids = UserProfile.objects.filter(
            user=user, is_active=True,
        ).values_list('id', flat=True)
        if profile_ids:
            q |= Q(target_profile_id__in=profile_ids)
        return Inquiry.objects.filter(q).select_related(
            'sender', 'target_org', 'target_profile__user', 'responded_by',
        ).distinct()


class InquiryRespondView(APIView):
    """Répondre à une demande de renseignement."""
    permission_classes = [permissions.IsAuthenticated]

    def patch(self, request, pk):
        inquiry = get_object_or_404(Inquiry, pk=pk)
        user = request.user

        # Vérifier que l'utilisateur est admin/propriétaire de l'org ciblée
        is_target = False
        if inquiry.target_org:
            is_target = OrganizationMembership.objects.filter(
                user=user, organization=inquiry.target_org, is_active=True,
                role__in=['PROPRIETAIRE', 'ADMINISTRATEUR'],
            ).exists()
        elif inquiry.target_profile:
            is_target = inquiry.target_profile.user == user

        if not is_target and not user.is_platform_admin:
            return Response(
                {'message': 'Non autorisé.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        if inquiry.status != 'PENDING':
            return Response(
                {'message': 'Cette demande a déjà reçu une réponse.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = InquiryRespondSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        inquiry.response = serializer.validated_data['response']
        inquiry.responded_by = user
        inquiry.status = 'ANSWERED'
        inquiry.responded_at = timezone.now()
        inquiry.save()

        return Response({
            'message': 'Réponse envoyée.',
            'inquiry': InquiryDetailSerializer(inquiry).data,
        })


# ══════════════════════════════════════════════════════════════
# Frollot Connect — Recommandations
# ══════════════════════════════════════════════════════════════

class ManuscriptRecommendationsView(APIView):
    """
    Recommander des maisons d'édition selon le genre et la langue du manuscrit.
    GET /api/manuscripts/recommendations/?genre=ROMAN&language=FR
    """
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        genre = request.query_params.get('genre', '')

        qs = Organization.objects.filter(
            is_active=True,
            org_type='MAISON_EDITION',
            is_accepting_manuscripts=True,
        )

        if genre:
            qs = qs.filter(accepted_genres__contains=genre)

        qs = qs.order_by('-avg_rating', '-review_count')[:10]
        serializer = OrganizationDirectorySerializer(qs, many=True)
        return Response(serializer.data)


class ServiceRecommendationsView(APIView):
    """
    Recommander des prestataires selon le type de service et la langue.
    GET /api/services/recommendations/?type=CORRECTION&language=FR
    """
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        service_type = request.query_params.get('type', '')
        language = request.query_params.get('language', '')

        from apps.services.models import ServiceListing
        qs = ServiceListing.objects.filter(is_active=True).select_related('provider__user')

        if service_type:
            qs = qs.filter(service_type=service_type)

        if language:
            qs = qs.filter(languages__contains=language)

        qs = qs.order_by('-provider__avg_rating', 'base_price')[:10]

        data = [
            {
                'listing_id': item.id,
                'listing_title': item.title,
                'listing_slug': item.slug,
                'service_type': item.service_type,
                'base_price': str(item.base_price),
                'turnaround_days': item.turnaround_days,
                'provider_id': item.provider.id,
                'provider_name': item.provider.user.get_full_name(),
                'provider_slug': item.provider.slug,
                'provider_rating': str(item.provider.avg_rating),
                'provider_review_count': item.provider.review_count,
                'provider_completed_projects': item.provider.completed_projects,
            }
            for item in qs
        ]
        return Response(data)
