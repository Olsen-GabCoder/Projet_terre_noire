import logging

from django.db import models as db_models
from django.db.models import Q, Count
from django.shortcuts import get_object_or_404
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.pagination import PageNumberPagination
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.permissions import AllowAny, IsAuthenticated, IsAuthenticatedOrReadOnly
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.books.models import Book, Author
from apps.organizations.models import Organization
from apps.users.models import User

from .models import (
    UserFollow, AuthorFollow, OrganizationFollow,
    ReadingList, ReadingListItem,
    Post, PostLike, PostComment,
    BookClub, BookClubMembership, BookClubMessage, MessageReport,
    ClubSession, SessionRSVP, ClubBookHistory,
    ClubWishlistItem, ModerationLog,
)
from .serializers import (
    UserFollowSerializer, AuthorFollowSerializer, OrganizationFollowSerializer,
    ReadingListSerializer, ReadingListDetailSerializer,
    ReadingListCreateSerializer, ReadingListItemSerializer,
    PostSerializer, PostCreateSerializer, PostCommentSerializer,
    PlatformReviewSerializer,
    BookClubListSerializer, BookClubDetailSerializer,
    BookClubCreateSerializer, BookClubMemberSerializer, BookClubMessageSerializer,
    MessageReportSerializer,
    ClubSessionSerializer, ClubBookHistorySerializer,
    SimpleUserSerializer,
)
from .recommendations import get_recommendations

logger = logging.getLogger(__name__)


# ── Pagination ──

class StandardPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100


# ══════════════════════════════════════════════════════════════════════
# FOLLOW VIEWS
# ══════════════════════════════════════════════════════════════════════

class BaseFollowToggleView(APIView):
    """Base générique pour follow/unfollow — sous-classes définissent le modèle cible."""
    permission_classes = [IsAuthenticated]
    follow_model = None       # ex: UserFollow
    target_model = None       # ex: User
    id_param = None           # ex: 'user_id'
    follower_field = None     # ex: 'follower'
    target_field = None       # ex: 'following'
    count_filter_field = None # ex: 'following'

    def post(self, request):
        target_id = request.data.get(self.id_param)
        if not target_id:
            return Response({'detail': f'{self.id_param} requis.'}, status=status.HTTP_400_BAD_REQUEST)
        target = get_object_or_404(self.target_model, pk=target_id)
        obj, created = self.follow_model.objects.get_or_create(
            **{self.follower_field: request.user, self.target_field: target}
        )
        if not created:
            obj.delete()
        else:
            logger.info("User #%s followed %s #%s", request.user.id, self.target_model.__name__, target.pk)
            # TODO Phase 8: send in-app notification to target user
        followers_count = self.follow_model.objects.filter(**{self.count_filter_field: target}).count()
        return Response({'followed': created, 'followers_count': followers_count})


class FollowUserToggleView(BaseFollowToggleView):
    """POST {user_id} — suivre / ne plus suivre un utilisateur."""
    follow_model = UserFollow
    target_model = User
    id_param = 'user_id'
    follower_field = 'follower'
    target_field = 'following'
    count_filter_field = 'following'

    def post(self, request):
        user_id = request.data.get('user_id')
        if user_id and int(user_id) == request.user.id:
            return Response({'detail': 'Impossible de se suivre soi-même.'}, status=status.HTTP_400_BAD_REQUEST)
        return super().post(request)


class FollowAuthorToggleView(BaseFollowToggleView):
    """POST {author_id} — suivre / ne plus suivre un auteur."""
    follow_model = AuthorFollow
    target_model = Author
    id_param = 'author_id'
    follower_field = 'follower'
    target_field = 'author'
    count_filter_field = 'author'


class FollowOrganizationToggleView(BaseFollowToggleView):
    """POST {organization_id} — suivre / ne plus suivre une organisation."""
    follow_model = OrganizationFollow
    target_model = Organization
    id_param = 'organization_id'
    follower_field = 'follower'
    target_field = 'organization'
    count_filter_field = 'organization'


class FollowStatusView(APIView):
    """GET ?user_id=&author_id=&organization_id= — vérifie si l'utilisateur suit."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        result = {}
        user_id = request.query_params.get('user_id')
        author_id = request.query_params.get('author_id')
        organization_id = request.query_params.get('organization_id')

        if user_id:
            result['follows_user'] = UserFollow.objects.filter(
                follower=request.user, following_id=user_id
            ).exists()
        if author_id:
            result['follows_author'] = AuthorFollow.objects.filter(
                follower=request.user, author_id=author_id
            ).exists()
        if organization_id:
            result['follows_organization'] = OrganizationFollow.objects.filter(
                follower=request.user, organization_id=organization_id
            ).exists()

        return Response(result)


class MyFollowingView(APIView):
    """GET — retourne les utilisateurs, auteurs et organisations suivis."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user_follows = UserFollow.objects.filter(follower=request.user).select_related('following')
        author_follows = AuthorFollow.objects.filter(follower=request.user).select_related('author')
        org_follows = OrganizationFollow.objects.filter(follower=request.user).select_related('organization')

        users = SimpleUserSerializer(
            [f.following for f in user_follows], many=True
        ).data
        authors = [
            {'id': f.author.id, 'full_name': f.author.full_name}
            for f in author_follows
        ]
        organizations = [
            {'id': f.organization.id, 'name': f.organization.name}
            for f in org_follows
        ]

        return Response({
            'users': users,
            'authors': authors,
            'organizations': organizations,
        })


class UserFollowersView(APIView):
    """GET /<user_id>/ — liste paginée des abonnés d'un utilisateur."""
    permission_classes = [IsAuthenticatedOrReadOnly]
    pagination_class = StandardPagination

    def get(self, request, user_id):
        follows = UserFollow.objects.filter(following_id=user_id).select_related('follower')
        paginator = StandardPagination()
        page = paginator.paginate_queryset(follows, request)
        serializer = UserFollowSerializer(page, many=True)
        return paginator.get_paginated_response(serializer.data)


class AuthorFollowersView(APIView):
    """GET /<author_id>/ — liste paginée des abonnés d'un auteur."""
    permission_classes = [IsAuthenticatedOrReadOnly]

    def get(self, request, author_id):
        follows = AuthorFollow.objects.filter(author_id=author_id).select_related('follower')
        paginator = StandardPagination()
        page = paginator.paginate_queryset(follows, request)
        serializer = AuthorFollowSerializer(page, many=True)
        return paginator.get_paginated_response(serializer.data)


class OrganizationFollowersView(APIView):
    """GET /<organization_id>/ — liste paginée des abonnés d'une organisation."""
    permission_classes = [IsAuthenticatedOrReadOnly]

    def get(self, request, organization_id):
        follows = OrganizationFollow.objects.filter(organization_id=organization_id).select_related('follower')
        paginator = StandardPagination()
        page = paginator.paginate_queryset(follows, request)
        serializer = OrganizationFollowSerializer(page, many=True)
        return paginator.get_paginated_response(serializer.data)


# ══════════════════════════════════════════════════════════════════════
# READING LIST VIEWS
# ══════════════════════════════════════════════════════════════════════

