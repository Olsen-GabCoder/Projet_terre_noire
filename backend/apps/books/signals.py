"""
Signaux pour mettre a jour les notes et les scores de popularite/tendance.
"""
import logging
from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from django.db.models import Avg, Count
from django.core.cache import cache

from .models import BookReview

logger = logging.getLogger(__name__)

# Cles de cache a invalider quand les donnees livres changent
_CACHE_KEYS = (
    'books_featured', 'books_bestsellers', 'books_new_releases',
    'books_trending', 'books_recommended',
)


def _invalidate_book_caches():
    """Invalide tous les caches lies aux listes de livres."""
    for key in _CACHE_KEYS:
        cache.delete(key)


def _update_book_rating(book):
    """Recalcule rating et rating_count pour un livre (avis principaux uniquement)."""
    result = BookReview.objects.filter(book=book, parent__isnull=True).aggregate(
        avg=Avg('rating'),
        count=Count('id')
    )
    book.rating = result['avg'] or 0
    book.rating_count = result['count'] or 0
    book.save(update_fields=['rating', 'rating_count'])
    _invalidate_book_caches()


def _refresh_scores_for_book(book):
    """Recalcule les scores pour un seul livre (appel leger post-signal)."""
    try:
        from .scoring import compute_popularity_scores, compute_trending_scores
        # Recalcul global (rapide si peu de livres, ~quelques ms)
        compute_popularity_scores()
        compute_trending_scores()
    except Exception as e:
        logger.warning("Erreur recalcul scores: %s", e)


@receiver([post_save, post_delete], sender=BookReview)
def update_book_rating_on_review(sender, instance, **kwargs):
    _update_book_rating(instance.book)
    _refresh_scores_for_book(instance.book)


# Signal sur Order : quand une commande passe a PAID, recalculer les scores
def _on_order_status_change(sender, instance, **kwargs):
    """Recalcule les scores quand une commande est payee."""
    if instance.status == 'PAID':
        _invalidate_book_caches()
        try:
            from .scoring import compute_popularity_scores, compute_trending_scores
            compute_popularity_scores()
            compute_trending_scores()
        except Exception as e:
            logger.warning("Erreur recalcul scores apres paiement: %s", e)


def connect_order_signals():
    """Connecte le signal Order post_save (appele depuis apps.py ready())."""
    from apps.orders.models import Order
    post_save.connect(_on_order_status_change, sender=Order)
