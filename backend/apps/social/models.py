from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models
from django.utils.text import slugify


# ── Follows ──

class UserFollow(models.Model):
    """Un utilisateur suit un autre utilisateur."""
    follower = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
        related_name='following_users', verbose_name="Abonné",
    )
    following = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
        related_name='user_followers', verbose_name="Suivi",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = [['follower', 'following']]
        verbose_name = "Abonnement utilisateur"
        verbose_name_plural = "Abonnements utilisateurs"

    def clean(self):
        if self.follower_id == self.following_id:
            raise ValidationError("Impossible de se suivre soi-même.")

    def __str__(self):
        return f"{self.follower} → {self.following}"


class AuthorFollow(models.Model):
    """Un utilisateur suit un auteur."""
    follower = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
        related_name='following_authors', verbose_name="Abonné",
    )
    author = models.ForeignKey(
        'books.Author', on_delete=models.CASCADE,
        related_name='author_followers', verbose_name="Auteur suivi",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = [['follower', 'author']]
        verbose_name = "Abonnement auteur"
        verbose_name_plural = "Abonnements auteurs"

    def __str__(self):
        return f"{self.follower} → {self.author}"


class OrganizationFollow(models.Model):
    """Un utilisateur suit une organisation."""
    follower = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
        related_name='following_organizations', verbose_name="Abonné",
    )
    organization = models.ForeignKey(
        'organizations.Organization', on_delete=models.CASCADE,
        related_name='org_followers', verbose_name="Organisation suivie",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = [['follower', 'organization']]
        verbose_name = "Abonnement organisation"
        verbose_name_plural = "Abonnements organisations"

    def __str__(self):
        return f"{self.follower} → {self.organization}"


# ── Listes de lecture ──

class ReadingList(models.Model):
    """Liste de lecture créée par un utilisateur."""
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
        related_name='reading_lists', verbose_name="Créateur",
    )
    title = models.CharField(max_length=200, verbose_name="Titre")
    slug = models.SlugField(max_length=220, unique=True, blank=True)
    description = models.TextField(blank=True, verbose_name="Description")
    is_public = models.BooleanField(default=True, verbose_name="Publique")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Liste de lecture"
        verbose_name_plural = "Listes de lecture"
        ordering = ['-updated_at']

    def save(self, *args, **kwargs):
        if not self.slug:
            base = slugify(f"{self.user.username}-{self.title}")
            slug = base
            counter = 1
            while ReadingList.objects.filter(slug=slug).exclude(pk=self.pk).exists():
                slug = f"{base}-{counter}"
                counter += 1
            self.slug = slug
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.title} ({self.user.username})"


class ReadingListItem(models.Model):
    """Un livre dans une liste de lecture."""
    reading_list = models.ForeignKey(
        ReadingList, on_delete=models.CASCADE,
        related_name='items', verbose_name="Liste",
    )
    book = models.ForeignKey(
        'books.Book', on_delete=models.CASCADE,
        related_name='reading_list_items', verbose_name="Livre",
    )
    note = models.TextField(blank=True, verbose_name="Note personnelle")
    position = models.PositiveIntegerField(default=0, verbose_name="Position")
    added_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Livre dans une liste"
        verbose_name_plural = "Livres dans les listes"
        unique_together = [['reading_list', 'book']]
        ordering = ['position', '-added_at']

    def __str__(self):
        return f"{self.book.title} in {self.reading_list.title}"


# ── Publications (fil d'actualité) ──

