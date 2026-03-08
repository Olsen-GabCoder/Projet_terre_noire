"""
Signaux pour mettre à jour la note moyenne et le nombre d'avis d'un livre.
"""
from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from django.db.models import Avg, Count
from django.core.cache import cache

from .models import BookReview


def _update_book_rating(book):
    """Recalcule rating et rating_count pour un livre (avis principaux uniquement)."""
    result = BookReview.objects.filter(book=book, parent__isnull=True).aggregate(
        avg=Avg('rating'),
        count=Count('id')
    )
    book.rating = result['avg'] or 0
    book.rating_count = result['count'] or 0
    book.save(update_fields=['rating', 'rating_count'])
    # Invalider le cache des listes de livres
    for key in ('books_featured', 'books_bestsellers', 'books_new_releases'):
        cache.delete(key)


@receiver([post_save, post_delete], sender=BookReview)
def update_book_rating_on_review(sender, instance, **kwargs):
    _update_book_rating(instance.book)
