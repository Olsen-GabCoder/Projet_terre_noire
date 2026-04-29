from rest_framework import serializers


# ─── Inputs ───────────────────────────────────────────────────────

class CategorizeBookSerializer(serializers.Serializer):
    title = serializers.CharField()
    author = serializers.CharField(required=False, default='')
    description = serializers.CharField(required=False, default='')


class GenerateDescriptionSerializer(serializers.Serializer):
    title = serializers.CharField()
    author = serializers.CharField(required=False, default='')
    genre = serializers.CharField(required=False, default='')
    context = serializers.CharField(required=False, default='', help_text="Infos supplémentaires")


class GenerateBackCoverSerializer(serializers.Serializer):
    title = serializers.CharField()
    author = serializers.CharField(required=False, default='')
    description = serializers.CharField(required=False, default='')
    genre = serializers.CharField(required=False, default='')


class SummarizeBookSerializer(serializers.Serializer):
    book_id = serializers.IntegerField()


class SynthesizeReviewsSerializer(serializers.Serializer):
    book_id = serializers.IntegerField()


class AnalyzeManuscriptSerializer(serializers.Serializer):
    manuscript_id = serializers.IntegerField(required=False)
    title = serializers.CharField(required=False, default='')
    text = serializers.CharField(required=False, default='', help_text="Extrait du manuscrit (max 5000 car)")


class SemanticSearchSerializer(serializers.Serializer):
    query = serializers.CharField(max_length=500)


class RecommendBooksSerializer(serializers.Serializer):
    """Pas de champs requis — utilise le profil de l'utilisateur connecté."""
    count = serializers.IntegerField(required=False, default=8, min_value=1, max_value=20)


class CrossSellSerializer(serializers.Serializer):
    book_ids = serializers.ListField(child=serializers.IntegerField(), min_length=1, max_length=10)


class ModerateMessageSerializer(serializers.Serializer):
    message = serializers.CharField(max_length=5000)
    club_name = serializers.CharField(required=False, default='')


class SummarizeDiscussionSerializer(serializers.Serializer):
    club_id = serializers.IntegerField()
    last_n_messages = serializers.IntegerField(required=False, default=50, min_value=10, max_value=200)


class DiscussionQuestionsSerializer(serializers.Serializer):
    book_id = serializers.IntegerField()
    checkpoint_label = serializers.CharField(required=False, default='')


class DetectSpoilerSerializer(serializers.Serializer):
    review_text = serializers.CharField(max_length=5000)
    book_title = serializers.CharField(required=False, default='')


class ChatbotSerializer(serializers.Serializer):
    message = serializers.CharField(max_length=2000)
    context_page = serializers.CharField(required=False, default='', help_text="Page actuelle de l'utilisateur")
    history = serializers.ListField(
        child=serializers.DictField(), required=False, default=list,
        help_text="Historique [{role, content}, ...]",
    )


class ClassifyContactSerializer(serializers.Serializer):
    subject = serializers.CharField()
    message = serializers.CharField()
    sender_email = serializers.CharField(required=False, default='')


class GenerateBioSerializer(serializers.Serializer):
    """Pas de champs requis — utilise le profil de l'utilisateur connecté."""
    pass


class SummarizeMeetingSerializer(serializers.Serializer):
    session_id = serializers.IntegerField()


class DetectInactiveMembersSerializer(serializers.Serializer):
    club_id = serializers.IntegerField()
    days_threshold = serializers.IntegerField(required=False, default=14, min_value=3, max_value=90)


class RecommendPublishersSerializer(serializers.Serializer):
    manuscript_id = serializers.IntegerField()


class AnalyzeVendorTrendsSerializer(serializers.Serializer):
    """Pas de champs requis — utilise les organisations du vendeur connecté."""
    pass


class PredictStockSerializer(serializers.Serializer):
    book_id = serializers.IntegerField()
    org_id = serializers.IntegerField(required=False, help_text="Organisation vendeur (optionnel)")


class SuggestLibraryAcquisitionsSerializer(serializers.Serializer):
    org_id = serializers.IntegerField()


class LibraryRecommendSerializer(serializers.Serializer):
    org_id = serializers.IntegerField()
    count = serializers.IntegerField(required=False, default=6, min_value=1, max_value=12)


class SimilarManuscriptsSerializer(serializers.Serializer):
    manuscript_id = serializers.IntegerField()


class EstimateQuoteSerializer(serializers.Serializer):
    manuscript_id = serializers.IntegerField(required=False)
    title = serializers.CharField(required=False, default='')
    genre = serializers.CharField(required=False, default='')
    page_count = serializers.IntegerField(required=False, default=0)
    publishing_model = serializers.CharField(required=False, default='')


class RecommendClubsSerializer(serializers.Serializer):
    count = serializers.IntegerField(required=False, default=5, min_value=1, max_value=10)


class PredictLateReturnSerializer(serializers.Serializer):
    org_id = serializers.IntegerField()


class SuggestAuthorsSerializer(serializers.Serializer):
    count = serializers.IntegerField(required=False, default=6, min_value=1, max_value=12)


class ActivitySummarySerializer(serializers.Serializer):
    """Pas de champs requis — utilise le profil de l'utilisateur connecté."""
    pass


class DashboardHelpSerializer(serializers.Serializer):
    page = serializers.CharField(max_length=200, help_text="Chemin de la page dashboard")


class PersonalizedNewsletterSerializer(serializers.Serializer):
    subscriber_email = serializers.EmailField(help_text="Email de l'abonné pour la prévisualisation")


class WishlistAlertSerializer(serializers.Serializer):
    """Pas de champs requis — utilise la wishlist de l'utilisateur connecté."""
    pass


class SmartCouponTargetingSerializer(serializers.Serializer):
    segment = serializers.ChoiceField(
        choices=['churn', 'high_value', 'new', 'inactive'],
        required=False, default='churn',
    )
    count = serializers.IntegerField(required=False, default=10, min_value=1, max_value=50)


class SuggestPriceSerializer(serializers.Serializer):
    book_id = serializers.IntegerField()


class QuotaSerializer(serializers.Serializer):
    remaining = serializers.IntegerField()
    limit = serializers.IntegerField()
    used = serializers.IntegerField()
