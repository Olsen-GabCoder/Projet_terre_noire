from django.conf import settings
from django.db import models
from django.db.models import Q
from django.utils.text import slugify
from django.core.validators import MinValueValidator, MaxValueValidator, RegexValidator
from decimal import Decimal


class Category(models.Model):
    """
    Modèle pour les catégories de livres
    (Roman, Essai, Science-Fiction, etc.)
    """
    name = models.CharField(
        max_length=100,
        unique=True,
        verbose_name="Nom de la catégorie"
    )
    slug = models.SlugField(
        max_length=120,
        unique=True,
        blank=True,
        verbose_name="Slug"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Catégorie"
        verbose_name_plural = "Catégories"
        ordering = ['name']

    def save(self, *args, **kwargs):
        """Génération automatique du slug si non fourni"""
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name


class Author(models.Model):
    """
    Modèle pour les auteurs.
    Peut être lié à un compte utilisateur (optionnel).
    Quand lié, les infos affichées (nom, bio, photo) viennent du profil utilisateur.
    """
    full_name = models.CharField(
        max_length=200,
        verbose_name="Nom complet"
    )
    biography = models.TextField(
        blank=True,
        null=True,
        verbose_name="Biographie"
    )
    photo = models.ImageField(
        upload_to='authors/',
        blank=True,
        null=True,
        verbose_name="Photo de l'auteur"
    )
    slug = models.SlugField(
        max_length=220,
        unique=True,
        blank=True,
        verbose_name="Slug"
    )
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='author_profile',
        verbose_name="Compte utilisateur lié",
        help_text="Si lié, le nom, la bio et la photo sont synchronisés depuis le profil.",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Auteur"
        verbose_name_plural = "Auteurs"
        ordering = ['full_name']

    def save(self, *args, **kwargs):
        if not self.slug:
            base = slugify(self.full_name)
            slug = base
            n = 1
            while Author.objects.filter(slug=slug).exclude(pk=self.pk).exists():
                slug = f"{base}-{n}"
                n += 1
            self.slug = slug
        super().save(*args, **kwargs)

    def __str__(self):
        return self.display_name

    # ── Propriétés de résolution (priorité au compte lié) ──

    @property
    def display_name(self):
        if self.user:
            name = self.user.get_full_name()
            if name:
                return name
        return self.full_name

    @property
    def display_bio(self):
        if self.user_id:
            from apps.users.models import UserProfile
            profile = UserProfile.objects.filter(
                user_id=self.user_id, profile_type='AUTEUR', is_active=True
            ).first()
            if profile and profile.bio:
                return profile.bio
        return self.biography or ''

    @property
    def display_photo(self):
        if self.user_id and self.user.profile_image:
            return self.user.profile_image
        return self.photo

    @property
    def is_registered(self):
        return self.user_id is not None


class Book(models.Model):
    """
    Modèle pour les livres
    """
    # Choix pour le format du livre
    FORMAT_CHOICES = [
        ('EBOOK', 'Ebook'),
        ('PAPIER', 'Papier'),
    ]

    title = models.CharField(
        max_length=300,
        verbose_name="Titre"
    )
    slug = models.SlugField(
        max_length=320,
        unique=True,
        blank=True,
        verbose_name="Slug"
    )
    reference = models.CharField(
        max_length=50,
        unique=True,
        verbose_name="Référence (ISBN/Code)",
        help_text="ISBN ou code interne unique"
    )
    description = models.TextField(
        verbose_name="Description/Résumé"
    )
    price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(0)],
        verbose_name="Prix (FCFA)"
    )
    format = models.CharField(
        max_length=10,
        choices=FORMAT_CHOICES,
        default='PAPIER',
        verbose_name="Format"
    )
    cover_image = models.ImageField(
        upload_to='books/covers/',
        verbose_name="Image de couverture",
        blank=True,
        null=True,
    )
    back_cover_image = models.ImageField(
        upload_to='books/back_covers/',
        verbose_name="Image de couverture arrière (4e de couverture)",
        blank=True,
        null=True,
    )
    pdf_file = models.FileField(
        upload_to='books/pdfs/',
        verbose_name="Fichier PDF (ebook)",
        blank=True,
        null=True,
        help_text="PDF du livre pour lecture en ligne ou achat ebook.",
    )
    available = models.BooleanField(
        default=True,
        verbose_name="Disponible"
    )
    
    # Relations - Note: Utilisez des chaînes pour éviter les problèmes de référence circulaire
    category = models.ForeignKey(
        Category,
        on_delete=models.PROTECT,
        related_name='books',
        verbose_name="Catégorie"
    )
    author = models.ForeignKey(
        Author,
        on_delete=models.PROTECT,
        related_name='books',
        verbose_name="Auteur"
    )
    
    # === NOUVEAUX CHAMPS AJOUTÉS ===
    # Prix d'origine pour les promotions
    original_price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(0)],
        null=True,
        blank=True,
        verbose_name="Prix d'origine (FCFA)",
        help_text="Prix avant promotion. Laissez vide si pas de promotion."
    )
    
    # Best-seller — calculé automatiquement à partir des ventes
    is_bestseller = models.BooleanField(
        default=False,
        verbose_name="Best-seller",
        help_text="Calculé automatiquement : 500+ ventes.",
    )
    total_sales = models.PositiveIntegerField(
        default=0,
        verbose_name="Ventes totales",
        help_text="Nombre total d'exemplaires vendus (mis à jour au paiement).",
    )
    
    # Note moyenne (ex: 4.5)
    rating = models.DecimalField(
        max_digits=3,
        decimal_places=2,
        default=Decimal('0.00'),
        validators=[MinValueValidator(0), MaxValueValidator(5)],
        verbose_name="Note moyenne",
        help_text="Note sur 5 (ex: 4.5)"
    )
    
    # Nombre d'avis
    rating_count = models.PositiveIntegerField(
        default=0,
        verbose_name="Nombre d'avis",
        help_text="Nombre total d'avis reçus"
    )
    # === FIN NOUVEAUX CHAMPS ===

    # Organisation éditrice (Frollot Connect)
    publisher_organization = models.ForeignKey(
        'organizations.Organization',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='published_books',
        verbose_name="Organisation éditrice",
        help_text="Maison d'édition qui a publié ce livre.",
    )

    # Métadonnées
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Livre"
        verbose_name_plural = "Livres"
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['slug']),
            models.Index(fields=['reference']),
            models.Index(fields=['available']),
            models.Index(fields=['is_bestseller']),  # Nouvel index
            models.Index(fields=['rating']),         # Nouvel index
        ]

    def save(self, *args, **kwargs):
        """Génération automatique du slug si non fourni"""
        if not self.slug:
            self.slug = slugify(self.title)
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.title} - {self.author.full_name}"

    @property
    def is_ebook(self):
        """Vérifie si le livre est un ebook"""
        return self.format == 'EBOOK'

    @property
    def is_available(self):
        """Vérifie la disponibilité"""
        return self.available

    def get_format_display(self):
        """Retourne la version lisible du format"""
        return dict(self.FORMAT_CHOICES).get(self.format, self.format)
    
    # === NOUVELLES PROPRIÉTÉS ===
    @property
    def has_discount(self):
        """Vérifie si le livre a une promotion"""
        return self.original_price is not None and self.original_price > self.price
    
    @property
    def discount_percentage(self):
        """Calcule le pourcentage de réduction"""
        if not self.has_discount:
            return 0
        discount = ((self.original_price - self.price) / self.original_price) * 100
        return round(discount, 0)
    
    @property
    def discount_amount(self):
        """Calcule le montant de la réduction"""
        if not self.has_discount:
            return 0
        return self.original_price - self.price


