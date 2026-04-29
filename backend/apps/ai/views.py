"""
Endpoints IA de Frollot.
Tous requièrent une authentification.
Chaque appel vérifie le quota utilisateur.
"""
import json
import logging
import time

from django.conf import settings
from rest_framework import status
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from rest_framework.response import Response
from rest_framework.throttling import UserRateThrottle
from rest_framework.views import APIView

from . import prompts
from .client import ask_claude, ask_claude_json, QuotaExceededError, get_quota_remaining, get_client, check_quota, increment_quota
from .models import AIGeneration
from .serializers import (
    CategorizeBookSerializer, GenerateDescriptionSerializer,
    GenerateBackCoverSerializer, SummarizeBookSerializer,
    SynthesizeReviewsSerializer, AnalyzeManuscriptSerializer,
    SemanticSearchSerializer, RecommendBooksSerializer,
    CrossSellSerializer, ModerateMessageSerializer,
    SummarizeDiscussionSerializer, DiscussionQuestionsSerializer,
    DetectSpoilerSerializer, ChatbotSerializer,
    ClassifyContactSerializer, GenerateBioSerializer,
    SuggestPriceSerializer, SummarizeMeetingSerializer,
    DetectInactiveMembersSerializer, RecommendPublishersSerializer,
    AnalyzeVendorTrendsSerializer, PredictStockSerializer,
    SuggestLibraryAcquisitionsSerializer, LibraryRecommendSerializer,
    SimilarManuscriptsSerializer, EstimateQuoteSerializer,
    RecommendClubsSerializer, PredictLateReturnSerializer,
    SmartCouponTargetingSerializer, SuggestAuthorsSerializer,
    ActivitySummarySerializer, DashboardHelpSerializer,
    PersonalizedNewsletterSerializer, WishlistAlertSerializer,
)

logger = logging.getLogger(__name__)


class AIThrottle(UserRateThrottle):
    rate = '30/min'


class BaseAIView(APIView):
    """Base pour tous les endpoints IA."""
    permission_classes = [IsAuthenticated]
    throttle_classes = [AIThrottle]

    def _log_generation(self, user, prompt_type, input_text, output_text,
                        model='', tokens_in=0, tokens_out=0, duration_ms=0,
                        content_type='', object_id=None):
        """Trace l'appel dans AIGeneration."""
        try:
            AIGeneration.objects.create(
                user=user,
                prompt_type=prompt_type,
                input_text=input_text[:2000],
                output_text=output_text[:5000],
                model_used=model or getattr(settings, 'AI_MODEL', 'claude-sonnet-4-20250514'),
                tokens_in=tokens_in,
                tokens_out=tokens_out,
                duration_ms=duration_ms,
                content_type=content_type,
                object_id=object_id,
            )
        except Exception as e:
            logger.error("Erreur log AIGeneration: %s", e)

    def _handle_error(self, e):
        if isinstance(e, QuotaExceededError):
            return Response(
                {'error': str(e), 'code': 'quota_exceeded'},
                status=status.HTTP_429_TOO_MANY_REQUESTS,
            )
        if isinstance(e, json.JSONDecodeError):
            return Response(
                {'error': 'Réponse IA invalide. Réessayez.', 'code': 'parse_error'},
                status=status.HTTP_502_BAD_GATEWAY,
            )
        logger.error("AI error: %s", e)
        return Response(
            {'error': 'Erreur du service IA. Réessayez.', 'code': 'ai_error'},
            status=status.HTTP_502_BAD_GATEWAY,
        )


# ─── Quota ────────────────────────────────────────────────────────

class QuotaView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        from .client import get_quota_remaining
        limit = getattr(settings, 'AI_DAILY_QUOTA', 50)
        remaining = get_quota_remaining(request.user.id)
        return Response({
            'remaining': remaining,
            'limit': limit,
            'used': limit - remaining,
        })


# ─── Phase 2 : Fiches livres & Éditorial ─────────────────────────

class CategorizeBookView(BaseAIView):
    """B5 — Catégorisation automatique d'un livre."""

    def post(self, request):
        ser = CategorizeBookSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        d = ser.validated_data
        user_msg = f"Titre: {d['title']}\nAuteur: {d['author']}\nDescription: {d['description']}"

        try:
            start = time.time()
            result = ask_claude_json(
                prompts.CATEGORIZE_BOOK, user_msg,
                prompt_type='categorize',
                cache_id=f"cat_{d['title'][:50]}",
                cache_ttl=86400,
                user_id=request.user.id,
                max_tokens=512,
                temperature=0.3,
            )
            self._log_generation(
                request.user, 'categorize', user_msg, json.dumps(result, ensure_ascii=False),
                duration_ms=int((time.time() - start) * 1000),
                content_type='book',
            )
            return Response(result)
        except Exception as e:
            return self._handle_error(e)


class GenerateDescriptionView(BaseAIView):
    """F1 — Génération de description catalogue."""

    def post(self, request):
        ser = GenerateDescriptionSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        d = ser.validated_data
        user_msg = (
            f"Titre: {d['title']}\nAuteur: {d['author']}\n"
            f"Genre: {d['genre']}\nContexte: {d['context']}"
        )

        try:
            start = time.time()
            result = ask_claude(
                prompts.GENERATE_DESCRIPTION, user_msg,
                prompt_type='description',
                cache_id=f"desc_{d['title'][:50]}",
                cache_ttl=3600,
                user_id=request.user.id,
                max_tokens=1024,
                temperature=0.8,
            )
            self._log_generation(
                request.user, 'description', user_msg, result,
                duration_ms=int((time.time() - start) * 1000),
                content_type='book',
            )
            return Response({'description': result})
        except Exception as e:
            return self._handle_error(e)


class GenerateBackCoverView(BaseAIView):
    """E3 — Génération de 4e de couverture."""

    def post(self, request):
        ser = GenerateBackCoverSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        d = ser.validated_data
        user_msg = (
            f"Titre: {d['title']}\nAuteur: {d['author']}\n"
            f"Description: {d['description']}\nGenre: {d['genre']}"
        )

        try:
            start = time.time()
            result = ask_claude(
                prompts.GENERATE_BACK_COVER, user_msg,
                prompt_type='back_cover',
                user_id=request.user.id,
                max_tokens=512,
                temperature=0.8,
            )
            self._log_generation(
                request.user, 'back_cover', user_msg, result,
                duration_ms=int((time.time() - start) * 1000),
                content_type='book',
            )
            return Response({'back_cover': result})
        except Exception as e:
            return self._handle_error(e)


class SummarizeBookView(BaseAIView):
    """B1 — Résumé IA du livre."""

    def post(self, request):
        ser = SummarizeBookSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        book_id = ser.validated_data['book_id']

        from apps.books.models import Book
        try:
            book = Book.objects.select_related('author', 'category').get(id=book_id)
        except Book.DoesNotExist:
            return Response({'error': 'Livre non trouvé'}, status=404)

        reviews = book.reviews.filter(parent__isnull=True).values_list('comment', flat=True)[:10]
        reviews_text = "\n---\n".join(r for r in reviews if r)

        user_msg = (
            f"Titre: {book.title}\n"
            f"Auteur: {book.author.full_name if book.author else 'Inconnu'}\n"
            f"Genre: {book.category.name if book.category else 'Non classé'}\n"
            f"Description: {book.description or 'Aucune'}\n\n"
            f"Avis des lecteurs:\n{reviews_text or 'Aucun avis'}"
        )

        try:
            start = time.time()
            result = ask_claude(
                prompts.SUMMARIZE_BOOK, user_msg,
                prompt_type='summary',
                cache_id=f"sum_{book_id}",
                cache_ttl=7200,
                user_id=request.user.id,
                max_tokens=1024,
            )
            self._log_generation(
                request.user, 'summary', user_msg[:500], result,
                duration_ms=int((time.time() - start) * 1000),
                content_type='book', object_id=book_id,
            )
            return Response({'summary': result})
        except Exception as e:
            return self._handle_error(e)


class SynthesizeReviewsView(BaseAIView):
    """B2 — Synthèse des avis."""

    def post(self, request):
        ser = SynthesizeReviewsSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        book_id = ser.validated_data['book_id']

        from apps.books.models import Book
        try:
            book = Book.objects.get(id=book_id)
        except Book.DoesNotExist:
            return Response({'error': 'Livre non trouvé'}, status=404)

        reviews = book.reviews.filter(parent__isnull=True).values('comment', 'rating')[:20]
        if not reviews:
            return Response({'error': 'Pas assez d\'avis pour une synthèse'}, status=400)

        reviews_text = "\n---\n".join(
            f"Note: {r['rating']}/5 — {r['comment']}" for r in reviews if r['comment']
        )
        user_msg = f"Livre: {book.title}\n\nAvis ({len(reviews)}):\n{reviews_text}"

        try:
            start = time.time()
            result = ask_claude_json(
                prompts.SYNTHESIZE_REVIEWS, user_msg,
                prompt_type='reviews_synthesis',
                cache_id=f"rev_{book_id}",
                cache_ttl=3600,
                user_id=request.user.id,
                max_tokens=1024,
            )
            self._log_generation(
                request.user, 'reviews_synthesis', user_msg[:500], json.dumps(result, ensure_ascii=False),
                duration_ms=int((time.time() - start) * 1000),
                content_type='book', object_id=book_id,
            )
            return Response(result)
        except Exception as e:
            return self._handle_error(e)


class AnalyzeManuscriptView(BaseAIView):
    """E1 — Analyse de manuscrit."""

    @staticmethod
    def _extract_file_text(file_field):
        """Extrait le texte brut d'un fichier PDF ou DOCX."""
        name = file_field.name.lower()
        try:
            if name.endswith('.pdf'):
                from PyPDF2 import PdfReader
                file_field.seek(0)
                reader = PdfReader(file_field)
                pages = []
                for page in reader.pages[:30]:  # Max 30 pages
                    t = page.extract_text()
                    if t:
                        pages.append(t)
                return "\n".join(pages)
            elif name.endswith(('.docx', '.doc')):
                import docx
                file_field.seek(0)
                doc = docx.Document(file_field)
                return "\n".join(p.text for p in doc.paragraphs if p.text.strip())
        except Exception as e:
            logger.warning("Extraction texte manuscrit échouée: %s", e)
        return ''

    def post(self, request):
        ser = AnalyzeManuscriptSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        d = ser.validated_data

        text = d.get('text', '')
        title = d.get('title', '')
        manuscript_id = d.get('manuscript_id')

        # Métadonnées déclarées par l'auteur (pour vérification croisée)
        declared_description = ''
        declared_genre = ''
        declared_language = ''
        declared_author = ''

        if manuscript_id:
            from apps.manuscripts.models import Manuscript
            try:
                ms = Manuscript.objects.get(id=manuscript_id)
                title = title or ms.title
                declared_description = ms.description or ''
                declared_genre = ms.get_genre_display() if ms.genre else ''
                declared_language = ms.get_language_display() if ms.language else ''
                declared_author = ms.author_name or ''
                # Priorité : fichier réel > texte fourni > description
                if not text and ms.file:
                    text = self._extract_file_text(ms.file)
                if not text:
                    text = declared_description
                if not text:
                    return Response({'error': 'Manuscrit sans contenu à analyser'}, status=400)
            except Manuscript.DoesNotExist:
                return Response({'error': 'Manuscrit non trouvé'}, status=404)

        if not text:
            return Response({'error': 'Texte ou manuscript_id requis'}, status=400)

        # Construire le message avec métadonnées + extrait réel
        meta_parts = [f"Titre déclaré: {title}"]
        if declared_author:
            meta_parts.append(f"Auteur déclaré: {declared_author}")
        if declared_genre:
            meta_parts.append(f"Genre déclaré: {declared_genre}")
        if declared_language:
            meta_parts.append(f"Langue déclarée: {declared_language}")
        if declared_description:
            meta_parts.append(f"Description fournie par l'auteur:\n{declared_description[:1000]}")

        user_msg = (
            "── MÉTADONNÉES DÉCLARÉES ──\n"
            + "\n".join(meta_parts)
            + "\n\n── EXTRAIT RÉEL DU DOCUMENT ──\n"
            + text[:8000]
        )

        try:
            start = time.time()
            result = ask_claude_json(
                prompts.ANALYZE_MANUSCRIPT, user_msg,
                prompt_type='manuscript_analysis',
                user_id=request.user.id,
                max_tokens=2500,
                temperature=0.5,
            )
            self._log_generation(
                request.user, 'manuscript_analysis', user_msg[:500],
                json.dumps(result, ensure_ascii=False),
                duration_ms=int((time.time() - start) * 1000),
                content_type='manuscript', object_id=manuscript_id,
            )
            return Response(result)
        except Exception as e:
            return self._handle_error(e)


