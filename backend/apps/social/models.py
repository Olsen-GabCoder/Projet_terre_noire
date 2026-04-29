import uuid

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
    current_book_since = models.DateTimeField(
        null=True, blank=True,
        verbose_name="Livre en cours depuis",
    )

    creator = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='created_clubs', verbose_name="Créateur",
    )
    is_public = models.BooleanField(default=True, verbose_name="Public")
    requires_approval = models.BooleanField(default=False, verbose_name="Approbation requise")
    application_vote_duration = models.PositiveIntegerField(
        default=48, verbose_name="Durée du vote de candidature (heures)",
    )
    max_members = models.PositiveIntegerField(default=50, verbose_name="Nombre max de membres")
    reading_goal_pages = models.PositiveIntegerField(
        null=True, blank=True, verbose_name="Objectif de lecture (pages/semaine)",
    )
    reading_goal_deadline = models.DateField(
        null=True, blank=True, verbose_name="Date limite de l'objectif",
    )
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

    @property
    def active_members_count(self):
        """Number of approved, non-banned members. Uses queryset annotation if available."""
        # If annotated by the queryset (e.g. in ViewSet.get_queryset), use that value
        annotated = self.__dict__.get('_active_members_count')
        if annotated is not None:
            return annotated
        return self.memberships.filter(
            membership_status='APPROVED', is_banned=False,
        ).count()

    def __str__(self):
        return self.name


