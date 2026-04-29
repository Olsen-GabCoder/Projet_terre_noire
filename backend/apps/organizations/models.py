import uuid

from django.conf import settings
from django.core.validators import MinValueValidator, MaxValueValidator
from django.db import models
from django.utils.text import slugify


class Organization(models.Model):
    """
    Organisation sur Frollot : maison d'édition, librairie, bibliothèque ou imprimerie.
    Chaque organisation possède son propre espace, son équipe et son catalogue.
    """
    # NB : pas de type PRESTATAIRE — les prestataires de services (correcteurs,
    # illustrateurs, etc.) sont modélisés via UserProfile.profile_type, pas via une org.
    ORG_TYPE_CHOICES = [
        ('MAISON_EDITION', "Maison d'édition"),
        ('LIBRAIRIE', 'Librairie'),
        ('BIBLIOTHEQUE', 'Bibliothèque'),
        ('IMPRIMERIE', 'Imprimerie'),
    ]

    name = models.CharField(max_length=200, verbose_name="Nom de l'organisation")
    slug = models.SlugField(max_length=220, unique=True, blank=True, verbose_name="Slug")
    org_type = models.CharField(max_length=20, choices=ORG_TYPE_CHOICES, verbose_name="Type d'organisation", db_index=True)
    description = models.TextField(blank=True, verbose_name="Description")
    logo = models.ImageField(upload_to='organizations/logos/', blank=True, null=True, verbose_name="Logo")
    cover_image = models.ImageField(upload_to='organizations/covers/', blank=True, null=True, verbose_name="Image de couverture")

    # Contact
    email = models.EmailField(blank=True, verbose_name="Email de contact")
    phone_number = models.CharField(max_length=20, blank=True, verbose_name="Téléphone")
    website = models.URLField(blank=True, verbose_name="Site web")
    address = models.TextField(blank=True, verbose_name="Adresse")
    city = models.CharField(max_length=100, blank=True, verbose_name="Ville")
    country = models.CharField(max_length=100, default="Gabon", verbose_name="Pays")
    latitude = models.DecimalField(
        max_digits=9, decimal_places=6, null=True, blank=True,
        verbose_name="Latitude",
    )
    longitude = models.DecimalField(
        max_digits=9, decimal_places=6, null=True, blank=True,
        verbose_name="Longitude",
    )

    # Frollot Connect — Vitrine & Annuaire
    accepted_genres = models.JSONField(
        default=list, blank=True,
        verbose_name="Genres acceptés",
        help_text="Ex: ['ROMAN', 'POESIE', 'ESSAI']",
    )
    submission_guidelines = models.TextField(
        blank=True,
        verbose_name="Guide de soumission",
        help_text="Instructions affichées sur la vitrine pour les auteurs souhaitant soumettre.",
    )
    is_accepting_manuscripts = models.BooleanField(
        default=False,
        verbose_name="Accepte les manuscrits",
    )
    specialties = models.JSONField(
        default=list, blank=True,
        verbose_name="Spécialités",
        help_text="Domaines d'expertise. Ex: ['Littérature africaine', 'Romans policiers']",
    )

    # Réputation (dénormalisée pour perf)
    avg_rating = models.DecimalField(
        max_digits=3, decimal_places=2, default=0,
        verbose_name="Note moyenne",
    )
    review_count = models.IntegerField(
        default=0,
        verbose_name="Nombre d'avis",
    )
    avg_response_days = models.IntegerField(
        null=True, blank=True,
        verbose_name="Temps de réponse moyen (jours)",
    )

    # ── Identité étendue ──
    short_description = models.CharField(
        max_length=280, blank=True,
        verbose_name="Accroche",
        help_text="Phrase courte affichée sur les cartes (max 280 car.).",
    )
    founding_year = models.PositiveIntegerField(
        null=True, blank=True,
        verbose_name="Année de création",
    )
    languages = models.JSONField(
        default=list, blank=True,
        verbose_name="Langues de travail",
        help_text="Ex: ['FR', 'EN', 'AR']",
    )

    # ── Coordonnées étendues ──
    whatsapp = models.CharField(max_length=20, blank=True, verbose_name="WhatsApp")
    po_box = models.CharField(max_length=50, blank=True, verbose_name="Boîte postale")
    social_links = models.JSONField(
        default=dict, blank=True,
        verbose_name="Réseaux sociaux",
        help_text='{"facebook":"...","instagram":"...","twitter":"...","linkedin":"...","youtube":"..."}',
    )

    # ── Horaires & Paiement ──
    business_hours = models.JSONField(
        default=dict, blank=True,
        verbose_name="Horaires d'ouverture",
        help_text='{"lundi":{"open":"08:00","close":"17:00"},...}',
    )
    payment_methods = models.JSONField(
        default=list, blank=True,
        verbose_name="Moyens de paiement",
        help_text="Ex: ['CASH','MOBILE_MONEY','CARD','VIREMENT']",
    )

    # ── Manuscrits — champs étendus (Maison d'édition) ──
    response_time_days = models.PositiveIntegerField(
        null=True, blank=True,
        verbose_name="Délai de réponse manuscrits (jours)",
        help_text="Délai maximum promis pour examiner un manuscrit.",
    )
    accepted_languages = models.JSONField(
        default=list, blank=True,
        verbose_name="Langues acceptées pour les manuscrits",
    )
    required_documents = models.JSONField(
        default=list, blank=True,
        verbose_name="Documents requis",
        help_text="Ex: ['MANUSCRIT','SYNOPSIS','LETTRE_MOTIVATION','CV','PHOTO']",
    )
    simultaneous_submissions = models.BooleanField(
        default=True,
        verbose_name="Soumissions simultanées autorisées",
    )
    editorial_line = models.TextField(
        blank=True,
        verbose_name="Ligne éditoriale",
    )
    target_audience = models.JSONField(
        default=list, blank=True,
        verbose_name="Public cible",
        help_text="Ex: ['ADULTE','JEUNESSE','UNIVERSITAIRE']",
    )

    # ── Données spécifiques au type (Librairie, Bibliothèque, Imprimerie) ──
    type_specific_data = models.JSONField(
        default=dict, blank=True,
        verbose_name="Données spécifiques au type",
        help_text="Champs dynamiques selon le type d'organisation.",
    )

    # Statut
    is_active = models.BooleanField(default=True, verbose_name="Active")
    is_verified = models.BooleanField(default=False, verbose_name="Vérifiée par la plateforme")

    # Propriétaire
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name='owned_organizations',
        verbose_name="Propriétaire",
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Organisation"
        verbose_name_plural = "Organisations"
        ordering = ['name']

    def save(self, *args, **kwargs):
        if not self.slug:
            base = slugify(self.name)
            slug = base
            counter = 1
            while Organization.objects.filter(slug=slug).exclude(pk=self.pk).exists():
                slug = f"{base}-{counter}"
                counter += 1
            self.slug = slug
        # Guard: prevent changing org_type from BIBLIOTHEQUE if library data exists
        if self.pk:
            try:
                old = Organization.objects.only('org_type').get(pk=self.pk)
                if old.org_type == 'BIBLIOTHEQUE' and self.org_type != 'BIBLIOTHEQUE':
                    from apps.library.models import LibraryCatalogItem
                    if LibraryCatalogItem.objects.filter(library=self).exists():
                        from django.core.exceptions import ValidationError
                        raise ValidationError(
                            "Impossible de changer le type : cette organisation a un catalogue "
                            "de bibliothèque actif."
                        )
            except Organization.DoesNotExist:
                pass
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.name} ({self.get_org_type_display()})"