# ─── Phase 3 : Recherche & Recommandations ────────────────────────

class SemanticSearchView(BaseAIView):
    """A1 — Recherche sémantique."""

    def post(self, request):
        ser = SemanticSearchSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        query = ser.validated_data['query']

        from apps.books.models import Book
        books = Book.objects.filter(available=True).select_related('author', 'category')[:100]
        catalog = "\n".join(
            f"ID:{b.id} | {b.title} | {b.author.full_name if b.author else '?'} | "
            f"{b.category.name if b.category else '?'} | {(b.description or '')[:100]}"
            for b in books
        )

        user_msg = f"Requête: {query}\n\nCatalogue:\n{catalog}"

        try:
            start = time.time()
            result = ask_claude_json(
                prompts.SEMANTIC_SEARCH, user_msg,
                prompt_type='semantic_search',
                user_id=request.user.id,
                max_tokens=512,
                temperature=0.2,
            )
            self._log_generation(
                request.user, 'semantic_search', query, json.dumps(result, ensure_ascii=False),
                duration_ms=int((time.time() - start) * 1000),
            )
            # Enrichir avec les données complètes des livres trouvés
            book_ids = result.get('book_ids', [])
            from apps.books.serializers import BookListSerializer
            found_books = Book.objects.filter(id__in=book_ids).select_related('author', 'category')
            books_by_id = {b.id: b for b in found_books}
            ordered = [books_by_id[bid] for bid in book_ids if bid in books_by_id]

            result['books'] = BookListSerializer(ordered, many=True, context={'request': request}).data
            return Response(result)
        except Exception as e:
            return self._handle_error(e)


class RecommendBooksView(BaseAIView):
    """A4 — Recommandations personnalisées avec explications."""

    def post(self, request):
        ser = RecommendBooksSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        count = ser.validated_data['count']
        user = request.user

        # Collecter l'historique
        from apps.books.models import Book
        from apps.orders.models import Order
        from apps.wishlist.models import WishlistItem

        purchased_ids = list(
            Order.objects.filter(user=user, status='PAID')
            .values_list('items__book_id', flat=True).distinct()[:20]
        )
        wishlist_ids = list(
            WishlistItem.objects.filter(user=user)
            .values_list('book_id', flat=True)[:20]
        )
        reviewed = list(
            Book.objects.filter(reviews__user=user)
            .values_list('id', flat=True)[:20]
        )

        purchased = Book.objects.filter(id__in=purchased_ids).select_related('author', 'category')
        history = "\n".join(
            f"- {b.title} ({b.author.full_name if b.author else '?'}, {b.category.name if b.category else '?'})"
            for b in purchased
        )
        wishlist = Book.objects.filter(id__in=wishlist_ids).select_related('author', 'category')
        wish_text = "\n".join(
            f"- {b.title} ({b.author.full_name if b.author else '?'})"
            for b in wishlist
        )

        # Catalogue candidat (exclure déjà achetés)
        exclude_ids = set(purchased_ids + wishlist_ids + reviewed)
        candidates = Book.objects.filter(available=True).exclude(
            id__in=exclude_ids
        ).select_related('author', 'category')[:80]
        catalog = "\n".join(
            f"ID:{b.id} | {b.title} | {b.author.full_name if b.author else '?'} | "
            f"{b.category.name if b.category else '?'}"
            for b in candidates
        )

        user_msg = (
            f"Historique d'achat:\n{history or 'Aucun achat'}\n\n"
            f"Wishlist:\n{wish_text or 'Vide'}\n\n"
            f"Catalogue disponible:\n{catalog}\n\n"
            f"Retourne {count} recommandations."
        )

        try:
            start = time.time()
            result = ask_claude_json(
                prompts.RECOMMEND_BOOKS, user_msg,
                prompt_type='recommendation',
                cache_id=f"rec_{user.id}",
                cache_ttl=1800,
                user_id=user.id,
                max_tokens=1024,
            )
            self._log_generation(
                user, 'recommendation', f"user={user.id}", json.dumps(result, ensure_ascii=False),
                duration_ms=int((time.time() - start) * 1000),
            )
            # Enrichir
            rec_ids = []
            for r in result:
                if 'book_id' in r:
                    try:
                        r['book_id'] = int(r['book_id'])
                        rec_ids.append(r['book_id'])
                    except (ValueError, TypeError):
                        pass
            from apps.books.serializers import BookListSerializer
            found = Book.objects.filter(id__in=rec_ids).select_related('author', 'category')
            ctx = {'request': request}
            books_map = {b.id: BookListSerializer(b, context=ctx).data for b in found}
            for r in result:
                r['book'] = books_map.get(r.get('book_id'))
            return Response({'recommendations': result})
        except Exception as e:
            return self._handle_error(e)


class CrossSellView(BaseAIView):
    """C1 — Suggestions cross-sell panier."""

    def post(self, request):
        ser = CrossSellSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        book_ids = ser.validated_data['book_ids']

        from apps.books.models import Book
        from apps.books.serializers import BookListSerializer

        cart_books = Book.objects.filter(id__in=book_ids).select_related('author', 'category')
        cart_text = "\n".join(
            f"- {b.title} ({b.author.full_name if b.author else '?'}, {b.category.name if b.category else '?'})"
            for b in cart_books
        )

        candidates = Book.objects.filter(available=True).exclude(
            id__in=book_ids
        ).select_related('author', 'category')[:60]
        catalog = "\n".join(
            f"ID:{b.id} | {b.title} | {b.author.full_name if b.author else '?'} | "
            f"{b.category.name if b.category else '?'}"
            for b in candidates
        )

        user_msg = f"Panier:\n{cart_text}\n\nCatalogue:\n{catalog}"

        try:
            start = time.time()
            result = ask_claude_json(
                prompts.CROSS_SELL, user_msg,
                prompt_type='cross_sell',
                user_id=request.user.id,
                max_tokens=512,
                temperature=0.5,
            )
            self._log_generation(
                request.user, 'cross_sell', user_msg[:300], json.dumps(result, ensure_ascii=False),
                duration_ms=int((time.time() - start) * 1000),
            )
            for s in result.get('suggestions', []):
                try:
                    s['book_id'] = int(s['book_id'])
                except (ValueError, TypeError, KeyError):
                    s['book_id'] = None
            sug_ids = [s['book_id'] for s in result.get('suggestions', []) if s.get('book_id')]
            found = Book.objects.filter(id__in=sug_ids).select_related('author', 'category')
            books_map = {b.id: BookListSerializer(b, context={'request': request}).data for b in found}
            for s in result.get('suggestions', []):
                s['book'] = books_map.get(s.get('book_id'))
            return Response(result)
        except Exception as e:
            return self._handle_error(e)


# ─── Phase 4 : Clubs & Social ─────────────────────────────────────

class ModerateMessageView(BaseAIView):
    """D2 — Modération intelligente."""

    def post(self, request):
        ser = ModerateMessageSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        d = ser.validated_data
        user_msg = f"Club: {d['club_name']}\nMessage: {d['message']}"

        try:
            start = time.time()
            result = ask_claude_json(
                prompts.MODERATE_MESSAGE, user_msg,
                prompt_type='moderation',
                user_id=request.user.id,
                max_tokens=256,
                temperature=0.1,
            )
            self._log_generation(
                request.user, 'moderation', d['message'][:200], json.dumps(result, ensure_ascii=False),
                duration_ms=int((time.time() - start) * 1000),
            )
            return Response(result)
        except Exception as e:
            return self._handle_error(e)


class SummarizeDiscussionView(BaseAIView):
    """D1 — Résumé de discussion."""

    def post(self, request):
        ser = SummarizeDiscussionSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        club_id = ser.validated_data['club_id']
        last_n = ser.validated_data['last_n_messages']

        from apps.social.models import BookClubMessage, BookClub
        try:
            club = BookClub.objects.get(id=club_id)
        except BookClub.DoesNotExist:
            return Response({'error': 'Club non trouvé'}, status=404)

        messages = (
            BookClubMessage.objects
            .filter(club=club, is_deleted=False, message_type='TEXT')
            .select_related('author')
            .order_by('-created_at')[:last_n]
        )
        if not messages:
            return Response({'error': 'Aucun message à résumer'}, status=400)

        msgs_text = "\n".join(
            f"[{m.author.first_name if m.author else 'Système'}] {m.content}"
            for m in reversed(list(messages))
        )
        book_name = club.current_book.title if club.current_book else "Aucun livre en cours"
        user_msg = f"Club: {club.name}\nLivre en cours: {book_name}\n\nMessages:\n{msgs_text}"

        try:
            start = time.time()
            result = ask_claude(
                prompts.SUMMARIZE_DISCUSSION, user_msg,
                prompt_type='discussion_summary',
                cache_id=f"disc_{club_id}",
                cache_ttl=1800,
                user_id=request.user.id,
                max_tokens=1024,
            )
            self._log_generation(
                request.user, 'discussion_summary', f"club={club_id}", result,
                duration_ms=int((time.time() - start) * 1000),
                content_type='club', object_id=club_id,
            )
            return Response({'summary': result})
        except Exception as e:
            return self._handle_error(e)


