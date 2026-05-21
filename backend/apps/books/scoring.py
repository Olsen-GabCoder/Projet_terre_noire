"""
Moteur de scoring intelligent pour les livres.

Calcule popularity_score et trending_score en SQL pur (annotations Django)
pour eviter les boucles Python. Fournit aussi les recommandations personnalisees.
"""

import logging
from datetime import timedelta
from django.utils import timezone
from django.db.models import (
    Count, Q, F, Value, FloatField, Case, When, Subquery, OuterRef,
)
from django.db.models.functions import Coalesce, Greatest, Least

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Constantes de ponderation
# ---------------------------------------------------------------------------
W_SALES_TOTAL = 0.30
W_SALES_RECENT = 0.25
W_QUALITY = 0.20
W_WISHLIST = 0.15
W_ADMIN_BOOST = 0.10

RECENT_DAYS = 30
TRENDING_DAYS = 7


# ---------------------------------------------------------------------------
# Popularity score
# ---------------------------------------------------------------------------
def compute_popularity_scores():
    """
    Recalcule popularity_score pour TOUS les livres en une seule requete.
    Appeler apres un achat, un avis, ou via la commande update_scores.
    """
    from .models import Book
    from apps.orders.models import OrderItem
    from apps.wishlist.models import WishlistItem

    now = timezone.now()
    since_recent = now - timedelta(days=RECENT_DAYS)

    # --- Maximums pour normalisation (evite division par zero) ---
    max_sales = _max_or_one(
        OrderItem.objects.filter(order__status='PAID')
        .values('book').annotate(c=Count('id')).order_by('-c')
        .values_list('c', flat=True)[:1]
    )
    max_recent = _max_or_one(
        OrderItem.objects.filter(order__status='PAID', order__created_at__gte=since_recent)
        .values('book').annotate(c=Count('id')).order_by('-c')
        .values_list('c', flat=True)[:1]
    )
    max_wishlist = _max_or_one(
        WishlistItem.objects.values('book').annotate(c=Count('id')).order_by('-c')
        .values_list('c', flat=True)[:1]
    )

    books = Book.objects.all()
    updated = 0

    for book in books.iterator():
        # Ventes totales
        total_sales = OrderItem.objects.filter(
            book=book, order__status='PAID'
        ).aggregate(c=Count('id'))['c'] or 0

        # Ventes recentes (30 jours)
        recent_sales = OrderItem.objects.filter(
            book=book, order__status='PAID',
            order__created_at__gte=since_recent,
        ).aggregate(c=Count('id'))['c'] or 0

        # Qualite : (rating/5) * min(rating_count/10, 1)
        rating_norm = float(book.rating or 0) / 5.0
        confidence = min((book.rating_count or 0) / 10.0, 1.0)
        quality = rating_norm * confidence

        # Wishlist
        wishlist_count = WishlistItem.objects.filter(book=book).count()

        # Admin boost
        admin_boost = 1.0 if book.is_bestseller else 0.0

        # Score final (0-100)
        score = (
            (total_sales / max_sales) * W_SALES_TOTAL * 100
            + (recent_sales / max_recent) * W_SALES_RECENT * 100
            + quality * W_QUALITY * 100
            + (wishlist_count / max_wishlist) * W_WISHLIST * 100
            + admin_boost * W_ADMIN_BOOST * 100
        )

        if abs(book.popularity_score - score) > 0.01:
            book.popularity_score = round(score, 2)
            book.save(update_fields=['popularity_score'])
            updated += 1

    logger.info("Popularity scores: %d livres mis a jour", updated)
    return updated


# ---------------------------------------------------------------------------
# Trending score (velocite)
# ---------------------------------------------------------------------------
def compute_trending_scores():
    """
    Recalcule trending_score pour TOUS les livres.
    Formule : (ventes 7j / max(ventes 7j precedents, 1)) * facteur_nouveaute
    """
    from .models import Book
    from apps.orders.models import OrderItem

    now = timezone.now()
    since_7d = now - timedelta(days=TRENDING_DAYS)
    since_14d = now - timedelta(days=TRENDING_DAYS * 2)

    books = Book.objects.filter(available=True)
    updated = 0

    for book in books.iterator():
        sales_7d = OrderItem.objects.filter(
            book=book, order__status='PAID',
            order__created_at__gte=since_7d,
        ).aggregate(c=Count('id'))['c'] or 0

        sales_prev_7d = OrderItem.objects.filter(
            book=book, order__status='PAID',
            order__created_at__gte=since_14d,
            order__created_at__lt=since_7d,
        ).aggregate(c=Count('id'))['c'] or 0

        # Velocite
        velocity = sales_7d / max(sales_prev_7d, 1)

        # Facteur nouveaute : boost si publie < 14 jours
        pub_date = book.published_date or (book.created_at.date() if book.created_at else None)
        if pub_date and (now.date() - pub_date).days < 14:
            velocity *= 1.3

        # Bonus absolu : un livre avec 0→5 ventes est plus trending que 0→0
        trending = velocity * (1 + sales_7d * 0.5)

        trending = round(trending, 2)
        if abs(book.trending_score - trending) > 0.01:
            book.trending_score = trending
            book.save(update_fields=['trending_score'])
            updated += 1

    logger.info("Trending scores: %d livres mis a jour", updated)
    return updated