class BookReview(models.Model):
    """
    Avis d'un utilisateur sur un livre.
    Un utilisateur ne peut laisser qu'un seul avis principal par livre.
    Les réponses (parent non null) n'ont pas de note.
    """
    user = models.ForeignKey(
        'users.User',
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='book_reviews',
        verbose_name="Utilisateur"
    )
    book = models.ForeignKey(
        Book,
        on_delete=models.CASCADE,
        related_name='reviews',
        verbose_name="Livre"
    )
    parent = models.ForeignKey(
        'self',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='replies',
        verbose_name="Avis parent (réponse)"
    )
    rating = models.PositiveSmallIntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(5)],
        null=True,
        blank=True,
        verbose_name="Note (1-5)",
        help_text="Uniquement pour l'avis principal, pas pour les réponses"
    )
    comment = models.TextField(
        blank=True,
        verbose_name="Commentaire"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Avis"
        verbose_name_plural = "Avis"
        constraints = [
            models.UniqueConstraint(
                fields=['user', 'book'],
                condition=Q(parent__isnull=True),
                name='unique_user_book_main_review'
            )
        ]
        ordering = ['-created_at']

    def __str__(self):
        if self.parent:
            return f"Réponse de {self.user.username} à un avis sur {self.book.title}"
        return f"{self.user.username} - {self.book.title} ({self.rating}/5)"


class ReviewLike(models.Model):
    """Like d'un utilisateur sur un avis."""
    user = models.ForeignKey(
        'users.User',
        on_delete=models.CASCADE,
        related_name='review_likes',
        verbose_name="Utilisateur"
    )
    review = models.ForeignKey(
        BookReview,
        on_delete=models.CASCADE,
        related_name='likes',
        verbose_name="Avis"
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Like d'avis"
        verbose_name_plural = "Likes d'avis"
        unique_together = [['user', 'review']]

    def __str__(self):
        return f"{self.user.username} aime l'avis #{self.review_id}"