class DiscussionQuestionsView(BaseAIView):
    """D3/B3 — Questions de discussion."""

    def post(self, request):
        ser = DiscussionQuestionsSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        book_id = ser.validated_data['book_id']
        checkpoint = ser.validated_data['checkpoint_label']

        from apps.books.models import Book
        try:
            book = Book.objects.select_related('author', 'category').get(id=book_id)
        except Book.DoesNotExist:
            return Response({'error': 'Livre non trouvé'}, status=404)

        user_msg = (
            f"Livre: {book.title}\n"
            f"Auteur: {book.author.full_name if book.author else '?'}\n"
            f"Genre: {book.category.name if book.category else '?'}\n"
            f"Description: {(book.description or '')[:500]}\n"
            f"Checkpoint: {checkpoint or 'Lecture complète'}"
        )

        try:
            start = time.time()
            result = ask_claude_json(
                prompts.GENERATE_DISCUSSION_QUESTIONS, user_msg,
                prompt_type='discussion_questions',
                cache_id=f"quest_{book_id}_{checkpoint[:20] if checkpoint else 'full'}",
                cache_ttl=86400,
                user_id=request.user.id,
                max_tokens=512,
            )
            self._log_generation(
                request.user, 'discussion_questions', user_msg[:300],
                json.dumps(result, ensure_ascii=False),
                duration_ms=int((time.time() - start) * 1000),
                content_type='book', object_id=book_id,
            )
            return Response(result)
        except Exception as e:
            return self._handle_error(e)


class DetectSpoilerView(BaseAIView):
    """B4 — Détection de spoilers."""

    def post(self, request):
        ser = DetectSpoilerSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        d = ser.validated_data
        user_msg = f"Livre: {d['book_title']}\nAvis: {d['review_text']}"

        try:
            start = time.time()
            result = ask_claude_json(
                prompts.DETECT_SPOILER, user_msg,
                prompt_type='spoiler_detection',
                user_id=request.user.id,
                max_tokens=256,
                temperature=0.1,
            )
            self._log_generation(
                request.user, 'spoiler_detection', d['review_text'][:200],
                json.dumps(result, ensure_ascii=False),
                duration_ms=int((time.time() - start) * 1000),
            )
            return Response(result)
        except Exception as e:
            return self._handle_error(e)


# ─── Phase 5 : Commerce ───────────────────────────────────────────

class SummarizeMeetingView(BaseAIView):
    """D4 — Résumé IA d'une séance de club terminée."""

    def post(self, request):
        ser = SummarizeMeetingSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        session_id = ser.validated_data['session_id']

        from apps.social.models import ClubSession, BookClubMessage, BookClubMembership
        from django.utils import timezone

        try:
            session = ClubSession.objects.select_related('club', 'club__current_book').get(id=session_id)
        except ClubSession.DoesNotExist:
            return Response({'error': 'Séance non trouvée'}, status=404)

        # Vérifier que l'utilisateur est membre du club
        if not BookClubMembership.objects.filter(
            club=session.club, user=request.user, membership_status='APPROVED'
        ).exists() and not request.user.is_staff:
            return Response({'error': 'Accès refusé'}, status=403)

        # Vérifier que la séance est terminée
        if not session.meeting_ended_at:
            return Response({'error': 'La séance n\'est pas encore terminée'}, status=400)

        # Récupérer les messages pendant la séance
        messages = BookClubMessage.objects.filter(
            club=session.club,
            is_deleted=False,
            message_type='TEXT',
            created_at__gte=session.meeting_started_at,
            created_at__lte=session.meeting_ended_at,
        ).select_related('author').order_by('created_at')

        if not messages.exists():
            return Response({'error': 'Aucun message échangé pendant cette séance'}, status=400)

        msgs_text = "\n".join(
            f"[{m.author.first_name if m.author else 'Système'}] {m.content}"
            for m in messages
        )
        book_name = session.club.current_book.title if session.club.current_book else "Aucun livre"
        duration = ''
        if session.meeting_started_at and session.meeting_ended_at:
            mins = int((session.meeting_ended_at - session.meeting_started_at).total_seconds() / 60)
            duration = f"{mins} minutes"

        user_msg = (
            f"Club: {session.club.name}\n"
            f"Séance: {session.title}\n"
            f"Livre en cours: {book_name}\n"
            f"Durée: {duration}\n"
            f"Participants: {session.meeting_participants_count}\n\n"
            f"Messages ({messages.count()}):\n{msgs_text}"
        )

        try:
            start = time.time()
            result = ask_claude_json(
                prompts.SUMMARIZE_MEETING, user_msg,
                prompt_type='meeting_summary',
                cache_id=f"meet_{session_id}",
                cache_ttl=86400,
                user_id=request.user.id,
                max_tokens=1024,
            )
            elapsed_ms = int((time.time() - start) * 1000)
            self._log_generation(
                request.user, 'meeting_summary', user_msg[:500],
                json.dumps(result, ensure_ascii=False),
                duration_ms=elapsed_ms,
                content_type='session', object_id=session_id,
            )

            # Sauvegarder le résumé sur la séance
            session.meeting_summary = result.get('summary', '')
            session.summary_key_points = result.get('key_points', [])
            session.summary_next_steps = result.get('next_steps', '')
            session.summary_generated_at = timezone.now()
            session.summary_generated_by = request.user
            session.save(update_fields=[
                'meeting_summary', 'summary_key_points', 'summary_next_steps',
                'summary_generated_at', 'summary_generated_by',
            ])

            return Response(result)
        except Exception as e:
            return self._handle_error(e)


class DetectInactiveMembersView(BaseAIView):
    """D5 — Détection de membres inactifs et messages de relance."""

    def post(self, request):
        ser = DetectInactiveMembersSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        club_id = ser.validated_data['club_id']
        days_threshold = ser.validated_data['days_threshold']

        from apps.social.models import BookClub, BookClubMembership, BookClubMessage
        from django.utils import timezone
        from django.db.models import Count, Max
        from datetime import timedelta

        try:
            club = BookClub.objects.select_related('current_book').get(id=club_id)
        except BookClub.DoesNotExist:
            return Response({'error': 'Club non trouvé'}, status=404)

        # Vérifier que l'utilisateur est admin/mod du club
        user_membership = BookClubMembership.objects.filter(
            club=club, user=request.user, membership_status='APPROVED'
        ).first()
        if not user_membership or user_membership.role not in ('ADMIN', 'MODERATOR'):
            if not request.user.is_staff:
                return Response({'error': 'Réservé aux admins/modérateurs du club'}, status=403)

        cutoff = timezone.now() - timedelta(days=days_threshold)

        # Collecter les stats d'activité par membre
        memberships = BookClubMembership.objects.filter(
            club=club, membership_status='APPROVED', is_banned=False,
        ).select_related('user')

        # Messages par membre sur les 30 derniers jours
        msg_stats = dict(
            BookClubMessage.objects.filter(
                club=club, is_deleted=False,
                created_at__gte=timezone.now() - timedelta(days=30),
            ).values('author_id').annotate(
                count=Count('id'),
                last_msg=Max('created_at'),
            ).values_list('author_id', 'count', 'last_msg')
        )
        # Reformat: author_id -> {count, last_msg}
        msg_data = {}
        for row in BookClubMessage.objects.filter(
            club=club, is_deleted=False,
            created_at__gte=timezone.now() - timedelta(days=30),
        ).values('author_id').annotate(
            count=Count('id'),
            last_msg=Max('created_at'),
        ):
            msg_data[row['author_id']] = {
                'count': row['count'],
                'last_msg': row['last_msg'],
            }

        members_info = []
        for m in memberships:
            mdata = msg_data.get(m.user_id, {})
            last_msg = mdata.get('last_msg')
            last_read = m.last_read_at
            msg_count_30d = mdata.get('count', 0)

            # Déterminer la dernière activité
            last_activity = max(filter(None, [last_msg, last_read]), default=None)
            days_inactive = (timezone.now() - last_activity).days if last_activity else 999

            members_info.append({
                'user_id': m.user_id,
                'name': m.user.first_name or m.user.username,
                'role': m.role,
                'joined_at': m.joined_at.strftime('%Y-%m-%d') if m.joined_at else '?',
                'days_inactive': days_inactive,
                'messages_30d': msg_count_30d,
                'reading_progress': m.reading_progress or 0,
                'last_activity': last_activity.strftime('%Y-%m-%d') if last_activity else 'Jamais',
            })

        # Filtrer les inactifs
        inactive = [m for m in members_info if m['days_inactive'] >= days_threshold]

        if not inactive:
            return Response({
                'inactive_members': [],
                'message': f'Tous les membres sont actifs (seuil: {days_threshold} jours)',
            })

        inactive_text = "\n".join(
            f"- {m['name']} (rôle: {m['role']}, inactif: {m['days_inactive']}j, "
            f"messages 30j: {m['messages_30d']}, progression lecture: {m['reading_progress']}%, "
            f"membre depuis: {m['joined_at']}, dernière activité: {m['last_activity']})"
            for m in inactive
        )
        book_name = club.current_book.title if club.current_book else "Aucun"

        user_msg = (
            f"Club: {club.name}\n"
            f"Livre en cours: {book_name}\n"
            f"Seuil d'inactivité: {days_threshold} jours\n\n"
            f"Membres inactifs ({len(inactive)}):\n{inactive_text}"
        )

        try:
            start = time.time()
            result = ask_claude_json(
                prompts.DETECT_INACTIVE_MEMBERS, user_msg,
                prompt_type='other',
                cache_id=f"inact_{club_id}_{days_threshold}",
                cache_ttl=3600,
                user_id=request.user.id,
                max_tokens=1024,
            )
            self._log_generation(
                request.user, 'other', user_msg[:500],
                json.dumps(result, ensure_ascii=False),
                duration_ms=int((time.time() - start) * 1000),
                content_type='club', object_id=club_id,
            )

            # Enrichir avec les user_id réels
            ai_members = result.get('inactive_members', [])
            name_to_id = {m['name']: m['user_id'] for m in inactive}
            for am in ai_members:
                am['user_id'] = name_to_id.get(am.get('name') or am.get('user_id'))

            return Response(result)
        except Exception as e:
            return self._handle_error(e)


