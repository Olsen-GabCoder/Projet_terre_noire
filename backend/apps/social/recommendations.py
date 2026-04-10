from django.db.models import Case, When, Value, IntegerField, Sum

from apps.books.models import Book
from apps.orders.models import OrderItem
from apps.wishlist.models import WishlistItem


def get_recommendations(user, limit=12):
    """
    Recommande des livres en fonction des achats et de la liste d'envie
    de l'utilisateur.

    Scoring :
      +3 pour chaque catégorie en commun avec les livres achetés / wishlist
      +3 pour chaque auteur en commun

    Exclut les livres déjà achetés.
    Fallback : best-sellers (livres les plus commandés) si aucune donnée.
    """

    # Livres achetés (commandes payées)
    purchased_book_ids = list(
        OrderItem.objects.filter(
            order__user=user,
            order__status='PAID',
        ).values_list('book_id', flat=True)
    )

    # Livres de la wishlist
    wishlist_book_ids = list(
        WishlistItem.objects.filter(user=user).values_list('book_id', flat=True)
    )

    source_book_ids = set(purchased_book_ids + wishlist_book_ids)

    if not source_book_ids:
        # Fallback : livres les plus commandés
        bestseller_ids = (
            OrderItem.objects
            .values_list('book_id', flat=True)
            .order_by()  # supprime l'ordering par défaut
        )
        # Comptage manuel via annotation
        from django.db.models import Count
        bestsellers = (
            OrderItem.objects
            .values('book_id')
            .annotate(total=Count('id'))
            .order_by('-total')[:limit]
        )
        bestseller_book_ids = [b['book_id'] for b in bestsellers]
        if bestseller_book_ids:
            return Book.objects.filter(id__in=bestseller_book_ids)[:limit]
        # Dernier recours : livres récents
        return Book.objects.order_by('-created_at')[:limit]

    # Catégories et auteurs des livres sources
    source_books = Book.objects.filter(id__in=source_book_ids)
    category_ids = set(source_books.values_list('category_id', flat=True))
    author_ids = set(source_books.values_list('author_id', flat=True))

    # Exclure les livres déjà achetés
    exclude_ids = set(purchased_book_ids)

    # Construire les conditions de scoring
    whens = []
    if category_ids:
        whens.append(
            When(category_id__in=category_ids, then=Value(3))
        )
    if author_ids:
        whens.append(
            When(author_id__in=author_ids, then=Value(3))
        )

    if not whens:
        return Book.objects.order_by('-created_at')[:limit]

    recommendations = (
        Book.objects
        .exclude(id__in=exclude_ids)
        .annotate(
            score=Sum(
                Case(
                    *whens,
                    default=Value(0),
                    output_field=IntegerField(),
                )
            )
        )
        .filter(score__gt=0)
        .order_by('-score', '-created_at')[:limit]
    )

    return recommendations
