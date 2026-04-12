"""
Espace Auteur — Vues pour le dashboard auteur.
Endpoints /api/authors/me/...
"""

from django.db.models import Sum, Avg, Count, Q, F
from django.shortcuts import get_object_or_404
from rest_framework import permissions, status
from rest_framework.pagination import PageNumberPagination
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Author, Book, BookReview
from .serializers import (
    AuthorSerializer,
    BookListSerializer,
    BookCreateUpdateSerializer,
    BookReviewSerializer,
)


class IsAuthor(permissions.BasePermission):
    """L'utilisateur doit avoir un profil Author lié."""
    message = "Vous devez être enregistré en tant qu'auteur pour accéder à cet espace."

    def has_permission(self, request, view):
        return (
            request.user
            and request.user.is_authenticated
            and Author.objects.filter(user=request.user).exists()
        )


class SmallPagination(PageNumberPagination):
    page_size = 10
    page_size_query_param = 'page_size'
    max_page_size = 50


def _get_author_for_user(user):
    """Retourne l'Author lié à l'utilisateur, ou 404."""
    return get_object_or_404(Author, user=user)


# ══════════════════════════════════════════════
# 1. Dashboard — Stats agrégées
# ══════════════════════════════════════════════

class AuthorDashboardView(APIView):
    """GET /api/authors/me/dashboard/"""
    permission_classes = [permissions.IsAuthenticated, IsAuthor]

    def get(self, request):
        author = _get_author_for_user(request.user)
        books = Book.objects.filter(author=author)

        # Stats livres
        book_stats = books.aggregate(
            total=Count('id'),
            available=Count('id', filter=Q(available=True)),
            total_sales=Sum('total_sales'),
            avg_rating=Avg('rating', filter=Q(rating__gt=0)),
            total_reviews=Sum('rating_count'),
        )

        # Revenus depuis les commandes payées
        from apps.orders.models import OrderItem
        revenue = OrderItem.objects.filter(
            book__author=author,
            order__status__in=['PAID', 'SHIPPED', 'DELIVERED'],
        ).aggregate(
            total=Sum(F('price') * F('quantity')),
            orders=Count('order', distinct=True),
        )

        # Manuscrits soumis par cet utilisateur
        from apps.manuscripts.models import Manuscript
        ms_qs = Manuscript.objects.filter(submitter=request.user)

        return Response({
            'author': AuthorSerializer(author, context={'request': request}).data,
            'book_count': book_stats['total'] or 0,
            'books_available': book_stats['available'] or 0,
            'total_sales': book_stats['total_sales'] or 0,
            'avg_rating': round(book_stats['avg_rating'] or 0, 2),
            'total_reviews': book_stats['total_reviews'] or 0,
            'total_revenue': float(revenue['total'] or 0),
            'total_orders': revenue['orders'] or 0,
            'manuscripts_total': ms_qs.count(),
            'manuscripts_pending': ms_qs.filter(status='PENDING').count(),
        })


# ══════════════════════════════════════════════
# 2. Mes livres — CRUD
# ══════════════════════════════════════════════

class AuthorBookListCreateView(APIView):
    """
    GET  /api/authors/me/books/  — Liste tous les livres de l'auteur
    POST /api/authors/me/books/  — Auto-publication d'un livre
    """
    permission_classes = [permissions.IsAuthenticated, IsAuthor]
    parser_classes = [MultiPartParser, FormParser]

    def get(self, request):
        author = _get_author_for_user(request.user)
        books = (
            Book.objects.filter(author=author)
            .select_related('category', 'publisher_organization')
            .order_by('-created_at')
        )
        serializer = BookListSerializer(books, many=True, context={'request': request})
        return Response(serializer.data)

    def post(self, request):
        author = _get_author_for_user(request.user)
        serializer = BookCreateUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        book = serializer.save(author=author)
        return Response({
            'message': f'Livre « {book.title} » publié avec succès.',
            'book_id': book.id,
            'slug': book.slug,
        }, status=status.HTTP_201_CREATED)


