from django.conf import settings
from django.db import models


class AIGeneration(models.Model):
    """Trace chaque appel IA pour audit, debug et analytics."""

    PROMPT_TYPES = [
        ('categorize', 'Catégorisation livre'),
        ('description', 'Génération description'),
        ('back_cover', '4e de couverture'),
        ('summary', 'Résumé livre'),
        ('reviews_synthesis', 'Synthèse avis'),
        ('manuscript_analysis', 'Analyse manuscrit'),
        ('semantic_search', 'Recherche sémantique'),
        ('recommendation', 'Recommandation'),
        ('cross_sell', 'Cross-sell'),
        ('moderation', 'Modération'),
        ('discussion_summary', 'Résumé discussion'),
        ('discussion_questions', 'Questions discussion'),
        ('spoiler_detection', 'Détection spoiler'),
        ('meeting_summary', 'Résumé séance'),
        ('chatbot', 'Chatbot'),
        ('contact_classify', 'Classification contact'),
        ('newsletter', 'Newsletter'),
        ('bio', 'Bio profil'),
        ('price_suggest', 'Suggestion prix'),
        ('vendor_trends', 'Tendances vendeur'),
        ('stock_predict', 'Prévision stock'),
        ('library_recommend', 'Recommandation bibliothèque'),
        ('other', 'Autre'),
    ]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='ai_generations',
    )
    prompt_type = models.CharField(max_length=30, choices=PROMPT_TYPES, db_index=True)
    input_text = models.TextField(help_text="Message envoyé à Claude (tronqué si long)")
    output_text = models.TextField(help_text="Réponse de Claude")
    model_used = models.CharField(max_length=60, default='claude-sonnet-4-20250514')
    tokens_in = models.PositiveIntegerField(default=0)
    tokens_out = models.PositiveIntegerField(default=0)
    duration_ms = models.PositiveIntegerField(default=0)
    # Lien optionnel vers l'objet concerné
    content_type = models.CharField(max_length=50, blank=True, help_text="Ex: book, manuscript, club")
    object_id = models.PositiveIntegerField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Génération IA'
        verbose_name_plural = 'Générations IA'

    def __str__(self):
        return f"{self.get_prompt_type_display()} — {self.created_at:%d/%m %H:%M}"

    @property
    def cost_estimate_usd(self):
        """Estimation du coût (tarifs Claude Sonnet approximatifs)."""
        return (self.tokens_in * 3 + self.tokens_out * 15) / 1_000_000