class Post(models.Model):
    """Publication dans le fil d'actualité."""
    POST_TYPE_CHOICES = [
        ('TEXT', 'Texte'),
        ('REVIEW', 'Avis partagé'),
        ('RECOMMENDATION', 'Recommandation'),
        ('NEWS', 'Actualité'),
        ('PLATFORM_REVIEW', 'Avis plateforme'),
    ]

    author = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='posts', verbose_name="Auteur du post",
    )
    content = models.TextField(verbose_name="Contenu")
    image = models.ImageField(
        upload_to='social/posts/', blank=True, null=True,
        verbose_name="Image",
    )
    book = models.ForeignKey(
        'books.Book', on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='posts', verbose_name="Livre associé",
    )
    post_type = models.CharField(
        max_length=20, choices=POST_TYPE_CHOICES, default='TEXT',
        verbose_name="Type de publication",
    )
    rating = models.PositiveSmallIntegerField(
        null=True, blank=True,
        verbose_name="Note (1-5)",
        help_text="Note de 1 à 5, utilisée pour les avis plateforme.",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Publication"
        verbose_name_plural = "Publications"
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['-created_at']),
            models.Index(fields=['author', '-created_at']),
            models.Index(fields=['post_type', '-created_at']),
        ]

    def __str__(self):
        username = self.author.username if self.author else "[compte supprimé]"
        return f"Post by {username} ({self.post_type})"


class PostLike(models.Model):
    """Like sur une publication."""
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
        related_name='post_likes',
    )
    post = models.ForeignKey(
        Post, on_delete=models.CASCADE, related_name='likes',
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = [['user', 'post']]
        verbose_name = "Like de publication"
        verbose_name_plural = "Likes de publications"


class PostComment(models.Model):
    """Commentaire sur une publication."""
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='post_comments',
    )
    post = models.ForeignKey(
        Post, on_delete=models.CASCADE, related_name='comments',
    )
    content = models.TextField(verbose_name="Commentaire")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created_at']
        verbose_name = "Commentaire de publication"
        verbose_name_plural = "Commentaires de publications"

    def __str__(self):
        username = self.user.username if self.user else "[compte supprimé]"
        return f"Comment by {username} on Post #{self.post_id}"


# ── Clubs de lecture ──

class BookClub(models.Model):
    """
    Club de lecture — communauté de lecteurs.
    Un club peut discuter de plusieurs livres, avoir un thème, des règles,
    une photo de couverture, et regrouper des adhérents autour de la lecture.
    """
    CATEGORY_CHOICES = [
        ('GENERAL', 'Général'),
        ('ROMAN', 'Romans'),
        ('POESIE', 'Poésie'),
        ('ESSAI', 'Essais & Non-fiction'),
        ('JEUNESSE', 'Littérature jeunesse'),
        ('SF_FANTASY', 'Science-fiction & Fantasy'),
        ('POLAR', 'Policier & Thriller'),
        ('BD_MANGA', 'BD & Manga'),
        ('CLASSIQUES', 'Classiques'),
        ('AFRICAIN', 'Littérature africaine'),
        ('DEVELOPPEMENT', 'Développement personnel'),
        ('AUTRE', 'Autre'),
    ]

    FREQUENCY_CHOICES = [
        ('WEEKLY', 'Hebdomadaire'),
        ('BIWEEKLY', 'Bimensuel'),
        ('MONTHLY', 'Mensuel'),
        ('FLEXIBLE', 'Flexible'),
    ]

    name = models.CharField(max_length=200, verbose_name="Nom du club")
    slug = models.SlugField(max_length=220, unique=True, blank=True)
    description = models.TextField(blank=True, verbose_name="Description")
    cover_image = models.ImageField(
        upload_to='clubs/covers/', blank=True, null=True,
        verbose_name="Photo de couverture",
    )
    category = models.JSONField(
        default=list, blank=True,
        verbose_name="Catégories / Thèmes",
        help_text="Liste de thèmes. Ex: ['ROMAN', 'AFRICAIN']",
    )
    rules = models.TextField(
        blank=True, verbose_name="Règles du club",
        help_text="Charte, code de conduite, attentes envers les membres.",
    )
    meeting_frequency = models.CharField(
        max_length=20, choices=FREQUENCY_CHOICES, default='MONTHLY',
        verbose_name="Fréquence des échanges",
    )
    languages = models.JSONField(
        default=list, blank=True,
        verbose_name="Langues du club",
        help_text="Ex: ['FR', 'EN']",
    )
    tags = models.JSONField(
        default=list, blank=True,
        verbose_name="Tags / Mots-clés",
        help_text="Ex: ['afrique', 'femmes-auteurs', 'poésie']",
    )

    # Livre actuellement en discussion (optionnel)
    current_book = models.ForeignKey(
        'books.Book', on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='current_clubs', verbose_name="Livre en cours de discussion",
    )
    # Ancien champ — rendu optionnel pour rétrocompatibilité
    book = models.ForeignKey(
        'books.Book', on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='clubs', verbose_name="Livre fondateur (legacy)",
    )

    creator = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='created_clubs', verbose_name="Créateur",
    )
    is_public = models.BooleanField(default=True, verbose_name="Public")
    max_members = models.PositiveIntegerField(default=50, verbose_name="Nombre max de membres")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Club de lecture"
        verbose_name_plural = "Clubs de lecture"
        ordering = ['-created_at']

    def save(self, *args, **kwargs):
        if not self.slug:
            base = slugify(self.name)
            slug = base
            counter = 1
            while BookClub.objects.filter(slug=slug).exclude(pk=self.pk).exists():
                slug = f"{base}-{counter}"
                counter += 1
            self.slug = slug
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name


