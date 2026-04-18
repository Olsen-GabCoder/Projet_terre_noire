from django.db.models import Q
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
    BookClub, BookClubMembership, BookClubMessage,
)
from .serializers import (
    UserFollowSerializer, AuthorFollowSerializer, OrganizationFollowSerializer,
    ReadingListSerializer, ReadingListDetailSerializer,
    ReadingListCreateSerializer, ReadingListItemSerializer,
    PostSerializer, PostCreateSerializer, PostCommentSerializer,
    PlatformReviewSerializer,
    BookClubListSerializer, BookClubDetailSerializer,
    BookClubCreateSerializer, BookClubMemberSerializer, BookClubMessageSerializer,
    SimpleUserSerializer,
)
from .recommendations import get_recommendations


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
        qs = BookClub.objects.select_related('creator', 'book', 'current_book').prefetch_related('memberships')
        if self.request.query_params.get('public') == 'true':
            qs = qs.filter(is_public=True)
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
        """Rejoindre un club de lecture."""
        club = self.get_object()
        if club.memberships.count() >= club.max_members:
            return Response(
                {'detail': 'Le club est complet.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        _, created = BookClubMembership.objects.get_or_create(
            club=club, user=request.user, defaults={'role': 'MEMBER'}
        )
        if not created:
            return Response({'detail': 'Vous êtes déjà membre.'}, status=status.HTTP_409_CONFLICT)
        return Response({
            'joined': True,
            'members_count': club.memberships.count(),
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
        return Response({
            'left': True,
            'members_count': club.memberships.count(),
        })

    @action(detail=True, methods=['get', 'post'], parser_classes=[MultiPartParser, FormParser, JSONParser])
    def messages(self, request, slug=None):
        """GET : messages du club. POST : envoyer un message (texte, voix, image, fichier)."""
        club = self.get_object()
        if not club.memberships.filter(user=request.user).exists():
            return Response(
                {'error': "Vous devez être membre du club pour accéder aux messages."},
                status=status.HTTP_403_FORBIDDEN,
            )
        if request.method == 'GET':
            qs = BookClubMessage.objects.filter(club=club).select_related('author')
            # Support polling : ?after=<id> retourne uniquement les nouveaux messages
            after = request.query_params.get('after')
            if after:
                qs = qs.filter(id__gt=after)
                serializer = BookClubMessageSerializer(qs, many=True, context={'request': request})
                return Response(serializer.data)
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
        if new_role not in ('ADMIN', 'MEMBER'):
            return Response({'detail': 'Rôle invalide.'}, status=status.HTTP_400_BAD_REQUEST)

        membership.role = new_role
        membership.save(update_fields=['role'])
        return Response({
            'message': f'{membership.user.get_full_name()} est maintenant {membership.get_role_display()}.',
            'membership': BookClubMemberSerializer(membership, context={'request': request}).data,
        })

    @action(detail=True, methods=['delete'], url_path='members/(?P<member_id>[0-9]+)/kick')
    def kick_member(self, request, slug=None, member_id=None):
        """Exclure un membre du club (admin uniquement)."""
        club = self.get_object()
        if not self._is_club_admin(club, request.user):
            return Response({'detail': 'Réservé aux administrateurs.'}, status=status.HTTP_403_FORBIDDEN)

        membership = BookClubMembership.objects.filter(club=club, id=member_id).select_related('user').first()
        if not membership:
            return Response({'detail': 'Membre introuvable.'}, status=status.HTTP_404_NOT_FOUND)

        if membership.user == club.creator:
            return Response({'detail': 'Impossible d\'exclure le créateur.'}, status=status.HTTP_400_BAD_REQUEST)

        name = membership.user.get_full_name()
        membership.delete()
        return Response({'message': f'{name} a été exclu du club.', 'members_count': club.memberships.count()})

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
