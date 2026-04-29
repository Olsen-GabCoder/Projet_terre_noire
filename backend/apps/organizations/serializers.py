import json
from datetime import timedelta

from django.utils import timezone
from rest_framework import serializers

from .models import Organization, OrganizationMembership, Invitation, OrganizationReview, Inquiry


class JSONFieldMixin:
    """Validation commune pour les JSONFields envoyés en string (FormData)."""

    def _parse_json_list(self, value, field_name):
        if isinstance(value, str):
            try:
                value = json.loads(value)
            except (json.JSONDecodeError, TypeError):
                raise serializers.ValidationError(f"Format invalide pour {field_name}.")
        if not isinstance(value, list):
            raise serializers.ValidationError(f"{field_name} doit être une liste.")
        return value

    def _parse_json_dict(self, value, field_name):
        if isinstance(value, str):
            try:
                value = json.loads(value)
            except (json.JSONDecodeError, TypeError):
                raise serializers.ValidationError(f"Format invalide pour {field_name}.")
        if not isinstance(value, dict):
            raise serializers.ValidationError(f"{field_name} doit être un objet.")
        return value

    def validate_accepted_genres(self, value):
        value = self._parse_json_list(value, "genres")
        valid = ['ROMAN', 'NOUVELLE', 'POESIE', 'ESSAI', 'THEATRE', 'JEUNESSE', 'BD', 'AUTRE']
        for g in value:
            if g not in valid:
                raise serializers.ValidationError(f"Genre invalide : {g}")
        return value

    def validate_specialties(self, value):
        return self._parse_json_list(value, "spécialités")

    def validate_accepted_languages(self, value):
        return self._parse_json_list(value, "langues acceptées")

    def validate_languages(self, value):
        return self._parse_json_list(value, "langues")

    def validate_required_documents(self, value):
        return self._parse_json_list(value, "documents requis")

    def validate_target_audience(self, value):
        return self._parse_json_list(value, "public cible")

    def validate_payment_methods(self, value):
        return self._parse_json_list(value, "moyens de paiement")

    def validate_social_links(self, value):
        return self._parse_json_dict(value, "réseaux sociaux")

    def validate_business_hours(self, value):
        return self._parse_json_dict(value, "horaires")

    def validate_type_specific_data(self, value):
        return self._parse_json_dict(value, "données spécifiques")

    def validate_is_accepting_manuscripts(self, value):
        if isinstance(value, str):
            return value.lower() in ('true', '1', 'on', 'yes')
        return bool(value)

    def validate_simultaneous_submissions(self, value):
        if isinstance(value, str):
            return value.lower() in ('true', '1', 'on', 'yes')
        return bool(value)


class OrganizationListSerializer(serializers.ModelSerializer):
    org_type_display = serializers.CharField(source='get_org_type_display', read_only=True)
    member_count = serializers.SerializerMethodField()

    class Meta:
        model = Organization
        fields = [
            'id', 'name', 'slug', 'org_type', 'org_type_display',
            'logo', 'city', 'country', 'latitude', 'longitude', 'is_verified', 'member_count', 'created_at',
        ]
        read_only_fields = ['id', 'slug', 'is_verified', 'created_at']

    def get_member_count(self, obj):
        return obj.memberships.filter(is_active=True).count()


class OrganizationDirectorySerializer(serializers.ModelSerializer):
    """Serializer compact pour l'annuaire des organisations."""
    org_type_display = serializers.CharField(source='get_org_type_display', read_only=True)

    class Meta:
        model = Organization
        fields = [
            'id', 'name', 'slug', 'org_type', 'org_type_display',
            'logo', 'description', 'short_description', 'city', 'country', 'latitude', 'longitude',
            'founding_year', 'languages',
            'is_verified', 'is_accepting_manuscripts',
            'accepted_genres', 'specialties',
            'response_time_days',
            'avg_rating', 'review_count', 'avg_response_days',
            'created_at',
        ]