class ReadingListViewSet(viewsets.ModelViewSet):
    """CRUD pour les listes de lecture."""
    pagination_class = StandardPagination
    lookup_field = 'slug'

    def get_permissions(self):
        if self.action in ('list', 'retrieve'):
            return [IsAuthenticatedOrReadOnly()]
        return [IsAuthenticated()]

    def get_serializer_class(self):
        if self.action == 'create':
            return ReadingListCreateSerializer
        if self.action == 'retrieve':
            return ReadingListDetailSerializer
        return ReadingListSerializer

    def get_queryset(self):
        user = self.request.user
        if user.is_authenticated:
            # Ses propres listes + les listes publiques des autres
            return ReadingList.objects.filter(
                Q(user=user) | Q(is_public=True)
            ).select_related('user').distinct()
        return ReadingList.objects.filter(is_public=True).select_related('user')

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    def perform_update(self, serializer):
        if serializer.instance.user != self.request.user:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Vous ne pouvez modifier que vos propres listes.")
        serializer.save()

    def perform_destroy(self, instance):
        if instance.user != self.request.user:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Vous ne pouvez supprimer que vos propres listes.")
        instance.delete()

    @action(detail=True, methods=['post'], url_path='add-book')
    def add_book(self, request, slug=None):
        reading_list = self.get_object()
        if reading_list.user != request.user:
            return Response({'detail': 'Non autorisé.'}, status=status.HTTP_403_FORBIDDEN)
        book_id = request.data.get('book_id')
        if not book_id:
            return Response({'detail': 'book_id requis.'}, status=status.HTTP_400_BAD_REQUEST)
        book = get_object_or_404(Book, pk=book_id)
        note = request.data.get('note', '')
        item, created = ReadingListItem.objects.get_or_create(
            reading_list=reading_list, book=book,
            defaults={'note': note}
        )
        if not created:
            return Response({'detail': 'Livre déjà dans la liste.'}, status=status.HTTP_409_CONFLICT)
        return Response(ReadingListItemSerializer(item).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'], url_path='remove-book')
    def remove_book(self, request, slug=None):
        reading_list = self.get_object()
        if reading_list.user != request.user:
            return Response({'detail': 'Non autorisé.'}, status=status.HTTP_403_FORBIDDEN)
        book_id = request.data.get('book_id')
        if not book_id:
            return Response({'detail': 'book_id requis.'}, status=status.HTTP_400_BAD_REQUEST)
        deleted, _ = ReadingListItem.objects.filter(
            reading_list=reading_list, book_id=book_id
        ).delete()
        if not deleted:
            return Response({'detail': 'Livre non trouvé dans la liste.'}, status=status.HTTP_404_NOT_FOUND)
        return Response({'detail': 'Livre retiré de la liste.'})

    @action(detail=True, methods=['patch'], url_path='reorder')
    def reorder(self, request, slug=None):
        reading_list = self.get_object()
        if reading_list.user != request.user:
            return Response({'detail': 'Non autorisé.'}, status=status.HTTP_403_FORBIDDEN)
        items_order = request.data.get('items', [])
        if not isinstance(items_order, list):
            return Response({'detail': 'items doit être une liste.'}, status=status.HTTP_400_BAD_REQUEST)
        for item_data in items_order:
            ReadingListItem.objects.filter(
                pk=item_data.get('id'), reading_list=reading_list
            ).update(position=item_data.get('position', 0))
        return Response({'detail': 'Ordre mis à jour.'})


# ══════════════════════════════════════════════════════════════════════
# POST VIEWS
# ══════════════════════════════════════════════════════════════════════

class PostViewSet(viewsets.ModelViewSet):
    """CRUD pour les publications du fil d'actualité."""
    pagination_class = StandardPagination

    def get_permissions(self):
        if self.action in ('list', 'retrieve', 'user_posts'):
            return [IsAuthenticatedOrReadOnly()]
        return [IsAuthenticated()]

    def get_serializer_class(self):
        if self.action == 'create':
            return PostCreateSerializer
        if self.action == 'comments':
            return PostCommentSerializer
        return PostSerializer

    def get_queryset(self):
        from django.db.models import Prefetch
        from .models import PostComment
        # Évite N+1 sur author, book, comments.user (accédés par PostSerializer)
        return Post.objects.select_related('author', 'book').prefetch_related(
            'likes',
            Prefetch('comments', queryset=PostComment.objects.select_related('user')),
        )

    def list(self, request, *args, **kwargs):
        """Feed : posts des utilisateurs suivis + membres des mêmes orgs + propres posts.
        ?scope=public → tous les posts récents (pour la sidebar Home).
        """
        user = request.user
        scope = request.query_params.get('scope', '')
        if scope == 'public' or not user.is_authenticated:
            qs = self.get_queryset()
        else:
            # IDs des utilisateurs suivis
            followed_user_ids = UserFollow.objects.filter(
                follower=user
            ).values_list('following_id', flat=True)

            # IDs des membres des mêmes organisations
            user_org_ids = OrganizationFollow.objects.filter(
                follower=user
            ).values_list('organization_id', flat=True)
            org_member_ids = OrganizationFollow.objects.filter(
                organization_id__in=user_org_ids
            ).values_list('follower_id', flat=True)

            qs = self.get_queryset().filter(
                Q(author=user) |
                Q(author_id__in=followed_user_ids) |
                Q(author_id__in=org_member_ids)
            ).distinct()

        page = self.paginate_queryset(qs)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        serializer = self.get_serializer(qs, many=True)
        return Response(serializer.data)

    def perform_create(self, serializer):
        serializer.save(author=self.request.user)

    def perform_update(self, serializer):
        if serializer.instance.author != self.request.user:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Vous ne pouvez modifier que vos propres publications.")
        serializer.save()

    def perform_destroy(self, instance):
        if instance.author != self.request.user:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Vous ne pouvez supprimer que vos propres publications.")
        instance.delete()

    @action(detail=True, methods=['post', 'delete'])
    def like(self, request, pk=None):
        """Toggle like sur un post."""
        post = self.get_object()
        obj, created = PostLike.objects.get_or_create(user=request.user, post=post)
        if not created:
            obj.delete()
        return Response({
            'liked': created,
            'likes_count': post.likes.count(),
        })

    @action(detail=True, methods=['get', 'post'])
    def comments(self, request, pk=None):
        """GET : liste des commentaires. POST : ajouter un commentaire."""
        post = self.get_object()
        if request.method == 'GET':
            qs = PostComment.objects.filter(post=post).select_related('user')
            serializer = PostCommentSerializer(qs, many=True)
            return Response(serializer.data)
        # POST
        serializer = PostCommentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(user=request.user, post=post)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['delete'], url_path='comments/(?P<comment_id>[0-9]+)')
    def delete_comment(self, request, pk=None, comment_id=None):
        """Supprimer un commentaire (auteur du commentaire ou du post)."""
        post = self.get_object()
        comment = get_object_or_404(PostComment, pk=comment_id, post=post)
        if comment.user != request.user and post.author != request.user:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Seul l'auteur du commentaire ou du post peut le supprimer.")
        comment.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=False, methods=['get'], url_path='user/(?P<user_id>[0-9]+)')
    def user_posts(self, request, user_id=None):
        """Posts d'un utilisateur spécifique."""
        qs = self.get_queryset().filter(author_id=user_id)
        page = self.paginate_queryset(qs)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        serializer = self.get_serializer(qs, many=True)
        return Response(serializer.data)


# ══════════════════════════════════════════════════════════════════════
# RECOMMENDATIONS
# ══════════════════════════════════════════════════════════════════════