class BookClubMembership(models.Model):
    """Appartenance d'un utilisateur à un club."""
    ROLE_CHOICES = [
        ('ADMIN', 'Administrateur'),
        ('MODERATOR', 'Modérateur'),
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
    MEMBERSHIP_STATUS_CHOICES = [
        ('APPROVED', 'Approuvé'),
        ('PENDING', 'En attente'),
        ('REJECTED', 'Rejeté'),
    ]

    role = models.CharField(max_length=10, choices=ROLE_CHOICES, default='MEMBER')
    membership_status = models.CharField(
        max_length=10, choices=MEMBERSHIP_STATUS_CHOICES, default='APPROVED',
        verbose_name="Statut d'adhésion",
    )
    joined_at = models.DateTimeField(auto_now_add=True)
    last_read_at = models.DateTimeField(
        null=True, blank=True, verbose_name="Dernière lecture",
        help_text="Horodatage de la dernière fois que le membre a consulté le chat.",
    )
    reading_progress = models.PositiveIntegerField(
        default=0, verbose_name="Progression de lecture (%)",
        help_text="Pourcentage de progression dans le livre en cours du club (0-100).",
    )
    is_banned = models.BooleanField(default=False, verbose_name="Banni")
    banned_at = models.DateTimeField(null=True, blank=True, verbose_name="Banni le")

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
        ('QUOTE', 'Citation de passage'),
        ('SYSTEM', 'Message système'),
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
    quote_text = models.TextField(
        blank=True, verbose_name="Texte du passage cité",
    )
    quote_page = models.PositiveIntegerField(
        null=True, blank=True, verbose_name="Numéro de page du passage",
    )
    quote_book = models.ForeignKey(
        'books.Book', on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='club_quotes', verbose_name="Livre cité",
    )
    reply_to = models.ForeignKey(
        'self', on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='replies', verbose_name="En réponse à",
    )
    forwarded_from = models.ForeignKey(
        'self', on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='forwards', verbose_name="Transféré depuis",
    )
    is_deleted = models.BooleanField(default=False, verbose_name="Supprimé")
    is_pinned = models.BooleanField(default=False, verbose_name="Épinglé")
    edited_at = models.DateTimeField(null=True, blank=True, verbose_name="Modifié le")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created_at']
        verbose_name = "Message de club"
        verbose_name_plural = "Messages de club"

    def __str__(self):
        username = self.author.username if self.author else "[compte supprimé]"
        return f"{username}: {self.content[:50]}"


class MessageReaction(models.Model):
    """Réaction emoji sur un message de club."""
    message = models.ForeignKey(
        BookClubMessage, on_delete=models.CASCADE,
        related_name='reactions', verbose_name="Message",
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
        related_name='message_reactions', verbose_name="Utilisateur",
    )
    emoji = models.CharField(max_length=8, verbose_name="Emoji")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = [['message', 'user', 'emoji']]
        verbose_name = "Réaction"
        verbose_name_plural = "Réactions"

    def __str__(self):
        return f"{self.user.username} → {self.emoji} sur msg #{self.message_id}"


class ClubInvitation(models.Model):
    """Lien d'invitation partageable pour rejoindre un club."""
    import uuid as _uuid

    club = models.ForeignKey(
        BookClub, on_delete=models.CASCADE,
        related_name='invitations', verbose_name="Club",
    )
    token = models.UUIDField(default=_uuid.uuid4, unique=True, editable=False)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, blank=True, related_name='club_invitations_created',
    )
    max_uses = models.PositiveIntegerField(default=0, help_text="0 = illimité")
    use_count = models.PositiveIntegerField(default=0)
    expires_at = models.DateTimeField(null=True, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = "Invitation de club"
        verbose_name_plural = "Invitations de club"

    def __str__(self):
        return f"Invitation {self.token} → {self.club.name}"

    @property
    def is_valid(self):
        if not self.is_active:
            return False
        if self.max_uses > 0 and self.use_count >= self.max_uses:
            return False
        if self.expires_at:
            from django.utils import timezone
            if timezone.now() > self.expires_at:
                return False
        return True


class BookPoll(models.Model):
    """Vote pour choisir le prochain livre du club ou sondage générique."""
    STATUS_CHOICES = [
        ('OPEN', 'Ouvert'),
        ('CLOSED', 'Clos'),
    ]
    POLL_TYPE_CHOICES = [
        ('BOOK', 'Livre'),
        ('GENERIC', 'Générique'),
        ('APPLICATION', 'Candidature'),
    ]

    club = models.ForeignKey(
        BookClub, on_delete=models.CASCADE,
        related_name='polls', verbose_name="Club",
    )
    title = models.CharField(max_length=200, default="Vote pour le prochain livre")
    poll_type = models.CharField(max_length=15, choices=POLL_TYPE_CHOICES, default='BOOK', verbose_name="Type de sondage")
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='OPEN')
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, blank=True, related_name='created_polls',
    )
    created_at = models.DateTimeField(auto_now_add=True)
    closed_at = models.DateTimeField(null=True, blank=True)
    expires_at = models.DateTimeField(
        null=True, blank=True,
        verbose_name="Date d'expiration",
        help_text="Si défini, le sondage se ferme automatiquement à cette date.",
    )
    allow_multiple = models.BooleanField(
        default=False,
        verbose_name="Choix multiples",
        help_text="Permet de voter pour plusieurs options.",
    )

    class Meta:
        ordering = ['-created_at']
        verbose_name = "Vote de club"
        verbose_name_plural = "Votes de club"

    @property
    def is_expired(self):
        if not self.expires_at:
            return False
        from django.utils import timezone
        return timezone.now() >= self.expires_at

    def auto_close_if_expired(self):
        """Close the poll if it has expired. Returns True if closed.

        Legacy convenience method — used by tests.
        Production flow uses the close_expired_polls Celery task
        + resolve_application service directly.
        """
        if self.status == 'OPEN' and self.is_expired:
            from django.utils import timezone
            self.status = 'CLOSED'
            self.closed_at = timezone.now()
            self.save(update_fields=['status', 'closed_at'])

            if self.poll_type == 'APPLICATION':
                from apps.social.services import resolve_application
                resolve_application(self)

            return True
        return False

    def __str__(self):
        return f"{self.title} — {self.club.name}"


class BookPollOption(models.Model):
    """Un livre proposé dans un vote ou une option texte pour un sondage générique."""
    poll = models.ForeignKey(
        BookPoll, on_delete=models.CASCADE,
        related_name='options', verbose_name="Vote",
    )
    book = models.ForeignKey(
        'books.Book', on_delete=models.CASCADE,
        related_name='poll_options', verbose_name="Livre",
        null=True, blank=True,
    )
    text_label = models.CharField(max_length=200, null=True, blank=True, verbose_name="Option texte")
    proposed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, blank=True, related_name='proposed_options',
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = [['poll', 'book']]
        verbose_name = "Option de vote"

    @property
    def label(self):
        if self.text_label:
            return self.text_label
        if self.book:
            return self.book.title
        return '—'

    def __str__(self):
        return f"{self.label} dans {self.poll}"