class OrganizationMembership(models.Model):
    """
    Appartenance d'un utilisateur à une organisation, avec un rôle interne.
    """
    ROLE_CHOICES = [
        ('PROPRIETAIRE', 'Propriétaire'),
        ('ADMINISTRATEUR', 'Administrateur'),
        ('EDITEUR', 'Éditeur'),
        ('COMMERCIAL', 'Commercial'),
        ('MEMBRE', 'Membre'),
    ]

    organization = models.ForeignKey(
        Organization,
        on_delete=models.CASCADE,
        related_name='memberships',
        verbose_name="Organisation",
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='organization_memberships',
        verbose_name="Utilisateur",
    )
    role = models.CharField(
        max_length=20,
        choices=ROLE_CHOICES,
        default='MEMBRE',
        verbose_name="Rôle dans l'organisation",
    )
    is_active = models.BooleanField(default=True, verbose_name="Membre actif")
    joined_at = models.DateTimeField(auto_now_add=True, verbose_name="Date d'adhésion")

    class Meta:
        verbose_name = "Membre d'organisation"
        verbose_name_plural = "Membres d'organisations"
        unique_together = [['organization', 'user']]
        ordering = ['organization', 'role']

    def __str__(self):
        return f"{self.user.get_full_name()} — {self.get_role_display()} @ {self.organization.name}"


