from datetime import timedelta

from django.utils import timezone
from rest_framework import serializers

from .models import (
    LibraryCatalogItem, LibraryMembership, BookLoan,
    LoanExtension, BookReservation,
)


# ── Catalogue ──

class LibraryCatalogItemSerializer(serializers.ModelSerializer):
    book_title = serializers.CharField(source='book.title', read_only=True)
    book_author = serializers.SerializerMethodField()
    book_cover_image = serializers.ImageField(source='book.cover_image', read_only=True)
    book_format = serializers.CharField(source='book.format', read_only=True)
    book_category = serializers.CharField(source='book.category.name', read_only=True, default=None)
    library_name = serializers.CharField(source='library.name', read_only=True)
    in_stock = serializers.SerializerMethodField()

    class Meta:
        model = LibraryCatalogItem
        fields = [
            'id', 'book', 'book_title', 'book_author', 'book_cover_image',
            'book_format', 'book_category', 'library', 'library_name', 'total_copies',
            'available_copies', 'allows_digital_loan', 'max_loan_days',
            'is_active', 'in_stock', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_book_author(self, obj):
        if obj.book.author:
            return obj.book.author.full_name
        return None

    def get_in_stock(self, obj):
        return obj.available_copies > 0


class LibraryCatalogItemCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = LibraryCatalogItem
        fields = ['book', 'total_copies', 'available_copies', 'allows_digital_loan', 'max_loan_days']

    def validate(self, attrs):
        if attrs.get('available_copies', 0) > attrs.get('total_copies', 1):
            raise serializers.ValidationError(
                "Les exemplaires disponibles ne peuvent pas dépasser le total."
            )
        return attrs

    def create(self, validated_data):
        validated_data['library'] = self.context['library']
        return super().create(validated_data)


# ── Adhésions ──

class LibraryMembershipSerializer(serializers.ModelSerializer):
    user_name = serializers.SerializerMethodField()
    user_email = serializers.SerializerMethodField()
    membership_type_display = serializers.CharField(source='get_membership_type_display', read_only=True)
    is_expired = serializers.SerializerMethodField()

    class Meta:
        model = LibraryMembership
        fields = [
            'id', 'membership_number', 'user', 'user_name', 'user_email',
            'library', 'membership_type', 'membership_type_display',
            'is_active', 'is_expired', 'expires_at', 'joined_at',
        ]
        read_only_fields = ['id', 'membership_number', 'joined_at']

    def get_user_name(self, obj):
        return obj.user.get_full_name()

    def get_user_email(self, obj):
        return obj.user.email

    def get_is_expired(self, obj):
        return obj.is_expired


class LibraryMembershipCreateSerializer(serializers.ModelSerializer):
    user = serializers.IntegerField(required=False, write_only=True)
    expires_at = serializers.DateTimeField(required=False)

    class Meta:
        model = LibraryMembership
        fields = ['user', 'membership_type', 'expires_at']

    def validate(self, attrs):
        request = self.context.get('request')
        from django.contrib.auth import get_user_model
        User = get_user_model()
        user_id = attrs.pop('user', None)
        if user_id and user_id != request.user.id:
            # Only library admins can create memberships for other users
            from apps.organizations.models import OrganizationMembership
            library = self.context.get('library')
            is_admin = library and OrganizationMembership.objects.filter(
                user=request.user,
                organization=library,
                role__in=['PROPRIETAIRE', 'ADMINISTRATEUR'],
                is_active=True,
            ).exists()
            if not is_admin:
                user_id = None  # Force self-registration
        if user_id:
            try:
                attrs['user'] = User.objects.get(pk=user_id)
            except User.DoesNotExist:
                raise serializers.ValidationError({'user': 'Utilisateur introuvable.'})
        elif request:
            attrs['user'] = request.user
        if not attrs.get('expires_at'):
            attrs['expires_at'] = timezone.now() + timedelta(days=365)
        return attrs

    def create(self, validated_data):
        validated_data['library'] = self.context['library']
        return super().create(validated_data)


# ── Prêts ──

class BookLoanSerializer(serializers.ModelSerializer):
    book_title = serializers.SerializerMethodField()
    library_name = serializers.CharField(source='catalog_item.library.name', read_only=True)
    borrower_name = serializers.SerializerMethodField()
    loan_type_display = serializers.CharField(source='get_loan_type_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    is_overdue = serializers.BooleanField(read_only=True)

    class Meta:
        model = BookLoan
        fields = [
            'id', 'catalog_item', 'book_title', 'library_name',
            'borrower', 'borrower_name', 'loan_type', 'loan_type_display',
            'status', 'status_display', 'is_overdue',
            'borrowed_at', 'due_date', 'returned_at', 'created_at',
        ]
        read_only_fields = ['id', 'created_at']

    def get_book_title(self, obj):
        return obj.catalog_item.book.title

    def get_borrower_name(self, obj):
        return obj.borrower.get_full_name()


class BookLoanCreateSerializer(serializers.Serializer):
    catalog_item = serializers.PrimaryKeyRelatedField(queryset=LibraryCatalogItem.objects.all())
    loan_type = serializers.ChoiceField(choices=BookLoan.LOAN_TYPE_CHOICES)

    def validate(self, attrs):
        request = self.context.get('request')
        user = request.user
        catalog_item = attrs['catalog_item']
        loan_type = attrs['loan_type']

        # Vérifier adhésion active non expirée
        membership = LibraryMembership.objects.filter(
            user=user,
            library=catalog_item.library,
            is_active=True,
            expires_at__gt=timezone.now(),
        ).first()
        if not membership:
            raise serializers.ValidationError(
                "Vous devez avoir une adhésion active et non expirée à cette bibliothèque."
            )

        if loan_type == 'PHYSICAL':
            if catalog_item.available_copies <= 0:
                raise serializers.ValidationError(
                    "Aucun exemplaire physique disponible."
                )
        elif loan_type == 'DIGITAL':
            if not catalog_item.allows_digital_loan:
                raise serializers.ValidationError(
                    "Le prêt numérique n'est pas autorisé pour ce livre."
                )
            concurrent = BookLoan.objects.filter(
                borrower=user,
                loan_type='DIGITAL',
                status__in=['REQUESTED', 'ACTIVE'],
            ).count()
            if concurrent >= 3:
                raise serializers.ValidationError(
                    "Vous avez déjà 3 prêts numériques en cours (maximum autorisé)."
                )

        return attrs


# ── Extensions ──

class LoanExtensionSerializer(serializers.ModelSerializer):
    class Meta:
        model = LoanExtension
        fields = ['id', 'loan', 'extended_days', 'approved', 'requested_at', 'approved_at']
        read_only_fields = ['id', 'requested_at', 'approved_at']


class LoanExtensionCreateSerializer(serializers.Serializer):
    extended_days = serializers.IntegerField(min_value=1, max_value=30)

    def validate(self, attrs):
        loan = self.context.get('loan')
        if not loan:
            raise serializers.ValidationError("Prêt introuvable.")
        if loan.status != 'ACTIVE':
            raise serializers.ValidationError(
                "Seuls les prêts en cours peuvent être prolongés."
            )
        existing_count = LoanExtension.objects.filter(loan=loan).count()
        if existing_count >= 2:
            raise serializers.ValidationError(
                "Maximum 2 prolongations par prêt."
            )
        return attrs


# ── Réservations ──

class BookReservationSerializer(serializers.ModelSerializer):
    book_title = serializers.SerializerMethodField()
    library_name = serializers.CharField(source='catalog_item.library.name', read_only=True)
    user_name = serializers.SerializerMethodField()
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model = BookReservation
        fields = [
            'id', 'catalog_item', 'book_title', 'library_name',
            'user', 'user_name', 'status', 'status_display',
            'created_at', 'notified_at', 'expires_at',
        ]
        read_only_fields = ['id', 'created_at']

    def get_book_title(self, obj):
        return obj.catalog_item.book.title

    def get_user_name(self, obj):
        return obj.user.get_full_name()


class BookReservationCreateSerializer(serializers.Serializer):
    catalog_item = serializers.PrimaryKeyRelatedField(queryset=LibraryCatalogItem.objects.all())

    def validate(self, attrs):
        request = self.context.get('request')
        catalog_item = attrs['catalog_item']

        if catalog_item.available_copies > 0:
            raise serializers.ValidationError(
                "Le livre est disponible, vous pouvez l'emprunter directement."
            )

        existing = BookReservation.objects.filter(
            catalog_item=catalog_item,
            user=request.user,
            status='PENDING',
        ).exists()
        if existing:
            raise serializers.ValidationError(
                "Vous avez déjà une réservation en attente pour ce livre."
            )

        return attrs