class BookPollVote(models.Model):
    """Vote d'un membre pour une option."""
    option = models.ForeignKey(
        BookPollOption, on_delete=models.CASCADE,
        related_name='votes', verbose_name="Option",
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
        related_name='poll_votes', verbose_name="Votant",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = [['option', 'user']]
        verbose_name = "Vote"

    def __str__(self):
        return f"{self.user.username} → {self.option.book.title}"


class ClubSession(models.Model):
    """Séance de club — instantanée, planifiée ou permanente."""
    SESSION_TYPE_CHOICES = [
        ('INSTANT', 'Instantanée'),
        ('SCHEDULED', 'Planifiée'),
        ('PERMANENT', 'Permanente'),
    ]
    RECURRENCE_CHOICES = [
        ('NONE', 'Aucune'),
        ('WEEKLY', 'Hebdomadaire'),
        ('BIWEEKLY', 'Bimensuel'),
        ('MONTHLY', 'Mensuel'),
    ]

    session_type = models.CharField(
        max_length=10, choices=SESSION_TYPE_CHOICES, default='SCHEDULED',
        verbose_name="Type de séance",
    )
    club = models.ForeignKey(
        BookClub, on_delete=models.CASCADE,
        related_name='sessions', verbose_name="Club",
    )
    title = models.CharField(max_length=200, verbose_name="Sujet de la séance")
    description = models.TextField(blank=True, verbose_name="Description")
    scheduled_at = models.DateTimeField(verbose_name="Date et heure")
    is_online = models.BooleanField(default=True, verbose_name="En ligne")
    location = models.CharField(
        max_length=255, blank=True,
        verbose_name="Lieu (si en présentiel)",
    )
    recurrence = models.CharField(
        max_length=10, choices=RECURRENCE_CHOICES, default='NONE',
        verbose_name="Récurrence",
    )
    # Video meeting
    room_id = models.UUIDField(
        default=uuid.uuid4, editable=False,
        verbose_name="ID de la salle vidéo",
    )
    meeting_active = models.BooleanField(
        default=False, verbose_name="Séance en cours",
    )
    meeting_started_at = models.DateTimeField(
        null=True, blank=True, verbose_name="Début de la visio",
    )
    meeting_ended_at = models.DateTimeField(
        null=True, blank=True, verbose_name="Fin de la visio",
    )
    meeting_participants_count = models.PositiveIntegerField(
        default=0, verbose_name="Nombre de participants",
    )
    # AI meeting summary
    meeting_summary = models.TextField(blank=True, verbose_name="Résumé IA de la séance")
    summary_key_points = models.JSONField(blank=True, default=list, verbose_name="Points clés")
    summary_next_steps = models.TextField(blank=True, verbose_name="Prochaines étapes")
    summary_generated_at = models.DateTimeField(null=True, blank=True, verbose_name="Date du résumé")
    summary_generated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, blank=True, related_name='+',
        verbose_name="Résumé généré par",
    )

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, blank=True, related_name='created_sessions',
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['scheduled_at']
        verbose_name = "Séance de club"
        verbose_name_plural = "Séances de club"
        constraints = [
            models.UniqueConstraint(
                fields=['club'],
                condition=models.Q(session_type='PERMANENT'),
                name='unique_permanent_session_per_club',
            ),
        ]

    def __str__(self):
        return f"{self.title} — {self.club.name}"


