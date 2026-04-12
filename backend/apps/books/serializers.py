from rest_framework import serializers
from .models import Category, Author, Book, BookReview


class LibraryCatalogMiniSerializer(serializers.Serializer):
    """Version compacte d'une entrée de catalogue bibliothèque."""
    id = serializers.IntegerField()
    library_id = serializers.IntegerField(source='library.id')
    library_name = serializers.CharField(source='library.name')
    library_slug = serializers.SlugField(source='library.slug')
    library_city = serializers.CharField(source='library.city')
    library_is_verified = serializers.BooleanField(source='library.is_verified')
    available_copies = serializers.IntegerField()
    total_copies = serializers.IntegerField()
    allows_digital_loan = serializers.BooleanField()
    max_loan_days = serializers.IntegerField()
    in_stock = serializers.SerializerMethodField()

    def get_in_stock(self, obj):
        return obj.available_copies > 0


class BookListingMiniSerializer(serializers.Serializer):
    """Version compacte d'une offre marketplace, embarquée dans BookListSerializer."""
    id = serializers.IntegerField()
    vendor_id = serializers.IntegerField(source='vendor.id')
    vendor_name = serializers.CharField(source='vendor.name')
    vendor_slug = serializers.SlugField(source='vendor.slug')
    vendor_city = serializers.CharField(source='vendor.city')
    vendor_is_verified = serializers.BooleanField(source='vendor.is_verified')
    price = serializers.DecimalField(max_digits=10, decimal_places=2)
    original_price = serializers.DecimalField(max_digits=10, decimal_places=2, allow_null=True)
    stock = serializers.IntegerField()
    condition = serializers.CharField()
    condition_display = serializers.CharField(source='get_condition_display')
    has_discount = serializers.BooleanField()
    in_stock = serializers.BooleanField()


class CategorySerializer(serializers.ModelSerializer):
    """
    Sérialiseur pour le modèle Category
    Transforme les catégories en JSON pour l'API
    """

    class Meta:
        model = Category
        fields = ['id', 'name', 'slug', 'created_at', 'updated_at']
        read_only_fields = ['id', 'slug', 'created_at', 'updated_at']


class AuthorSerializer(serializers.ModelSerializer):
    """
    Sérialiseur pour le modèle Author.
    Expose les champs display_* qui résolvent automatiquement
    depuis le profil utilisateur lié (si existant).
    """
    books_count = serializers.SerializerMethodField()
    avg_rating = serializers.SerializerMethodField()
    display_name = serializers.CharField(read_only=True)
    display_bio = serializers.CharField(read_only=True)
    display_photo = serializers.SerializerMethodField()
    is_registered = serializers.BooleanField(read_only=True)

    class Meta:
        model = Author
        fields = [
            'id',
            'full_name',
            'biography',
            'photo',
            'slug',
            'books_count',
            'avg_rating',
            'display_name',
            'display_bio',
            'display_photo',
            'is_registered',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'slug', 'created_at', 'updated_at']

    def get_books_count(self, obj):
        # Utiliser l'annotation si dispo, sinon prefetch cache
        if hasattr(obj, 'num_books'):
            return obj.num_books
        return obj.books.count()

    def get_avg_rating(self, obj):
        # Si annoté par la vue, utiliser la valeur annotée (pas de requête supplémentaire)
        if hasattr(obj, 'avg_rating') and obj.avg_rating is not None:
            return round(float(obj.avg_rating), 1)
        # Utiliser le cache prefetch pour éviter le N+1
        books = obj.books.all()
        rated = [b.rating for b in books if b.rating and b.rating > 0]
        if rated:
            return round(sum(rated) / len(rated), 1)
        return 0

    def get_display_photo(self, obj):
        photo = obj.display_photo
        if photo:
            request = self.context.get('request')
            if request and hasattr(photo, 'url'):
                return request.build_absolute_uri(photo.url)
            if hasattr(photo, 'url'):
                return photo.url
        return None


