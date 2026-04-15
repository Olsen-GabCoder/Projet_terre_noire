from rest_framework import serializers

from .models import (
    ServiceListing, ServiceRequest, ServiceQuote, ServiceOrder,
    EditorialProject, ProjectTask, PrintRequest,
    ProfessionalWallet, ProfessionalWalletTransaction,
    ServiceProviderReview,
    QuoteTemplate, QuoteTemplateLot, QuoteTemplateItem, Quote, QuoteLot, QuoteItem,
)


# ── ServiceListing ──

class ServiceListingSerializer(serializers.ModelSerializer):
    provider_name = serializers.SerializerMethodField()
    provider_image = serializers.SerializerMethodField()
    provider_slug = serializers.SlugField(source='provider.slug', read_only=True)
    provider_verified = serializers.BooleanField(source='provider.is_verified', read_only=True)
    service_type_display = serializers.CharField(source='get_service_type_display', read_only=True)
    price_type_display = serializers.CharField(source='get_price_type_display', read_only=True)

    class Meta:
        model = ServiceListing
        fields = [
            'id', 'provider', 'provider_name', 'provider_image',
            'provider_slug', 'provider_verified',
            'service_type', 'service_type_display', 'title', 'slug',
            'description', 'price_type', 'price_type_display',
            'base_price', 'turnaround_days', 'languages', 'genres',
            'portfolio_samples', 'is_active', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'slug', 'created_at', 'updated_at']

    def get_provider_name(self, obj):
        return obj.provider.user.get_full_name()

    def get_provider_image(self, obj):
        user = obj.provider.user
        image = user.profile_image if user.profile_image else obj.provider.profile_image
        if image:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(image.url)
            return image.url
        return None


class ServiceListingCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = ServiceListing
        fields = [
            'service_type', 'title', 'description', 'price_type',
            'base_price', 'turnaround_days', 'languages', 'genres',
            'portfolio_samples',
        ]

    def create(self, validated_data):
        validated_data['provider'] = self.context['provider']
        return super().create(validated_data)


# ── ServiceRequest ──

class ServiceRequestSerializer(serializers.ModelSerializer):
    client_name = serializers.SerializerMethodField()
    provider_name = serializers.SerializerMethodField()
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    quotes_count = serializers.SerializerMethodField()
    pending_quote_id = serializers.SerializerMethodField()

    class Meta:
        model = ServiceRequest
        fields = [
            'id', 'client', 'client_name', 'listing',
            'provider_profile', 'provider_name',
            'title', 'description', 'requirements', 'file',
            'page_count', 'word_count', 'budget_min', 'budget_max',
            'status', 'status_display', 'quotes_count', 'pending_quote_id',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'client', 'created_at', 'updated_at']

    def get_client_name(self, obj):
        return obj.client.get_full_name()

    def get_provider_name(self, obj):
        return obj.provider_profile.user.get_full_name()

    def get_quotes_count(self, obj):
        return obj.quotes.count()

    def get_pending_quote_id(self, obj):
        # Utilise le prefetch si disponible, sinon requête directe
        quote = obj.quotes.filter(status='PENDING').first()
        return quote.id if quote else None

    def to_representation(self, instance):
        data = super().to_representation(instance)
        # SimpleUserSerializer pattern for client
        data['client_info'] = {
            'id': instance.client.id,
            'full_name': instance.client.get_full_name(),
            'email': instance.client.email,
        }
        return data


class ServiceRequestCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = ServiceRequest
        fields = [
            'listing', 'provider_profile', 'title', 'description',
            'requirements', 'file', 'page_count', 'word_count',
            'budget_min', 'budget_max',
        ]

    def create(self, validated_data):
        validated_data['client'] = self.context['request'].user
        validated_data['status'] = 'SUBMITTED'
        return super().create(validated_data)


# ── ServiceQuote ──

class ServiceQuoteSerializer(serializers.ModelSerializer):
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model = ServiceQuote
        fields = [
            'id', 'request', 'price', 'turnaround_days', 'message',
            'scope_of_work', 'revision_rounds', 'payment_terms',
            'methodology', 'milestones', 'reporting_frequency', 'exclusions',
            'status', 'status_display', 'valid_until', 'created_at',
        ]
        read_only_fields = ['id', 'created_at']


class ServiceQuoteCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = ServiceQuote
        fields = [
            'request', 'price', 'turnaround_days', 'message',
            'scope_of_work', 'revision_rounds', 'payment_terms',
            'methodology', 'milestones', 'reporting_frequency', 'exclusions',
            'valid_until',
        ]

    def validate_request(self, value):
        if value.status not in ('SUBMITTED', 'QUOTED'):
            raise serializers.ValidationError(
                "Impossible de créer un devis pour une demande avec ce statut."
            )
        return value

    def create(self, validated_data):
        quote = super().create(validated_data)
        # Mettre à jour le statut de la demande
        request_obj = quote.request
        request_obj.status = 'QUOTED'
        request_obj.save(update_fields=['status', 'updated_at'])

        # Générer le PDF du devis et envoyer un email au client
        import logging
        logger = logging.getLogger(__name__)
        try:
            from apps.core.invoice import generate_service_quote_pdf
            from apps.core.email import send_templated_email
            from django.conf import settings

            pdf_buffer = generate_service_quote_pdf(quote)
            pdf_content = pdf_buffer.getvalue()
            filename = f'devis-service-{quote.id:06d}.pdf'

            client = request_obj.client
            provider_name = request_obj.provider_profile.user.get_full_name()
            frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:5173')

            send_templated_email(
                subject=f"Devis reçu — {request_obj.title}",
                template_name='service_quote',
                context={
                    'client_name': client.get_full_name(),
                    'provider_name': provider_name,
                    'request_title': request_obj.title,
                    'quote_id': quote.id,
                    'price': str(quote.price),
                    'turnaround_days': quote.turnaround_days,
                    'revision_rounds': quote.revision_rounds,
                    'valid_until': quote.valid_until,
                    'scope_of_work': quote.scope_of_work,
                    'methodology': quote.methodology,
                    'frontend_url': frontend_url,
                },
                to_emails=[client.email],
                attachments=[(filename, pdf_content, 'application/pdf')],
            )
            logger.info(f"Devis #{quote.id} — email envoyé à {client.email}")
        except Exception as e:
            logger.error(f"Erreur envoi email devis #{quote.id}: {e}", exc_info=True)

        return quote


class ServiceQuoteRespondSerializer(serializers.Serializer):
    accept = serializers.BooleanField()
    coupon_code = serializers.CharField(max_length=50, required=False, allow_blank=True, default='')


# ── ServiceOrder ──

class ServiceOrderSerializer(serializers.ModelSerializer):
    client_name = serializers.SerializerMethodField()
    provider_name = serializers.SerializerMethodField()
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    request_title = serializers.CharField(source='request.title', read_only=True)
    has_deliverable = serializers.SerializerMethodField()
    deliverable_filename = serializers.SerializerMethodField()
    deliverable_size = serializers.SerializerMethodField()
    max_revision_rounds = serializers.SerializerMethodField()

    class Meta:
        model = ServiceOrder
        fields = [
            'id', 'request', 'request_title', 'quote', 'client', 'client_name',
            'provider', 'provider_name', 'status', 'status_display',
            'amount', 'discount_amount', 'coupon', 'platform_fee', 'has_deliverable', 'deliverable_filename',
            'deliverable_size', 'revision_count', 'last_revision_reason',
            'max_revision_rounds', 'delivered_at', 'deadline', 'completed_at', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_client_name(self, obj):
        return obj.client.get_full_name()

    def get_provider_name(self, obj):
        return obj.provider.user.get_full_name()

    def get_has_deliverable(self, obj):
        return bool(obj.deliverable_file)

    def get_deliverable_filename(self, obj):
        if obj.deliverable_file:
            import os
            return os.path.basename(obj.deliverable_file.name)
        return None

    def get_deliverable_size(self, obj):
        if obj.deliverable_file:
            try:
                return obj.deliverable_file.size
            except (FileNotFoundError, OSError):
                return None
        return None

    def get_max_revision_rounds(self, obj):
        if obj.quote:
            return obj.quote.revision_rounds
        return 0


class ServiceOrderStatusSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=ServiceOrder.STATUS_CHOICES)


# ── EditorialProject ──

