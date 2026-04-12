# backend/apps/books/views.py

import logging
from rest_framework import viewsets, filters, status
from rest_framework.decorators import action, api_view, permission_classes as perm_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticatedOrReadOnly, IsAuthenticated, AllowAny
from rest_framework.pagination import PageNumberPagination

from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Count, Avg, Sum, Q, F, Exists, OuterRef, Prefetch
from django.conf import settings
from django.core.cache import cache
from django.shortcuts import get_object_or_404
from django.http import FileResponse, Http404
from django.views.decorators.clickjacking import xframe_options_exempt

logger = logging.getLogger(__name__)

from .models import Book, Author, Category, BookReview, ReviewLike
from .filters import BookFilter
from .serializers import (
    BookListSerializer,
    BookDetailSerializer,
    BookCreateUpdateSerializer,
    AuthorSerializer,
    AuthorDetailSerializer,
    CategorySerializer,
    CategoryDetailSerializer,
    BookStatisticsSerializer,
    BookReviewSerializer,
    BookReviewCreateSerializer,
    BookReviewReplySerializer,
)


@xframe_options_exempt
@api_view(['GET'])
@perm_classes([IsAuthenticated])
def serve_book_pdf(request, book_id):
    """
    Sert le PDF d'un livre pour affichage dans l'iframe de l'application.
    Accès restreint : utilisateur authentifié + achat vérifié (ou admin).
    Exempt de X-Frame-Options pour autoriser l'embedding dans notre frontend.
    """
    from apps.orders.models import Order

    book = get_object_or_404(Book, pk=book_id)

    if not book.pdf_file:
        raise Http404("PDF non disponible pour ce livre.")

    # Admin/staff : accès libre
    if not request.user.is_staff:
        # Vérifier que l'utilisateur a une commande payée contenant ce livre
        has_purchased = Order.objects.filter(
            user=request.user,
            status='PAID',
            items__book=book,
        ).exists()
        if not has_purchased:
            return Response(
                {'detail': "Vous devez acheter ce livre pour accéder au lecteur."},
                status=status.HTTP_403_FORBIDDEN,
            )

    try:
        f = book.pdf_file.open('rb')
    except Exception as e:
        logger.warning("Ouverture du PDF livre %s échouée: %s", book_id, e)
        raise Http404("Fichier PDF inaccessible.") from e
    filename = f"{book.slug or book.id}.pdf"
    response = FileResponse(f, content_type='application/pdf')
    response['Content-Disposition'] = f'inline; filename="{filename}"'
    return response


class StandardResultsSetPagination(PageNumberPagination):
    """
    Pagination standard pour les listes
    12 éléments par page (3 lignes de 4 cartes en général)
    Maximum 100 pour éviter les abus
    """
    page_size = 12
    page_size_query_param = 'page_size'
    max_page_size = 100


class ReviewResultsSetPagination(PageNumberPagination):
    """Pagination pour les avis (10 par page)."""
    page_size = 10
    page_size_query_param = 'page_size'
    max_page_size = 50


