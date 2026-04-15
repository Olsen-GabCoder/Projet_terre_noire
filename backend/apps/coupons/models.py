import string
import secrets

from django.conf import settings
from django.core.exceptions import ValidationError
from django.core.validators import MinValueValidator, MaxValueValidator
from django.db import models
from django.utils import timezone


class CouponTemplate(models.Model):
    """Template d'offre réutilisable pour générer des coupons vendeur."""

    DISCOUNT_TYPE_CHOICES = [
        ('PERCENT', 'Pourcentage'),
        ('FIXED', 'Montant fixe (FCFA)'),
        ('FREE_SHIPPING', 'Livraison offerte'),
    ]

    CATEGORY_CHOICES = [
        ('BIENVENUE', 'Bienvenue'),
        ('FIDELITE', 'Fidélité'),
        ('SAISONNIER', 'Saisonnier'),
        ('REACTIVATION', 'Réactivation'),
        ('ANNIVERSAIRE', 'Anniversaire'),
        ('FLASH', 'Flash'),
        ('PARRAINAGE', 'Parrainage'),
        ('PROMO_PRODUIT', 'Promo produit'),
        ('DESTOCKAGE', 'Déstockage'),
        ('AUTRE', 'Autre'),
    ]

    TARGET_EMITTER_CHOICES = [
        ('ALL', 'Tous'),
        ('ORGANIZATION', 'Organisations uniquement'),
        ('PROVIDER_PROFILE', 'Prestataires uniquement'),
    ]

    ICON_PALETTE = (
        'fas fa-ticket-alt', 'fas fa-gift', 'fas fa-star', 'fas fa-heart',
        'fas fa-birthday-cake', 'fas fa-fire', 'fas fa-bolt', 'fas fa-tag',
        'fas fa-shopping-bag', 'fas fa-crown', 'fas fa-bookmark', 'fas fa-trophy',
        'fas fa-medal', 'fas fa-hand-holding-heart', 'fas fa-percentage',
        'fas fa-truck', 'fas fa-clock', 'fas fa-calendar-alt', 'fas fa-certificate',
        'fas fa-award',
    )

    COLOR_PALETTE = (
        '#5b5eea', '#8b5cf6', '#ec4899', '#f43f5e', '#f97316',
        '#eab308', '#22c55e', '#14b8a6', '#0ea5e9', '#6366f1',
    )

    # ── Émetteur ──
    organization = models.ForeignKey(
        'organizations.Organization', on_delete=models.CASCADE,
        null=True, blank=True,
        related_name='coupon_templates', verbose_name="Organisation",
    )
    provider_profile = models.ForeignKey(
        'users.UserProfile', on_delete=models.CASCADE,
        null=True, blank=True,
        related_name='coupon_templates', verbose_name="Profil prestataire",
        limit_choices_to={'profile_type__in': ['CORRECTEUR', 'ILLUSTRATEUR', 'TRADUCTEUR']},
    )

    # ── Identité & marketing ──
    name = models.CharField(max_length=150, verbose_name="Nom interne")
    commercial_title = models.CharField(
        max_length=200, blank=True, verbose_name="Titre commercial",
    )
    subtitle = models.CharField(
        max_length=200, blank=True, verbose_name="Sous-titre accroche",
    )
    marketing_description = models.TextField(
        blank=True, verbose_name="Description marketing",
    )
    category = models.CharField(
        max_length=20, choices=CATEGORY_CHOICES, default='AUTRE',
        verbose_name="Catégorie",
    )
    tags = models.JSONField(default=list, blank=True, verbose_name="Tags")
    icon = models.CharField(
        max_length=50, default='fas fa-ticket-alt', verbose_name="Icône",
    )
    accent_color = models.CharField(
        max_length=7, default='#5b5eea', verbose_name="Couleur d'accent",
    )

    # ── Réduction ──
    discount_type = models.CharField(
        max_length=20, choices=DISCOUNT_TYPE_CHOICES,
        verbose_name="Type de réduction",
    )
    discount_value = models.DecimalField(
        max_digits=10, decimal_places=2, default=0,
        validators=[MinValueValidator(0)],
        verbose_name="Valeur de la réduction",
    )
    min_order_amount = models.DecimalField(
        max_digits=10, decimal_places=2, default=0,
        validators=[MinValueValidator(0)],
        verbose_name="Montant minimum de commande (FCFA)",
    )
    max_discount_amount = models.DecimalField(
        max_digits=10, decimal_places=2, null=True, blank=True,
        validators=[MinValueValidator(0)],
        verbose_name="Plafond de réduction (FCFA)",
    )

    # ── Conditions commerciales ──
    first_order_only = models.BooleanField(
        default=False, verbose_name="Premier achat uniquement",
    )
    min_customer_age_days = models.PositiveIntegerField(
        null=True, blank=True, verbose_name="Ancienneté client minimum (jours)",
    )

    # ── Validité & quotas ──
    default_expiry_days = models.PositiveIntegerField(
        default=30, verbose_name="Expiration par défaut (jours)",
    )
    valid_from = models.DateTimeField(
        null=True, blank=True, verbose_name="Début de validité du template",
    )
    valid_until = models.DateTimeField(
        null=True, blank=True, verbose_name="Fin de validité du template",
    )
    total_quota = models.PositiveIntegerField(
        null=True, blank=True, verbose_name="Quota total de coupons",
    )
    quota_used = models.PositiveIntegerField(
        default=0, verbose_name="Coupons déjà émis",
    )
    per_customer_limit = models.PositiveIntegerField(
        default=1, verbose_name="Limite par client",
    )

    # ── Système & bibliothèque ──
    is_system = models.BooleanField(
        default=False, verbose_name="Template système Frollot",
    )
    system_slug = models.SlugField(
        max_length=80, null=True, blank=True, unique=True,
        verbose_name="Slug système",
    )
    clone_count = models.PositiveIntegerField(
        default=0, verbose_name="Nombre de clonages",
    )
    is_published = models.BooleanField(
        default=True, verbose_name="Publié",
    )
    cloned_from = models.ForeignKey(
        'self', on_delete=models.SET_NULL,
        null=True, blank=True, related_name='clones',
        verbose_name="Cloné depuis",
    )
    target_emitter_type = models.CharField(
        max_length=20, choices=TARGET_EMITTER_CHOICES, default='ALL',
        verbose_name="Type d'émetteur cible",
    )
    display_order = models.PositiveIntegerField(
        default=100, verbose_name="Ordre d'affichage",
    )

    # ── Métadonnées ──
    is_active = models.BooleanField(default=True, verbose_name="Actif")
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, blank=True, related_name='created_coupon_templates',
        verbose_name="Créé par",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Template coupon"
        verbose_name_plural = "Templates coupons"
        ordering = ['-created_at']
        constraints = [
            models.CheckConstraint(
                condition=~models.Q(organization__isnull=False, provider_profile__isnull=False),
                name='coupontemplate_emitter_xor',
            ),
            models.UniqueConstraint(
                fields=['organization', 'name'],
                condition=models.Q(organization__isnull=False),
                name='coupontemplate_unique_org_name',
            ),
            models.UniqueConstraint(
                fields=['provider_profile', 'name'],
                condition=models.Q(provider_profile__isnull=False),
                name='coupontemplate_unique_provider_name',
            ),
        ]

    def __str__(self):
        from apps.coupons.services import get_emitter_name_from_fields
        emitter = get_emitter_name_from_fields(self.organization, self.provider_profile)
        label = self.commercial_title or self.name
        return f"{label} ({emitter})"

    def clean(self):
        super().clean()
        if self.icon and self.icon not in self.ICON_PALETTE:
            raise ValidationError({'icon': f"Icône invalide. Choix autorisés : {', '.join(self.ICON_PALETTE)}"})
        if self.accent_color and self.accent_color not in self.COLOR_PALETTE:
            raise ValidationError({'accent_color': f"Couleur invalide. Choix autorisés : {', '.join(self.COLOR_PALETTE)}"})
        if self.valid_from and self.valid_until and self.valid_from >= self.valid_until:
            raise ValidationError({'valid_until': "La date de fin doit être postérieure à la date de début."})
        if self.total_quota is not None and self.total_quota < self.quota_used:
            raise ValidationError({'total_quota': "Le quota total ne peut pas être inférieur au nombre de coupons déjà émis."})

    @property
    def has_quota_remaining(self):
        if self.total_quota is None:
            return True
        return self.quota_used < self.total_quota