class OrganizationStorefrontSerializer(serializers.ModelSerializer):
    """Vitrine publique complète d'une organisation."""
    org_type_display = serializers.CharField(source='get_org_type_display', read_only=True)
    owner_name = serializers.CharField(source='owner.get_full_name', read_only=True)
    owner_slug = serializers.CharField(source='owner.slug', read_only=True)
    member_count = serializers.SerializerMethodField()
    book_count = serializers.SerializerMethodField()

    class Meta:
        model = Organization
        fields = [
            'id', 'name', 'slug', 'org_type', 'org_type_display',
            'description', 'short_description', 'logo', 'cover_image',
            'email', 'phone_number', 'whatsapp', 'website', 'address', 'po_box', 'city', 'country', 'latitude', 'longitude',
            'social_links', 'business_hours', 'payment_methods',
            'founding_year', 'languages',
            'is_verified', 'is_accepting_manuscripts',
            'accepted_genres', 'accepted_languages', 'specialties', 'submission_guidelines',
            'response_time_days', 'required_documents', 'simultaneous_submissions',
            'editorial_line', 'target_audience',
            'type_specific_data',
            'avg_rating', 'review_count', 'avg_response_days',
            'owner_name', 'owner_slug', 'member_count', 'book_count',
            'created_at',
        ]

    def get_member_count(self, obj):
        return obj.memberships.filter(is_active=True).count()

    def get_book_count(self, obj):
        from apps.services.models import EditorialProject
        return EditorialProject.objects.filter(
            organization=obj, book__isnull=False,
        ).values('book').distinct().count()


class OrganizationMembershipSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source='user.get_full_name', read_only=True)
    user_email = serializers.EmailField(source='user.email', read_only=True)
    role_display = serializers.CharField(source='get_role_display', read_only=True)

    class Meta:
        model = OrganizationMembership
        fields = [
            'id', 'user', 'user_name', 'user_email',
            'role', 'role_display', 'is_active', 'joined_at',
        ]
        read_only_fields = ['id', 'user', 'joined_at']


class OrganizationDetailSerializer(serializers.ModelSerializer):
    org_type_display = serializers.CharField(source='get_org_type_display', read_only=True)
    owner_name = serializers.CharField(source='owner.get_full_name', read_only=True)
    members = serializers.SerializerMethodField()

    class Meta:
        model = Organization
        fields = [
            'id', 'name', 'slug', 'org_type', 'org_type_display', 'description', 'short_description',
            'logo', 'cover_image', 'founding_year', 'languages',
            'email', 'phone_number', 'whatsapp', 'website', 'address', 'po_box', 'city', 'country', 'latitude', 'longitude',
            'social_links', 'business_hours', 'payment_methods',
            'is_accepting_manuscripts', 'accepted_genres', 'accepted_languages',
            'specialties', 'submission_guidelines', 'response_time_days',
            'required_documents', 'simultaneous_submissions', 'editorial_line', 'target_audience',
            'type_specific_data',
            'is_active', 'is_verified', 'owner', 'owner_name',
            'members', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'slug', 'is_verified', 'owner', 'created_at', 'updated_at']

    def get_members(self, obj):
        memberships = obj.memberships.filter(is_active=True).select_related('user')
        return OrganizationMembershipSerializer(memberships, many=True).data


class OrganizationCreateSerializer(JSONFieldMixin, serializers.ModelSerializer):
    class Meta:
        model = Organization
        fields = [
            'name', 'org_type', 'description', 'short_description',
            'logo', 'cover_image', 'founding_year', 'languages',
            'email', 'phone_number', 'whatsapp', 'website', 'address', 'po_box', 'city', 'country', 'latitude', 'longitude',
            'social_links', 'business_hours', 'payment_methods',
            'accepted_genres', 'accepted_languages', 'submission_guidelines', 'is_accepting_manuscripts',
            'specialties', 'response_time_days', 'required_documents', 'simultaneous_submissions',
            'editorial_line', 'target_audience',
            'type_specific_data',
        ]

    def create(self, validated_data):
        user = self.context['request'].user
        validated_data['owner'] = user
        org = super().create(validated_data)
        OrganizationMembership.objects.create(
            organization=org, user=user, role='PROPRIETAIRE',
        )
        return org