class BookListSerializer(serializers.ModelSerializer):
    """
    Sérialiseur optimisé pour la liste des livres
    Version allégée pour les performances (liste de catalogue)
    """

    # Nested serializers pour avoir les détails complets au lieu de simples IDs
    category = CategorySerializer(read_only=True)
    author = AuthorSerializer(read_only=True)

    # Champs calculés
    format_display = serializers.CharField(source='get_format_display', read_only=True)

    # === NOUVEAUX CHAMPS ===
    # Promotions et prix
    original_price = serializers.DecimalField(
        max_digits=10,
        decimal_places=2,
        allow_null=True,
        read_only=True
    )
    has_discount = serializers.BooleanField(read_only=True)
    discount_percentage = serializers.IntegerField(read_only=True)
    discount_amount = serializers.DecimalField(
        max_digits=10,
        decimal_places=2,
        read_only=True
    )

    # Best-seller et notes
    is_bestseller = serializers.BooleanField(read_only=True)
    rating = serializers.DecimalField(
        max_digits=3,
        decimal_places=2,
        read_only=True
    )
    rating_count = serializers.IntegerField(read_only=True)

    # Formatage de la note (ex: "4.5/5")
    rating_display = serializers.SerializerMethodField()

    # Organisation éditrice (compact pour la liste)
    publisher_name = serializers.SerializerMethodField()
    publisher_slug = serializers.SerializerMethodField()

    # Offres marketplace (librairies, vendeurs)
    listings = serializers.SerializerMethodField()
    best_listing_price = serializers.SerializerMethodField()
    listings_count = serializers.SerializerMethodField()

    # Disponibilité en bibliothèque
    library_availability = serializers.SerializerMethodField()
    library_count = serializers.SerializerMethodField()

    class Meta:
        model = Book
        fields = [
            'id',
            'title',
            'slug',
            'reference',
            'description',
            'price',
            'original_price',
            'format',
            'format_display',
            'cover_image',
            'back_cover_image',
            'available',
            'category',
            'author',
            'created_at',
            # Nouveaux champs
            'has_discount',
            'discount_percentage',
            'discount_amount',
            'is_bestseller',
            'total_sales',
            'rating',
            'rating_count',
            'rating_display',
            'pdf_file',
            # Organisation
            'publisher_organization',
            'publisher_name',
            'publisher_slug',
            # Marketplace
            'listings',
            'best_listing_price',
            'listings_count',
            # Bibliothèques
            'library_availability',
            'library_count',
        ]
        read_only_fields = ['id', 'slug', 'created_at']

    def get_publisher_name(self, obj):
        return obj.publisher_organization.name if obj.publisher_organization else None

    def get_publisher_slug(self, obj):
        return obj.publisher_organization.slug if obj.publisher_organization else None

    def _get_active_listings(self, obj):
        """Retourne les listings prefetchées ou queryset filtré."""
        # Si prefetchées via Prefetch('active_listings'), utiliser le cache
        if hasattr(obj, '_prefetched_objects_cache') and 'active_listings' in obj._prefetched_objects_cache:
            return obj.active_listings.all()
        # Fallback : query directe (pour les endpoints qui n'ont pas le Prefetch)
        return obj.listings.filter(is_active=True).select_related('vendor')

    def get_listings(self, obj):
        active = self._get_active_listings(obj)
        return BookListingMiniSerializer(active, many=True).data

    def get_best_listing_price(self, obj):
        active = self._get_active_listings(obj)
        if not active:
            return None
        prices = [l.price for l in active if l.in_stock]
        return str(min(prices)) if prices else None

    def get_listings_count(self, obj):
        active = self._get_active_listings(obj)
        return len(list(active))

    def _get_active_catalog_items(self, obj):
        if hasattr(obj, '_prefetched_objects_cache') and 'active_catalog_items' in obj._prefetched_objects_cache:
            return obj.active_catalog_items
        return obj.library_catalog_items.filter(is_active=True).select_related('library')

    def get_library_availability(self, obj):
        items = self._get_active_catalog_items(obj)
        return LibraryCatalogMiniSerializer(items, many=True).data

    def get_library_count(self, obj):
        items = self._get_active_catalog_items(obj)
        return len(list(items))

    def get_rating_display(self, obj):
        """Retourne la note formatée (ex: "4.5/5")"""
        if obj.rating and obj.rating > 0:
            return f"{obj.rating}/5"
        return "Pas encore noté"