class AuthorBookDetailView(APIView):
    """
    GET/PATCH/DELETE /api/authors/me/books/{book_id}/
    Seuls les livres auto-publiés (publisher_organization=null) sont modifiables.
    """
    permission_classes = [permissions.IsAuthenticated, IsAuthor]
    parser_classes = [MultiPartParser, FormParser]

    def _get_book(self, request, book_id):
        author = _get_author_for_user(request.user)
        return get_object_or_404(Book, pk=book_id, author=author)

    def get(self, request, book_id):
        book = self._get_book(request, book_id)
        from .serializers import BookDetailSerializer
        return Response(BookDetailSerializer(book, context={'request': request}).data)

    def patch(self, request, book_id):
        book = self._get_book(request, book_id)
        if book.publisher_organization_id:
            return Response(
                {'error': 'Ce livre est géré par une maison d\'édition. Modifiez-le depuis le dashboard de l\'organisation.'},
                status=status.HTTP_403_FORBIDDEN,
            )
        serializer = BookCreateUpdateSerializer(book, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response({'message': f'Livre « {book.title} » mis à jour.', 'book_id': book.id})

    def delete(self, request, book_id):
        book = self._get_book(request, book_id)
        if book.publisher_organization_id:
            return Response(
                {'error': 'Ce livre est géré par une maison d\'édition.'},
                status=status.HTTP_403_FORBIDDEN,
            )
        title = book.title
        book.available = False
        book.save(update_fields=['available'])
        return Response({'message': f'Livre « {title} » retiré du catalogue.'})


# ══════════════════════════════════════════════
# 3. Ventes — Revenus et commandes
# ══════════════════════════════════════════════

class AuthorSalesView(APIView):
    """GET /api/authors/me/sales/"""
    permission_classes = [permissions.IsAuthenticated, IsAuthor]

    def get(self, request):
        author = _get_author_for_user(request.user)
        from apps.orders.models import OrderItem

        paid_statuses = ['PAID', 'SHIPPED', 'DELIVERED']
        items = OrderItem.objects.filter(
            book__author=author,
            order__status__in=paid_statuses,
        ).select_related('book', 'order')

        # Par livre
        per_book = (
            items.values('book__id', 'book__title', 'book__cover_image', 'book__price')
            .annotate(
                units_sold=Sum('quantity'),
                revenue=Sum(F('price') * F('quantity')),
            )
            .order_by('-revenue')
        )

        # Totaux
        totals = items.aggregate(
            total_revenue=Sum(F('price') * F('quantity')),
            total_units=Sum('quantity'),
            total_orders=Count('order', distinct=True),
        )

        # Commandes récentes
        recent = (
            items.order_by('-order__created_at')[:20]
            .values(
                'order__id', 'order__created_at', 'order__status',
                'book__title', 'quantity', 'price',
            )
        )

        return Response({
            'total_revenue': float(totals['total_revenue'] or 0),
            'total_units': totals['total_units'] or 0,
            'total_orders': totals['total_orders'] or 0,
            'per_book': list(per_book),
            'recent_orders': list(recent),
        })


# ══════════════════════════════════════════════
# 4. Avis lecteurs — Tous les avis sur mes livres
# ══════════════════════════════════════════════

class AuthorReviewsView(APIView):
    """GET /api/authors/me/reviews/"""
    permission_classes = [permissions.IsAuthenticated, IsAuthor]

    def get(self, request):
        author = _get_author_for_user(request.user)
        reviews = (
            BookReview.objects.filter(book__author=author, parent__isnull=True)
            .select_related('user', 'book')
            .order_by('-created_at')
        )

        # Filtre par livre
        book_id = request.query_params.get('book')
        if book_id:
            reviews = reviews.filter(book_id=book_id)

        # Filtre par note
        rating = request.query_params.get('rating')
        if rating:
            reviews = reviews.filter(rating=int(rating))

        paginator = SmallPagination()
        page = paginator.paginate_queryset(reviews, request)
        serializer = BookReviewSerializer(page, many=True, context={'request': request})
        return paginator.get_paginated_response(serializer.data)