class RecommendPublishersView(BaseAIView):
    """G1 — Recommandation d'éditeurs pour un manuscrit."""

    def post(self, request):
        ser = RecommendPublishersSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        manuscript_id = ser.validated_data['manuscript_id']

        from apps.manuscripts.models import Manuscript
        from apps.organizations.models import Organization

        try:
            ms = Manuscript.objects.get(id=manuscript_id)
        except Manuscript.DoesNotExist:
            return Response({'error': 'Manuscrit non trouvé'}, status=404)

        # Vérifier accès (auteur du manuscrit ou staff)
        if ms.submitted_by_id != request.user.id and not request.user.is_staff:
            # Aussi autorisé si l'user est owner d'une org ciblée
            from apps.organizations.models import Organization as Org
            if ms.target_organization_id:
                if not Org.objects.filter(id=ms.target_organization_id, owner=request.user).exists():
                    return Response({'error': 'Accès refusé'}, status=403)
            else:
                return Response({'error': 'Accès refusé'}, status=403)

        # Récupérer les éditeurs éligibles
        publishers = Organization.objects.filter(
            is_active=True,
            org_type='MAISON_EDITION',
            is_accepting_manuscripts=True,
        ).values(
            'id', 'name', 'short_description', 'accepted_genres',
            'specialties', 'editorial_line', 'target_audience',
            'accepted_languages', 'response_time_days',
            'avg_rating', 'review_count', 'is_verified',
            'city', 'country',
        )[:30]

        if not publishers:
            return Response({'error': 'Aucun éditeur disponible actuellement'}, status=400)

        pub_text = "\n".join(
            f"ID:{p['id']} | {p['name']} | "
            f"Genres: {', '.join(p['accepted_genres'] or [])} | "
            f"Spécialités: {', '.join(p['specialties'] or [])} | "
            f"Ligne éditoriale: {(p['editorial_line'] or '')[:150]} | "
            f"Public: {', '.join(p['target_audience'] or [])} | "
            f"Langues: {', '.join(p['accepted_languages'] or [])} | "
            f"Note: {p['avg_rating'] or '?'}/5 ({p['review_count'] or 0} avis) | "
            f"Délai réponse: {p['response_time_days'] or '?'}j | "
            f"Vérifié: {'Oui' if p['is_verified'] else 'Non'} | "
            f"{p['city'] or ''}, {p['country'] or ''}"
            for p in publishers
        )

        user_msg = (
            f"Manuscrit: {ms.title}\n"
            f"Auteur: {ms.author_name}\n"
            f"Genre déclaré: {ms.get_genre_display() if ms.genre else '?'}\n"
            f"Langue: {ms.get_language_display() if ms.language else '?'}\n"
            f"Pages: {ms.page_count or '?'}\n"
            f"Description: {(ms.description or '')[:500]}\n\n"
            f"Éditeurs disponibles ({len(publishers)}):\n{pub_text}"
        )

        try:
            start = time.time()
            result = ask_claude_json(
                prompts.RECOMMEND_PUBLISHERS, user_msg,
                prompt_type='other',
                cache_id=f"pubmatch_{manuscript_id}",
                cache_ttl=3600,
                user_id=request.user.id,
                max_tokens=1024,
                temperature=0.4,
            )
            self._log_generation(
                request.user, 'other', user_msg[:500],
                json.dumps(result, ensure_ascii=False),
                duration_ms=int((time.time() - start) * 1000),
                content_type='manuscript', object_id=manuscript_id,
            )

            # Enrichir les recommandations avec les données complètes
            recs = result.get('recommendations', [])
            pub_map = {p['id']: p for p in publishers}
            for r in recs:
                try:
                    r['org_id'] = int(r['org_id'])
                except (ValueError, TypeError, KeyError):
                    r['org_id'] = None
                pub = pub_map.get(r.get('org_id'))
                if pub:
                    r['publisher'] = {
                        'id': pub['id'],
                        'name': pub['name'],
                        'short_description': pub['short_description'],
                        'avg_rating': float(pub['avg_rating']) if pub['avg_rating'] else None,
                        'review_count': pub['review_count'],
                        'response_time_days': pub['response_time_days'],
                        'is_verified': pub['is_verified'],
                        'city': pub['city'],
                        'country': pub['country'],
                    }

            return Response(result)
        except Exception as e:
            return self._handle_error(e)


class AnalyzeVendorTrendsView(BaseAIView):
    """F4 — Analyse des tendances de vente pour un vendeur."""

    def post(self, request):
        from apps.organizations.models import Organization
        from apps.marketplace.models import SubOrder, BookListing
        from apps.orders.models import OrderItem
        from django.db.models import Sum, Count, Max, F
        from django.utils import timezone
        from datetime import timedelta

        # Organisations du vendeur
        vendor_orgs = Organization.objects.filter(
            owner=request.user, is_active=True,
        ).values_list('id', flat=True)

        if not vendor_orgs:
            return Response({'error': 'Aucune organisation vendeur trouvée'}, status=400)

        now = timezone.now()
        month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        prev_month_start = (month_start - timedelta(days=1)).replace(day=1)

        # Stats globales
        all_suborders = SubOrder.objects.filter(vendor_id__in=vendor_orgs).exclude(status='CANCELLED')
        total_revenue = all_suborders.aggregate(s=Sum('subtotal'))['s'] or 0
        total_orders = all_suborders.count()

        # Ce mois
        this_month = all_suborders.filter(created_at__gte=month_start)
        this_month_revenue = this_month.aggregate(s=Sum('subtotal'))['s'] or 0
        this_month_orders = this_month.count()

        # Mois précédent
        prev_month = all_suborders.filter(created_at__gte=prev_month_start, created_at__lt=month_start)
        prev_month_revenue = prev_month.aggregate(s=Sum('subtotal'))['s'] or 0
        prev_month_orders = prev_month.count()

        # Top livres vendus
        top_books = list(
            OrderItem.objects.filter(
                vendor_id__in=vendor_orgs,
                sub_order__status='DELIVERED',
            ).values('book__title', 'book__category__name')
            .annotate(
                qty=Sum('quantity'),
                rev=Sum(F('quantity') * F('price')),
            ).order_by('-qty')[:8]
        )
        top_text = "\n".join(
            f"- {b['book__title']} ({b['book__category__name'] or '?'}) : {b['qty']} vendus, {b['rev']} FCFA"
            for b in top_books
        ) or "Aucune vente livrée"

        # Inventaire
        listings = BookListing.objects.filter(vendor_id__in=vendor_orgs, is_active=True)
        active_count = listings.filter(stock__gt=0).count()
        oos_count = listings.filter(stock=0).count()

        # Commandes en attente
        pending = all_suborders.filter(status='PENDING').count()

        user_msg = (
            f"Vendeur: {request.user.first_name} {request.user.last_name}\n\n"
            f"── CHIFFRES GLOBAUX ──\n"
            f"CA total: {total_revenue} FCFA\n"
            f"Commandes totales: {total_orders}\n\n"
            f"── CE MOIS ──\n"
            f"CA: {this_month_revenue} FCFA\n"
            f"Commandes: {this_month_orders}\n\n"
            f"── MOIS PRÉCÉDENT ──\n"
            f"CA: {prev_month_revenue} FCFA\n"
            f"Commandes: {prev_month_orders}\n\n"
            f"── TOP LIVRES ──\n{top_text}\n\n"
            f"── INVENTAIRE ──\n"
            f"Offres actives (en stock): {active_count}\n"
            f"Ruptures de stock: {oos_count}\n"
            f"Commandes en attente: {pending}"
        )

        try:
            start = time.time()
            result = ask_claude_json(
                prompts.ANALYZE_VENDOR_TRENDS, user_msg,
                prompt_type='vendor_trends',
                cache_id=f"vtrend_{request.user.id}",
                cache_ttl=3600,
                user_id=request.user.id,
                max_tokens=1024,
                temperature=0.5,
            )
            self._log_generation(
                request.user, 'vendor_trends', user_msg[:500],
                json.dumps(result, ensure_ascii=False),
                duration_ms=int((time.time() - start) * 1000),
            )
            return Response(result)
        except Exception as e:
            return self._handle_error(e)


class PredictStockView(BaseAIView):
    """F5 — Prévision de stock et suggestion de réapprovisionnement."""

    def post(self, request):
        ser = PredictStockSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        book_id = ser.validated_data['book_id']
        org_id = ser.validated_data.get('org_id')

        from apps.books.models import Book
        from apps.marketplace.models import BookListing, SubOrder
        from apps.orders.models import OrderItem
        from django.db.models import Sum, Count
        from django.utils import timezone
        from datetime import timedelta

        try:
            book = Book.objects.select_related('author', 'category').get(id=book_id)
        except Book.DoesNotExist:
            return Response({'error': 'Livre non trouvé'}, status=404)

        # Trouver le listing pertinent
        listing_qs = BookListing.objects.filter(book=book, is_active=True)
        if org_id:
            listing_qs = listing_qs.filter(vendor_id=org_id)
        listing = listing_qs.first()

        current_stock = listing.stock if listing else 0

        # Historique des ventes sur les 90 derniers jours
        now = timezone.now()
        periods = [
            ('30 derniers jours', now - timedelta(days=30), now),
            ('30-60 jours', now - timedelta(days=60), now - timedelta(days=30)),
            ('60-90 jours', now - timedelta(days=90), now - timedelta(days=60)),
        ]

        vendor_filter = {'vendor_id': org_id} if org_id else {}
        sales_history = []
        for label, start_dt, end_dt in periods:
            qty = OrderItem.objects.filter(
                book=book,
                sub_order__created_at__gte=start_dt,
                sub_order__created_at__lt=end_dt,
                **vendor_filter,
            ).aggregate(s=Sum('quantity'))['s'] or 0
            sales_history.append(f"{label}: {qty} vendus")

        total_all_time = book.total_sales or 0

        user_msg = (
            f"Livre: {book.title}\n"
            f"Auteur: {book.author.full_name if book.author else '?'}\n"
            f"Genre: {book.category.name if book.category else '?'}\n"
            f"Format: {book.format or 'Papier'}\n"
            f"Stock actuel: {current_stock}\n"
            f"Ventes totales (historique complet): {total_all_time}\n\n"
            f"Historique récent:\n" + "\n".join(f"- {s}" for s in sales_history)
        )

        try:
            start = time.time()
            result = ask_claude_json(
                prompts.PREDICT_STOCK, user_msg,
                prompt_type='stock_predict',
                cache_id=f"stock_{book_id}_{org_id or 'all'}",
                cache_ttl=3600,
                user_id=request.user.id,
                max_tokens=512,
                temperature=0.3,
            )
            self._log_generation(
                request.user, 'stock_predict', user_msg,
                json.dumps(result, ensure_ascii=False),
                duration_ms=int((time.time() - start) * 1000),
                content_type='book', object_id=book_id,
            )
            result['current_stock'] = current_stock
            return Response(result)
        except Exception as e:
            return self._handle_error(e)