class Invitation(models.Model):
    """
    Invitation à rejoindre une organisation.
    Envoyée par un propriétaire/admin, acceptée/déclinée par l'invité.
    """
    STATUS_CHOICES = [
        ('PENDING', 'En attente'),
        ('ACCEPTED', 'Acceptée'),
        ('DECLINED', 'Déclinée'),
        ('EXPIRED', 'Expirée'),
    ]

    organization = models.ForeignKey(
        Organization,
        on_delete=models.CASCADE,
        related_name='invitations',
        verbose_name="Organisation",
    )
    email = models.EmailField(verbose_name="Email invité", db_index=True)
    role = models.CharField(
        max_length=20,
        choices=OrganizationMembership.ROLE_CHOICES,
        default='MEMBRE',
        verbose_name="Rôle proposé",
    )
    invited_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='sent_invitations',
        verbose_name="Invité par",
    )
    token = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING', db_index=True)
    message = models.TextField(blank=True, verbose_name="Message personnalisé")
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField(verbose_name="Date d'expiration")

    class Meta:
        verbose_name = "Invitation"
        verbose_name_plural = "Invitations"
        ordering = ['-created_at']

    def __str__(self):
        return f"Invitation {self.email} → {self.organization.name} ({self.get_status_display()})"

    @property
    def is_expired(self):
        from django.utils import timezone
        return timezone.now() > self.expires_at


class OrganizationReview(models.Model):
    """
    Avis sur une organisation.
    Un utilisateur peut noter une org s'il a acheté un livre, soumis un manuscrit,
    utilisé un service ou été membre.
    """
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='org_reviews',
        verbose_name="Utilisateur",
    )
    organization = models.ForeignKey(
        Organization,
        on_delete=models.CASCADE,
        related_name='reviews',
        verbose_name="Organisation",
    )
    rating = models.IntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(5)],
        verbose_name="Note (1-5)",
    )
    comment = models.TextField(blank=True, verbose_name="Commentaire")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Avis sur organisation"
        verbose_name_plural = "Avis sur organisations"
        unique_together = [['user', 'organization']]
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.user} → {self.organization} — {self.rating}★"


class Inquiry(models.Model):
    """
    Demande de renseignement structurée.
    Pas un chat : un formulaire avec sujet + message + réponse.
    Cible : une organisation OU un professionnel.
    """
    STATUS_CHOICES = [
        ('PENDING', 'En attente'),
        ('ANSWERED', 'Répondu'),
        ('CLOSED', 'Fermé'),
    ]

    sender = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='sent_inquiries',
        verbose_name="Expéditeur",
    )
    target_org = models.ForeignKey(
        Organization,
        on_delete=models.CASCADE,
        null=True, blank=True,
        related_name='received_inquiries',
        verbose_name="Organisation cible",
    )
    target_profile = models.ForeignKey(
        'users.UserProfile',
        on_delete=models.CASCADE,
        null=True, blank=True,
        related_name='received_inquiries',
        verbose_name="Professionnel cible",
    )
    subject = models.CharField(max_length=300, verbose_name="Sujet")
    message = models.TextField(verbose_name="Message")
    attachment = models.FileField(
        upload_to='inquiries/', null=True, blank=True,
        verbose_name="Pièce jointe",
    )
    response = models.TextField(blank=True, verbose_name="Réponse")
    responded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='inquiry_responses',
        verbose_name="Répondu par",
    )
    status = models.CharField(
        max_length=20, choices=STATUS_CHOICES, default='PENDING',
        verbose_name="Statut",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    responded_at = models.DateTimeField(null=True, blank=True, verbose_name="Date de réponse")

    class Meta:
        verbose_name = "Demande de renseignement"
        verbose_name_plural = "Demandes de renseignement"
        ordering = ['-created_at']

    def __str__(self):
        target = self.target_org or self.target_profile
        return f"{self.sender} → {target} — {self.subject} ({self.get_status_display()})"