class BookDetailSerializer(serializers.ModelSerializer):
    """
    Sérialiseur complet pour le détail d'un livre
    Inclut toutes les informations nécessaires pour la page de détail
    """

    # Nested serializers pour les relations
    category = CategorySerializer(read_only=True)
    author = AuthorSerializer(read_only=True)

    # IDs pour la création/modification (write_only)
    category_id = serializers.PrimaryKeyRelatedField(
        queryset=Category.objects.all(),
        source='category',
        write_only=True
    )
    author_id = serializers.PrimaryKeyRelatedField(
        queryset=Author.objects.all(),
        source='author',
        write_only=True
    )

    # Champs calculés
    format_display = serializers.CharField(source='get_format_display', read_only=True)
    is_ebook = serializers.BooleanField(read_only=True)
    is_available = serializers.BooleanField(read_only=True)

    # === NOUVEAUX CHAMPS ===
    # Promotions et prix
    original_price = serializers.DecimalField(
        max_digits=10,
        decimal_places=2,
        allow_null=True,
        read_only=True
    )
    has_discount = serializers.BooleanField(read_only=True)
    discount_percentage = serializers.IntegerField(read_only=True)
    discount_amount = serializers.DecimalField(
        max_digits=10,
        decimal_places=2,
        read_only=True
    )

    # Best-seller et notes
    is_bestseller = serializers.BooleanField(read_only=True)
    rating = serializers.DecimalField(
        max_digits=3,
        decimal_places=2,
        read_only=True
    )
    rating_count = serializers.IntegerField(read_only=True)

    # Formatage de la note
    rating_display = serializers.SerializerMethodField()
    rating_stars = serializers.SerializerMethodField()

    # Offres marketplace
    listings = serializers.SerializerMethodField()
    best_listing_price = serializers.SerializerMethodField()
    listings_count = serializers.SerializerMethodField()

    # Disponibilité en bibliothèque
    library_availability = serializers.SerializerMethodField()
    library_count = serializers.SerializerMethodField()

    # Organisation éditrice
    publisher_name = serializers.SerializerMethodField()
    publisher_slug = serializers.SerializerMethodField()

    class Meta:
        model = Book
        fields = [
            'id',
            'title',
            'slug',
            'reference',
            'description',
            'price',
            'original_price',
            'format',
            'format_display',
            'cover_image',
            'back_cover_image',
            'available',
            'is_ebook',
            'is_available',
            'category',
            'category_id',
            'author',
            'author_id',
            'created_at',
            'updated_at',
            # Nouveaux champs
            'has_discount',
            'discount_percentage',
            'discount_amount',
            'is_bestseller',
            'total_sales',
            'rating',
            'rating_count',
            'rating_display',
            'rating_stars',
            'pdf_file',
            # Organisation
            'publisher_organization',
            'publisher_name',
            'publisher_slug',
            # Marketplace
            'listings',
            'best_listing_price',
            'listings_count',
            # Bibliothèques
            'library_availability',
            'library_count',
        ]
        read_only_fields = ['id', 'slug', 'created_at', 'updated_at']

    def get_publisher_name(self, obj):
        return obj.publisher_organization.name if obj.publisher_organization else None

    def get_publisher_slug(self, obj):
        return obj.publisher_organization.slug if obj.publisher_organization else None

    def _get_active_listings(self, obj):
        if hasattr(obj, '_prefetched_objects_cache') and 'active_listings' in obj._prefetched_objects_cache:
            return obj.active_listings.all()
        return obj.listings.filter(is_active=True).select_related('vendor')

    def get_listings(self, obj):
        active = self._get_active_listings(obj)
        return BookListingMiniSerializer(active, many=True).data

    def get_best_listing_price(self, obj):
        active = self._get_active_listings(obj)
        if not active:
            return None
        prices = [l.price for l in active if l.in_stock]
        return str(min(prices)) if prices else None

    def get_listings_count(self, obj):
        active = self._get_active_listings(obj)
        return len(list(active))

    def _get_active_catalog_items(self, obj):
        if hasattr(obj, '_prefetched_objects_cache') and 'active_catalog_items' in obj._prefetched_objects_cache:
            return obj.active_catalog_items
        return obj.library_catalog_items.filter(is_active=True).select_related('library')

    def get_library_availability(self, obj):
        items = self._get_active_catalog_items(obj)
        return LibraryCatalogMiniSerializer(items, many=True).data

    def get_library_count(self, obj):
        items = self._get_active_catalog_items(obj)
        return len(list(items))

    def get_rating_display(self, obj):
        """Retourne la note formatée (ex: "4.5/5")"""
        if obj.rating and obj.rating > 0:
            return f"{obj.rating}/5 ({obj.rating_count} avis)"
        return "Pas encore noté"

    def get_rating_stars(self, obj):
        """Retourne les étoiles de notation pour l'affichage"""
        if not obj.rating or obj.rating == 0:
            return []

        rating = float(obj.rating)
        full_stars = int(rating)
        half_star = 1 if rating - full_stars >= 0.5 else 0
        empty_stars = 5 - full_stars - half_star

        return {
            'full': full_stars,
            'half': half_star,
            'empty': empty_stars,
            'value': rating
        }

    def validate_price(self, value):
        """Validation personnalisée du prix"""
        if value < 0:
            raise serializers.ValidationError("Le prix ne peut pas être négatif.")
        if value > 1000000:
            raise serializers.ValidationError("Le prix semble anormalement élevé.")
        return value

    def validate_reference(self, value):
        """Validation personnalisée de la référence"""
        if len(value) < 3:
            raise serializers.ValidationError("La référence doit contenir au moins 3 caractères.")
        return value.upper()