class BookViewSet(viewsets.ModelViewSet):
    """
    ViewSet pour la gestion complète des livres
    
    Liste des actions disponibles:
    - list: GET /api/books/ - Liste paginée des livres
    - retrieve: GET /api/books/{id}/ - Détail d'un livre
    - create: POST /api/books/ - Créer un livre (admin)
    - update: PUT /api/books/{id}/ - Modifier un livre (admin)
    - partial_update: PATCH /api/books/{id}/ - Modifier partiellement (admin)
    - destroy: DELETE /api/books/{id}/ - Supprimer un livre (admin)
    
    Filtres disponibles:
    - ?category=1 - Filtrer par catégorie
    - ?author=2 - Filtrer par auteur
    - ?book_format=EBOOK - Filtrer par format (renommé pour éviter conflit DRF)
    - ?available=true - Filtrer par disponibilité
    - ?search=victor - Rechercher dans titre/description/auteur
    - ?ordering=-created_at - Trier par date (descendant)
    """
    
    # Évite N+1 sur category, author, publisher_organization (accédés par BookListSerializer)
    queryset = Book.objects.select_related('category', 'author', 'publisher_organization').all()
    permission_classes = [IsAuthenticatedOrReadOnly]
    pagination_class = StandardResultsSetPagination
    
    # Configuration des filtres
    filter_backends = [
        DjangoFilterBackend,
        filters.SearchFilter,
        filters.OrderingFilter
    ]
    
    # Utiliser le filtre personnalisé au lieu de filterset_fields
    filterset_class = BookFilter
    
    # Champs dans lesquels on peut rechercher
    search_fields = [
        'title',
        'description',
        'author__full_name',
        'reference'
    ]
    
    # Champs sur lesquels on peut trier
    ordering_fields = [
        'title',
        'price',
        'created_at',
        'updated_at',
        'rating'
    ]
    
    # Tri par défaut
    ordering = ['-created_at']
    
    def get_serializer_class(self):
        """
        Retourne le sérialiseur approprié selon l'action
        - Liste: Version allégée pour les performances
        - Détail: Version complète avec toutes les infos
        - Création/Modification: Version simplifiée sans nested
        """
        if self.action == 'list':
            return BookListSerializer
        elif self.action == 'retrieve':
            return BookDetailSerializer
        elif self.action in ['create', 'update', 'partial_update']:
            return BookCreateUpdateSerializer
        return BookDetailSerializer

    def create(self, request, *args, **kwargs):
        if request.method == 'POST' and not request.data and not request.FILES:
            logger.warning("POST /api/books/ : body vide (multipart non parsé ?)")
            return Response(
                {
                    'detail': 'Aucune donnée reçue. Vérifiez que le formulaire envoie bien les champs '
                              '(titre, auteur, catégorie, etc.) avec Content-Type multipart/form-data.'
                },
                status=status.HTTP_400_BAD_REQUEST
            )
        serializer = self.get_serializer(data=request.data)
        if not serializer.is_valid():
            logger.warning(
                "POST /api/books/ validation error: keys=%s errors=%s",
                list(request.data.keys()) if request.data else [],
                serializer.errors,
            )
        return super().create(request, *args, **kwargs)

    def get_queryset(self):
        """
        Optimisation des requêtes selon l'action
        Utilise select_related pour éviter les N+1 queries
        Prefetch les listings marketplace actives pour list/retrieve
        """
        queryset = super().get_queryset()

        if self.action in ['list', 'retrieve']:
            from apps.marketplace.models import BookListing
            from apps.library.models import LibraryCatalogItem
            queryset = queryset.select_related(
                'category', 'author', 'publisher_organization',
            ).prefetch_related(
                Prefetch(
                    'listings',
                    queryset=BookListing.objects.filter(
                        is_active=True,
                    ).select_related('vendor').order_by('price'),
                    to_attr='active_listings',
                ),
                Prefetch(
                    'library_catalog_items',
                    queryset=LibraryCatalogItem.objects.filter(
                        is_active=True,
                    ).select_related('library'),
                    to_attr='active_catalog_items',
                ),
            )

        return queryset
    
    @action(detail=False, methods=['get'], url_path='featured')
    def featured_books(self, request):
        """
        Endpoint personnalisé: /api/books/featured/
        Retourne les livres mis en avant (les 6 plus récents et disponibles)
        """
        cache_key = 'books_featured'
        data = cache.get(cache_key)
        if data is None:
            featured = self.get_queryset().filter(available=True)[:6]
            serializer = BookListSerializer(featured, many=True, context={'request': request})
            data = serializer.data
            cache.set(cache_key, data, getattr(settings, 'CACHE_BOOKS_TTL', 300))
        return Response(data)

    @action(detail=False, methods=['get'], url_path='bestsellers')
    def bestsellers(self, request):
        """
        Endpoint personnalisé: /api/books/bestsellers/
        Retourne les best-sellers (livres marqués comme bestseller)
        """
        cache_key = 'books_bestsellers'
        data = cache.get(cache_key)
        if data is None:
            bestsellers = self.get_queryset().filter(
                available=True, is_bestseller=True
            ).order_by('-rating', '-created_at')[:8]
            serializer = BookListSerializer(bestsellers, many=True, context={'request': request})
            data = serializer.data
            cache.set(cache_key, data, getattr(settings, 'CACHE_BOOKS_TTL', 300))
        return Response(data)

    @action(detail=False, methods=['get'], url_path='new-releases')
    def new_releases(self, request):
        """
        Endpoint personnalisé: /api/books/new-releases/
        Retourne les nouveautés (10 derniers livres ajoutés)
        """
        cache_key = 'books_new_releases'
        data = cache.get(cache_key)
        if data is None:
            new_books = self.get_queryset().filter(available=True).order_by('-created_at')[:10]
            serializer = BookListSerializer(new_books, many=True, context={'request': request})
            data = serializer.data
            cache.set(cache_key, data, getattr(settings, 'CACHE_BOOKS_TTL', 300))
        return Response(data)
    
    @action(detail=False, methods=['get'], url_path='by-format/(?P<format_type>[^/.]+)')
    def by_format(self, request, format_type=None):
        """
        Endpoint personnalisé: /api/books/by-format/EBOOK/ ou /PAPIER/
        Retourne les livres filtrés par format
        """
        if format_type not in ['EBOOK', 'PAPIER']:
            return Response(
                {'error': 'Format invalide. Utilisez EBOOK ou PAPIER'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        books = self.get_queryset().filter(format=format_type, available=True)
        page = self.paginate_queryset(books)
        
        if page is not None:
            serializer = BookListSerializer(page, many=True, context={'request': request})
            return self.get_paginated_response(serializer.data)
        
        serializer = BookListSerializer(books, many=True, context={'request': request})
        return Response(serializer.data)
    
    @action(detail=True, methods=['get'], url_path='reviews/me')
    def my_review(self, request, pk=None):
        """
        GET /api/books/{id}/reviews/me/
        Retourne l'avis principal de l'utilisateur connecté (ou 404).
        """
        book = self.get_object()
        if not request.user.is_authenticated:
            return Response(status=status.HTTP_404_NOT_FOUND)
        try:
            review = BookReview.objects.get(
                book=book, user=request.user, parent__isnull=True
            )
        except BookReview.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)
        serializer = BookReviewSerializer(review, context={'request': request})
        return Response(serializer.data)

    @action(detail=True, methods=['get', 'post', 'delete'], url_path='reviews')
    def reviews(self, request, pk=None):
        """
        GET /api/books/{id}/reviews/ - Liste les avis du livre
        POST /api/books/{id}/reviews/ - Créer ou modifier son avis (authentifié)
        DELETE /api/books/{id}/reviews/ - Supprimer son avis (authentifié)
        """
        book = self.get_object()

        if request.method == 'GET':
            reviews_qs = (
                BookReview.objects.filter(book=book, parent__isnull=True)
                .select_related('user')
                .prefetch_related('replies__user', 'likes')
                .annotate(_likes_count=Count('likes'))
                .order_by('-created_at')
            )
            # Annoter user_has_liked pour l'utilisateur connecté
            if request.user.is_authenticated:
                user_liked = ReviewLike.objects.filter(review=OuterRef('pk'), user=request.user)
                reviews_qs = reviews_qs.annotate(_user_has_liked=Exists(user_liked))
            # Pagination
            paginator = ReviewResultsSetPagination()
            page = paginator.paginate_queryset(reviews_qs, request)
            if page is not None:
                serializer = BookReviewSerializer(
                    page, many=True, context={'request': request}
                )
                return paginator.get_paginated_response(serializer.data)
            serializer = BookReviewSerializer(
                reviews_qs, many=True, context={'request': request}
            )
            return Response(serializer.data)

        if not request.user.is_authenticated:
            return Response(
                {'detail': 'Authentification requise.'},
                status=status.HTTP_401_UNAUTHORIZED
            )

        if request.method == 'DELETE':
            deleted, _ = BookReview.objects.filter(
                user=request.user, book=book, parent__isnull=True
            ).delete()
            if deleted:
                return Response(status=status.HTTP_204_NO_CONTENT)
            return Response(
                {'detail': "Vous n'avez pas d'avis sur ce livre."},
                status=status.HTTP_404_NOT_FOUND
            )

        # POST : créer ou mettre à jour son avis principal
        review, created = BookReview.objects.get_or_create(
            user=request.user,
            book=book,
            parent=None,
            defaults={'rating': 1, 'comment': ''}
        )
        serializer = BookReviewCreateSerializer(review, data=request.data, partial=not created)
        serializer.is_valid(raise_exception=True)
        serializer.save()

        response_serializer = BookReviewSerializer(
            review, context={'request': request}
        )
        return Response(
            response_serializer.data,
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK
        )

    @action(detail=True, methods=['post'], url_path='reviews/(?P<review_id>[^/.]+)/reply')
    def reply_to_review(self, request, pk=None, review_id=None):
        """
        POST /api/books/{id}/reviews/{review_id}/reply/
        Répondre à un avis (authentifié).
        """
        book = self.get_object()
        try:
            parent_review = BookReview.objects.get(
                id=review_id, book=book, parent__isnull=True
            )
        except BookReview.DoesNotExist:
            return Response(
                {'detail': 'Avis introuvable.'},
                status=status.HTTP_404_NOT_FOUND
            )

        if not request.user.is_authenticated:
            return Response(
                {'detail': 'Authentification requise.'},
                status=status.HTTP_401_UNAUTHORIZED
            )

        serializer = BookReviewReplySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        reply = BookReview.objects.create(
            user=request.user,
            book=book,
            parent=parent_review,
            comment=serializer.validated_data['comment']
        )
        response_serializer = BookReviewSerializer(
            reply, context={'request': request}
        )
        return Response(response_serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['delete'], url_path='reviews/(?P<review_id>[^/.]+)/delete')
    def delete_review_by_id(self, request, pk=None, review_id=None):
        """
        DELETE /api/books/{id}/reviews/{review_id}/delete/
        Supprimer un avis ou une réponse (uniquement les siens).
        """
        book = self.get_object()
        try:
            review = BookReview.objects.get(id=review_id, book=book)
        except BookReview.DoesNotExist:
            return Response(
                {'detail': 'Avis introuvable.'},
                status=status.HTTP_404_NOT_FOUND
            )

        if not request.user.is_authenticated:
            return Response(
                {'detail': 'Authentification requise.'},
                status=status.HTTP_401_UNAUTHORIZED
            )

        if review.user_id != request.user.id:
            return Response(
                {'detail': "Vous ne pouvez supprimer que vos propres avis."},
                status=status.HTTP_403_FORBIDDEN
            )

        review.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=['post', 'delete'], url_path='reviews/(?P<review_id>[^/.]+)/like')
    def like_review(self, request, pk=None, review_id=None):
        """
        POST /api/books/{id}/reviews/{review_id}/like/ - Liker un avis
        DELETE /api/books/{id}/reviews/{review_id}/like/ - Retirer son like
        """
        book = self.get_object()
        try:
            review = BookReview.objects.get(id=review_id, book=book)
        except BookReview.DoesNotExist:
            return Response(
                {'detail': 'Avis introuvable.'},
                status=status.HTTP_404_NOT_FOUND
            )

        if not request.user.is_authenticated:
            return Response(
                {'detail': 'Authentification requise.'},
                status=status.HTTP_401_UNAUTHORIZED
            )

        if request.method == 'POST':
            _, created = ReviewLike.objects.get_or_create(
                user=request.user, review=review
            )
            return Response(
                {'liked': True, 'likes_count': review.likes.count()},
                status=status.HTTP_201_CREATED if created else status.HTTP_200_OK
            )
        else:
            deleted, _ = ReviewLike.objects.filter(
                user=request.user, review=review
            ).delete()
            return Response(
                {'liked': False, 'likes_count': review.likes.count()},
                status=status.HTTP_200_OK
            )

    @action(detail=True, methods=['get'], url_path='related')
    def related_books(self, request, pk=None):
        """
        Endpoint personnalisé: /api/books/{id}/related/
        Retourne des livres similaires (même catégorie ou même auteur)
        """
        book = self.get_object()
        
        # Livres de la même catégorie ou du même auteur, excluant le livre actuel
        related = self.get_queryset().filter(
            Q(category=book.category) | Q(author=book.author),
            available=True
        ).exclude(id=book.id).distinct()[:6]
        
        serializer = BookListSerializer(related, many=True, context={'request': request})
        return Response(serializer.data)

    @action(detail=True, methods=['get'], url_path='listings')
    def listings(self, request, pk=None):
        """
        GET /api/books/{id}/listings/
        Retourne toutes les offres vendeurs actives pour ce livre, triées par prix.
        """
        book = self.get_object()
        from apps.marketplace.models import BookListing
        from apps.marketplace.serializers import BookListingSerializer
        listings = BookListing.objects.filter(
            book=book, is_active=True,
        ).select_related('vendor').order_by('price')
        serializer = BookListingSerializer(listings, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'], url_path='statistics')
    def statistics(self, request):
        """
        Endpoint personnalisé: /api/books/statistics/
        Retourne des statistiques sur le catalogue
        """
        try:
            # Calcul des statistiques
            total_books = Book.objects.count()
            available_books = Book.objects.filter(available=True).count()
            
            # Prix moyen
            avg_price = Book.objects.aggregate(Avg('price'))['price__avg']
            average_price = round(float(avg_price), 2) if avg_price else 0.0
            
            # Note moyenne
            avg_rating = Book.objects.filter(rating__gt=0).aggregate(Avg('rating'))['rating__avg']
            average_rating = round(float(avg_rating), 2) if avg_rating else 0.0
            
            # Livres avec remise (original_price existe et est supérieur au prix actuel)
            books_with_discount = Book.objects.filter(
                original_price__isnull=False
            ).filter(
                original_price__gt=F('price')
            ).count()
            
            stats = {
                'total_books': total_books,
                'total_authors': Author.objects.count(),
                'total_categories': Category.objects.count(),
                'available_books': available_books,
                'ebooks_count': Book.objects.filter(format='EBOOK').count(),
                'paper_books_count': Book.objects.filter(format='PAPIER').count(),
                'average_price': average_price,
                'bestsellers_count': Book.objects.filter(is_bestseller=True).count(),
                'average_rating': average_rating,
                'books_with_discount': books_with_discount
            }
            
            serializer = BookStatisticsSerializer(stats)
            return Response(serializer.data)
            
        except Exception as e:
            # En cas d'erreur, retourner des statistiques par défaut
            return Response({
                'total_books': 0,
                'total_authors': 0,
                'total_categories': 0,
                'available_books': 0,
                'ebooks_count': 0,
                'paper_books_count': 0,
                'average_price': 0.0,
                'bestsellers_count': 0,
                'average_rating': 0.0,
                'books_with_discount': 0
            })


    @action(detail=False, methods=['get'], url_path='autocomplete',
            permission_classes=[AllowAny])
    def autocomplete(self, request):
        """
        GET /api/books/autocomplete/?q=term
        Endpoint léger pour l'autocomplete de la barre de recherche.
        Retourne max 5 livres + 3 auteurs correspondants.
        """
        q = request.query_params.get('q', '').strip()
        if len(q) < 2:
            return Response({'books': [], 'authors': []})

        cache_key = f'autocomplete_{q.lower()[:30]}'
        cached = cache.get(cache_key)
        if cached is not None:
            return Response(cached)

        # Livres : recherche sur titre et auteur
        books_qs = (
            Book.objects
            .filter(
                Q(title__icontains=q) | Q(author__full_name__icontains=q),
                available=True
            )
            .select_related('author')
            .only('id', 'title', 'cover_image', 'price', 'author__id', 'author__full_name')
            [:5]
        )
        books_data = [
            {
                'id': b.id,
                'title': b.title,
                'cover_image': request.build_absolute_uri(b.cover_image.url) if b.cover_image else None,
                'price': str(b.price) if b.price else None,
                'author': b.author.full_name if b.author else None,
            }
            for b in books_qs
        ]

        # Auteurs : recherche sur le nom
        authors_qs = (
            Author.objects
            .filter(full_name__icontains=q)
            .annotate(nb_books=Count('books'))
            .only('id', 'full_name', 'photo')
            [:3]
        )
        authors_data = [
            {
                'id': a.id,
                'full_name': a.full_name,
                'photo': request.build_absolute_uri(a.photo.url) if a.photo else None,
                'books_count': a.nb_books,
            }
            for a in authors_qs
        ]

        result = {'books': books_data, 'authors': authors_data}
        cache.set(cache_key, result, 60)  # cache 1 min
        return Response(result)


class AuthorViewSet(viewsets.ModelViewSet):
    """
    ViewSet pour la gestion des auteurs

    Liste des actions:
    - list: GET /api/authors/ - Liste tous les auteurs
    - retrieve: GET /api/authors/{id}/ - Détail d'un auteur avec ses livres
    - create: POST /api/authors/ - Créer un auteur (admin)
    - update: PUT/PATCH /api/authors/{id}/ - Modifier (admin)
    - destroy: DELETE /api/authors/{id}/ - Supprimer (admin)
    """
    
    # Évite N+1 sur author.user (accédé par is_registered property)
    queryset = Author.objects.select_related('user').prefetch_related('books').all()
    permission_classes = [IsAuthenticatedOrReadOnly]
    pagination_class = StandardResultsSetPagination
    
    filter_backends = [
        filters.SearchFilter,
        filters.OrderingFilter
    ]
    
    search_fields = ['full_name', 'biography']
    ordering_fields = ['full_name', 'created_at']
    ordering = ['full_name']
    
    def get_serializer_class(self):
        """
        Liste: Version simple
        Détail: Version avec liste des livres
        """
        if self.action == 'retrieve':
            return AuthorDetailSerializer
        return AuthorSerializer
    
    def get_queryset(self):
        """
        Optimisation: précharger les livres et annoter pour éviter les N+1 queries.
        """
        queryset = super().get_queryset()

        if self.action == 'list':
            queryset = queryset.annotate(
                num_books=Count('books', filter=Q(books__available=True)),
                avg_rating=Avg('books__rating', filter=Q(books__rating__gt=0)),
            )

        if self.action == 'retrieve':
            queryset = queryset.prefetch_related(
                'books__category',
                'books__author'
            )

        return queryset

    @action(detail=False, methods=['get'], url_path='featured')
    def featured(self, request):
        """
        GET /api/authors/featured/?limit=16
        Auteurs mis en avant : au moins 1 livre, triés par ventes + note moyenne.
        Retourne plus que nécessaire pour permettre un mélange côté frontend.
        """
        limit = min(int(request.query_params.get('limit', 16)), 50)
        authors = (
            Author.objects
            .prefetch_related('books')
            .annotate(
                num_books=Count('books', filter=Q(books__available=True)),
                avg_rating=Avg('books__rating', filter=Q(books__rating__gt=0)),
                sales=Sum('books__total_sales'),
            )
            .filter(num_books__gt=0)
            .order_by('-sales', '-avg_rating', '-num_books')
            [:limit]
        )
        serializer = AuthorSerializer(authors, many=True, context={'request': request})
        return Response(serializer.data)

    @action(detail=False, methods=['get'], url_path='with-books')
    def authors_with_books(self, request):
        """
        Endpoint personnalisé: /api/authors/with-books/
        Retourne uniquement les auteurs qui ont au moins un livre publié
        """
        authors = self.get_queryset().annotate(
            num_books=Count('books')
        ).filter(num_books__gt=0).order_by('-num_books')
        
        page = self.paginate_queryset(authors)
        
        if page is not None:
            serializer = AuthorSerializer(page, many=True, context={'request': request})
            return self.get_paginated_response(serializer.data)
        
        serializer = AuthorSerializer(authors, many=True, context={'request': request})
        return Response(serializer.data)
    
    @action(detail=True, methods=['get'], url_path='books')
    def author_books(self, request, pk=None):
        """
        Endpoint personnalisé: /api/authors/{id}/books/
        Retourne tous les livres d'un auteur spécifique
        """
        author = self.get_object()
        books = author.books.filter(available=True).select_related('category', 'author')
        
        page = self.paginate_queryset(books)
        
        if page is not None:
            serializer = BookListSerializer(page, many=True, context={'request': request})
            return self.get_paginated_response(serializer.data)
        
        serializer = BookListSerializer(books, many=True, context={'request': request})
        return Response(serializer.data)


class CategoryViewSet(viewsets.ModelViewSet):
    """
    ViewSet pour la gestion des catégories
    
    Liste des actions:
    - list: GET /api/categories/ - Liste toutes les catégories
    - retrieve: GET /api/categories/{id}/ - Détail d'une catégorie avec ses livres
    - create: POST /api/categories/ - Créer une catégorie (admin)
    - update: PUT/PATCH /api/categories/{id}/ - Modifier (admin)
    - destroy: DELETE /api/categories/{id}/ - Supprimer (admin)
    """
    
    queryset = Category.objects.prefetch_related('books').all()
    permission_classes = [IsAuthenticatedOrReadOnly]
    pagination_class = StandardResultsSetPagination
    
    filter_backends = [
        filters.SearchFilter,
        filters.OrderingFilter
    ]
    
    search_fields = ['name']
    ordering_fields = ['name', 'created_at']
    ordering = ['name']
    
    def get_serializer_class(self):
        """
        Liste: Version simple
        Détail: Version avec liste des livres
        """
        if self.action == 'retrieve':
            return CategoryDetailSerializer
        return CategorySerializer
    
    def get_queryset(self):
        """
        Optimisation: précharger les livres pour le détail
        """
        queryset = super().get_queryset()
        
        if self.action == 'retrieve':
            queryset = queryset.prefetch_related(
                'books__category',
                'books__author'
            )
        
        return queryset
    
    @action(detail=False, methods=['get'], url_path='with-books')
    def categories_with_books(self, request):
        """
        Endpoint personnalisé: /api/categories/with-books/
        Retourne uniquement les catégories qui ont au moins un livre
        """
        categories = self.get_queryset().annotate(
            num_books=Count('books')
        ).filter(num_books__gt=0).order_by('-num_books')
        
        serializer = CategorySerializer(categories, many=True, context={'request': request})
        return Response(serializer.data)
    
    @action(detail=True, methods=['get'], url_path='books')
    def category_books(self, request, pk=None):
        """
        Endpoint personnalisé: /api/categories/{id}/books/
        Retourne tous les livres d'une catégorie spécifique
        """
        category = self.get_object()
        books = category.books.filter(available=True).select_related('category', 'author')
        
        page = self.paginate_queryset(books)
        
        if page is not None:
            serializer = BookListSerializer(page, many=True, context={'request': request})
            return self.get_paginated_response(serializer.data)
        
        serializer = BookListSerializer(books, many=True, context={'request': request})
        return Response(serializer.data)