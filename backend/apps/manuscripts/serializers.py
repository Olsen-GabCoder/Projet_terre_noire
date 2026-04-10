from rest_framework import serializers
from .models import Manuscript


class ManuscriptSerializer(serializers.ModelSerializer):
    """
    Sérialiseur complet pour la soumission et la gestion de manuscrits.
    """

    status_display = serializers.CharField(source='get_status_display', read_only=True)
    file_url = serializers.SerializerMethodField()
    target_organization_name = serializers.SerializerMethodField()
    submitter_name = serializers.SerializerMethodField()
    reviewed_by_name = serializers.SerializerMethodField()
    quotes_summary = serializers.SerializerMethodField()

    class Meta:
        model = Manuscript
        fields = [
            'id',
            'title',
            'author_name',
            'pen_name',
            'email',
            'phone_number',
            'country',
            'genre',
            'language',
            'page_count',
            'file',
            'file_url',
            'description',
            'terms_accepted',
            'target_organization',
            'target_organization_name',
            'is_open_market',
            'open_market_locked',
            'open_market_deadline',
            'submitter',
            'submitter_name',
            'status',
            'status_display',
            'reviewed_by',
            'reviewed_by_name',
            'reviewed_at',
            'rejection_reason',
            'submitted_at',
            'quotes_summary',
        ]
        read_only_fields = [
            'id', 'status', 'submitted_at', 'reviewed_by', 'reviewed_at',
            'open_market_locked', 'open_market_deadline',
        ]

    def get_target_organization_name(self, obj):
        if obj.target_organization:
            return obj.target_organization.name
        return None

    def get_submitter_name(self, obj):
        if obj.submitter:
            return obj.submitter.get_full_name() or obj.submitter.username
        return None

    def get_reviewed_by_name(self, obj):
        if obj.reviewed_by:
            return obj.reviewed_by.get_full_name() or obj.reviewed_by.username
        return None

    def get_file_url(self, obj):
        if obj.file:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.file.url)
            return obj.file.url
        return None

    def get_quotes_summary(self, obj):
        """Résumé des devis DQE liés au manuscrit (visible par l'auteur)."""
        if not hasattr(obj, 'dqe_quotes'):
            return []
        quotes = obj.dqe_quotes.select_related('provider_organization').all()
        return [
            {
                'id': q.id,
                'reference': q.reference,
                'status': q.status,
                'status_display': q.get_status_display(),
                'publishing_model': q.publishing_model,
                'publishing_model_display': q.get_publishing_model_display() if q.publishing_model else '',
                'total_ttc': str(q.total_ttc),
                'organization_name': q.provider_organization.name if q.provider_organization else None,
                'sent_at': q.sent_at.isoformat() if q.sent_at else None,
                'valid_until': q.valid_until.isoformat() if q.valid_until else None,
            }
            for q in quotes
        ]

    def validate_file(self, value):
        max_size = 10 * 1024 * 1024
        if value.size > max_size:
            raise serializers.ValidationError(
                "Le fichier est trop volumineux. Taille maximale: 10 MB."
            )

        # Validation du contenu réel (magic bytes) en plus de l'extension
        MAGIC_SIGNATURES = {
            b'%PDF': 'pdf',
            b'PK\x03\x04': 'docx',  # DOCX = ZIP
            b'\xd0\xcf\x11\xe0': 'doc',  # DOC = OLE2
        }
        header = value.read(4)
        value.seek(0)

        ext = value.name.rsplit('.', 1)[-1].lower() if '.' in value.name else ''
        matched = any(header.startswith(sig) for sig in MAGIC_SIGNATURES)
        if not matched:
            raise serializers.ValidationError(
                "Le contenu du fichier ne correspond pas à un format PDF, DOCX ou DOC valide."
            )

        return value

    def validate_email(self, value):
        return value.lower()

    def validate_phone_number(self, value):
        cleaned = ''.join(c for c in value if c.isdigit())
        if len(cleaned) < 8:
            raise serializers.ValidationError(
                "Le numéro de téléphone doit contenir au moins 8 chiffres."
            )
        return value.strip()

    def validate_page_count(self, value):
        if value is not None and (value < 1 or value > 10000):
            raise serializers.ValidationError(
                "Le nombre de pages doit être entre 1 et 10 000."
            )
        return value

    def validate_terms_accepted(self, value):
        if value in (True, 'true', '1', 'on', 'yes'):
            return True
        raise serializers.ValidationError(
            "Vous devez accepter les conditions de soumission."
        )

    def validate(self, attrs):
        terms = attrs.get('terms_accepted')
        if terms is None:
            terms = self.initial_data.get('terms_accepted')
        if terms not in (True, 'true', '1', 'on', 'yes'):
            raise serializers.ValidationError({
                'terms_accepted': ["Vous devez accepter les conditions de soumission."]
            })
        attrs['terms_accepted'] = True
        return attrs

    def validate_description(self, value):
        if len(value.strip()) < 50:
            raise serializers.ValidationError(
                "La description doit contenir au moins 50 caractères."
            )
        return value


class ManuscriptListSerializer(serializers.ModelSerializer):
    """Sérialiseur allégé pour les listes (admin, inbox org, mes soumissions)."""

    status_display = serializers.CharField(source='get_status_display', read_only=True)
    genre_display = serializers.CharField(source='get_genre_display', read_only=True)
    language_display = serializers.CharField(source='get_language_display', read_only=True)
    target_organization_name = serializers.SerializerMethodField()

    class Meta:
        model = Manuscript
        fields = [
            'id',
            'title',
            'author_name',
            'email',
            'genre',
            'genre_display',
            'language',
            'language_display',
            'page_count',
            'target_organization',
            'target_organization_name',
            'is_open_market',
            'status',
            'status_display',
            'reviewed_at',
            'rejection_reason',
            'submitted_at',
        ]
        read_only_fields = fields

    def get_target_organization_name(self, obj):
        if obj.target_organization:
            return obj.target_organization.name
        return None


class ManuscriptStatusSerializer(serializers.Serializer):
    """Sérialiseur pour la mise à jour de statut avec feedback."""
    status = serializers.ChoiceField(choices=Manuscript.STATUS_CHOICES)
    rejection_reason = serializers.CharField(required=False, allow_blank=True, default='')