class BookCreateUpdateSerializer(serializers.ModelSerializer):
    """
    Sérialiseur pour la création et modification de livres
    Version simplifiée sans nested serializers.
    L'image de couverture et le PDF sont optionnels.
    """
    cover_image = serializers.ImageField(required=False, allow_null=True)
    back_cover_image = serializers.ImageField(required=False, allow_null=True)
    pdf_file = serializers.FileField(required=False, allow_null=True)

    class Meta:
        model = Book
        fields = [
            'title',
            'reference',
            'description',
            'price',
            'original_price',
            'format',
            'cover_image',
            'back_cover_image',
            'pdf_file',
            'available',
            'is_bestseller',
            'total_sales',
            'rating',
            'rating_count',
            'category',
            'author',
            'publisher_organization',
        ]

    def validate(self, data):
        """
        Validation globale des données
        Vérifie la cohérence entre les champs
        """
        # Vérifier que l'auteur et la catégorie existent
        if 'author' in data and not data['author']:
            raise serializers.ValidationError({
                'author': "Un livre doit avoir un auteur."
            })

        if 'category' in data and not data['category']:
            raise serializers.ValidationError({
                'category': "Un livre doit appartenir à une catégorie."
            })

        # Validation du prix d'origine vs prix actuel
        if 'original_price' in data and 'price' in data:
            if data['original_price'] is not None:
                if data['original_price'] <= 0:
                    raise serializers.ValidationError({
                        'original_price': "Le prix d'origine doit être positif."
                    })
                if data['price'] >= data['original_price']:
                    raise serializers.ValidationError({
                        'price': "Le prix en promotion doit être inférieur au prix d'origine."
                    })

        # Validation de la note
        if 'rating' in data:
            if data['rating'] < 0 or data['rating'] > 5:
                raise serializers.ValidationError({
                    'rating': "La note doit être comprise entre 0 et 5."
                })

        return data


class AuthorDetailSerializer(serializers.ModelSerializer):
    """
    Sérialiseur détaillé pour un auteur.
    Inclut la liste de ses livres + champs display_*.
    """
    books = BookListSerializer(many=True, read_only=True)
    books_count = serializers.SerializerMethodField()
    average_rating = serializers.SerializerMethodField()
    bestsellers_count = serializers.SerializerMethodField()
    display_name = serializers.CharField(read_only=True)
    display_bio = serializers.CharField(read_only=True)
    display_photo = serializers.SerializerMethodField()
    is_registered = serializers.BooleanField(read_only=True)

    class Meta:
        model = Author
        fields = [
            'id',
            'full_name',
            'biography',
            'photo',
            'slug',
            'books',
            'books_count',
            'average_rating',
            'bestsellers_count',
            'display_name',
            'display_bio',
            'display_photo',
            'is_registered',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'slug', 'created_at', 'updated_at']

    def get_books_count(self, obj):
        if hasattr(obj, 'num_books'):
            return obj.num_books
        return obj.books.count()

    def get_average_rating(self, obj):
        # Utilise le prefetch cache au lieu de requêtes supplémentaires
        books = obj.books.all()
        rated = [b.rating for b in books if b.rating and b.rating > 0]
        if rated:
            return round(sum(rated) / len(rated), 2)
        return 0

    def get_bestsellers_count(self, obj):
        # Utilise le prefetch cache
        return sum(1 for b in obj.books.all() if b.is_bestseller)

    def get_display_photo(self, obj):
        photo = obj.display_photo
        if photo:
            request = self.context.get('request')
            if request and hasattr(photo, 'url'):
                return request.build_absolute_uri(photo.url)
            if hasattr(photo, 'url'):
                return photo.url
        return None


