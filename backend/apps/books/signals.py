"""
Signaux pour mettre à jour la note moyenne, le nombre d'avis,
et le statut best-seller d'un livre.
"""
from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from django.db.models import Avg, Count, Sum
from django.core.cache import cache

from .models import BookReview

BESTSELLER_MIN_SALES = 500  # Seuil minimum pour être best-seller


def _update_book_rating(book):
    """Recalcule rating et rating_count pour un livre (avis principaux uniquement)."""
    result = BookReview.objects.filter(book=book, parent__isnull=True).aggregate(
        avg=Avg('rating'),
        count=Count('id')
    )
    book.rating = result['avg'] or 0
    book.rating_count = result['count'] or 0
    book.save(update_fields=['rating', 'rating_count'])
    for key in ('books_featured', 'books_bestsellers', 'books_new_releases'):
        cache.delete(key)


@receiver([post_save, post_delete], sender=BookReview)
def update_book_rating_on_review(sender, instance, **kwargs):
    _update_book_rating(instance.book)


def update_sales_on_payment(order):
    """
    Appelé quand une commande est payée.
    Met à jour total_sales et is_bestseller pour chaque livre de la commande.
    """
    from apps.orders.models import OrderItem

    items = OrderItem.objects.filter(order=order).select_related('book')
    for item in items:
        book = item.book
        # Recalculer total_sales depuis toutes les commandes payées
        total = OrderItem.objects.filter(
            book=book,
            order__status='PAID',
        ).aggregate(total=Sum('quantity'))['total'] or 0
        book.total_sales = total
        book.is_bestseller = total >= BESTSELLER_MIN_SALES
        book.save(update_fields=['total_sales', 'is_bestseller'])