class SuggestLibraryAcquisitionsView(BaseAIView):
    """L1 — Suggestions d'acquisitions pour bibliothèques."""

    def post(self, request):
        ser = SuggestLibraryAcquisitionsSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        org_id = ser.validated_data['org_id']

        from apps.organizations.models import Organization
        from apps.library.models import LibraryCatalogItem, BookLoan, BookReservation, LibraryMembership
        from django.db.models import Count, Q
        from django.utils import timezone
        from datetime import timedelta

        try:
            library = Organization.objects.get(id=org_id, org_type='BIBLIOTHEQUE', is_active=True)
        except Organization.DoesNotExist:
            return Response({'error': 'Bibliothèque non trouvée'}, status=404)

        # Vérifier accès
        if library.owner_id != request.user.id and not request.user.is_staff:
            return Response({'error': 'Accès refusé'}, status=403)

        now = timezone.now()
        last_90d = now - timedelta(days=90)

        # Stats bibliothèque
        catalog_count = LibraryCatalogItem.objects.filter(library=library, is_active=True).count()
        member_count = LibraryMembership.objects.filter(library=library, is_active=True).count()

        # Livres les plus empruntés (90 derniers jours)
        popular_loans = list(
            BookLoan.objects.filter(
                catalog_item__library=library,
                created_at__gte=last_90d,
            ).values(
                'catalog_item__book__title',
                'catalog_item__book__author__full_name',
                'catalog_item__book__category__name',
            ).annotate(loan_count=Count('id'))
            .order_by('-loan_count')[:10]
        )

        popular_text = "\n".join(
            f"- {p['catalog_item__book__title']} ({p['catalog_item__book__author__full_name'] or '?'}, "
            f"{p['catalog_item__book__category__name'] or '?'}) : {p['loan_count']} emprunts"
            for p in popular_loans
        ) or "Aucun emprunt récent"

        # Réservations en attente (demande non satisfaite)
        pending_reservations = list(
            BookReservation.objects.filter(
                catalog_item__library=library,
                status='PENDING',
            ).values(
                'catalog_item__book__title',
                'catalog_item__book__author__full_name',
                'catalog_item__book__category__name',
            ).annotate(res_count=Count('id'))
            .order_by('-res_count')[:10]
        )

        pending_text = "\n".join(
            f"- {r['catalog_item__book__title']} ({r['catalog_item__book__author__full_name'] or '?'}) : "
            f"{r['res_count']} réservation(s) en attente"
            for r in pending_reservations
        ) or "Aucune réservation en attente"

        # Livres souvent en rupture (available_copies = 0)
        oos_books = list(
            LibraryCatalogItem.objects.filter(
                library=library, is_active=True, available_copies=0,
            ).select_related('book', 'book__author', 'book__category')[:10]
        )
        oos_text = "\n".join(
            f"- {b.book.title} ({b.book.author.full_name if b.book.author else '?'}, "
            f"{b.book.category.name if b.book.category else '?'}) : "
            f"{b.total_copies} exemplaire(s) total, 0 disponible"
            for b in oos_books
        ) or "Aucune rupture"

        # Genres du catalogue
        genre_distribution = list(
            LibraryCatalogItem.objects.filter(
                library=library, is_active=True,
            ).values('book__category__name')
            .annotate(count=Count('id'))
            .order_by('-count')[:8]
        )
        genres_text = ", ".join(
            f"{g['book__category__name'] or '?'} ({g['count']})" for g in genre_distribution
        ) or "Non classé"

        user_msg = (
            f"Bibliothèque: {library.name}\n"
            f"Catalogue: {catalog_count} titres\n"
            f"Membres actifs: {member_count}\n"
            f"Répartition genres: {genres_text}\n\n"
            f"── LIVRES LES PLUS EMPRUNTÉS (90j) ──\n{popular_text}\n\n"
            f"── RÉSERVATIONS EN ATTENTE (forte demande) ──\n{pending_text}\n\n"
            f"── LIVRES EN RUPTURE (0 exemplaire disponible) ──\n{oos_text}"
        )

        try:
            start = time.time()
            result = ask_claude_json(
                prompts.SUGGEST_LIBRARY_ACQUISITIONS, user_msg,
                prompt_type='library_recommend',
                cache_id=f"libacq_{org_id}",
                cache_ttl=3600,
                user_id=request.user.id,
                max_tokens=1024,
                temperature=0.5,
            )
            self._log_generation(
                request.user, 'library_recommend', user_msg[:500],
                json.dumps(result, ensure_ascii=False),
                duration_ms=int((time.time() - start) * 1000),
                content_type='library', object_id=org_id,
            )
            return Response(result)
        except Exception as e:
            return self._handle_error(e)


class LibraryRecommendView(BaseAIView):
    """L2 — Recommandations personnalisées dans le catalogue d'une bibliothèque."""

    def post(self, request):
        ser = LibraryRecommendSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        org_id = ser.validated_data['org_id']
        count = ser.validated_data['count']

        from apps.organizations.models import Organization
        from apps.library.models import LibraryCatalogItem, BookLoan

        try:
            library = Organization.objects.get(id=org_id, org_type='BIBLIOTHEQUE', is_active=True)
        except Organization.DoesNotExist:
            return Response({'error': 'Bibliothèque non trouvée'}, status=404)

        user = request.user

        # Historique d'emprunts de l'utilisateur dans cette bibliothèque
        user_loans = BookLoan.objects.filter(
            borrower=user,
            catalog_item__library=library,
        ).select_related(
            'catalog_item__book', 'catalog_item__book__author', 'catalog_item__book__category'
        ).order_by('-created_at')[:20]

        borrowed_ids = set()
        history_parts = []
        for loan in user_loans:
            b = loan.catalog_item.book
            borrowed_ids.add(b.id)
            history_parts.append(
                f"- {b.title} ({b.author.full_name if b.author else '?'}, "
                f"{b.category.name if b.category else '?'}) — {loan.get_status_display()}"
            )
        history_text = "\n".join(history_parts) or "Aucun emprunt"

        # Catalogue disponible (exclure livres déjà empruntés)
        available = LibraryCatalogItem.objects.filter(
            library=library, is_active=True, available_copies__gt=0,
        ).exclude(
            book_id__in=borrowed_ids,
        ).select_related('book', 'book__author', 'book__category')[:60]

        catalog_text = "\n".join(
            f"ID:{item.book.id} | {item.book.title} | "
            f"{item.book.author.full_name if item.book.author else '?'} | "
            f"{item.book.category.name if item.book.category else '?'} | "
            f"Dispo: {item.available_copies}/{item.total_copies}"
            for item in available
        )

        if not catalog_text:
            return Response({'recommendations': [], 'message': 'Aucun livre disponible'})

        user_msg = (
            f"Bibliothèque: {library.name}\n"
            f"Utilisateur: {user.first_name}\n\n"
            f"Historique d'emprunts:\n{history_text}\n\n"
            f"Catalogue disponible ({len(available)} titres):\n{catalog_text}\n\n"
            f"Retourne {count} recommandations."
        )

        try:
            start = time.time()
            result = ask_claude_json(
                prompts.LIBRARY_RECOMMEND, user_msg,
                prompt_type='library_recommend',
                cache_id=f"librec_{user.id}_{org_id}",
                cache_ttl=1800,
                user_id=user.id,
                max_tokens=1024,
            )
            self._log_generation(
                user, 'library_recommend', f"user={user.id} lib={org_id}",
                json.dumps(result, ensure_ascii=False),
                duration_ms=int((time.time() - start) * 1000),
                content_type='library', object_id=org_id,
            )

            # Enrichir avec les données livres
            recs = result.get('recommendations', [])
            book_ids = []
            for r in recs:
                try:
                    r['book_id'] = int(r['book_id'])
                    book_ids.append(r['book_id'])
                except (ValueError, TypeError, KeyError):
                    pass

            from apps.books.serializers import BookListSerializer
            from apps.books.models import Book
            found = Book.objects.filter(id__in=book_ids).select_related('author', 'category')
            books_map = {b.id: BookListSerializer(b, context={'request': request}).data for b in found}
            for r in recs:
                r['book'] = books_map.get(r.get('book_id'))

            return Response({'recommendations': recs})
        except Exception as e:
            return self._handle_error(e)


class SimilarManuscriptsView(BaseAIView):
    """E2 — Détection de manuscrits/livres similaires."""

    def post(self, request):
        ser = SimilarManuscriptsSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        manuscript_id = ser.validated_data['manuscript_id']

        from apps.manuscripts.models import Manuscript
        from apps.books.models import Book

        try:
            ms = Manuscript.objects.get(id=manuscript_id)
        except Manuscript.DoesNotExist:
            return Response({'error': 'Manuscrit non trouvé'}, status=404)

        # Vérifier accès
        if ms.submitted_by_id != request.user.id and not request.user.is_staff:
            from apps.organizations.models import Organization
            if ms.target_organization_id:
                if not Organization.objects.filter(id=ms.target_organization_id, owner=request.user).exists():
                    return Response({'error': 'Accès refusé'}, status=403)
            else:
                return Response({'error': 'Accès refusé'}, status=403)

        # Livres existants pour comparaison
        books = Book.objects.filter(available=True).select_related('author', 'category')[:80]
        catalog = "\n".join(
            f"ID:{b.id} | {b.title} | {b.author.full_name if b.author else '?'} | "
            f"{b.category.name if b.category else '?'} | {(b.description or '')[:100]}"
            for b in books
        )

        # Autres manuscrits en cours
        other_ms = Manuscript.objects.exclude(id=manuscript_id).filter(
            status__in=['PENDING', 'REVIEWING'],
        )[:30]
        ms_list = "\n".join(
            f"MS:{m.id} | {m.title} | {m.author_name} | {m.get_genre_display() if m.genre else '?'} | "
            f"{(m.description or '')[:100]}"
            for m in other_ms
        )

        user_msg = (
            f"Manuscrit à comparer:\n"
            f"Titre: {ms.title}\n"
            f"Auteur: {ms.author_name}\n"
            f"Genre: {ms.get_genre_display() if ms.genre else '?'}\n"
            f"Description: {(ms.description or '')[:500]}\n\n"
            f"── LIVRES PUBLIÉS ({len(books)}) ──\n{catalog}\n\n"
            f"── MANUSCRITS EN COURS ({other_ms.count()}) ──\n{ms_list or 'Aucun'}"
        )

        try:
            start = time.time()
            result = ask_claude_json(
                prompts.SIMILAR_MANUSCRIPTS, user_msg,
                prompt_type='other',
                cache_id=f"simms_{manuscript_id}",
                cache_ttl=3600,
                user_id=request.user.id,
                max_tokens=1024,
                temperature=0.3,
            )
            self._log_generation(
                request.user, 'other', user_msg[:500],
                json.dumps(result, ensure_ascii=False),
                duration_ms=int((time.time() - start) * 1000),
                content_type='manuscript', object_id=manuscript_id,
            )
            return Response(result)
        except Exception as e:
            return self._handle_error(e)


class EstimateQuoteView(BaseAIView):
    """E4 — Pré-remplissage de devis éditorial par IA."""

    def post(self, request):
        ser = EstimateQuoteSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        d = ser.validated_data
        manuscript_id = d.get('manuscript_id')

        title = d.get('title', '')
        genre = d.get('genre', '')
        page_count = d.get('page_count', 0)
        publishing_model = d.get('publishing_model', '')

        # Si manuscript_id fourni, enrichir depuis le manuscrit
        if manuscript_id:
            from apps.manuscripts.models import Manuscript
            try:
                ms = Manuscript.objects.get(id=manuscript_id)
                title = title or ms.title
                genre = genre or (ms.get_genre_display() if ms.genre else '')
                page_count = page_count or (ms.page_count or 0)
            except Manuscript.DoesNotExist:
                pass

        if not title:
            return Response({'error': 'Titre requis'}, status=400)

        user_msg = (
            f"Manuscrit: {title}\n"
            f"Genre: {genre or 'Non précisé'}\n"
            f"Nombre de pages: {page_count or 'Non précisé'}\n"
            f"Modèle d'édition: {publishing_model or 'Non précisé'}\n\n"
            f"Devise: FCFA (Afrique francophone)\n"
            f"Contexte: maison d'édition en Afrique francophone"
        )

        try:
            start = time.time()
            result = ask_claude_json(
                prompts.ESTIMATE_QUOTE, user_msg,
                prompt_type='other',
                cache_id=f"quote_{manuscript_id or title[:30]}_{publishing_model}",
                cache_ttl=3600,
                user_id=request.user.id,
                max_tokens=1500,
                temperature=0.4,
            )
            self._log_generation(
                request.user, 'other', user_msg,
                json.dumps(result, ensure_ascii=False),
                duration_ms=int((time.time() - start) * 1000),
                content_type='manuscript', object_id=manuscript_id,
            )
            return Response(result)
        except Exception as e:
            return self._handle_error(e)