class CategoryDetailSerializer(serializers.ModelSerializer):
    """
    Sérialiseur détaillé pour une catégorie
    Inclut la liste des livres de cette catégorie
    """

    # Liste des livres de la catégorie
    books = BookListSerializer(many=True, read_only=True)
    books_count = serializers.SerializerMethodField()

    # Statistiques de la catégorie
    average_rating = serializers.SerializerMethodField()
    bestsellers_count = serializers.SerializerMethodField()
    average_price = serializers.SerializerMethodField()

    class Meta:
        model = Category
        fields = [
            'id',
            'name',
            'slug',
            'books',
            'books_count',
            'average_rating',
            'bestsellers_count',
            'average_price',
            'created_at',
            'updated_at'
        ]
        read_only_fields = ['id', 'slug', 'created_at', 'updated_at']

    def get_books_count(self, obj):
        """Retourne le nombre de livres dans cette catégorie"""
        if hasattr(obj, 'num_books'):
            return obj.num_books
        return obj.books.count()

    def get_average_rating(self, obj):
        """Retourne la note moyenne des livres de la catégorie (utilise le prefetch cache)"""
        books = obj.books.all()
        rated = [b.rating for b in books if b.rating and b.rating > 0]
        if rated:
            return round(sum(rated) / len(rated), 2)
        return 0

    def get_bestsellers_count(self, obj):
        """Retourne le nombre de best-sellers dans cette catégorie (utilise le prefetch cache)"""
        return sum(1 for b in obj.books.all() if b.is_bestseller)

    def get_average_price(self, obj):
        """Retourne le prix moyen des livres de la catégorie (utilise le prefetch cache)"""
        books = list(obj.books.all())
        if books:
            total_price = sum(b.price for b in books)
            return round(total_price / len(books), 2)
        return 0


class BookReviewSerializer(serializers.ModelSerializer):
    """Sérialiseur pour les avis sur les livres (avec photo profil, likes, réponses)."""
    user_display = serializers.SerializerMethodField()
    user_profile_image = serializers.SerializerMethodField()
    likes_count = serializers.SerializerMethodField()
    user_has_liked = serializers.SerializerMethodField()
    replies = serializers.SerializerMethodField()

    class Meta:
        model = BookReview
        fields = [
            'id', 'user', 'user_display', 'user_profile_image',
            'book', 'parent', 'rating', 'comment',
            'likes_count', 'user_has_liked', 'replies',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'user', 'book', 'parent', 'created_at', 'updated_at']

    def get_user_display(self, obj):
        """Nom affiché de l'utilisateur (nom complet ou prénom)."""
        full_name = obj.user.get_full_name()
        if full_name and full_name.strip():
            return full_name.strip()
        if obj.user.first_name:
            return obj.user.first_name
        if obj.user.username:
            return obj.user.username
        return 'Anonyme'

    def get_user_profile_image(self, obj):
        """URL de la photo de profil (ou None)."""
        if obj.user.profile_image:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.user.profile_image.url)
            return obj.user.profile_image.url
        return None

    def get_likes_count(self, obj):
        """Nombre de likes sur cet avis."""
        if hasattr(obj, '_likes_count'):
            return obj._likes_count
        return obj.likes.count()

    def get_user_has_liked(self, obj):
        """True si l'utilisateur connecté a liké cet avis."""
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return False
        if hasattr(obj, '_user_has_liked'):
            return obj._user_has_liked
        return obj.likes.filter(user=request.user).exists()

    def get_replies(self, obj):
        """Réponses imbriquées (uniquement pour les avis principaux)."""
        if obj.parent_id:
            return []
        replies = obj.replies.select_related('user').order_by('created_at')
        return BookReviewSerializer(replies, many=True, context=self.context).data


class BookReviewCreateSerializer(serializers.ModelSerializer):
    """Sérialiseur pour créer/modifier un avis principal."""

    class Meta:
        model = BookReview
        fields = ['rating', 'comment']

    def validate_rating(self, value):
        if value is not None and (value < 1 or value > 5):
            raise serializers.ValidationError("La note doit être entre 1 et 5.")
        return value


class BookReviewReplySerializer(serializers.ModelSerializer):
    """Sérialiseur pour créer une réponse à un avis."""

    class Meta:
        model = BookReview
        fields = ['comment']

    def validate_comment(self, value):
        if not value or not value.strip():
            raise serializers.ValidationError("Le commentaire est requis.")
        return value.strip()


# Sérialiseur générique pour les statistiques (bonus)
class BookStatisticsSerializer(serializers.Serializer):
    """
    Sérialiseur pour les statistiques du catalogue
    """
    total_books = serializers.IntegerField()
    total_authors = serializers.IntegerField()
    total_categories = serializers.IntegerField()
    available_books = serializers.IntegerField()
    ebooks_count = serializers.IntegerField()
    paper_books_count = serializers.IntegerField()
    average_price = serializers.DecimalField(max_digits=10, decimal_places=2)
    bestsellers_count = serializers.IntegerField()
    average_rating = serializers.DecimalField(max_digits=3, decimal_places=2)
    books_with_discount = serializers.IntegerField()