class EditorialProjectSerializer(serializers.ModelSerializer):
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    organization_name = serializers.CharField(source='organization.name', read_only=True)
    tasks_count = serializers.SerializerMethodField()

    class Meta:
        model = EditorialProject
        fields = [
            'id', 'manuscript', 'organization', 'organization_name',
            'book', 'title', 'description', 'status', 'status_display',
            'tasks_count', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'organization', 'created_at', 'updated_at']

    def get_tasks_count(self, obj):
        return obj.tasks.count()


class EditorialProjectCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = EditorialProject
        fields = ['manuscript', 'book', 'title', 'description']

    def create(self, validated_data):
        validated_data['organization'] = self.context['organization']
        return super().create(validated_data)


# ── ProjectTask ──

class ProjectTaskSerializer(serializers.ModelSerializer):
    task_type_display = serializers.CharField(source='get_task_type_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    assigned_to_name = serializers.SerializerMethodField()

    class Meta:
        model = ProjectTask
        fields = [
            'id', 'project', 'task_type', 'task_type_display',
            'service_order', 'assigned_to', 'assigned_to_name',
            'title', 'notes', 'due_date', 'status', 'status_display',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_assigned_to_name(self, obj):
        if obj.assigned_to:
            return obj.assigned_to.user.get_full_name()
        return None


class ProjectTaskCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProjectTask
        fields = [
            'project', 'task_type', 'service_order', 'assigned_to',
            'title', 'notes', 'due_date',
        ]


class ProjectTaskStatusSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=ProjectTask.STATUS_CHOICES)


# ── PrintRequest ──

class PrintRequestSerializer(serializers.ModelSerializer):
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    book_title = serializers.CharField(source='book.title', read_only=True)
    printer_name = serializers.CharField(source='printer.name', read_only=True)
    requester_name = serializers.SerializerMethodField()

    class Meta:
        model = PrintRequest
        fields = [
            'id', 'book', 'book_title', 'project', 'requester', 'requester_name',
            'requester_org', 'printer', 'printer_name',
            'format_specs', 'quantity', 'unit_price', 'total_price',
            'delivery_address', 'status', 'status_display',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'requester', 'created_at', 'updated_at']

    def get_requester_name(self, obj):
        return obj.requester.get_full_name()


class PrintRequestCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = PrintRequest
        fields = [
            'book', 'project', 'printer', 'format_specs',
            'quantity', 'delivery_address',
        ]

    def create(self, validated_data):
        validated_data['requester'] = self.context['request'].user
        org = self.context.get('requester_org')
        if org:
            validated_data['requester_org'] = org
        return super().create(validated_data)


class PrintRequestStatusSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=PrintRequest.STATUS_CHOICES)
    unit_price = serializers.DecimalField(max_digits=10, decimal_places=2, required=False)
    total_price = serializers.DecimalField(max_digits=10, decimal_places=2, required=False)


# ── Wallet ──

class ProfessionalWalletSerializer(serializers.ModelSerializer):
    professional_name = serializers.SerializerMethodField()

    class Meta:
        model = ProfessionalWallet
        fields = [
            'id', 'professional', 'professional_name',
            'balance', 'total_earned', 'total_withdrawn', 'updated_at',
        ]
        read_only_fields = fields

    def get_professional_name(self, obj):
        return obj.professional.user.get_full_name()


class ProfessionalWalletTransactionSerializer(serializers.ModelSerializer):
    type_display = serializers.CharField(source='get_transaction_type_display', read_only=True)

    class Meta:
        model = ProfessionalWalletTransaction
        fields = [
            'id', 'transaction_type', 'type_display', 'amount',
            'description', 'service_order', 'created_at',
        ]
        read_only_fields = fields


# ── Avis Prestataires (Frollot Connect) ──

class ServiceProviderReviewSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source='user.get_full_name', read_only=True)
    provider_name = serializers.SerializerMethodField()

    class Meta:
        model = ServiceProviderReview
        fields = [
            'id', 'user', 'user_name', 'provider', 'provider_name',
            'service_order', 'rating', 'comment',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'user', 'provider', 'created_at', 'updated_at']

    def get_provider_name(self, obj):
        return obj.provider.user.get_full_name()


class ServiceProviderReviewCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = ServiceProviderReview
        fields = ['rating', 'comment', 'service_order']

    def validate(self, attrs):
        user = self.context['request'].user
        provider = self.context['provider']
        if ServiceProviderReview.objects.filter(user=user, provider=provider).exists():
            raise serializers.ValidationError("Vous avez déjà laissé un avis sur ce prestataire.")
        return attrs

    def create(self, validated_data):
        validated_data['user'] = self.context['request'].user
        validated_data['provider'] = self.context['provider']
        return super().create(validated_data)


# ═══════════════════════════════════════════════════
#  DQE — Serializers
# ═══════════════════════════════════════════════════


class QuoteTemplateItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = QuoteTemplateItem
        fields = ['id', 'designation', 'unit', 'default_quantity', 'default_unit_price', 'order']

class QuoteTemplateLotSerializer(serializers.ModelSerializer):
    items = QuoteTemplateItemSerializer(many=True, read_only=True)
    class Meta:
        model = QuoteTemplateLot
        fields = ['id', 'name', 'order', 'items']

class QuoteTemplateListSerializer(serializers.ModelSerializer):
    organization_name = serializers.CharField(source='organization.name', default=None)
    publishing_model_display = serializers.CharField(source='get_publishing_model_display', default='', read_only=True)
    lots_count = serializers.SerializerMethodField()
    class Meta:
        model = QuoteTemplate
        fields = [
            'id', 'name', 'slug', 'description', 'organization', 'organization_name',
            'publishing_model', 'publishing_model_display',
            'is_public', 'is_active', 'lots_count',
        ]
    def get_lots_count(self, obj):
        return obj.lots.count()

class QuoteTemplateDetailSerializer(serializers.ModelSerializer):
    lots = QuoteTemplateLotSerializer(many=True, read_only=True)
    organization_name = serializers.CharField(source='organization.name', default=None)
    publishing_model_display = serializers.CharField(source='get_publishing_model_display', default='', read_only=True)
    class Meta:
        model = QuoteTemplate
        fields = [
            'id', 'name', 'slug', 'description', 'organization', 'organization_name',
            'publishing_model', 'publishing_model_display',
            'is_public', 'public_description', 'internal_notes',
            'is_active', 'lots', 'created_at', 'updated_at',
        ]

class QuoteTemplatePublicSerializer(serializers.ModelSerializer):
    """Serializer pour la vitrine publique — jamais de notes internes."""
    lots = QuoteTemplateLotSerializer(many=True, read_only=True)
    organization_name = serializers.CharField(source='organization.name', default=None)
    publishing_model_display = serializers.CharField(source='get_publishing_model_display', default='', read_only=True)
    class Meta:
        model = QuoteTemplate
        fields = [
            'id', 'name', 'slug', 'public_description', 'organization', 'organization_name',
            'publishing_model', 'publishing_model_display',
            'lots', 'created_at',
        ]

class QuoteItemSerializer(serializers.ModelSerializer):
    total = serializers.DecimalField(max_digits=14, decimal_places=2, read_only=True)
    class Meta:
        model = QuoteItem
        fields = ['id', 'designation', 'description', 'unit', 'quantity', 'unit_price', 'total', 'order']

class QuoteItemWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = QuoteItem
        fields = ['designation', 'description', 'unit', 'quantity', 'unit_price', 'order']

class QuoteLotSerializer(serializers.ModelSerializer):
    items = QuoteItemSerializer(many=True, read_only=True)
    class Meta:
        model = QuoteLot
        fields = ['id', 'name', 'order', 'subtotal', 'items']

class QuoteLotWriteSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=200)
    order = serializers.IntegerField(default=0)
    items = QuoteItemWriteSerializer(many=True)