class Coupon(models.Model):
    """Code promo pour réduction sur les commandes."""

    DISCOUNT_TYPE_CHOICES = CouponTemplate.DISCOUNT_TYPE_CHOICES

    STATUS_CHOICES = [
        ('PENDING', 'En attente d\'envoi'),
        ('SENT', 'Envoyé'),
        ('USED', 'Utilisé'),
        ('EXPIRED', 'Expiré'),
        ('REVOKED', 'Révoqué'),
        ('FAILED', 'Échec d\'envoi'),
    ]

    code = models.CharField(max_length=50, unique=True, verbose_name="Code")

    # Réduction (remplace les anciens discount_percent / discount_amount)
    discount_type = models.CharField(
        max_length=20, choices=DISCOUNT_TYPE_CHOICES,
        default='PERCENT', verbose_name="Type de réduction",
    )
    discount_value = models.DecimalField(
        max_digits=10, decimal_places=2, default=0,
        validators=[MinValueValidator(0)],
        verbose_name="Valeur de la réduction",
    )
    min_order_amount = models.DecimalField(
        max_digits=10, decimal_places=2, default=0,
        validators=[MinValueValidator(0)],
        verbose_name="Montant minimum (FCFA)",
    )

    # Scope émetteur (org XOR provider_profile, ou les deux null = plateforme)
    organization = models.ForeignKey(
        'organizations.Organization', on_delete=models.SET_NULL,
        null=True, blank=True, related_name='coupons',
        verbose_name="Organisation émettrice",
    )
    provider_profile = models.ForeignKey(
        'users.UserProfile', on_delete=models.SET_NULL,
        null=True, blank=True, related_name='coupons',
        verbose_name="Profil prestataire émetteur",
        limit_choices_to={'profile_type__in': ['CORRECTEUR', 'ILLUSTRATEUR', 'TRADUCTEUR']},
    )
    template = models.ForeignKey(
        CouponTemplate, on_delete=models.SET_NULL,
        null=True, blank=True, related_name='coupons',
        verbose_name="Template source",
    )

    # Destinataire
    recipient_email = models.EmailField(
        null=True, blank=True, verbose_name="Email destinataire",
    )
    recipient = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, blank=True, related_name='received_coupons',
        verbose_name="Destinataire (user)",
    )

    # Statut et cycle de vie
    status = models.CharField(
        max_length=20, choices=STATUS_CHOICES, default='PENDING',
        verbose_name="Statut",
    )
    valid_from = models.DateTimeField(
        null=True, blank=True, verbose_name="Valide à partir de",
    )
    valid_until = models.DateTimeField(
        null=True, blank=True, verbose_name="Valide jusqu'à",
    )
    is_active = models.BooleanField(default=True, verbose_name="Actif")
    max_uses = models.PositiveIntegerField(
        null=True, blank=True, default=1,
        verbose_name="Nombre max d'utilisations",
    )
    usage_count = models.PositiveIntegerField(
        default=0, verbose_name="Utilisations",
    )

    # Usage
    used_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, blank=True, related_name='used_coupons',
        verbose_name="Utilisé par",
    )
    used_at = models.DateTimeField(
        null=True, blank=True, verbose_name="Utilisé le",
    )
    used_on_order = models.ForeignKey(
        'orders.Order', on_delete=models.SET_NULL,
        null=True, blank=True, related_name='applied_coupons',
        verbose_name="Utilisé sur commande",
    )

    # Émetteur
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, blank=True, related_name='created_coupons',
        verbose_name="Créé par",
    )
    custom_message = models.TextField(
        blank=True, verbose_name="Message personnalisé",
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Code promo"
        verbose_name_plural = "Codes promo"
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['status', 'recipient']),
            models.Index(fields=['organization', 'status']),
            models.Index(fields=['provider_profile', 'status']),
            models.Index(fields=['recipient_email']),
        ]
        constraints = [
            models.CheckConstraint(
                condition=~models.Q(organization__isnull=False, provider_profile__isnull=False),
                name='coupon_emitter_xor',
            ),
        ]

    def __str__(self):
        if self.discount_type == 'PERCENT':
            desc = f"{self.discount_value}%"
        elif self.discount_type == 'FIXED':
            desc = f"{self.discount_value} FCFA"
        else:
            desc = "Livraison offerte"
        return f"{self.code} ({desc})"

    @classmethod
    def generate_code(cls):
        """Génère un code unique FROLLOT-XXXXXX."""
        alphabet = string.ascii_uppercase + string.digits
        for _ in range(20):
            code = 'FROLLOT-' + ''.join(secrets.choice(alphabet) for _ in range(6))
            if not cls.objects.filter(code=code).exists():
                return code
        raise RuntimeError("Impossible de générer un code coupon unique après 20 tentatives.")

    def is_valid_for(self, user, scoped_subtotal=None, provider_profile_id=None):
        """Vérifie si le coupon est utilisable par ce user sur ce montant/prestataire."""
        now = timezone.now()

        if self.status not in ('SENT',):
            return False
        if not self.is_active:
            return False
        if self.valid_from and now < self.valid_from:
            return False
        if self.valid_until and now > self.valid_until:
            return False
        if self.max_uses is not None and self.usage_count >= self.max_uses:
            return False

        # Coupon personnel : vérifier le destinataire
        if self.recipient_id and self.recipient_id != user.id:
            return False
        if self.recipient_email and not self.recipient_id:
            if user.email.lower() != self.recipient_email.lower():
                return False

        # Scope prestataire : vérifier que le service est bien du bon prestataire
        if self.provider_profile_id and provider_profile_id:
            if self.provider_profile_id != provider_profile_id:
                return False

        # Montant minimum
        if scoped_subtotal is not None and scoped_subtotal < self.min_order_amount:
            return False

        return True

    def apply(self, user, order=None):
        """Marque le coupon comme utilisé. order est None pour les services (traçabilité via ServiceOrder.coupon FK inverse)."""
        self.status = 'USED'
        self.used_by = user
        self.used_at = timezone.now()
        self.used_on_order = order  # None pour les services
        self.usage_count += 1
        self.save(update_fields=[
            'status', 'used_by', 'used_at', 'used_on_order',
            'usage_count', 'updated_at',
        ])

    def restore(self):
        """Restaure le coupon après annulation de commande."""
        self.status = 'SENT'
        self.used_by = None
        self.used_at = None
        self.used_on_order = None
        self.usage_count = max(0, self.usage_count - 1)
        self.save(update_fields=[
            'status', 'used_by', 'used_at', 'used_on_order',
            'usage_count', 'updated_at',
        ])