class SessionRSVP(models.Model):
    """RSVP d'un membre pour une séance de club."""
    STATUS_CHOICES = [
        ('GOING', 'Participe'),
        ('NOT_GOING', 'Ne participe pas'),
        ('MAYBE', 'Peut-être'),
    ]

    session = models.ForeignKey(
        ClubSession, on_delete=models.CASCADE,
        related_name='rsvps', verbose_name="Séance",
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
        related_name='session_rsvps', verbose_name="Membre",
    )
    status = models.CharField(
        max_length=10, choices=STATUS_CHOICES,
        verbose_name="Statut",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = [['session', 'user']]
        verbose_name = "RSVP séance"
        verbose_name_plural = "RSVPs séances"

    def __str__(self):
        return f"{self.user} — {self.get_status_display()} — {self.session.title}"


class ClubBookHistory(models.Model):
    """Historique des livres lus par un club — enrichi de métriques figées à l'archivage."""
    club = models.ForeignKey(
        BookClub, on_delete=models.CASCADE,
        related_name='book_history', verbose_name="Club",
    )
    book = models.ForeignKey(
        'books.Book', on_delete=models.CASCADE,
        related_name='club_history', verbose_name="Livre",
    )
    started_at = models.DateField(verbose_name="Commencé le")
    finished_at = models.DateField(null=True, blank=True, verbose_name="Terminé le")
    metrics = models.JSONField(
        default=dict, blank=True,
        verbose_name="Métriques de lecture figées",
        help_text="members_completed, checkpoints_reached, checkpoints_total, duration_days, etc.",
    )
    source_poll = models.ForeignKey(
        'BookPoll', null=True, blank=True, on_delete=models.SET_NULL,
        related_name='archived_books', verbose_name="Sondage source",
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL,
        related_name='archived_club_books', verbose_name="Archivé par",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-finished_at', '-started_at']
        verbose_name = "Historique de lecture du club"
        verbose_name_plural = "Historiques de lecture du club"

    def __str__(self):
        return f"{self.book.title} @ {self.club.name}"


# ── Jalons de lecture ──

class ReadingCheckpoint(models.Model):
    """Jalon de lecture — point de discussion sans spoilers."""
    club = models.ForeignKey(
        BookClub, on_delete=models.CASCADE,
        related_name='checkpoints', verbose_name="Club",
    )
    book = models.ForeignKey(
        'books.Book', on_delete=models.CASCADE,
        related_name='reading_checkpoints', verbose_name="Livre",
    )
    label = models.CharField(max_length=200, verbose_name="Nom du jalon")
    target_page = models.PositiveIntegerField(verbose_name="Page cible")
    sort_order = models.PositiveIntegerField(default=0, verbose_name="Ordre")
    reached_at = models.DateTimeField(null=True, blank=True, verbose_name="Atteint le")
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, blank=True, related_name='created_checkpoints',
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['sort_order', 'target_page']
        unique_together = [['club', 'book', 'target_page']]
        verbose_name = "Jalon de lecture"
        verbose_name_plural = "Jalons de lecture"

    def __str__(self):
        return f"{self.label} (p.{self.target_page}) — {self.club.name}"


# ── Wishlist collective ──

class ClubWishlistItem(models.Model):
    """Suggestion de livre par un membre du club."""
    club = models.ForeignKey(
        BookClub, on_delete=models.CASCADE,
        related_name='wishlist_items', verbose_name="Club",
    )
    book = models.ForeignKey(
        'books.Book', on_delete=models.CASCADE,
        related_name='club_wishlist_entries', verbose_name="Livre",
    )
    suggested_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, blank=True, related_name='club_suggestions',
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = [['club', 'book']]
        ordering = ['-created_at']
        verbose_name = "Suggestion de lecture"
        verbose_name_plural = "Suggestions de lecture"

    def __str__(self):
        return f"{self.book.title} — wishlist {self.club.name}"


class ClubWishlistVote(models.Model):
    """Vote d'un membre pour une suggestion de la wishlist."""
    item = models.ForeignKey(
        ClubWishlistItem, on_delete=models.CASCADE,
        related_name='votes', verbose_name="Suggestion",
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
        related_name='wishlist_votes', verbose_name="Votant",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = [['item', 'user']]
        verbose_name = "Vote wishlist"
        verbose_name_plural = "Votes wishlist"

    def __str__(self):
        return f"{self.user.username} → {self.item.book.title}"


# ── Journal de modération ──

class ModerationLog(models.Model):
    """Journal des actions de modération dans un club."""
    ACTION_CHOICES = [
        ('KICK', 'Exclusion'),
        ('BAN', 'Bannissement'),
        ('ROLE_CHANGE', 'Changement de rôle'),
        ('MSG_DELETE', 'Suppression de message'),
        ('MSG_PIN', 'Épinglage de message'),
        ('MSG_UNPIN', 'Désépinglage de message'),
        ('MEMBER_APPROVE', 'Approbation de membre'),
        ('MEMBER_REJECT', 'Rejet de membre'),
        ('REPORT_REVIEW', 'Traitement de signalement'),
    ]

    club = models.ForeignKey(
        BookClub, on_delete=models.CASCADE,
        related_name='moderation_logs', verbose_name="Club",
    )
    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, blank=True, related_name='moderation_actions',
        verbose_name="Auteur de l'action",
    )
    action = models.CharField(max_length=20, choices=ACTION_CHOICES, verbose_name="Action")
    target_user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, blank=True, related_name='moderation_targets',
        verbose_name="Utilisateur ciblé",
    )
    target_message = models.ForeignKey(
        'BookClubMessage', on_delete=models.SET_NULL,
        null=True, blank=True, related_name='moderation_logs',
        verbose_name="Message ciblé",
    )
    details = models.CharField(max_length=300, blank=True, verbose_name="Détails")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = "Journal de modération"
        verbose_name_plural = "Journal de modération"

    def __str__(self):
        return f"{self.get_action_display()} par {self.actor} dans {self.club.name}"


# ── Candidatures démocratiques ──

class MembershipApplication(models.Model):
    """Candidature démocratique — soumise au vote des membres du club."""
    STATUS_CHOICES = [
        ('PENDING', 'En attente de vote'),
        ('APPROVED', 'Acceptée'),
        ('REJECTED', 'Refusée'),
        ('NO_QUORUM', 'Quorum non atteint'),
    ]

    club = models.ForeignKey(BookClub, on_delete=models.CASCADE, related_name='applications')
    applicant = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='club_applications')

    reading_relationship = models.TextField(verbose_name="Rapport à la lecture")
    motivation = models.TextField(verbose_name="Motivation pour rejoindre le club")
    contribution = models.TextField(verbose_name="Ce que le candidat souhaite apporter")

    poll = models.OneToOneField('BookPoll', on_delete=models.SET_NULL, null=True, blank=True, related_name='application')

    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='PENDING')
    votes_for = models.PositiveIntegerField(default=0)
    votes_against = models.PositiveIntegerField(default=0)
    total_eligible = models.PositiveIntegerField(default=0)

    created_at = models.DateTimeField(auto_now_add=True)
    resolved_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = "Candidature"
        verbose_name_plural = "Candidatures"

    def __str__(self):
        return f"Candidature de {self.applicant} pour {self.club.name}"