class RecommendClubsView(BaseAIView):
    """S1 — Recommandation de clubs de lecture personnalisée."""

    def post(self, request):
        ser = RecommendClubsSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        count = ser.validated_data['count']
        user = request.user

        from apps.social.models import BookClub, BookClubMembership
        from apps.books.models import Book
        from apps.orders.models import Order

        # Clubs dont l'utilisateur est déjà membre
        member_club_ids = set(
            BookClubMembership.objects.filter(
                user=user, membership_status='APPROVED',
            ).values_list('club_id', flat=True)
        )

        # Goûts de l'utilisateur
        purchased = Book.objects.filter(
            orders__user=user, orders__status='PAID',
        ).select_related('author', 'category')[:15]
        tastes = ", ".join(set(
            b.category.name for b in purchased if b.category
        )) or "éclectique"
        fav_authors = ", ".join(set(
            b.author.full_name for b in purchased if b.author
        )[:5]) or "divers"

        # Clubs disponibles (publics, non-membre)
        available = BookClub.objects.filter(
            is_public=True,
        ).exclude(
            id__in=member_club_ids,
        ).select_related('current_book', 'current_book__author')[:40]

        if not available:
            return Response({'recommendations': [], 'message': 'Aucun club disponible'})

        clubs_text = "\n".join(
            f"ID:{c.id} | {c.name} | "
            f"Catégories: {', '.join(c.category or [])} | "
            f"Livre en cours: {c.current_book.title if c.current_book else 'Aucun'} | "
            f"Membres: {c.active_members_count} | "
            f"Fréquence: {c.get_meeting_frequency_display()} | "
            f"{(c.description or '')[:100]}"
            for c in available
        )

        user_msg = (
            f"Utilisateur: {user.first_name}\n"
            f"Genres préférés: {tastes}\n"
            f"Auteurs lus: {fav_authors}\n\n"
            f"Clubs disponibles ({len(available)}):\n{clubs_text}\n\n"
            f"Retourne {count} recommandations."
        )

        try:
            start = time.time()
            result = ask_claude_json(
                prompts.RECOMMEND_CLUBS, user_msg,
                prompt_type='other',
                cache_id=f"clubrec_{user.id}",
                cache_ttl=1800,
                user_id=user.id,
                max_tokens=1024,
            )
            self._log_generation(
                user, 'other', f"user={user.id}",
                json.dumps(result, ensure_ascii=False),
                duration_ms=int((time.time() - start) * 1000),
            )

            # Enrichir avec données complètes
            recs = result.get('recommendations', [])
            club_ids = []
            for r in recs:
                try:
                    r['club_id'] = int(r['club_id'])
                    club_ids.append(r['club_id'])
                except (ValueError, TypeError, KeyError):
                    pass

            from apps.social.serializers import BookClubListSerializer
            found = BookClub.objects.filter(id__in=club_ids).select_related('current_book', 'creator')
            clubs_map = {c.id: BookClubListSerializer(c, context={'request': request}).data for c in found}
            for r in recs:
                r['club'] = clubs_map.get(r.get('club_id'))

            return Response({'recommendations': recs})
        except Exception as e:
            return self._handle_error(e)


class PredictLateReturnView(BaseAIView):
    """L3 — Prédiction de retard pour les prêts actifs d'une bibliothèque."""

    def post(self, request):
        ser = PredictLateReturnSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        org_id = ser.validated_data['org_id']

        from apps.organizations.models import Organization
        from apps.library.models import BookLoan, Fine
        from django.utils import timezone
        from django.db.models import Count, Q, F

        try:
            library = Organization.objects.get(id=org_id, org_type='BIBLIOTHEQUE', is_active=True)
        except Organization.DoesNotExist:
            return Response({'error': 'Bibliothèque non trouvée'}, status=404)

        if library.owner_id != request.user.id and not request.user.is_staff:
            return Response({'error': 'Accès refusé'}, status=403)

        now = timezone.now()

        # Prêts actifs
        active_loans = BookLoan.objects.filter(
            catalog_item__library=library,
            status='ACTIVE',
        ).select_related(
            'catalog_item__book', 'catalog_item__book__category', 'borrower',
        )

        if not active_loans.exists():
            return Response({'predictions': [], 'message': 'Aucun prêt actif'})

        # Historique de retard par emprunteur
        borrower_ids = set(l.borrower_id for l in active_loans if l.borrower_id)
        overdue_history = dict(
            BookLoan.objects.filter(
                borrower_id__in=borrower_ids,
                catalog_item__library=library,
            ).values('borrower_id').annotate(
                total_loans=Count('id'),
                overdue_count=Count('id', filter=Q(
                    returned_at__isnull=False,
                    returned_at__gt=F('due_date'),
                ) | Q(status='OVERDUE')),
            ).values_list('borrower_id', 'overdue_count', 'total_loans')
        )
        # Reformat
        history_data = {}
        for row in BookLoan.objects.filter(
            borrower_id__in=borrower_ids,
            catalog_item__library=library,
        ).values('borrower_id').annotate(
            total_loans=Count('id'),
            overdue_count=Count('id', filter=Q(
                returned_at__isnull=False,
                returned_at__gt=F('due_date'),
            )),
        ):
            history_data[row['borrower_id']] = {
                'total': row['total_loans'],
                'overdue': row['overdue_count'],
            }

        loans_text = []
        for loan in active_loans:
            days_remaining = (loan.due_date - now).days if loan.due_date else 0
            hist = history_data.get(loan.borrower_id, {'total': 0, 'overdue': 0})
            loans_text.append(
                f"Prêt #{loan.id} | {loan.catalog_item.book.title} | "
                f"Emprunteur: {loan.borrower.first_name if loan.borrower else '?'} | "
                f"Genre: {loan.catalog_item.book.category.name if loan.catalog_item.book.category else '?'} | "
                f"Jours restants: {days_remaining} | "
                f"Historique: {hist['total']} emprunts, {hist['overdue']} retards | "
                f"Rappels envoyés: {loan.reminder_sent or 0}"
            )

        user_msg = (
            f"Bibliothèque: {library.name}\n"
            f"Prêts actifs ({len(loans_text)}):\n" + "\n".join(loans_text)
        )

        try:
            start = time.time()
            result = ask_claude_json(
                prompts.PREDICT_LATE_RETURN + "\n\nRéponds avec une liste JSON : "
                "[{\"loan_id\": int, \"risk_level\": \"faible\"|\"moyen\"|\"élevé\", "
                "\"probability\": 0.0-1.0, \"reasoning\": \"...\"}]",
                user_msg,
                prompt_type='other',
                cache_id=f"late_{org_id}",
                cache_ttl=1800,
                user_id=request.user.id,
                max_tokens=1024,
                temperature=0.3,
            )
            self._log_generation(
                request.user, 'other', user_msg[:500],
                json.dumps(result, ensure_ascii=False),
                duration_ms=int((time.time() - start) * 1000),
                content_type='library', object_id=org_id,
            )

            predictions = result if isinstance(result, list) else result.get('predictions', result)
            return Response({'predictions': predictions})
        except Exception as e:
            return self._handle_error(e)


class SmartCouponTargetingView(BaseAIView):
    """M1 — Ciblage intelligent de coupons."""
    permission_classes = [IsAdminUser]

    def post(self, request):
        ser = SmartCouponTargetingSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        segment = ser.validated_data['segment']
        count = ser.validated_data['count']

        from apps.users.models import User
        from apps.orders.models import Order
        from django.db.models import Sum, Count, Max, Q
        from django.utils import timezone
        from datetime import timedelta

        now = timezone.now()
        users_qs = User.objects.filter(is_active=True, is_staff=False)

        # Construire les données utilisateurs selon le segment
        if segment == 'churn':
            # Utilisateurs qui ont acheté il y a 30-180 jours mais pas depuis 30 jours
            cutoff_recent = now - timedelta(days=30)
            cutoff_old = now - timedelta(days=180)
            users = users_qs.filter(
                orders__status='PAID',
                orders__created_at__gte=cutoff_old,
            ).annotate(
                last_order=Max('orders__created_at'),
                total_spent=Sum('orders__total'),
                order_count=Count('orders', distinct=True),
            ).filter(last_order__lt=cutoff_recent).order_by('-total_spent')[:count]
        elif segment == 'high_value':
            users = users_qs.annotate(
                total_spent=Sum('orders__total', filter=Q(orders__status='PAID')),
                order_count=Count('orders', filter=Q(orders__status='PAID'), distinct=True),
                last_order=Max('orders__created_at'),
            ).filter(total_spent__gt=0).order_by('-total_spent')[:count]
        elif segment == 'new':
            cutoff = now - timedelta(days=30)
            users = users_qs.filter(
                date_joined__gte=cutoff,
            ).annotate(
                order_count=Count('orders', filter=Q(orders__status='PAID'), distinct=True),
                total_spent=Sum('orders__total', filter=Q(orders__status='PAID')),
                last_order=Max('orders__created_at'),
            ).order_by('-date_joined')[:count]
        else:  # inactive
            cutoff = now - timedelta(days=60)
            users = users_qs.annotate(
                last_order=Max('orders__created_at'),
                order_count=Count('orders', filter=Q(orders__status='PAID'), distinct=True),
                total_spent=Sum('orders__total', filter=Q(orders__status='PAID')),
            ).filter(
                Q(last_order__lt=cutoff) | Q(last_order__isnull=True),
            ).exclude(order_count=0).order_by('-total_spent')[:count]

        if not users:
            return Response({'targets': [], 'message': 'Aucun utilisateur trouvé pour ce segment'})

        users_text = "\n".join(
            f"- {u.first_name or u.username} (ID:{u.id}, "
            f"commandes: {u.order_count or 0}, "
            f"dépensé: {u.total_spent or 0} FCFA, "
            f"dernière commande: {u.last_order.strftime('%Y-%m-%d') if u.last_order else 'jamais'}, "
            f"inscrit: {u.date_joined.strftime('%Y-%m-%d')})"
            for u in users
        )

        segment_labels = {
            'churn': 'risque de départ (achat ancien, inactif récemment)',
            'high_value': 'meilleurs clients (plus gros dépensiers)',
            'new': 'nouveaux inscrits (< 30 jours)',
            'inactive': 'inactifs (> 60 jours sans commande)',
        }

        user_msg = (
            f"Segment ciblé: {segment_labels.get(segment, segment)}\n\n"
            f"Utilisateurs ({len(users)}):\n{users_text}"
        )

        try:
            start = time.time()
            result = ask_claude_json(
                prompts.SMART_COUPON_TARGETING, user_msg,
                prompt_type='other',
                user_id=request.user.id,
                max_tokens=1024,
                temperature=0.4,
            )
            self._log_generation(
                request.user, 'other', user_msg[:500],
                json.dumps(result, ensure_ascii=False),
                duration_ms=int((time.time() - start) * 1000),
            )
            return Response(result)
        except Exception as e:
            return self._handle_error(e)