# ---------------------------------------------------------------------------
# Recommandations personnalisees
# ---------------------------------------------------------------------------
def get_personalized_recommendations(user, limit=8):
    """
    Algorithme hybride collaboratif + contenu.
    Retourne un QuerySet de Book tries par pertinence.
    """
    from .models import Book
    from apps.orders.models import OrderItem, Order

    # 1. Livres achetes par l'utilisateur
    purchased_ids = set(
        OrderItem.objects.filter(
            order__user=user, order__status='PAID'
        ).values_list('book_id', flat=True)
    )

    if not purchased_ids:
        # Pas d'historique : retourner trending + qualite
        return _anonymous_recommendations(limit)

    # 2. Categories et auteurs preferes
    purchased_books = Book.objects.filter(id__in=purchased_ids)
    fav_categories = set(purchased_books.values_list('category_id', flat=True))
    fav_authors = set(purchased_books.values_list('author_id', flat=True))

    # 3. Utilisateurs similaires : ont achete >= 2 livres en commun
    similar_users = (
        OrderItem.objects.filter(
            order__status='PAID',
            book_id__in=purchased_ids,
        )
        .exclude(order__user=user)
        .values('order__user')
        .annotate(common=Count('book_id', distinct=True))
        .filter(common__gte=2)
        .values_list('order__user_id', flat=True)
    )
    similar_user_ids = set(similar_users[:50])  # Cap a 50 pour perf

    # 4. Livres achetes par les users similaires (excluant les notres)
    co_purchase_counts = {}
    if similar_user_ids:
        co_items = (
            OrderItem.objects.filter(
                order__user_id__in=similar_user_ids,
                order__status='PAID',
            )
            .exclude(book_id__in=purchased_ids)
            .values('book_id')
            .annotate(freq=Count('order__user_id', distinct=True))
            .order_by('-freq')[:100]
        )
        co_purchase_counts = {item['book_id']: item['freq'] for item in co_items}

    # 5. Candidats : tous les livres non achetes, disponibles
    candidates = (
        Book.objects.filter(available=True)
        .exclude(id__in=purchased_ids)
        .select_related('category', 'author')
    )

    # 6. Scoring
    max_co = max(co_purchase_counts.values(), default=1)
    scored = []
    for book in candidates.iterator():
        co_score = co_purchase_counts.get(book.id, 0) / max_co
        cat_match = 1.0 if book.category_id in fav_categories else 0.0
        author_match = 1.0 if book.author_id in fav_authors else 0.0
        pop_norm = book.popularity_score / 100.0 if book.popularity_score else 0.0

        total = (
            co_score * 0.40
            + cat_match * 0.20
            + author_match * 0.15
            + pop_norm * 0.25
        )
        scored.append((book.id, total))

    # 7. Tri et diversification par categorie
    scored.sort(key=lambda x: x[1], reverse=True)
    result_ids = _diversify([s[0] for s in scored[:40]], candidates, limit)

    # Retourner les livres dans l'ordre du score
    id_order = {bid: i for i, bid in enumerate(result_ids)}
    books = list(Book.objects.filter(id__in=result_ids).select_related('category', 'author'))
    books.sort(key=lambda b: id_order.get(b.id, 999))
    return books


def _anonymous_recommendations(limit=8):
    """Recommandations pour utilisateur non connecte : trending + qualite + diversite."""
    from .models import Book

    candidates = (
        Book.objects.filter(available=True, rating_count__gte=1)
        .select_related('category', 'author')
        .order_by('-trending_score', '-popularity_score')[:40]
    )
    result_ids = _diversify(
        [b.id for b in candidates], candidates, limit
    )
    id_order = {bid: i for i, bid in enumerate(result_ids)}
    books = list(Book.objects.filter(id__in=result_ids).select_related('category', 'author'))
    books.sort(key=lambda b: id_order.get(b.id, 999))
    return books


def _diversify(sorted_ids, candidates_qs, limit):
    """
    Garantit au moins 1 livre par categorie dans les resultats.
    Prend les top ids mais redistribue si une categorie est sous-representee.
    """
    if not sorted_ids:
        return []

    from .models import Book
    books_map = {b.id: b for b in candidates_qs.filter(id__in=sorted_ids[:40])}

    seen_categories = set()
    result = []
    deferred = []

    for bid in sorted_ids:
        if bid not in books_map:
            continue
        book = books_map[bid]
        if book.category_id not in seen_categories:
            seen_categories.add(book.category_id)
            result.append(bid)
        else:
            deferred.append(bid)
        if len(result) >= limit:
            break

    # Completer avec les deferred si pas assez
    for bid in deferred:
        if len(result) >= limit:
            break
        result.append(bid)

    return result[:limit]


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def _max_or_one(qs):
    """Retourne le premier element d'un queryset ou 1 (evite div par zero)."""
    try:
        val = list(qs)
        return val[0] if val and val[0] else 1
    except (IndexError, TypeError):
        return 1