# ── Signalement de messages ──

class MessageReport(models.Model):
    """Signalement d'un message de club par un membre."""
    REASON_CHOICES = [
        ('SPAM', 'Spam'),
        ('HARASSMENT', 'Harcèlement'),
        ('INAPPROPRIATE', 'Contenu inapproprié'),
        ('HATE_SPEECH', 'Discours haineux'),
        ('OTHER', 'Autre'),
    ]
    STATUS_CHOICES = [
        ('PENDING', 'En attente'),
        ('REVIEWED', 'Examiné'),
        ('DISMISSED', 'Rejeté'),
    ]

    message = models.ForeignKey(
        BookClubMessage, on_delete=models.CASCADE,
        related_name='reports', verbose_name="Message signalé",
    )
    reporter = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
        related_name='message_reports', verbose_name="Signalé par",
    )
    reason = models.CharField(
        max_length=20, choices=REASON_CHOICES,
        verbose_name="Motif",
    )
    details = models.TextField(
        blank=True, verbose_name="Détails supplémentaires",
    )
    status = models.CharField(
        max_length=20, choices=STATUS_CHOICES, default='PENDING',
        verbose_name="Statut",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = [['message', 'reporter']]
        ordering = ['-created_at']
        verbose_name = "Signalement de message"
        verbose_name_plural = "Signalements de messages"

    def __str__(self):
        return f"Report #{self.pk} — {self.get_reason_display()} par {self.reporter}"


class BlockedUser(models.Model):
    """Un utilisateur en bloque un autre — les messages sont masqués côté client."""

    blocker = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
        related_name='blocked_users', verbose_name='Bloqueur',
    )
    blocked = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
        related_name='blocked_by', verbose_name='Bloqué',
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ['blocker', 'blocked']
        verbose_name = 'Utilisateur bloqué'
        verbose_name_plural = 'Utilisateurs bloqués'

    def __str__(self):
        return f"{self.blocker} bloque {self.blocked}"