class SuggestAuthorsView(BaseAIView):
    """A5 — Suggestion d'auteurs à suivre."""

    def post(self, request):
        ser = SuggestAuthorsSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        count = ser.validated_data['count']
        user = request.user

        from apps.books.models import Book, Author
        from apps.orders.models import Order

        # Goûts de l'utilisateur
        purchased = Book.objects.filter(
            orders__user=user, orders__status='PAID',
        ).select_related('author', 'category')[:20]

        read_authors = set()
        tastes_parts = []
        for b in purchased:
            if b.author:
                read_authors.add(b.author.id)
                tastes_parts.append(f"- {b.title} de {b.author.full_name} ({b.category.name if b.category else '?'})")

        tastes_text = "\n".join(tastes_parts) or "Aucun achat"

        # Auteurs candidats (exclure ceux déjà lus)
        candidates = Author.objects.exclude(
            id__in=read_authors,
        ).filter(
            books__available=True,
        ).distinct()[:50]

        candidates_text = "\n".join(
            f"ID:{a.id} | {a.full_name} | {(a.biography or '')[:100]}"
            for a in candidates
        )

        if not candidates_text:
            return Response({'suggestions': []})

        user_msg = (
            f"Utilisateur: {user.first_name}\n\n"
            f"Livres lus/achetés:\n{tastes_text}\n\n"
            f"Auteurs disponibles ({len(candidates)}):\n{candidates_text}\n\n"
            f"Retourne {count} suggestions."
        )

        try:
            start = time.time()
            result = ask_claude_json(
                prompts.SUGGEST_AUTHORS, user_msg,
                prompt_type='other',
                cache_id=f"authsug_{user.id}",
                cache_ttl=1800,
                user_id=user.id,
                max_tokens=1024,
            )
            self._log_generation(
                user, 'other', f"user={user.id}",
                json.dumps(result, ensure_ascii=False),
                duration_ms=int((time.time() - start) * 1000),
            )

            # Enrichir
            suggestions = result.get('suggestions', [])
            author_ids = []
            for s in suggestions:
                try:
                    s['author_id'] = int(s['author_id'])
                    author_ids.append(s['author_id'])
                except (ValueError, TypeError, KeyError):
                    pass

            found = Author.objects.filter(id__in=author_ids)
            authors_map = {}
            for a in found:
                authors_map[a.id] = {
                    'id': a.id,
                    'full_name': a.display_name,
                    'biography': (a.display_bio or '')[:150],
                    'photo': a.display_photo.url if a.display_photo else None,
                    'slug': a.slug,
                }
            for s in suggestions:
                s['author'] = authors_map.get(s.get('author_id'))

            return Response({'suggestions': suggestions})
        except Exception as e:
            return self._handle_error(e)


class ActivitySummaryView(BaseAIView):
    """H2 — Résumé d'activité personnalisé."""

    def post(self, request):
        user = request.user

        from apps.orders.models import Order
        from apps.books.models import Book
        from apps.social.models import BookClubMembership, BookClubMessage
        from apps.library.models import BookLoan
        from django.db.models import Count, Sum
        from django.utils import timezone
        from datetime import timedelta

        now = timezone.now()
        last_30d = now - timedelta(days=30)

        # Commandes récentes
        recent_orders = Order.objects.filter(
            user=user, status='PAID', created_at__gte=last_30d,
        ).aggregate(count=Count('id'), total=Sum('total'))

        # Livres achetés récemment
        recent_books = list(
            Book.objects.filter(
                orders__user=user, orders__status='PAID',
                orders__created_at__gte=last_30d,
            ).values_list('title', flat=True)[:5]
        )

        # Clubs
        clubs_count = BookClubMembership.objects.filter(
            user=user, membership_status='APPROVED',
        ).count()
        recent_messages = BookClubMessage.objects.filter(
            author=user, created_at__gte=last_30d, is_deleted=False,
        ).count()

        # Emprunts
        active_loans = BookLoan.objects.filter(
            borrower=user, status='ACTIVE',
        ).count()

        # Wishlist
        try:
            from apps.wishlist.models import WishlistItem
            wishlist_count = WishlistItem.objects.filter(user=user).count()
        except Exception:
            wishlist_count = 0

        user_msg = (
            f"Utilisateur: {user.first_name} {user.last_name}\n"
            f"Inscrit depuis: {user.date_joined.strftime('%d/%m/%Y')}\n\n"
            f"── 30 DERNIERS JOURS ──\n"
            f"Commandes: {recent_orders['count'] or 0} "
            f"(total: {recent_orders['total'] or 0} FCFA)\n"
            f"Livres achetés: {', '.join(recent_books) if recent_books else 'Aucun'}\n"
            f"Messages dans les clubs: {recent_messages}\n\n"
            f"── GLOBAL ──\n"
            f"Clubs: {clubs_count}\n"
            f"Emprunts actifs: {active_loans}\n"
            f"Wishlist: {wishlist_count} livres"
        )

        try:
            start = time.time()
            result = ask_claude_json(
                prompts.ACTIVITY_SUMMARY, user_msg,
                prompt_type='other',
                cache_id=f"activity_{user.id}",
                cache_ttl=3600,
                user_id=user.id,
                max_tokens=512,
                temperature=0.7,
            )
            self._log_generation(
                user, 'other', user_msg,
                json.dumps(result, ensure_ascii=False),
                duration_ms=int((time.time() - start) * 1000),
            )
            return Response(result)
        except Exception as e:
            return self._handle_error(e)


class DashboardHelpView(BaseAIView):
    """H3 — Aide contextuelle IA sur le dashboard."""

    def post(self, request):
        ser = DashboardHelpSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        page = ser.validated_data['page']

        user = request.user
        roles = []
        if hasattr(user, 'profile_types') and user.profile_types:
            roles = user.profile_types
        elif hasattr(user, 'profile') and hasattr(user.profile, 'profile_types'):
            roles = user.profile.profile_types or []

        user_msg = (
            f"Utilisateur: {user.first_name} {user.last_name}\n"
            f"Rôles: {', '.join(roles) if roles else 'Lecteur'}\n"
            f"Page actuelle du dashboard: {page}"
        )

        try:
            start = time.time()
            result = ask_claude(
                prompts.DASHBOARD_HELP, user_msg,
                prompt_type='other',
                cache_id=f"dhelp_{page}",
                cache_ttl=86400,
                user_id=user.id,
                max_tokens=256,
                temperature=0.5,
            )
            self._log_generation(
                user, 'other', user_msg, result,
                duration_ms=int((time.time() - start) * 1000),
            )
            return Response({'help': result})
        except Exception as e:
            return self._handle_error(e)


class PersonalizedNewsletterView(BaseAIView):
    """N1 — Génération de newsletter personnalisée."""
    permission_classes = [IsAdminUser]

    def post(self, request):
        ser = PersonalizedNewsletterSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        email = ser.validated_data['subscriber_email']

        from apps.books.models import Book
        from apps.social.models import BookClub

        # Trouver l'utilisateur correspondant (si inscrit)
        from apps.users.models import User
        subscriber_user = User.objects.filter(email=email).first()

        # Goûts de l'abonné
        tastes = "Inconnu (abonné non inscrit)"
        if subscriber_user:
            purchased = Book.objects.filter(
                orders__user=subscriber_user, orders__status='PAID',
            ).select_related('author', 'category')[:10]
            if purchased:
                genres = set(b.category.name for b in purchased if b.category)
                authors = set(b.author.full_name for b in purchased if b.author)
                tastes = f"Genres: {', '.join(genres)}. Auteurs: {', '.join(list(authors)[:5])}"

        # Nouveautés et actualités
        new_books = Book.objects.filter(available=True).order_by('-created_at')[:8]
        new_books_text = ", ".join(
            f"{b.title} de {b.author.full_name if b.author else '?'}"
            for b in new_books
        )

        popular_clubs = BookClub.objects.filter(is_public=True).order_by('-created_at')[:5]
        clubs_text = ", ".join(c.name for c in popular_clubs) or "Aucun"

        user_msg = (
            f"Abonné: {email}\n"
            f"Prénom: {subscriber_user.first_name if subscriber_user else 'Cher lecteur'}\n"
            f"Goûts: {tastes}\n\n"
            f"Nouveautés catalogue: {new_books_text}\n"
            f"Clubs actifs: {clubs_text}"
        )

        try:
            start = time.time()
            result = ask_claude(
                prompts.PERSONALIZED_NEWSLETTER, user_msg,
                prompt_type='newsletter',
                user_id=request.user.id,
                max_tokens=1500,
                temperature=0.8,
            )
            self._log_generation(
                request.user, 'newsletter', email, result,
                duration_ms=int((time.time() - start) * 1000),
            )
            return Response({'newsletter': result, 'subscriber_email': email})
        except Exception as e:
            return self._handle_error(e)


class WishlistAlertView(BaseAIView):
    """W1 — Alertes intelligentes sur la wishlist."""

    def post(self, request):
        user = request.user

        from apps.wishlist.models import WishlistItem
        from apps.marketplace.models import BookListing
        from apps.library.models import LibraryCatalogItem
        from apps.social.models import BookClub

        items = WishlistItem.objects.filter(user=user).select_related(
            'book', 'book__author', 'book__category',
        ).order_by('-added_at')[:20]

        if not items:
            return Response({'alerts': [], 'message': 'Votre wishlist est vide'})

        alerts_context = []
        for item in items:
            b = item.book
            # Vérifier baisse de prix
            has_discount = b.original_price and b.price and b.price < b.original_price
            # Vérifier dispo bibliothèque
            lib_avail = LibraryCatalogItem.objects.filter(
                book=b, is_active=True, available_copies__gt=0,
            ).select_related('library').first()
            # Vérifier si un club lit ce livre
            club_reading = BookClub.objects.filter(
                current_book=b, is_public=True,
            ).first()
            # Marketplace : offre la moins chère
            cheapest = BookListing.objects.filter(
                book=b, is_active=True, stock__gt=0,
            ).order_by('price').first()

            alerts_context.append(
                f"- {b.title} ({b.author.full_name if b.author else '?'}, "
                f"{b.category.name if b.category else '?'}) | "
                f"Prix: {b.price or '?'} FCFA | "
                f"Promo: {'Oui (-' + str(b.discount_percentage) + '%)' if has_discount else 'Non'} | "
                f"Dispo biblio: {lib_avail.library.name if lib_avail else 'Non'} | "
                f"Club en cours: {club_reading.name if club_reading else 'Non'} | "
                f"Marketplace: {str(cheapest.price) + ' FCFA' if cheapest else 'Non'}"
            )

        user_msg = (
            f"Utilisateur: {user.first_name}\n\n"
            f"Wishlist ({len(items)} livres):\n" + "\n".join(alerts_context)
        )

        try:
            start = time.time()
            result = ask_claude_json(
                prompts.WISHLIST_ALERT, user_msg,
                prompt_type='other',
                cache_id=f"wishalert_{user.id}",
                cache_ttl=1800,
                user_id=user.id,
                max_tokens=1024,
                temperature=0.4,
            )
            self._log_generation(
                user, 'other', f"user={user.id} wishlist={len(items)}",
                json.dumps(result, ensure_ascii=False),
                duration_ms=int((time.time() - start) * 1000),
            )
            return Response(result)
        except Exception as e:
            return self._handle_error(e)