class BookClubMembership(models.Model):
    """Appartenance d'un utilisateur à un club."""
    ROLE_CHOICES = [
        ('ADMIN', 'Administrateur'),
        ('MEMBER', 'Membre'),
    ]

    club = models.ForeignKey(
        BookClub, on_delete=models.CASCADE,
        related_name='memberships', verbose_name="Club",
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
        related_name='club_memberships', verbose_name="Membre",
    )
    role = models.CharField(max_length=10, choices=ROLE_CHOICES, default='MEMBER')
    joined_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = [['club', 'user']]
        verbose_name = "Membre du club"
        verbose_name_plural = "Membres du club"

    def __str__(self):
        return f"{self.user.username} @ {self.club.name}"


class BookClubMessage(models.Model):
    """Message dans un club de lecture — texte, voix, image ou fichier."""
    MESSAGE_TYPE_CHOICES = [
        ('TEXT', 'Texte'),
        ('VOICE', 'Note vocale'),
        ('IMAGE', 'Image'),
        ('FILE', 'Fichier'),
    ]

    club = models.ForeignKey(
        BookClub, on_delete=models.CASCADE,
        related_name='messages', verbose_name="Club",
    )
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='club_messages', verbose_name="Auteur",
    )
    message_type = models.CharField(
        max_length=10, choices=MESSAGE_TYPE_CHOICES, default='TEXT',
        verbose_name="Type de message",
    )
    content = models.TextField(blank=True, verbose_name="Message texte")
    attachment = models.FileField(
        upload_to='clubs/messages/', blank=True, null=True,
        verbose_name="Pièce jointe (image, fichier, note vocale)",
    )
    attachment_name = models.CharField(
        max_length=255, blank=True,
        verbose_name="Nom du fichier",
    )
    voice_duration = models.PositiveIntegerField(
        null=True, blank=True,
        verbose_name="Durée note vocale (secondes)",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created_at']
        verbose_name = "Message de club"
        verbose_name_plural = "Messages de club"

    def __str__(self):
        username = self.author.username if self.author else "[compte supprimé]"
        return f"{username}: {self.content[:50]}"


# TODO Phase 7: Report model for post/comment/message moderation
# class Report(models.Model):
#     reporter = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
#     content_type = models.ForeignKey(ContentType, on_delete=models.CASCADE)
#     object_id = models.PositiveIntegerField()
#     reason = models.CharField(max_length=50, choices=[
#         ('SPAM', 'Spam'), ('HARASSMENT', 'Harcèlement'),
#         ('INAPPROPRIATE', 'Contenu inapproprié'), ('OTHER', 'Autre'),
#     ])
#     status = models.CharField(max_length=20, choices=[
#         ('PENDING', 'En attente'), ('REVIEWED', 'Examiné'), ('DISMISSED', 'Rejeté'),
#     ], default='PENDING')
#     created_at = models.DateTimeField(auto_now_add=True)