class QuoteListSerializer(serializers.ModelSerializer):
    provider_organization_name = serializers.CharField(source='provider_organization.name', default=None)
    client_display = serializers.SerializerMethodField()
    publishing_model_display = serializers.CharField(source='get_publishing_model_display', default='', read_only=True)
    lots_count = serializers.SerializerMethodField()
    class Meta:
        model = Quote
        fields = [
            'id', 'reference', 'title', 'status',
            'publishing_model', 'publishing_model_display',
            'provider_organization', 'provider_organization_name',
            'client', 'client_display', 'client_email',
            'subtotal', 'discount_amount', 'tax_amount', 'total_ttc',
            'delivery_days', 'valid_until', 'lots_count',
            'manuscript', 'service_request',
            'created_at', 'sent_at', 'accepted_at',
        ]
    def get_client_display(self, obj):
        if obj.client:
            return obj.client.get_full_name() or obj.client.username
        return obj.client_name or obj.client_email or '—'
    def get_lots_count(self, obj):
        return obj.lots.count()

class QuoteDetailSerializer(serializers.ModelSerializer):
    lots = QuoteLotSerializer(many=True, read_only=True)
    provider_organization_name = serializers.CharField(source='provider_organization.name', default=None)
    client_display = serializers.SerializerMethodField()
    template_name = serializers.CharField(source='template.name', default=None)
    publishing_model_display = serializers.CharField(source='get_publishing_model_display', default='', read_only=True)
    replaced_by = serializers.SerializerMethodField()

    class Meta:
        model = Quote
        fields = [
            'id', 'reference', 'title', 'status',
            'template', 'template_name',
            'publishing_model', 'publishing_model_display',
            'royalty_terms', 'print_run', 'retail_price',
            'author_must_purchase', 'author_purchase_quantity',
            'parent_quote', 'replaced_by',
            'provider_organization', 'provider_organization_name',
            'provider_profile', 'created_by',
            'client', 'client_display', 'client_name', 'client_email',
            'manuscript', 'service_request',
            'lots',
            'subtotal', 'discount_type', 'discount_value', 'discount_amount',
            'subtotal_after_discount', 'tax_rate', 'tax_amount', 'total_ttc',
            'payment_schedule', 'delivery_days', 'validity_days', 'valid_until',
            'revision_rounds', 'notes',
            'created_at', 'updated_at', 'sent_at', 'accepted_at',
            'rejected_at', 'rejection_reason',
        ]

    def get_client_display(self, obj):
        if obj.client:
            return obj.client.get_full_name() or obj.client.username
        return obj.client_name or obj.client_email or '—'

    def get_replaced_by(self, obj):
        revision = obj.revisions.order_by('-created_at').first()
        if revision:
            return {'id': revision.id, 'reference': revision.reference}
        return None

class QuoteCreateSerializer(serializers.Serializer):
    """Serializer pour créer un devis complet (quote + lots + items) en une seule requête."""
    title = serializers.CharField(max_length=300)
    template_id = serializers.IntegerField(required=False, allow_null=True)
    manuscript_id = serializers.IntegerField(required=False, allow_null=True)
    service_request_id = serializers.IntegerField(required=False, allow_null=True)
    organization_id = serializers.IntegerField(required=False, allow_null=True)
    client_id = serializers.IntegerField(required=False, allow_null=True)
    client_name = serializers.CharField(max_length=200, required=False, allow_blank=True)
    client_email = serializers.EmailField(required=False, allow_blank=True)
    publishing_model = serializers.ChoiceField(
        choices=Quote.PUBLISHING_MODEL_CHOICES, required=False, allow_blank=True, default='',
    )
    royalty_terms = serializers.ListField(child=serializers.DictField(), required=False, default=list)
    print_run = serializers.IntegerField(required=False, allow_null=True, default=None)
    retail_price = serializers.DecimalField(max_digits=10, decimal_places=2, required=False, allow_null=True, default=None)
    parent_quote_id = serializers.IntegerField(required=False, allow_null=True, default=None)
    discount_type = serializers.ChoiceField(choices=['PERCENT', 'AMOUNT'], default='PERCENT')
    discount_value = serializers.DecimalField(max_digits=10, decimal_places=2, default=0)
    tax_rate = serializers.DecimalField(max_digits=5, decimal_places=2, default=0)
    delivery_days = serializers.IntegerField(default=30)
    validity_days = serializers.IntegerField(default=30)
    revision_rounds = serializers.IntegerField(default=1)
    notes = serializers.CharField(required=False, allow_blank=True, default='')
    payment_schedule = serializers.ListField(child=serializers.DictField(), required=False, default=list)
    lots = QuoteLotWriteSerializer(many=True)