class SuggestPriceView(BaseAIView):
    """F3 — Suggestion de prix optimal."""

    def post(self, request):
        ser = SuggestPriceSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        book_id = ser.validated_data['book_id']

        from apps.books.models import Book
        from apps.marketplace.models import BookListing

        try:
            book = Book.objects.select_related('author', 'category').get(id=book_id)
        except Book.DoesNotExist:
            return Response({'error': 'Livre non trouvé'}, status=404)

        listings = BookListing.objects.filter(book=book, is_active=True).values('price', 'condition')
        competitors = "\n".join(
            f"- {l['price']} FCFA ({l['condition']})" for l in listings
        )

        user_msg = (
            f"Livre: {book.title}\n"
            f"Genre: {book.category.name if book.category else '?'}\n"
            f"Prix éditeur: {book.price or 'Non défini'}\n"
            f"Offres existantes:\n{competitors or 'Aucune'}"
        )

        try:
            start = time.time()
            result = ask_claude_json(
                prompts.SUGGEST_PRICE, user_msg,
                prompt_type='price_suggest',
                user_id=request.user.id,
                max_tokens=256,
                temperature=0.3,
            )
            self._log_generation(
                request.user, 'price_suggest', user_msg, json.dumps(result, ensure_ascii=False),
                duration_ms=int((time.time() - start) * 1000),
                content_type='book', object_id=book_id,
            )
            return Response(result)
        except Exception as e:
            return self._handle_error(e)


# ─── Phase 6 : Assistant global ───────────────────────────────────

class ChatbotView(BaseAIView):
    """J1 — Chatbot Frollot — Assistant omniscient."""

    def _build_rich_context(self, user, message, context_page):
        """Construit un contexte riche avec toutes les données pertinentes."""
        from apps.books.models import Book, Author, Category
        from apps.orders.models import Order
        from apps.social.models import BookClub, BookClubMembership
        from apps.library.models import BookLoan
        from apps.organizations.models import Organization
        from django.db.models import Q

        sections = []
        msg_lower = message.lower()

        # ── 1. Profil utilisateur (toujours) ──
        sections.append(
            f"── PROFIL UTILISATEUR ──\n"
            f"Nom: {user.first_name} {user.last_name}\n"
            f"Email: {user.email}\n"
            f"Inscrit depuis: {user.date_joined.strftime('%d/%m/%Y')}\n"
            f"Page actuelle: {context_page or 'Non précisée'}"
        )

        # ── 2. Catalogue de livres (élargi, avec prix et auteurs) ──
        # Recherche ciblée si le message mentionne un auteur/titre
        book_qs = Book.objects.filter(available=True).select_related('author', 'category')
        # Chercher si le message contient un terme de recherche
        search_terms = [w for w in msg_lower.split() if len(w) > 3 and w not in
                        ('livre', 'livres', 'quel', 'quels', 'prix', 'auteur', 'combien',
                         'disponible', 'comment', 'faire', 'trouver', 'cherche', 'veux',
                         'voudrais', 'existe', 'avez', 'vous', 'sont', 'dans', 'pour',
                         'avec', 'plus', 'moins', 'cher', 'cette', 'cette', 'page')]
        if search_terms:
            q = Q()
            for term in search_terms[:3]:
                q |= Q(title__icontains=term) | Q(author__full_name__icontains=term) | Q(category__name__icontains=term)
            matched_books = book_qs.filter(q)[:20]
        else:
            matched_books = book_qs.none()

        # Toujours inclure les top livres aussi
        top_books = book_qs.order_by('-rating')[:15]
        all_books = list({b.id: b for b in list(matched_books) + list(top_books)}.values())[:30]

        if all_books:
            books_text = "\n".join(
                f"• {b.title} — {b.author.full_name if b.author else '?'} — "
                f"{b.price or 'Gratuit'} FCFA — {b.category.name if b.category else '?'} — "
                f"Note: {b.rating or '?'}/5 — "
                f"{'En stock' if b.available else 'Indisponible'}"
                for b in all_books
            )
            sections.append(f"── CATALOGUE ({len(all_books)} livres) ──\n{books_text}")

        # ── 3. Auteurs (si mentionné) ──
        if any(w in msg_lower for w in ('auteur', 'écrivain', 'auteurs', 'écrit')):
            authors = Author.objects.all()[:30]
            authors_text = ", ".join(
                f"{a.full_name} ({a.books.count()} livres)" for a in authors
            )
            if authors_text:
                sections.append(f"── AUTEURS SUR FROLLOT ──\n{authors_text}")

        # ── 4. Données personnelles de l'utilisateur ──
        # Commandes
        orders = Order.objects.filter(user=user).order_by('-created_at')[:5]
        if orders:
            orders_text = "\n".join(
                f"• Commande #{o.id} — {o.get_status_display()} — {o.total_amount} FCFA — "
                f"{o.created_at.strftime('%d/%m/%Y')}"
                for o in orders
            )
            sections.append(f"── MES COMMANDES ({orders.count()}) ──\n{orders_text}")
        else:
            sections.append("── MES COMMANDES ──\nAucune commande")

        # Emprunts
        loans = BookLoan.objects.filter(borrower=user).select_related(
            'catalog_item__book'
        ).order_by('-created_at')[:5]
        if loans:
            loans_text = "\n".join(
                f"• {l.catalog_item.book.title} — {l.get_status_display()} — "
                f"{'Retour: ' + l.due_date.strftime('%d/%m/%Y') if l.due_date else ''}"
                for l in loans
            )
            sections.append(f"── MES EMPRUNTS ──\n{loans_text}")

        # Clubs
        memberships = BookClubMembership.objects.filter(
            user=user, membership_status='APPROVED',
        ).select_related('club', 'club__current_book')[:5]
        if memberships:
            clubs_text = "\n".join(
                f"• {m.club.name} — Livre en cours: {m.club.current_book.title if m.club.current_book else 'Aucun'}"
                for m in memberships
            )
            sections.append(f"── MES CLUBS ──\n{clubs_text}")

        # Wishlist
        try:
            from apps.wishlist.models import WishlistItem
            wish = WishlistItem.objects.filter(user=user).select_related('book')[:10]
            if wish:
                wish_text = ", ".join(w.book.title for w in wish)
                sections.append(f"── MA WISHLIST ──\n{wish_text}")
        except Exception:
            pass

        # ── 5. Clubs publics (si question sur les clubs) ──
        if any(w in msg_lower for w in ('club', 'clubs', 'rejoindre', 'lecture')):
            public_clubs = BookClub.objects.filter(is_public=True).select_related('current_book')[:10]
            if public_clubs:
                clubs_list = "\n".join(
                    f"• {c.name} — {c.active_members_count} membres — "
                    f"Livre: {c.current_book.title if c.current_book else 'Aucun'} — "
                    f"/{c.slug}"
                    for c in public_clubs
                )
                sections.append(f"── CLUBS DISPONIBLES ──\n{clubs_list}")

        # ── 6. Bibliothèques (si question sur biblio/emprunt) ──
        if any(w in msg_lower for w in ('bibliothèque', 'biblio', 'emprunt', 'emprunter', 'prêt')):
            libraries = Organization.objects.filter(
                org_type='BIBLIOTHEQUE', is_active=True,
            )[:5]
            if libraries:
                lib_text = "\n".join(
                    f"• {l.name} — {l.city or '?'} — /organizations/{l.slug}"
                    for l in libraries
                )
                sections.append(f"── BIBLIOTHÈQUES ──\n{lib_text}")

        # ── 7. Catégories/genres disponibles ──
        if any(w in msg_lower for w in ('genre', 'catégorie', 'genres', 'type')):
            cats = Category.objects.all()
            if cats:
                sections.append(f"── GENRES DISPONIBLES ──\n{', '.join(c.name for c in cats)}")

        # ── 8. Guide plateforme (toujours) ──
        sections.append(prompts.CHATBOT_PLATFORM_GUIDE)

        return "\n\n".join(sections)

    def post(self, request):
        ser = ChatbotSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        d = ser.validated_data
        user = request.user

        # Construire le contexte riche
        rich_context = self._build_rich_context(user, d['message'], d['context_page'])
        system = prompts.CHATBOT_SYSTEM + "\n\n" + rich_context

        # Construire les messages avec historique
        messages = []
        for msg in (d.get('history') or [])[-10:]:  # Max 10 messages d'historique
            role = msg.get('role', '')
            content = msg.get('content', '')
            if role in ('user', 'assistant') and content:
                messages.append({"role": role, "content": content})
        messages.append({"role": "user", "content": d['message']})

        try:
            start = time.time()
            client = get_client()
            model = getattr(settings, 'AI_MODEL', 'claude-haiku-4-5-20251001')

            # Vérifier quota
            if not check_quota(user.id):
                raise QuotaExceededError("Quota IA journalier atteint.")

            response = client.messages.create(
                model=model,
                max_tokens=800,
                temperature=0.7,
                system=system,
                messages=messages,
            )
            result = response.content[0].text
            increment_quota(user.id)

            self._log_generation(
                user, 'chatbot', d['message'], result,
                model=model,
                tokens_in=response.usage.input_tokens,
                tokens_out=response.usage.output_tokens,
                duration_ms=int((time.time() - start) * 1000),
            )
            return Response({'reply': result})
        except Exception as e:
            return self._handle_error(e)


class ClassifyContactView(BaseAIView):
    """I2 — Classification contact."""
    permission_classes = [IsAdminUser]

    def post(self, request):
        ser = ClassifyContactSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        d = ser.validated_data
        user_msg = f"De: {d['sender_email']}\nSujet: {d['subject']}\nMessage: {d['message']}"

        try:
            start = time.time()
            result = ask_claude_json(
                prompts.CLASSIFY_CONTACT, user_msg,
                prompt_type='contact_classify',
                user_id=request.user.id,
                max_tokens=512,
            )
            self._log_generation(
                request.user, 'contact_classify', user_msg[:300],
                json.dumps(result, ensure_ascii=False),
                duration_ms=int((time.time() - start) * 1000),
            )
            return Response(result)
        except Exception as e:
            return self._handle_error(e)


class GenerateBioView(BaseAIView):
    """H1 — Bio auto-générée."""

    def post(self, request):
        user = request.user
        from apps.books.models import Book
        from apps.social.models import BookClubMembership

        purchased = Book.objects.filter(
            orders__user=user, orders__status='PAID'
        ).select_related('author', 'category')[:10]
        clubs = BookClubMembership.objects.filter(
            user=user, membership_status='APPROVED'
        ).select_related('club')[:5]

        tastes = ", ".join(b.category.name for b in purchased if b.category) or "éclectique"
        authors = ", ".join(b.author.full_name for b in purchased if b.author) or "divers"
        club_names = ", ".join(m.club.name for m in clubs) or "aucun"

        user_msg = (
            f"Prénom: {user.first_name}\n"
            f"Genres lus: {tastes}\n"
            f"Auteurs lus: {authors}\n"
            f"Clubs: {club_names}"
        )

        try:
            start = time.time()
            result = ask_claude(
                prompts.GENERATE_BIO, user_msg,
                prompt_type='bio',
                user_id=user.id,
                max_tokens=256,
                temperature=0.8,
            )
            self._log_generation(
                user, 'bio', user_msg, result,
                duration_ms=int((time.time() - start) * 1000),
            )
            return Response({'bio': result})
        except Exception as e:
            return self._handle_error(e)