class OrganizationUpdateSerializer(JSONFieldMixin, serializers.ModelSerializer):
    """Mise à jour du profil d'une organisation par son admin/propriétaire."""
    class Meta:
        model = Organization
        fields = [
            'name', 'description', 'short_description',
            'logo', 'cover_image', 'founding_year', 'languages',
            'email', 'phone_number', 'whatsapp', 'website', 'address', 'po_box', 'city', 'country', 'latitude', 'longitude',
            'social_links', 'business_hours', 'payment_methods',
            'accepted_genres', 'accepted_languages', 'submission_guidelines', 'is_accepting_manuscripts',
            'specialties', 'response_time_days', 'required_documents', 'simultaneous_submissions',
            'editorial_line', 'target_audience',
            'type_specific_data',
        ]


class MembershipCreateSerializer(serializers.Serializer):
    """Ajouter directement un utilisateur (par ID) à une organisation."""
    user_id = serializers.IntegerField()
    role = serializers.ChoiceField(choices=OrganizationMembership.ROLE_CHOICES, default='MEMBRE')

    def validate_user_id(self, value):
        from django.contrib.auth import get_user_model
        User = get_user_model()
        if not User.objects.filter(pk=value).exists():
            raise serializers.ValidationError("Utilisateur introuvable.")
        return value


# ── Invitations ──

class InvitationListSerializer(serializers.ModelSerializer):
    organization_name = serializers.CharField(source='organization.name', read_only=True)
    organization_type = serializers.CharField(source='organization.org_type', read_only=True)
    invited_by_name = serializers.CharField(source='invited_by.get_full_name', read_only=True)
    role_display = serializers.SerializerMethodField()

    class Meta:
        model = Invitation
        fields = [
            'id', 'organization', 'organization_name', 'organization_type',
            'email', 'role', 'role_display', 'invited_by_name',
            'status', 'message', 'token', 'created_at', 'expires_at',
        ]

    def get_role_display(self, obj):
        return dict(OrganizationMembership.ROLE_CHOICES).get(obj.role, obj.role)


class InvitationCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Invitation
        fields = ['email', 'role', 'message']

    def validate_email(self, value):
        org = self.context['organization']
        value = value.lower()
        if OrganizationMembership.objects.filter(
            organization=org, user__email=value, is_active=True,
        ).exists():
            raise serializers.ValidationError("Cet utilisateur est déjà membre de cette organisation.")
        if Invitation.objects.filter(organization=org, email=value, status='PENDING').exists():
            raise serializers.ValidationError("Une invitation est déjà en attente pour cet email.")
        return value

    def create(self, validated_data):
        validated_data['organization'] = self.context['organization']
        validated_data['invited_by'] = self.context['request'].user
        validated_data['expires_at'] = timezone.now() + timedelta(days=7)
        return super().create(validated_data)


class InvitationResponseSerializer(serializers.Serializer):
    token = serializers.UUIDField()
    accept = serializers.BooleanField()


# ── Avis Organisations (Frollot Connect) ──

class OrganizationReviewSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source='user.get_full_name', read_only=True)
    user_slug = serializers.CharField(source='user.slug', read_only=True)

    class Meta:
        model = OrganizationReview
        fields = [
            'id', 'user', 'user_name', 'user_slug', 'organization',
            'rating', 'comment', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'user', 'organization', 'created_at', 'updated_at']


class OrganizationReviewCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = OrganizationReview
        fields = ['rating', 'comment']

    def validate(self, attrs):
        user = self.context['request'].user
        organization = self.context['organization']
        if OrganizationReview.objects.filter(user=user, organization=organization).exists():
            raise serializers.ValidationError("Vous avez déjà laissé un avis sur cette organisation.")
        return attrs

    def create(self, validated_data):
        validated_data['user'] = self.context['request'].user
        validated_data['organization'] = self.context['organization']
        return super().create(validated_data)


# ── Demandes de renseignement (Frollot Connect) ──