class RecommendationsView(APIView):
    """GET — recommandations personnalisées de livres."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        limit = int(request.query_params.get('limit', 12))
        books = get_recommendations(request.user, limit=limit)
        from apps.books.serializers import BookListSerializer
        serializer = BookListSerializer(books, many=True, context={'request': request})
        return Response({'results': serializer.data})


# ══════════════════════════════════════════════════════════════════════
# PLATFORM REVIEWS (public — Home page)
# ══════════════════════════════════════════════════════════════════════

class FeaturedPlatformReviewsView(APIView):
    """
    GET /api/social/platform-reviews/featured/
    Endpoint public — retourne les meilleurs avis plateforme pour la Home.
    """
    permission_classes = [AllowAny]

    def get(self, request):
        from django.db.models import Count
        qs = (
            Post.objects
            .filter(post_type='PLATFORM_REVIEW', rating__gte=3)
            .select_related('author')
            .prefetch_related('likes')
            .annotate(total_likes=Count('likes'))
            .order_by('-rating', '-total_likes', '-created_at')
        )
        serializer = PlatformReviewSerializer(qs, many=True, context={'request': request})
        return Response(serializer.data)


# ══════════════════════════════════════════════════════════════════════
# BOOK CLUB VIEWS
# ══════════════════════════════════════════════════════════════════════

class BookClubViewSet(viewsets.ModelViewSet):
    """CRUD pour les clubs de lecture."""
    pagination_class = StandardPagination
    lookup_field = 'slug'

    def get_permissions(self):
        if self.action in ('list', 'retrieve', 'members'):
            return [IsAuthenticatedOrReadOnly()]
        return [IsAuthenticated()]

    def get_serializer_class(self):
        if self.action == 'create':
            return BookClubCreateSerializer
        if self.action == 'retrieve':
            return BookClubDetailSerializer
        return BookClubListSerializer

    def get_queryset(self):
        qs = BookClub.objects.select_related('creator', 'book', 'current_book').prefetch_related('memberships', 'messages')
        if self.request.query_params.get('public') == 'true':
            qs = qs.filter(is_public=True)
        # Filtre "Mes clubs" — uniquement les clubs dont l'utilisateur est membre
        if self.request.query_params.get('my_clubs') == 'true' and self.request.user.is_authenticated:
            qs = qs.filter(memberships__user=self.request.user)
        search = self.request.query_params.get('search')
        if search:
            from django.db.models import Q
            qs = qs.filter(Q(name__icontains=search) | Q(description__icontains=search))
        return qs.order_by('-created_at')

    def perform_create(self, serializer):
        club = serializer.save(creator=self.request.user)
        # Le créateur est automatiquement admin
        BookClubMembership.objects.create(
            club=club, user=self.request.user, role='ADMIN'
        )

    def _can_manage_club(self, club, user):
        """Vérifie si l'utilisateur peut gérer le club (créateur, ou admin si créateur supprimé)."""
        if club.creator == user:
            return True
        if club.creator is None:
            return club.memberships.filter(user=user, role='ADMIN').exists()
        return False

    def perform_update(self, serializer):
        if not self._can_manage_club(serializer.instance, self.request.user):
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Seul le créateur (ou un admin si le créateur a supprimé son compte) peut modifier ce club.")
        serializer.save()

    def perform_destroy(self, instance):
        if not self._can_manage_club(instance, self.request.user):
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Seul le créateur (ou un admin si le créateur a supprimé son compte) peut supprimer ce club.")
        instance.delete()

    @action(detail=True, methods=['post'])
    def join(self, request, slug=None):
        """Rejoindre un club de lecture. Si requires_approval, le membre est en attente."""
        club = self.get_object()
        if club.memberships.filter(membership_status='APPROVED').count() >= club.max_members:
            return Response(
                {'detail': 'Le club est complet.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        existing = BookClubMembership.objects.filter(club=club, user=request.user).first()
        if existing:
            if existing.is_banned:
                return Response({'detail': 'Vous avez été banni de ce club.'}, status=status.HTTP_403_FORBIDDEN)
            if existing.membership_status == 'REJECTED':
                return Response({'detail': 'Votre demande a été refusée.'}, status=status.HTTP_403_FORBIDDEN)
            return Response({'detail': 'Vous êtes déjà membre ou en attente.'}, status=status.HTTP_409_CONFLICT)
        ms = 'PENDING' if club.requires_approval else 'APPROVED'
        BookClubMembership.objects.create(club=club, user=request.user, role='MEMBER', membership_status=ms)
        if ms == 'PENDING':
            return Response({
                'pending': True,
                'message': 'Votre demande a été envoyée. Un administrateur doit l\'approuver.',
            }, status=status.HTTP_202_ACCEPTED)
        return Response({
            'joined': True,
            'members_count': club.memberships.filter(membership_status='APPROVED').count(),
        }, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'])
    def leave(self, request, slug=None):
        """Quitter un club de lecture."""
        club = self.get_object()
        if club.creator == request.user:
            return Response(
                {'detail': 'Le créateur ne peut pas quitter le club.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        deleted, _ = BookClubMembership.objects.filter(club=club, user=request.user).delete()
        if not deleted:
            return Response({'detail': 'Vous n\'êtes pas membre.'}, status=status.HTTP_404_NOT_FOUND)
        # Notifier les admins
        from apps.notifications.services import create_notification
        member_name = request.user.get_full_name() or request.user.username
        for m in club.memberships.filter(role__in=['ADMIN', 'MODERATOR'], user__isnull=False).select_related('user'):
            create_notification(
                recipient=m.user,
                notification_type='CLUB_MEMBER_LEFT',
                title=f'{member_name} a quitté {club.name}',
                message=f'{member_name} n\'est plus membre du club.',
                link=f'/clubs/{club.slug}',
                metadata={'club_id': club.id, 'club_slug': club.slug, 'user_id': request.user.id},
            )
        return Response({
            'left': True,
            'members_count': club.memberships.count(),
        })

    @action(detail=True, methods=['get', 'post'], parser_classes=[MultiPartParser, FormParser, JSONParser])
    def messages(self, request, slug=None):
        """GET : messages du club. POST : envoyer un message (texte, voix, image, fichier)."""
        club = self.get_object()
        if not club.memberships.filter(user=request.user, membership_status='APPROVED').exists():
            return Response(
                {'error': "Vous devez être membre approuvé du club pour accéder aux messages."},
                status=status.HTTP_403_FORBIDDEN,
            )
        if request.method == 'GET':
            qs = BookClubMessage.objects.filter(club=club).select_related('author', 'reply_to', 'reply_to__author').prefetch_related('reactions')
            # Recherche fulltext : ?search=term
            search = request.query_params.get('search')
            if search:
                qs = qs.filter(content__icontains=search, is_deleted=False)
                serializer = BookClubMessageSerializer(qs[:50], many=True, context={'request': request})
                return Response(serializer.data)
            # Support polling : ?after=<id> retourne uniquement les nouveaux messages
            after = request.query_params.get('after')
            if after:
                qs = qs.filter(id__gt=after)
                serializer = BookClubMessageSerializer(qs, many=True, context={'request': request})
                return Response(serializer.data)
            # Scroll infini vers le haut : ?before=<id>&limit=<n>
            before = request.query_params.get('before')
            if before:
                limit = min(int(request.query_params.get('limit', 30)), 100)
                older = qs.filter(id__lt=before).order_by('-created_at')[:limit]
                data = list(reversed(older))  # remettre en ordre chronologique
                serializer = BookClubMessageSerializer(data, many=True, context={'request': request})
                return Response({'results': serializer.data, 'has_more': len(data) == limit})
            paginator = StandardPagination()
            page = paginator.paginate_queryset(qs, request)
            serializer = BookClubMessageSerializer(page, many=True, context={'request': request})
            return paginator.get_paginated_response(serializer.data)
        serializer = BookClubMessageSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        serializer.save(club=club, author=request.user)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['get'])
    def members(self, request, slug=None):
        """Liste des membres du club."""
        club = self.get_object()
        qs = BookClubMembership.objects.filter(club=club).select_related('user')
        serializer = BookClubMemberSerializer(qs, many=True, context={'request': request})
        return Response(serializer.data)

    def _is_club_admin(self, club, user):
        """Vérifie si l'utilisateur est admin ou créateur du club."""
        if club.creator == user:
            return True
        return club.memberships.filter(user=user, role='ADMIN').exists()

    def _is_club_mod(self, club, user):
        """Vérifie si l'utilisateur est admin, modérateur ou créateur du club."""
        if club.creator == user:
            return True
        return club.memberships.filter(user=user, role__in=['ADMIN', 'MODERATOR']).exists()

    @action(detail=True, methods=['patch'], url_path='members/(?P<member_id>[0-9]+)/role')
    def update_member_role(self, request, slug=None, member_id=None):
        """Promouvoir/rétrograder un membre (admin uniquement)."""
        club = self.get_object()
        if not self._is_club_admin(club, request.user):
            return Response({'detail': 'Réservé aux administrateurs.'}, status=status.HTTP_403_FORBIDDEN)

        membership = BookClubMembership.objects.filter(club=club, id=member_id).select_related('user').first()
        if not membership:
            return Response({'detail': 'Membre introuvable.'}, status=status.HTTP_404_NOT_FOUND)

        if membership.user == club.creator:
            return Response({'detail': 'Impossible de modifier le rôle du créateur.'}, status=status.HTTP_400_BAD_REQUEST)

        new_role = request.data.get('role')
        if new_role not in ('ADMIN', 'MODERATOR', 'MEMBER'):
            return Response({'detail': 'Rôle invalide.'}, status=status.HTTP_400_BAD_REQUEST)

        membership.role = new_role
        membership.save(update_fields=['role'])
        self._log_moderation(club, request.user, 'ROLE_CHANGE', target_user=membership.user, details=f'→ {new_role}')
        return Response({
            'message': f'{membership.user.get_full_name()} est maintenant {membership.get_role_display()}.',
            'membership': BookClubMemberSerializer(membership, context={'request': request}).data,
        })

    @action(detail=True, methods=['delete'], url_path='members/(?P<member_id>[0-9]+)/kick')
    def kick_member(self, request, slug=None, member_id=None):
        """Exclure un membre du club (admin ou modérateur)."""
        club = self.get_object()
        if not self._is_club_mod(club, request.user):
            return Response({'detail': 'Réservé aux administrateurs et modérateurs.'}, status=status.HTTP_403_FORBIDDEN)

        membership = BookClubMembership.objects.filter(club=club, id=member_id).select_related('user').first()
        if not membership:
            return Response({'detail': 'Membre introuvable.'}, status=status.HTTP_404_NOT_FOUND)

        if membership.user == club.creator:
            return Response({'detail': 'Impossible d\'exclure le créateur.'}, status=status.HTTP_400_BAD_REQUEST)

        # Un modérateur ne peut pas kicker un admin ou un autre modérateur
        if not self._is_club_admin(club, request.user) and membership.role in ('ADMIN', 'MODERATOR'):
            return Response({'detail': 'Un modérateur ne peut pas exclure un admin ou un autre modérateur.'}, status=status.HTTP_403_FORBIDDEN)

        name = membership.user.get_full_name() or membership.user.username
        target = membership.user
        membership.delete()
        self._log_moderation(club, request.user, 'KICK', target_user=target, details=name)
        return Response({'message': f'{name} a été exclu du club.', 'members_count': club.memberships.count()})

    @action(detail=True, methods=['post'], url_path='members/(?P<member_id>[0-9]+)/ban')
    def ban_member(self, request, slug=None, member_id=None):
        """Bannir un membre du club de façon permanente (admin ou modérateur)."""
        club = self.get_object()
        if not self._is_club_mod(club, request.user):
            return Response({'detail': 'Réservé aux administrateurs et modérateurs.'}, status=status.HTTP_403_FORBIDDEN)

        membership = BookClubMembership.objects.filter(club=club, id=member_id).select_related('user').first()
        if not membership:
            return Response({'detail': 'Membre introuvable.'}, status=status.HTTP_404_NOT_FOUND)

        if membership.user == club.creator:
            return Response({'detail': 'Impossible de bannir le créateur.'}, status=status.HTTP_400_BAD_REQUEST)

        if not self._is_club_admin(club, request.user) and membership.role in ('ADMIN', 'MODERATOR'):
            return Response({'detail': 'Un modérateur ne peut pas bannir un admin ou un autre modérateur.'}, status=status.HTTP_403_FORBIDDEN)

        if membership.is_banned:
            return Response({'detail': 'Ce membre est déjà banni.'}, status=status.HTTP_409_CONFLICT)

        from django.utils import timezone
        membership.is_banned = True
        membership.banned_at = timezone.now()
        membership.membership_status = 'REJECTED'
        membership.save(update_fields=['is_banned', 'banned_at', 'membership_status'])

        name = membership.user.get_full_name() or membership.user.username
        self._log_moderation(club, request.user, 'BAN', target_user=membership.user, details=name)
        return Response({'message': f'{name} a été banni du club.'})

    @action(detail=True, methods=['post'], url_path='members/(?P<member_id>[0-9]+)/approve')
    def approve_member(self, request, slug=None, member_id=None):
        """Approuver un membre en attente (admin uniquement)."""
        club = self.get_object()
        if not self._is_club_admin(club, request.user):
            return Response({'detail': 'Réservé aux administrateurs.'}, status=status.HTTP_403_FORBIDDEN)
        membership = BookClubMembership.objects.filter(club=club, id=member_id, membership_status='PENDING').first()
        if not membership:
            return Response({'detail': 'Demande introuvable.'}, status=status.HTTP_404_NOT_FOUND)
        membership.membership_status = 'APPROVED'
        membership.save(update_fields=['membership_status'])
        from apps.notifications.services import create_notification
        create_notification(
            recipient=membership.user,
            notification_type='CLUB_INVITED',
            title=f'Bienvenue dans {club.name} !',
            message='Votre demande d\'adhésion a été approuvée.',
            link=f'/clubs/{club.slug}',
            metadata={'club_id': club.id, 'club_slug': club.slug},
        )
        self._log_moderation(club, request.user, 'MEMBER_APPROVE', target_user=membership.user)
        return Response(BookClubMemberSerializer(membership, context={'request': request}).data)

    @action(detail=True, methods=['post'], url_path='members/(?P<member_id>[0-9]+)/reject')
    def reject_member(self, request, slug=None, member_id=None):
        """Rejeter un membre en attente (admin uniquement)."""
        club = self.get_object()
        if not self._is_club_admin(club, request.user):
            return Response({'detail': 'Réservé aux administrateurs.'}, status=status.HTTP_403_FORBIDDEN)
        membership = BookClubMembership.objects.filter(club=club, id=member_id, membership_status='PENDING').first()
        if not membership:
            return Response({'detail': 'Demande introuvable.'}, status=status.HTTP_404_NOT_FOUND)
        target = membership.user
        membership.delete()
        self._log_moderation(club, request.user, 'MEMBER_REJECT', target_user=target)
        return Response({'status': 'rejected'})

    @action(detail=True, methods=['post'])
    def invite(self, request, slug=None):
        """Inviter un utilisateur au club (admin uniquement)."""
        club = self.get_object()
        if not self._is_club_admin(club, request.user):
            return Response({'detail': 'Réservé aux administrateurs.'}, status=status.HTTP_403_FORBIDDEN)

        username = request.data.get('username', '').strip()
        if not username:
            return Response({'detail': 'Nom d\'utilisateur requis.'}, status=status.HTTP_400_BAD_REQUEST)

        from django.contrib.auth import get_user_model
        User = get_user_model()
        target_user = User.objects.filter(username__iexact=username).first()
        if not target_user:
            target_user = User.objects.filter(email__iexact=username).first()
        if not target_user:
            return Response({'detail': 'Utilisateur introuvable.'}, status=status.HTTP_404_NOT_FOUND)

        if club.memberships.filter(user=target_user).exists():
            return Response({'detail': 'Cet utilisateur est déjà membre.'}, status=status.HTTP_409_CONFLICT)

        if club.memberships.count() >= club.max_members:
            return Response({'detail': 'Le club est complet.'}, status=status.HTTP_400_BAD_REQUEST)

        BookClubMembership.objects.create(club=club, user=target_user, role='MEMBER')
        return Response({
            'message': f'{target_user.get_full_name()} a été ajouté au club.',
            'members_count': club.memberships.count(),
        }, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['delete', 'patch'], url_path='messages/(?P<msg_id>[0-9]+)')
    def message_action(self, request, slug=None, msg_id=None):
        """
        DELETE : supprimer un message (soft delete — auteur ou admin).
        PATCH  : éditer un message texte (auteur uniquement, fenêtre de 15 min).
        """
        club = self.get_object()
        msg = BookClubMessage.objects.filter(club=club, id=msg_id).select_related('author').first()
        if not msg:
            return Response({'detail': 'Message introuvable.'}, status=status.HTTP_404_NOT_FOUND)

        is_author = msg.author == request.user
        is_admin = self._is_club_admin(club, request.user)
        is_mod = self._is_club_mod(club, request.user)

        if request.method == 'DELETE':
            if not is_author and not is_mod:
                return Response({'detail': 'Vous ne pouvez supprimer que vos propres messages.'}, status=status.HTTP_403_FORBIDDEN)
            msg.is_deleted = True
            msg.content = ''
            msg.save(update_fields=['is_deleted', 'content'])
            if not is_author:
                self._log_moderation(club, request.user, 'MSG_DELETE', target_user=msg.author, target_message=msg)
            return Response({'status': 'deleted'})

        # PATCH — édition
        if not is_author:
            return Response({'detail': 'Vous ne pouvez modifier que vos propres messages.'}, status=status.HTTP_403_FORBIDDEN)
        if msg.message_type != 'TEXT':
            return Response({'detail': 'Seuls les messages texte peuvent être modifiés.'}, status=status.HTTP_400_BAD_REQUEST)
        from django.utils import timezone
        from datetime import timedelta
        if timezone.now() - msg.created_at > timedelta(minutes=15):
            return Response({'detail': 'Le message ne peut plus être modifié (limite : 15 minutes).'}, status=status.HTTP_400_BAD_REQUEST)

        new_content = request.data.get('content', '').strip()
        if not new_content:
            return Response({'detail': 'Le contenu ne peut pas être vide.'}, status=status.HTTP_400_BAD_REQUEST)

        msg.content = new_content
        msg.edited_at = timezone.now()
        msg.save(update_fields=['content', 'edited_at'])
        serializer = BookClubMessageSerializer(msg, context={'request': request})
        return Response(serializer.data)

    @action(detail=True, methods=['post'], url_path='messages/(?P<msg_id>[0-9]+)/pin')
    def pin_message(self, request, slug=None, msg_id=None):
        """Toggle épingler/désépingler un message (admin/mod uniquement)."""
        club = self.get_object()
        if not self._is_club_mod(club, request.user):
            return Response({'detail': 'Réservé aux administrateurs.'}, status=status.HTTP_403_FORBIDDEN)
        msg = BookClubMessage.objects.filter(club=club, id=msg_id).first()
        if not msg or msg.is_deleted:
            return Response({'detail': 'Message introuvable.'}, status=status.HTTP_404_NOT_FOUND)
        msg.is_pinned = not msg.is_pinned
        msg.save(update_fields=['is_pinned'])
        self._log_moderation(club, request.user, 'MSG_PIN' if msg.is_pinned else 'MSG_UNPIN', target_message=msg)
        return Response({'status': 'pinned' if msg.is_pinned else 'unpinned', 'is_pinned': msg.is_pinned})

    @action(detail=True, methods=['post'], url_path='messages/(?P<msg_id>[0-9]+)/report')
    def report_message(self, request, slug=None, msg_id=None):
        """Signaler un message. Body: { reason: "SPAM", details: "..." }. Un seul signalement par user/message."""
        club = self.get_object()
        if not club.memberships.filter(user=request.user).exists():
            return Response({'detail': 'Vous devez être membre du club.'}, status=status.HTTP_403_FORBIDDEN)
        msg = BookClubMessage.objects.filter(club=club, id=msg_id).first()
        if not msg or msg.is_deleted:
            return Response({'detail': 'Message introuvable.'}, status=status.HTTP_404_NOT_FOUND)
        if msg.author == request.user:
            return Response({'detail': 'Vous ne pouvez pas signaler votre propre message.'}, status=status.HTTP_400_BAD_REQUEST)
        if MessageReport.objects.filter(message=msg, reporter=request.user).exists():
            return Response({'detail': 'Vous avez déjà signalé ce message.'}, status=status.HTTP_409_CONFLICT)
        serializer = MessageReportSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        serializer.save(message=msg, reporter=request.user)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['get'], url_path='reports')
    def reports(self, request, slug=None):
        """Liste des signalements du club (admin ou modérateur). ?status=PENDING pour filtrer."""
        club = self.get_object()
        if not self._is_club_mod(club, request.user):
            return Response({'detail': 'Réservé aux administrateurs et modérateurs.'}, status=status.HTTP_403_FORBIDDEN)
        qs = MessageReport.objects.filter(message__club=club).select_related('reporter', 'message', 'message__author')
        flt = request.query_params.get('status')
        if flt:
            qs = qs.filter(status=flt)
        serializer = MessageReportSerializer(qs[:50], many=True, context={'request': request})
        return Response(serializer.data)

    @action(detail=True, methods=['patch'], url_path='reports/(?P<report_id>[0-9]+)')
    def update_report(self, request, slug=None, report_id=None):
        """Mettre à jour le statut d'un signalement (admin ou modérateur). Body: { status: "REVIEWED"|"DISMISSED" }."""
        club = self.get_object()
        if not self._is_club_mod(club, request.user):
            return Response({'detail': 'Réservé aux administrateurs et modérateurs.'}, status=status.HTTP_403_FORBIDDEN)
        report = MessageReport.objects.filter(id=report_id, message__club=club).first()
        if not report:
            return Response({'detail': 'Signalement introuvable.'}, status=status.HTTP_404_NOT_FOUND)
        new_status = request.data.get('status')
        if new_status not in ('REVIEWED', 'DISMISSED'):
            return Response({'detail': 'Statut invalide.'}, status=status.HTTP_400_BAD_REQUEST)
        report.status = new_status
        report.save(update_fields=['status'])
        self._log_moderation(club, request.user, 'REPORT_REVIEW', details=f'{new_status}: {report.reason}')
        return Response(MessageReportSerializer(report, context={'request': request}).data)

    # ── Journal de modération ──

    def _log_moderation(self, club, actor, action, target_user=None, target_message=None, details=''):
        ModerationLog.objects.create(
            club=club, actor=actor, action=action,
            target_user=target_user, target_message=target_message,
            details=details[:300],
        )

    @action(detail=True, methods=['get'], url_path='moderation-log')
    def moderation_log(self, request, slug=None):
        """Journal de modération du club (admin/mod uniquement)."""
        club = self.get_object()
        if not self._is_club_mod(club, request.user):
            return Response({'detail': 'Réservé aux administrateurs et modérateurs.'}, status=status.HTTP_403_FORBIDDEN)
        from apps.social.serializers import ModerationLogSerializer
        logs = ModerationLog.objects.filter(club=club).select_related('actor', 'target_user')[:50]
        serializer = ModerationLogSerializer(logs, many=True, context={'request': request})
        return Response(serializer.data)

    @action(detail=True, methods=['post'], url_path='messages/(?P<msg_id>[0-9]+)/react')
    def react_to_message(self, request, slug=None, msg_id=None):
        """Toggle une réaction emoji sur un message. Body: { emoji: "👍" }"""
        club = self.get_object()
        if not club.memberships.filter(user=request.user).exists():
            return Response({'detail': 'Vous devez être membre du club.'}, status=status.HTTP_403_FORBIDDEN)

        msg = BookClubMessage.objects.filter(club=club, id=msg_id).first()
        if not msg or msg.is_deleted:
            return Response({'detail': 'Message introuvable.'}, status=status.HTTP_404_NOT_FOUND)

        emoji = request.data.get('emoji', '').strip()
        if not emoji or len(emoji) > 8:
            return Response({'detail': 'Emoji requis.'}, status=status.HTTP_400_BAD_REQUEST)

        from apps.social.models import MessageReaction
        existing = MessageReaction.objects.filter(message=msg, user=request.user, emoji=emoji).first()
        if existing:
            existing.delete()
            action = 'removed'
        else:
            MessageReaction.objects.create(message=msg, user=request.user, emoji=emoji)
            action = 'added'

        # Retourner le résumé mis à jour
        serializer = BookClubMessageSerializer(msg, context={'request': request})
        return Response({
            'action': action,
            'reactions_summary': serializer.data['reactions_summary'],
        })

    @action(detail=True, methods=['post'], url_path='messages/(?P<msg_id>[0-9]+)/forward')
    def forward_message(self, request, slug=None, msg_id=None):
        """Transférer un message vers un autre club. Body: { target_club_slug }"""
        source_club = self.get_object()
        if not source_club.memberships.filter(user=request.user, membership_status='APPROVED').exists():
            return Response({'detail': 'Vous devez être membre du club.'}, status=status.HTTP_403_FORBIDDEN)

        msg = BookClubMessage.objects.filter(club=source_club, id=msg_id, is_deleted=False).first()
        if not msg:
            return Response({'detail': 'Message introuvable.'}, status=status.HTTP_404_NOT_FOUND)

        target_slug = request.data.get('target_club_slug')
        if not target_slug:
            return Response({'detail': 'target_club_slug requis.'}, status=status.HTTP_400_BAD_REQUEST)

        target_club = BookClub.objects.filter(slug=target_slug).first()
        if not target_club:
            return Response({'detail': 'Club cible introuvable.'}, status=status.HTTP_404_NOT_FOUND)
        if not target_club.memberships.filter(user=request.user, membership_status='APPROVED').exists():
            return Response({'detail': 'Vous devez être membre du club cible.'}, status=status.HTTP_403_FORBIDDEN)

        # Créer le message transféré
        forwarded = BookClubMessage.objects.create(
            club=target_club,
            author=request.user,
            message_type=msg.message_type,
            content=msg.content,
            quote_text=msg.quote_text,
            quote_page=msg.quote_page,
            quote_book=msg.quote_book,
            forwarded_from=msg,
        )
        serializer = BookClubMessageSerializer(forwarded, context={'request': request})
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['get'], url_path='media')
    def shared_media(self, request, slug=None):
        """Liste des médias partagés dans le club (images, fichiers, voix)."""
        club = self.get_object()
        if not club.memberships.filter(user=request.user).exists():
            return Response(
                {'error': "Vous devez être membre du club pour accéder aux médias."},
                status=status.HTTP_403_FORBIDDEN,
            )
        qs = BookClubMessage.objects.filter(
            club=club, message_type__in=['IMAGE', 'FILE', 'VOICE'],
        ).exclude(attachment='').select_related('author').order_by('-created_at')[:50]
        serializer = BookClubMessageSerializer(qs, many=True, context={'request': request})
        return Response(serializer.data)

    @action(detail=True, methods=['post'], url_path='mark_read')
    def mark_read(self, request, slug=None):
        """Marquer les messages du club comme lus pour l'utilisateur connecté."""
        club = self.get_object()
        from django.utils import timezone
        updated = club.memberships.filter(user=request.user).update(last_read_at=timezone.now())
        if not updated:
            return Response({'error': "Vous n'êtes pas membre de ce club."}, status=status.HTTP_404_NOT_FOUND)
        return Response({'status': 'read'})

    @action(detail=True, methods=['patch'], url_path='progress')
    def update_progress(self, request, slug=None):
        """Mettre à jour la progression de lecture du membre connecté (0-100)."""
        club = self.get_object()
        progress = request.data.get('progress')
        try:
            progress = int(progress)
            if not 0 <= progress <= 100:
                raise ValueError
        except (TypeError, ValueError):
            return Response({'detail': 'progress doit être un entier entre 0 et 100.'}, status=status.HTTP_400_BAD_REQUEST)
        updated = club.memberships.filter(user=request.user).update(reading_progress=progress)
        if not updated:
            return Response({'detail': "Vous n'êtes pas membre de ce club."}, status=status.HTTP_404_NOT_FOUND)
        # Notifier le club quand un membre atteint 100%
        if progress == 100:
            from apps.notifications.services import create_notification
            member_name = request.user.get_full_name() or request.user.username
            book_title = club.current_book.title if club.current_book else 'le livre'
            for m in club.memberships.filter(user__isnull=False).exclude(user=request.user).select_related('user'):
                create_notification(
                    recipient=m.user,
                    notification_type='CLUB_PROGRESS_COMPLETE',
                    title=f'{member_name} a terminé {book_title}',
                    message=f'{member_name} a atteint 100% dans {club.name} !',
                    link=f'/clubs/{club.slug}',
                    metadata={'club_id': club.id, 'club_slug': club.slug, 'user_id': request.user.id},
                )
        return Response({'status': 'updated', 'progress': progress})

    # ── Polls (votes pour le prochain livre) ──

    @action(detail=True, methods=['get', 'post'], url_path='polls')
    def polls(self, request, slug=None):
        """
        GET  : liste des votes du club (le plus récent en premier).
        POST : créer un nouveau vote (admin uniquement). Body: { title? }
        """
        club = self.get_object()
        from apps.social.models import BookPoll
        from apps.social.serializers import BookPollSerializer

        if request.method == 'GET':
            qs = BookPoll.objects.filter(club=club).prefetch_related('options__book', 'options__votes', 'options__proposed_by')
            serializer = BookPollSerializer(qs, many=True, context={'request': request})
            return Response(serializer.data)

        # POST — créer un vote
        if not self._is_club_admin(club, request.user):
            return Response({'detail': 'Réservé aux administrateurs.'}, status=status.HTTP_403_FORBIDDEN)
        # Fermer les votes ouverts précédents
        BookPoll.objects.filter(club=club, status='OPEN').update(status='CLOSED')
        poll_type = request.data.get('poll_type', 'BOOK')
        if poll_type not in ('BOOK', 'GENERIC'):
            poll_type = 'BOOK'
        default_title = 'Vote pour le prochain livre' if poll_type == 'BOOK' else 'Sondage'
        poll = BookPoll.objects.create(
            club=club,
            created_by=request.user,
            title=request.data.get('title', default_title),
            poll_type=poll_type,
        )
        # Notifier tous les membres
        from apps.notifications.services import create_notification
        creator_name = request.user.get_full_name() or request.user.username
        for m in club.memberships.filter(user__isnull=False).exclude(user=request.user).select_related('user'):
            create_notification(
                recipient=m.user,
                notification_type='CLUB_POLL_CREATED',
                title=f'Nouveau vote dans {club.name}',
                message=f'{creator_name} a lancé un vote : {poll.title}',
                link=f'/clubs/{club.slug}',
                metadata={'club_id': club.id, 'club_slug': club.slug, 'poll_id': poll.id},
            )
        serializer = BookPollSerializer(poll, context={'request': request})
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'], url_path='polls/(?P<poll_id>[0-9]+)/add-option')
    def poll_add_option(self, request, slug=None, poll_id=None):
        """Proposer un livre ou une option texte dans un vote.
        Body (BOOK poll): { book_id }
        Body (GENERIC poll): { text_label }
        """
        club = self.get_object()
        if not club.memberships.filter(user=request.user).exists():
            return Response({'detail': 'Vous devez être membre du club.'}, status=status.HTTP_403_FORBIDDEN)

        from apps.social.models import BookPoll, BookPollOption
        poll = BookPoll.objects.filter(club=club, id=poll_id, status='OPEN').first()
        if not poll:
            return Response({'detail': 'Vote introuvable ou déjà clos.'}, status=status.HTTP_404_NOT_FOUND)

        if poll.poll_type == 'GENERIC':
            text_label = (request.data.get('text_label') or '').strip()
            if not text_label:
                return Response({'detail': 'text_label requis pour un sondage générique.'}, status=status.HTTP_400_BAD_REQUEST)
            if len(text_label) > 200:
                return Response({'detail': 'Option trop longue (200 caractères max).'}, status=status.HTTP_400_BAD_REQUEST)
            if BookPollOption.objects.filter(poll=poll, text_label=text_label).exists():
                return Response({'detail': 'Cette option existe déjà.'}, status=status.HTTP_409_CONFLICT)
            BookPollOption.objects.create(poll=poll, text_label=text_label, proposed_by=request.user)
        else:
            book_id = request.data.get('book_id')
            if not book_id:
                return Response({'detail': 'book_id requis.'}, status=status.HTTP_400_BAD_REQUEST)
            from apps.books.models import Book
            book = Book.objects.filter(id=book_id).first()
            if not book:
                return Response({'detail': 'Livre introuvable.'}, status=status.HTTP_404_NOT_FOUND)
            if BookPollOption.objects.filter(poll=poll, book=book).exists():
                return Response({'detail': 'Ce livre est déjà proposé.'}, status=status.HTTP_409_CONFLICT)
            BookPollOption.objects.create(poll=poll, book=book, proposed_by=request.user)

        from apps.social.serializers import BookPollSerializer
        serializer = BookPollSerializer(poll, context={'request': request})
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'], url_path='polls/(?P<poll_id>[0-9]+)/vote/(?P<option_id>[0-9]+)')
    def poll_vote(self, request, slug=None, poll_id=None, option_id=None):
        """Voter pour une option (toggle : vote/dévote)."""
        club = self.get_object()
        if not club.memberships.filter(user=request.user).exists():
            return Response({'detail': 'Vous devez être membre du club.'}, status=status.HTTP_403_FORBIDDEN)

        from apps.social.models import BookPoll, BookPollOption, BookPollVote
        poll = BookPoll.objects.filter(club=club, id=poll_id, status='OPEN').first()
        if not poll:
            return Response({'detail': 'Vote introuvable ou déjà clos.'}, status=status.HTTP_404_NOT_FOUND)

        option = BookPollOption.objects.filter(poll=poll, id=option_id).first()
        if not option:
            return Response({'detail': 'Option introuvable.'}, status=status.HTTP_404_NOT_FOUND)

        existing = BookPollVote.objects.filter(option=option, user=request.user).first()
        if existing:
            existing.delete()
            action_done = 'removed'
        else:
            # Retirer le vote précédent sur une autre option du même poll
            BookPollVote.objects.filter(option__poll=poll, user=request.user).delete()
            BookPollVote.objects.create(option=option, user=request.user)
            action_done = 'voted'

        from apps.social.serializers import BookPollSerializer
        serializer = BookPollSerializer(poll, context={'request': request})
        return Response({'action': action_done, 'poll': serializer.data})

    @action(detail=True, methods=['post'], url_path='polls/(?P<poll_id>[0-9]+)/close')
    def poll_close(self, request, slug=None, poll_id=None):
        """Clore un vote et appliquer le livre gagnant (admin uniquement)."""
        club = self.get_object()
        if not self._is_club_admin(club, request.user):
            return Response({'detail': 'Réservé aux administrateurs.'}, status=status.HTTP_403_FORBIDDEN)

        from apps.social.models import BookPoll
        from django.utils import timezone
        poll = BookPoll.objects.filter(club=club, id=poll_id, status='OPEN').first()
        if not poll:
            return Response({'detail': 'Vote introuvable ou déjà clos.'}, status=status.HTTP_404_NOT_FOUND)

        poll.status = 'CLOSED'
        poll.closed_at = timezone.now()
        poll.save(update_fields=['status', 'closed_at'])

        # Appliquer le gagnant comme livre en cours (seulement pour les sondages de type BOOK)
        winner = poll.options.annotate(vote_count=Count('votes')).order_by('-vote_count').first()
        winner_label = None
        if winner and winner.vote_count > 0:
            if poll.poll_type == 'BOOK' and winner.book:
                club.current_book = winner.book
                club.save(update_fields=['current_book', 'updated_at'])
                club.memberships.update(reading_progress=0)
                winner_label = winner.book.title
            else:
                winner_label = winner.text_label or (winner.book.title if winner.book else None)

        from apps.social.serializers import BookPollSerializer
        serializer = BookPollSerializer(poll, context={'request': request})
        return Response({
            'poll': serializer.data,
            'winner': winner_label,
        })

    # ── Invitations par lien ──

    @action(detail=True, methods=['post'], url_path='invite-link')
    def create_invite_link(self, request, slug=None):
        """Générer un lien d'invitation partageable (admin uniquement)."""
        club = self.get_object()
        if not self._is_club_admin(club, request.user):
            return Response({'detail': 'Réservé aux administrateurs.'}, status=status.HTTP_403_FORBIDDEN)

        from apps.social.models import ClubInvitation
        from datetime import timedelta
        from django.utils import timezone

        expires_days = int(request.data.get('expires_days', 7))
        max_uses = int(request.data.get('max_uses', 0))

        invitation = ClubInvitation.objects.create(
            club=club,
            created_by=request.user,
            max_uses=max_uses,
            expires_at=timezone.now() + timedelta(days=expires_days),
        )

        from apps.social.serializers import ClubInvitationSerializer
        serializer = ClubInvitationSerializer(invitation, context={'request': request})
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    # ── Sessions (séances programmées) ──

    @action(detail=True, methods=['get', 'post'], url_path='sessions')
    def sessions(self, request, slug=None):
        """GET : liste des séances futures (auto-génère les récurrences passées). POST : créer une séance (admin)."""
        club = self.get_object()

        if request.method == 'GET':
            from django.utils import timezone
            from datetime import timedelta
            now = timezone.now()

            # Auto-generate next occurrence for recurring sessions that are past
            recurring_past = ClubSession.objects.filter(
                club=club, recurrence__in=['WEEKLY', 'BIWEEKLY', 'MONTHLY'],
                scheduled_at__lt=now,
            )
            for session in recurring_past:
                next_dt = session.scheduled_at
                if session.recurrence == 'WEEKLY':
                    delta = timedelta(weeks=1)
                elif session.recurrence == 'BIWEEKLY':
                    delta = timedelta(weeks=2)
                else:  # MONTHLY
                    delta = timedelta(days=30)
                while next_dt < now:
                    next_dt += delta
                # Only create if it doesn't already exist at that time
                if not ClubSession.objects.filter(club=club, scheduled_at=next_dt).exists():
                    ClubSession.objects.create(
                        club=club, title=session.title,
                        description=session.description,
                        scheduled_at=next_dt,
                        is_online=session.is_online,
                        location=session.location,
                        recurrence=session.recurrence,
                        created_by=session.created_by,
                    )
                # Remove recurrence from the old past session
                session.recurrence = 'NONE'
                session.save(update_fields=['recurrence'])

            sessions = ClubSession.objects.filter(
                club=club, scheduled_at__gte=now
            ).select_related('created_by').prefetch_related('rsvps')
            serializer = ClubSessionSerializer(sessions, many=True, context={'request': request})
            return Response(serializer.data)

        # POST
        if not self._is_club_admin(club, request.user):
            return Response({'detail': 'Réservé aux administrateurs.'}, status=status.HTTP_403_FORBIDDEN)
        serializer = ClubSessionSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        serializer.save(club=club, created_by=request.user)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'], url_path='sessions/(?P<session_id>[0-9]+)/rsvp')
    def session_rsvp(self, request, slug=None, session_id=None):
        """RSVP pour une séance. Body: { status: "GOING"|"NOT_GOING"|"MAYBE" }. Re-POST met à jour."""
        club = self.get_object()
        if not club.memberships.filter(user=request.user).exists():
            return Response({'detail': 'Vous devez être membre du club.'}, status=status.HTTP_403_FORBIDDEN)
        session = ClubSession.objects.filter(club=club, id=session_id).first()
        if not session:
            return Response({'detail': 'Séance introuvable.'}, status=status.HTTP_404_NOT_FOUND)
        new_status = request.data.get('status')
        if new_status not in ('GOING', 'NOT_GOING', 'MAYBE'):
            return Response({'detail': 'Statut invalide.'}, status=status.HTTP_400_BAD_REQUEST)
        rsvp, created = SessionRSVP.objects.update_or_create(
            session=session, user=request.user,
            defaults={'status': new_status},
        )
        # Return updated session with counts
        session = ClubSession.objects.filter(id=session.id).select_related('created_by').prefetch_related('rsvps').first()
        serializer = ClubSessionSerializer(session, context={'request': request})
        return Response(serializer.data)

    # ── Jalons de lecture (checkpoints) ──

    @action(detail=True, methods=['get', 'post'], url_path='checkpoints')
    def checkpoints(self, request, slug=None):
        """
        GET  : liste des jalons du livre en cours.
        POST : créer un jalon (admin). Body: { label, target_page }
        """
        club = self.get_object()
        from apps.social.models import ReadingCheckpoint
        from apps.social.serializers import ReadingCheckpointSerializer

        if request.method == 'GET':
            if not club.current_book:
                return Response([])
            qs = ReadingCheckpoint.objects.filter(club=club, book=club.current_book)
            serializer = ReadingCheckpointSerializer(qs, many=True, context={'request': request})
            return Response(serializer.data)

        # POST
        if not self._is_club_admin(club, request.user):
            return Response({'detail': 'Réservé aux administrateurs.'}, status=status.HTTP_403_FORBIDDEN)
        if not club.current_book:
            return Response({'detail': 'Aucun livre en cours.'}, status=status.HTTP_400_BAD_REQUEST)

        label = (request.data.get('label') or '').strip()
        target_page = request.data.get('target_page')
        if not label or not target_page:
            return Response({'detail': 'label et target_page requis.'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            target_page = int(target_page)
            if target_page < 1:
                raise ValueError
        except (TypeError, ValueError):
            return Response({'detail': 'target_page doit être un entier positif.'}, status=status.HTTP_400_BAD_REQUEST)

        if ReadingCheckpoint.objects.filter(club=club, book=club.current_book, target_page=target_page).exists():
            return Response({'detail': 'Un jalon existe déjà pour cette page.'}, status=status.HTTP_409_CONFLICT)

        max_order = ReadingCheckpoint.objects.filter(club=club, book=club.current_book).count()
        checkpoint = ReadingCheckpoint.objects.create(
            club=club, book=club.current_book,
            label=label, target_page=target_page,
            sort_order=max_order, created_by=request.user,
        )
        serializer = ReadingCheckpointSerializer(checkpoint, context={'request': request})
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['delete'], url_path='checkpoints/(?P<cp_id>[0-9]+)')
    def checkpoint_delete(self, request, slug=None, cp_id=None):
        """Supprimer un jalon (admin)."""
        club = self.get_object()
        if not self._is_club_admin(club, request.user):
            return Response({'detail': 'Réservé aux administrateurs.'}, status=status.HTTP_403_FORBIDDEN)
        from apps.social.models import ReadingCheckpoint
        cp = ReadingCheckpoint.objects.filter(club=club, id=cp_id).first()
        if not cp:
            return Response({'detail': 'Jalon introuvable.'}, status=status.HTTP_404_NOT_FOUND)
        cp.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=['post'], url_path='checkpoints/(?P<cp_id>[0-9]+)/reach')
    def checkpoint_reach(self, request, slug=None, cp_id=None):
        """Marquer un jalon comme atteint (admin). Envoie une notification."""
        club = self.get_object()
        if not self._is_club_admin(club, request.user):
            return Response({'detail': 'Réservé aux administrateurs.'}, status=status.HTTP_403_FORBIDDEN)
        from apps.social.models import ReadingCheckpoint
        from apps.social.serializers import ReadingCheckpointSerializer
        from django.utils import timezone
        cp = ReadingCheckpoint.objects.filter(club=club, id=cp_id).first()
        if not cp:
            return Response({'detail': 'Jalon introuvable.'}, status=status.HTTP_404_NOT_FOUND)
        if cp.reached_at:
            return Response({'detail': 'Jalon déjà atteint.'}, status=status.HTTP_409_CONFLICT)

        cp.reached_at = timezone.now()
        cp.save(update_fields=['reached_at'])

        # Notifier les membres
        from apps.notifications.services import create_notification
        for m in club.memberships.filter(user__isnull=False).exclude(user=request.user).select_related('user'):
            create_notification(
                recipient=m.user,
                notification_type='CLUB_CHECKPOINT_REACHED',
                title=f'Jalon atteint dans {club.name}',
                message=f'Le club a atteint le jalon « {cp.label} » (page {cp.target_page}) !',
                link=f'/clubs/{club.slug}',
                metadata={'club_id': club.id, 'club_slug': club.slug, 'checkpoint_id': cp.id},
            )

        serializer = ReadingCheckpointSerializer(cp, context={'request': request})
        return Response(serializer.data)

    # ── Wishlist collective ──

    @action(detail=True, methods=['get', 'post'], url_path='wishlist')
    def wishlist(self, request, slug=None):
        """
        GET  : liste des suggestions triées par votes décroissants.
        POST : suggérer un livre. Body: { book_id }
        """
        club = self.get_object()
        from apps.social.models import ClubWishlistItem
        from apps.social.serializers import ClubWishlistItemSerializer

        if request.method == 'GET':
            qs = ClubWishlistItem.objects.filter(club=club).select_related('book', 'suggested_by').prefetch_related('votes')
            # Tri par nombre de votes décroissant
            qs = qs.annotate(vote_count=Count('votes')).order_by('-vote_count', '-created_at')
            serializer = ClubWishlistItemSerializer(qs, many=True, context={'request': request})
            return Response(serializer.data)

        # POST — suggérer un livre
        if not club.memberships.filter(user=request.user, membership_status='APPROVED').exists():
            return Response({'detail': 'Vous devez être membre du club.'}, status=status.HTTP_403_FORBIDDEN)

        book_id = request.data.get('book_id')
        if not book_id:
            return Response({'detail': 'book_id requis.'}, status=status.HTTP_400_BAD_REQUEST)

        book = get_object_or_404(Book, id=book_id)

        if ClubWishlistItem.objects.filter(club=club, book=book).exists():
            return Response({'detail': 'Ce livre est déjà dans la wishlist.'}, status=status.HTTP_409_CONFLICT)

        item = ClubWishlistItem.objects.create(club=club, book=book, suggested_by=request.user)
        serializer = ClubWishlistItemSerializer(item, context={'request': request})
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'], url_path='wishlist/(?P<item_id>[0-9]+)/vote')
    def wishlist_vote(self, request, slug=None, item_id=None):
        """Toggle vote sur une suggestion (vote/dévote)."""
        club = self.get_object()
        if not club.memberships.filter(user=request.user, membership_status='APPROVED').exists():
            return Response({'detail': 'Vous devez être membre du club.'}, status=status.HTTP_403_FORBIDDEN)

        from apps.social.models import ClubWishlistItem, ClubWishlistVote
        from apps.social.serializers import ClubWishlistItemSerializer

        item = ClubWishlistItem.objects.filter(club=club, id=item_id).first()
        if not item:
            return Response({'detail': 'Suggestion introuvable.'}, status=status.HTTP_404_NOT_FOUND)

        existing = ClubWishlistVote.objects.filter(item=item, user=request.user).first()
        if existing:
            existing.delete()
            action_done = 'removed'
        else:
            ClubWishlistVote.objects.create(item=item, user=request.user)
            action_done = 'voted'

        serializer = ClubWishlistItemSerializer(item, context={'request': request})
        return Response({'action': action_done, 'item': serializer.data})

    @action(detail=True, methods=['delete'], url_path='wishlist/(?P<item_id>[0-9]+)')
    def wishlist_remove(self, request, slug=None, item_id=None):
        """Supprimer une suggestion (auteur de la suggestion ou admin)."""
        club = self.get_object()
        from apps.social.models import ClubWishlistItem

        item = ClubWishlistItem.objects.filter(club=club, id=item_id).first()
        if not item:
            return Response({'detail': 'Suggestion introuvable.'}, status=status.HTTP_404_NOT_FOUND)

        is_author = item.suggested_by_id == request.user.id
        is_admin = self._is_club_admin(club, request.user)
        if not is_author and not is_admin:
            return Response({'detail': 'Non autorisé.'}, status=status.HTTP_403_FORBIDDEN)

        item.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    # ── Archives (historique des livres lus) ──

    @action(detail=True, methods=['get', 'post'], url_path='archives')
    def archives(self, request, slug=None):
        """GET : historique des livres lus. POST : ajouter un livre à l'historique (admin)."""
        club = self.get_object()

        if request.method == 'GET':
            history = ClubBookHistory.objects.filter(
                club=club
            ).select_related('book')
            serializer = ClubBookHistorySerializer(history, many=True, context={'request': request})
            return Response(serializer.data)

        # POST
        if not self._is_club_admin(club, request.user):
            return Response({'detail': 'Réservé aux administrateurs.'}, status=status.HTTP_403_FORBIDDEN)
        book_id = request.data.get('book_id')
        if not book_id:
            return Response({'detail': 'book_id requis.'}, status=status.HTTP_400_BAD_REQUEST)
        book = get_object_or_404(Book, id=book_id)
        from django.utils import timezone
        history, created = ClubBookHistory.objects.get_or_create(
            club=club, book=book,
            defaults={
                'started_at': request.data.get('started_at', timezone.now().date()),
                'finished_at': request.data.get('finished_at'),
            }
        )
        serializer = ClubBookHistorySerializer(history, context={'request': request})
        return Response(serializer.data, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)


class ClubJoinByLinkView(APIView):
    """
    GET  : aperçu du club via le lien d'invitation (public).
    POST : rejoindre le club via le lien (authentifié).
    """

    def get_permissions(self):
        if self.request.method == 'GET':
            return [AllowAny()]
        return [IsAuthenticated()]

    def get(self, request, token):
        from apps.social.models import ClubInvitation
        from apps.social.serializers import ClubInvitationSerializer

        invitation = ClubInvitation.objects.select_related('club', 'created_by').filter(token=token).first()
        if not invitation:
            return Response({'detail': 'Invitation introuvable.'}, status=status.HTTP_404_NOT_FOUND)

        serializer = ClubInvitationSerializer(invitation, context={'request': request})
        return Response(serializer.data)

    def post(self, request, token):
        from apps.social.models import ClubInvitation, BookClubMembership

        invitation = ClubInvitation.objects.select_related('club').filter(token=token).first()
        if not invitation:
            return Response({'detail': 'Invitation introuvable.'}, status=status.HTTP_404_NOT_FOUND)

        if not invitation.is_valid:
            return Response({'detail': 'Cette invitation a expiré ou a atteint sa limite.'}, status=status.HTTP_410_GONE)

        club = invitation.club

        existing = club.memberships.filter(user=request.user).first()
        if existing:
            if existing.is_banned:
                return Response({'detail': 'Vous avez été banni de ce club.'}, status=status.HTTP_403_FORBIDDEN)
            if existing.membership_status == 'APPROVED':
                return Response({'detail': 'Vous êtes déjà membre.', 'slug': club.slug}, status=status.HTTP_409_CONFLICT)
            if existing.membership_status == 'PENDING':
                return Response({'detail': 'Votre demande est en attente.', 'slug': club.slug}, status=status.HTTP_409_CONFLICT)

        if club.memberships.filter(membership_status='APPROVED').count() >= club.max_members:
            return Response({'detail': 'Le club est complet.'}, status=status.HTTP_400_BAD_REQUEST)

        # Invitation par lien = auto-approbation (lien partagé par un admin)
        BookClubMembership.objects.create(club=club, user=request.user, role='MEMBER', membership_status='APPROVED')
        invitation.use_count += 1
        invitation.save(update_fields=['use_count'])

        return Response({
            'status': 'joined',
            'slug': club.slug,
            'club_name': club.name,
        }, status=status.HTTP_201_CREATED)