class InquiryListSerializer(serializers.ModelSerializer):
    sender_name = serializers.CharField(source='sender.get_full_name', read_only=True)
    target_name = serializers.SerializerMethodField()
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model = Inquiry
        fields = [
            'id', 'sender', 'sender_name',
            'target_org', 'target_profile', 'target_name',
            'subject', 'status', 'status_display',
            'created_at', 'responded_at',
        ]

    def get_target_name(self, obj):
        if obj.target_org:
            return obj.target_org.name
        if obj.target_profile:
            return obj.target_profile.user.get_full_name()
        return None


class InquiryDetailSerializer(serializers.ModelSerializer):
    sender_name = serializers.CharField(source='sender.get_full_name', read_only=True)
    target_name = serializers.SerializerMethodField()
    responded_by_name = serializers.SerializerMethodField()
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model = Inquiry
        fields = [
            'id', 'sender', 'sender_name',
            'target_org', 'target_profile', 'target_name',
            'subject', 'message', 'attachment',
            'response', 'responded_by', 'responded_by_name',
            'status', 'status_display',
            'created_at', 'responded_at',
        ]

    def get_target_name(self, obj):
        if obj.target_org:
            return obj.target_org.name
        if obj.target_profile:
            return obj.target_profile.user.get_full_name()
        return None

    def get_responded_by_name(self, obj):
        if obj.responded_by:
            return obj.responded_by.get_full_name()
        return None


class InquiryCreateSerializer(serializers.ModelSerializer):
    message = serializers.CharField(max_length=5000)

    class Meta:
        model = Inquiry
        fields = ['target_org', 'target_profile', 'subject', 'message', 'attachment']

    def validate(self, attrs):
        if not attrs.get('target_org') and not attrs.get('target_profile'):
            raise serializers.ValidationError(
                "Vous devez cibler une organisation ou un professionnel."
            )
        if attrs.get('target_org') and attrs.get('target_profile'):
            raise serializers.ValidationError(
                "Vous ne pouvez cibler qu'une organisation OU un professionnel, pas les deux."
            )
        return attrs

    def create(self, validated_data):
        validated_data['sender'] = self.context['request'].user
        return super().create(validated_data)


class InquiryRespondSerializer(serializers.Serializer):
    response = serializers.CharField()


# ── Annuaire Professionnels (Frollot Connect) ──

class ProfessionalDirectorySerializer(serializers.Serializer):
    """Serializer pour l'annuaire des professionnels (basé sur UserProfile)."""
    id = serializers.IntegerField()
    slug = serializers.SlugField()
    profile_type = serializers.CharField()
    profile_type_display = serializers.CharField(source='get_profile_type_display')
    user_name = serializers.SerializerMethodField()
    bio = serializers.CharField()
    city = serializers.SerializerMethodField()
    country = serializers.SerializerMethodField()
    avatar = serializers.SerializerMethodField()
    cover_image = serializers.SerializerMethodField()
    is_verified = serializers.BooleanField()
    avg_rating = serializers.DecimalField(max_digits=3, decimal_places=2)
    review_count = serializers.IntegerField()
    completed_projects = serializers.IntegerField()
    avg_response_days = serializers.IntegerField()
    metadata = serializers.JSONField()
    listings_count = serializers.SerializerMethodField()

    def get_user_name(self, obj):
        return obj.user.get_full_name()

    def get_city(self, obj):
        return obj.user.city or ''

    def get_country(self, obj):
        return obj.user.country or ''

    def get_avatar(self, obj):
        if obj.user.profile_image:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.user.profile_image.url)
            return obj.user.profile_image.url
        return None

    def get_cover_image(self, obj):
        if obj.cover_image:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.cover_image.url)
            return obj.cover_image.url
        return None

    def get_listings_count(self, obj):
        return obj.service_listings.filter(is_active=True).count()


class ProfessionalStorefrontSerializer(ProfessionalDirectorySerializer):
    """Vitrine complète d'un professionnel avec ses services."""
    services = serializers.SerializerMethodField()

    def get_services(self, obj):
        from apps.services.serializers import ServiceListingSerializer
        listings = obj.service_listings.filter(is_active=True)
        return ServiceListingSerializer(listings, many=True).data
