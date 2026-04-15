from decimal import Decimal

from django.conf import settings
from django.core.exceptions import ValidationError
from django.core.validators import MinValueValidator, MaxValueValidator, FileExtensionValidator
from django.db import models
from django.utils.text import slugify


class ServiceListing(models.Model):
    """Offre de service d'un professionnel (correcteur, illustrateur, traducteur)."""
    SERVICE_TYPE_CHOICES = [
        ('CORRECTION', 'Correction'),
        ('ILLUSTRATION', 'Illustration'),
        ('TRANSLATION', 'Traduction'),
        ('COVER_DESIGN', 'Conception de couverture'),
        ('LAYOUT', 'Mise en page'),
        ('PROOFREADING', 'Relecture'),
    ]

    PRICE_TYPE_CHOICES = [
        ('PER_PAGE', 'Par page'),
        ('PER_WORD', 'Par mot'),
        ('PER_PROJECT', 'Par projet'),
        ('HOURLY', 'À l\'heure'),
    ]

    provider = models.ForeignKey(
        'users.UserProfile', on_delete=models.CASCADE,
        related_name='service_listings', verbose_name="Prestataire",
        limit_choices_to={'profile_type__in': ['CORRECTEUR', 'ILLUSTRATEUR', 'TRADUCTEUR']},
    )
    organization = models.ForeignKey(
        'organizations.Organization', on_delete=models.CASCADE,
        null=True, blank=True,
        related_name='service_listings',
        verbose_name="Organisation",
        help_text="Permet aux organisations de proposer des services.",
    )
    service_type = models.CharField(
        max_length=20, choices=SERVICE_TYPE_CHOICES,
        verbose_name="Type de service",
    )
    title = models.CharField(max_length=300, verbose_name="Titre")
    slug = models.SlugField(max_length=350, unique=True, blank=True, verbose_name="Slug")
    description = models.TextField(verbose_name="Description")
    price_type = models.CharField(
        max_length=20, choices=PRICE_TYPE_CHOICES,
        verbose_name="Type de tarification",
    )
    base_price = models.DecimalField(
        max_digits=10, decimal_places=2,
        validators=[MinValueValidator(Decimal('0'))],
        verbose_name="Prix de base (FCFA)",
    )
    turnaround_days = models.PositiveIntegerField(verbose_name="Délai (jours)")
    languages = models.JSONField(default=list, blank=True, verbose_name="Langues")
    genres = models.JSONField(default=list, blank=True, verbose_name="Genres")
    portfolio_samples = models.JSONField(default=list, blank=True, verbose_name="Exemples de portfolio")
    is_active = models.BooleanField(default=True, verbose_name="Active")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Offre de service"
        verbose_name_plural = "Offres de services"
        ordering = ['service_type']

    def save(self, *args, **kwargs):
        if not self.slug:
            base = slugify(self.title)
            if not base:
                base = 'service'
            slug = base
            counter = 1
            while ServiceListing.objects.filter(slug=slug).exclude(pk=self.pk).exists():
                slug = f"{base}-{counter}"
                counter += 1
            self.slug = slug
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.title} — {self.provider}"


class ServiceRequest(models.Model):
    """Demande de service d'un client à un prestataire."""
    STATUS_CHOICES = [
        ('DRAFT', 'Brouillon'),
        ('SUBMITTED', 'Soumise'),
        ('QUOTED', 'Devis envoyé'),
        ('ACCEPTED', 'Acceptée'),
        ('IN_PROGRESS', 'En cours'),
        ('REVIEW', 'En révision'),
        ('REVISION', 'Révision demandée'),
        ('COMPLETED', 'Terminée'),
        ('CANCELLED', 'Annulée'),
    ]

    client = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='service_requests', verbose_name="Client",
    )
    listing = models.ForeignKey(
        ServiceListing, on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='requests', verbose_name="Offre de service",
    )
    provider_profile = models.ForeignKey(
        'users.UserProfile', on_delete=models.CASCADE,
        related_name='received_requests', verbose_name="Profil prestataire",
    )
    title = models.CharField(max_length=300, verbose_name="Titre")
    description = models.TextField(verbose_name="Description")
    requirements = models.TextField(blank=True, verbose_name="Exigences")
    file = models.FileField(
        upload_to='services/requests/', null=True, blank=True,
        validators=[FileExtensionValidator(allowed_extensions=['pdf', 'docx', 'doc'])],
        verbose_name="Fichier joint",
    )
    page_count = models.IntegerField(null=True, blank=True, verbose_name="Nombre de pages")
    word_count = models.IntegerField(null=True, blank=True, verbose_name="Nombre de mots")
    budget_min = models.DecimalField(
        max_digits=10, decimal_places=2, null=True, blank=True,
        verbose_name="Budget minimum (FCFA)",
    )
    budget_max = models.DecimalField(
        max_digits=10, decimal_places=2, null=True, blank=True,
        verbose_name="Budget maximum (FCFA)",
    )
    status = models.CharField(
        max_length=20, choices=STATUS_CHOICES, default='DRAFT',
        verbose_name="Statut",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Demande de service"
        verbose_name_plural = "Demandes de services"
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.title} — {self.client}"


class ServiceQuote(models.Model):
    """Devis envoyé par un prestataire pour une demande de service."""
    STATUS_CHOICES = [
        ('PENDING', 'En attente'),
        ('ACCEPTED', 'Accepté'),
        ('REJECTED', 'Rejeté'),
        ('EXPIRED', 'Expiré'),
    ]

    request = models.ForeignKey(
        ServiceRequest, on_delete=models.CASCADE,
        related_name='quotes', verbose_name="Demande",
    )
    price = models.DecimalField(
        max_digits=10, decimal_places=2,
        validators=[MinValueValidator(Decimal('0'))],
        verbose_name="Prix total proposé (FCFA)",
    )
    turnaround_days = models.PositiveIntegerField(verbose_name="Délai de livraison (jours)")
    message = models.TextField(blank=True, verbose_name="Message / conditions")
    scope_of_work = models.TextField(
        blank=True,
        verbose_name="Périmètre de la prestation",
        help_text="Détail de ce qui est inclus dans le devis.",
    )
    revision_rounds = models.PositiveIntegerField(
        default=1,
        verbose_name="Révisions incluses",
        help_text="Nombre de tours de révision inclus dans le prix.",
    )
    payment_terms = models.CharField(
        max_length=50, blank=True,
        verbose_name="Conditions de paiement",
        help_text="Ex: 50% à la commande, 50% à la livraison.",
    )
    methodology = models.TextField(
        blank=True,
        verbose_name="Méthodologie de travail",
        help_text="Approche, outils utilisés, processus de travail.",
    )
    milestones = models.JSONField(
        default=list, blank=True,
        verbose_name="Jalons / sprints",
        help_text='Liste de jalons: [{"title":"...", "days":..., "deliverable":"..."}]',
    )
    reporting_frequency = models.CharField(
        max_length=30, blank=True,
        verbose_name="Fréquence de reporting",
        help_text="Ex: hebdomadaire, bi-hebdomadaire, à chaque jalon.",
    )
    exclusions = models.TextField(
        blank=True,
        verbose_name="Exclusions",
        help_text="Ce qui n'est PAS inclus dans le devis.",
    )
    status = models.CharField(
        max_length=20, choices=STATUS_CHOICES, default='PENDING',
        verbose_name="Statut",
    )
    valid_until = models.DateTimeField(verbose_name="Valide jusqu'au")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Devis de service"
        verbose_name_plural = "Devis de services"
        ordering = ['-created_at']

    def __str__(self):
        return f"Devis #{self.pk} — {self.price} FCFA"


class ServiceOrder(models.Model):
    """Commande de service après acceptation d'un devis."""
    STATUS_CHOICES = [
        ('PENDING', 'En attente'),
        ('IN_PROGRESS', 'En cours'),
        ('REVIEW', 'En révision'),
        ('REVISION', 'Révision demandée'),
        ('COMPLETED', 'Terminée'),
        ('CANCELLED', 'Annulée'),
    ]

    request = models.OneToOneField(
        ServiceRequest, on_delete=models.CASCADE,
        related_name='order', verbose_name="Demande",
    )
    quote = models.OneToOneField(
        ServiceQuote, on_delete=models.CASCADE,
        related_name='order', verbose_name="Devis",
    )
    client = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='service_orders', verbose_name="Client",
    )
    provider = models.ForeignKey(
        'users.UserProfile', on_delete=models.CASCADE,
        related_name='service_orders', verbose_name="Prestataire",
    )
    status = models.CharField(
        max_length=20, choices=STATUS_CHOICES, default='PENDING',
        verbose_name="Statut",
    )
    amount = models.DecimalField(
        max_digits=10, decimal_places=2,
        validators=[MinValueValidator(Decimal('0'))],
        verbose_name="Montant (FCFA)",
    )
    platform_fee = models.DecimalField(
        max_digits=10, decimal_places=2, default=Decimal('0'),
        verbose_name="Commission plateforme (FCFA)",
    )
    # P3.5 — Coupon prestataire
    discount_amount = models.DecimalField(
        max_digits=10, decimal_places=2, default=Decimal('0'),
        validators=[MinValueValidator(Decimal('0'))],
        verbose_name="Réduction coupon (FCFA)",
    )
    coupon = models.ForeignKey(
        'coupons.Coupon', on_delete=models.SET_NULL,
        null=True, blank=True, related_name='service_orders',
        verbose_name="Coupon appliqué",
    )
    deliverable_file = models.FileField(
        upload_to='services/deliverables/', null=True, blank=True,
        verbose_name="Fichier livrable",
    )
    deadline = models.DateTimeField(verbose_name="Date limite")
    completed_at = models.DateTimeField(null=True, blank=True, verbose_name="Terminée le")
    delivered_at = models.DateTimeField(
        null=True, blank=True, verbose_name="Livrable envoyé le",
        help_text="Horodatage du dernier upload de livrable. Sert de base pour l'auto-complétion à 14 jours.",
    )
    auto_complete_notified = models.PositiveIntegerField(
        default=0, verbose_name="Préavis auto-complétion envoyés",
        help_text="0 = aucun, 1 = J-7 envoyé, 2 = J-1 envoyé.",
    )
    revision_count = models.PositiveIntegerField(
        default=0, verbose_name="Révisions effectuées",
    )
    last_revision_reason = models.TextField(
        blank=True, default='', verbose_name="Motif de la dernière révision",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Commande de service"
        verbose_name_plural = "Commandes de services"
        ordering = ['-created_at']

    def __str__(self):
        return f"ServiceOrder #{self.pk} — {self.amount} FCFA"


class ProfessionalWallet(models.Model):
    """Portefeuille d'un professionnel (correcteur, illustrateur, traducteur)."""
    professional = models.OneToOneField(
        'users.UserProfile', on_delete=models.CASCADE,
        related_name='professional_wallet', verbose_name="Professionnel",
        limit_choices_to={'profile_type__in': ['CORRECTEUR', 'ILLUSTRATEUR', 'TRADUCTEUR']},
    )
    balance = models.DecimalField(
        max_digits=12, decimal_places=2, default=Decimal('0'),
        verbose_name="Solde (FCFA)",
    )
    total_earned = models.DecimalField(
        max_digits=12, decimal_places=2, default=Decimal('0'),
        verbose_name="Total gagné (FCFA)",
    )
    total_withdrawn = models.DecimalField(
        max_digits=12, decimal_places=2, default=Decimal('0'),
        verbose_name="Total retiré (FCFA)",
    )
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Portefeuille professionnel"
        verbose_name_plural = "Portefeuilles professionnels"

    def __str__(self):
        return f"Wallet {self.professional} — {self.balance} FCFA"


class ProfessionalWalletTransaction(models.Model):
    """Transaction dans le portefeuille d'un professionnel."""
    TYPE_CHOICES = [
        ('CREDIT_SERVICE', 'Crédit — Service'),
        ('DEBIT_COMMISSION', 'Débit — Commission plateforme'),
        ('DEBIT_WITHDRAWAL', 'Débit — Retrait'),
    ]

    wallet = models.ForeignKey(
        ProfessionalWallet, on_delete=models.CASCADE,
        related_name='transactions', verbose_name="Portefeuille",
    )
    service_order = models.ForeignKey(
        ServiceOrder, on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='wallet_transactions', verbose_name="Commande de service",
    )
    transaction_type = models.CharField(
        max_length=30, choices=TYPE_CHOICES,
        verbose_name="Type de transaction",
    )
    amount = models.DecimalField(
        max_digits=12, decimal_places=2,
        verbose_name="Montant (FCFA)",
    )
    description = models.TextField(blank=True, verbose_name="Description")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Transaction portefeuille professionnel"
        verbose_name_plural = "Transactions portefeuille professionnel"
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.get_transaction_type_display()} — {self.amount} FCFA"


class EditorialProject(models.Model):
    """Projet éditorial lié à un manuscrit ou un livre."""
    STATUS_CHOICES = [
        ('DRAFT', 'Brouillon'),
        ('CORRECTION', 'Correction'),
        ('ILLUSTRATION', 'Illustration'),
        ('LAYOUT', 'Mise en page'),
        ('REVIEW', 'Révision'),
        ('APPROVED', 'Approuvé'),
        ('PRINTING', 'Impression'),
        ('PUBLISHED', 'Publié'),
    ]

    manuscript = models.ForeignKey(
        'manuscripts.Manuscript', on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='editorial_projects', verbose_name="Manuscrit",
    )
    organization = models.ForeignKey(
        'organizations.Organization', on_delete=models.CASCADE,
        related_name='editorial_projects', verbose_name="Organisation",
        limit_choices_to={'org_type': 'MAISON_EDITION'},
    )
    book = models.ForeignKey(
        'books.Book', on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='editorial_projects', verbose_name="Livre",
    )
    title = models.CharField(max_length=300, verbose_name="Titre du projet")
    description = models.TextField(blank=True, verbose_name="Description")
    status = models.CharField(
        max_length=20, choices=STATUS_CHOICES, default='DRAFT',
        verbose_name="Statut",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Projet éditorial"
        verbose_name_plural = "Projets éditoriaux"
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.title} — {self.organization}"


class ProjectTask(models.Model):
    """Tâche dans un projet éditorial."""
    TASK_TYPE_CHOICES = [
        ('CORRECTION', 'Correction'),
        ('ILLUSTRATION', 'Illustration'),
        ('COVER_DESIGN', 'Conception de couverture'),
        ('LAYOUT', 'Mise en page'),
        ('PROOFREADING', 'Relecture'),
        ('TRANSLATION', 'Traduction'),
    ]

    STATUS_CHOICES = [
        ('TODO', 'À faire'),
        ('IN_PROGRESS', 'En cours'),
        ('REVIEW', 'En révision'),
        ('DONE', 'Terminée'),
    ]

    project = models.ForeignKey(
        EditorialProject, on_delete=models.CASCADE,
        related_name='tasks', verbose_name="Projet",
    )
    task_type = models.CharField(
        max_length=20, choices=TASK_TYPE_CHOICES,
        verbose_name="Type de tâche",
    )
    service_order = models.ForeignKey(
        ServiceOrder, on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='project_tasks', verbose_name="Commande de service",
    )
    assigned_to = models.ForeignKey(
        'users.UserProfile', on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='assigned_tasks', verbose_name="Assigné à",
    )
    title = models.CharField(max_length=300, verbose_name="Titre")
    notes = models.TextField(blank=True, verbose_name="Notes")
    due_date = models.DateField(null=True, blank=True, verbose_name="Date d'échéance")
    status = models.CharField(
        max_length=20, choices=STATUS_CHOICES, default='TODO',
        verbose_name="Statut",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Tâche de projet"
        verbose_name_plural = "Tâches de projet"
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.title} — {self.get_status_display()}"


class PrintRequest(models.Model):
    """Demande d'impression auprès d'une imprimerie."""
    STATUS_CHOICES = [
        ('DRAFT', 'Brouillon'),
        ('QUOTED', 'Devis reçu'),
        ('CONFIRMED', 'Confirmée'),
        ('PRINTING', 'En impression'),
        ('SHIPPED', 'Expédiée'),
        ('DELIVERED', 'Livrée'),
        ('CANCELLED', 'Annulée'),
    ]

    book = models.ForeignKey(
        'books.Book', on_delete=models.CASCADE,
        related_name='print_requests', verbose_name="Livre",
    )
    project = models.ForeignKey(
        EditorialProject, on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='print_requests', verbose_name="Projet éditorial",
    )
    requester = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
        related_name='print_requests', verbose_name="Demandeur",
    )
    requester_org = models.ForeignKey(
        'organizations.Organization', on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='print_requests_sent', verbose_name="Organisation demandeuse",
    )
    printer = models.ForeignKey(
        'organizations.Organization', on_delete=models.CASCADE,
        related_name='print_requests_received', verbose_name="Imprimerie",
        limit_choices_to={'org_type': 'IMPRIMERIE'},
    )
    format_specs = models.JSONField(default=dict, blank=True, verbose_name="Spécifications de format")
    quantity = models.PositiveIntegerField(verbose_name="Quantité")
    unit_price = models.DecimalField(
        max_digits=10, decimal_places=2, null=True, blank=True,
        verbose_name="Prix unitaire (FCFA)",
    )
    total_price = models.DecimalField(
        max_digits=10, decimal_places=2, null=True, blank=True,
        verbose_name="Prix total (FCFA)",
    )
    delivery_address = models.TextField(blank=True, verbose_name="Adresse de livraison")
    status = models.CharField(
        max_length=20, choices=STATUS_CHOICES, default='DRAFT',
        verbose_name="Statut",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Demande d'impression"
        verbose_name_plural = "Demandes d'impression"
        ordering = ['-created_at']

    def __str__(self):
        return f"Print #{self.pk} — {self.book.title} x{self.quantity}"


class ServiceProviderReview(models.Model):
    """
    Avis sur un prestataire de service.
    Un client peut noter un professionnel après la complétion d'un ServiceOrder.
    """
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='provider_reviews',
        verbose_name="Client",
    )
    provider = models.ForeignKey(
        'users.UserProfile',
        on_delete=models.CASCADE,
        related_name='reviews',
        verbose_name="Prestataire",
    )
    service_order = models.ForeignKey(
        ServiceOrder,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='reviews',
        verbose_name="Commande de service",
    )
    rating = models.IntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(5)],
        verbose_name="Note (1-5)",
    )
    comment = models.TextField(blank=True, verbose_name="Commentaire")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Avis sur prestataire"
        verbose_name_plural = "Avis sur prestataires"
        unique_together = [['user', 'provider']]
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.user} → {self.provider} — {self.rating}★"


# ═══════════════════════════════════════════════════════════════
#  DQE — Devis Quantitatif Estimatif (système unifié)
# ═══════════════════════════════════════════════════════════════

UNIT_CHOICES = [
    ('PAGE', 'Page'),
    ('MOT', 'Mot'),
    ('EXEMPLAIRE', 'Exemplaire'),
    ('FORFAIT', 'Forfait'),
    ('HEURE', 'Heure'),
    ('JOUR', 'Jour'),
    ('FEUILLE', 'Feuille'),
    ('PLANCHE', 'Planche'),
    ('CARACTERE', 'Caractère'),
]


class QuoteTemplate(models.Model):
    """Modèle de DQE réutilisable (global Frollot ou par organisation)."""

    PUBLISHING_MODEL_CHOICES = [
        ('COMPTE_EDITEUR', 'Édition à compte d\'éditeur'),
        ('COEDITION', 'Coédition'),
        ('COMPTE_AUTEUR', 'Édition à compte d\'auteur accompagnée'),
        ('AUTO_EDITION', 'Auto-édition accompagnée'),
        ('NUMERIQUE_PUR', 'Édition numérique pure'),
        ('REEDITION', 'Réédition'),
    ]

    name = models.CharField(max_length=200, verbose_name="Nom du modèle")
    slug = models.SlugField(max_length=220, unique=True)
    description = models.TextField(blank=True, verbose_name="Description")
    organization = models.ForeignKey(
        'organizations.Organization', on_delete=models.CASCADE,
        null=True, blank=True,
        related_name='quote_templates',
        verbose_name="Organisation",
        help_text="Vide = modèle global Frollot, disponible pour tous.",
    )
    publishing_model = models.CharField(
        max_length=20, choices=PUBLISHING_MODEL_CHOICES,
        blank=True, default='',
        verbose_name="Modèle éditorial",
    )
    is_public = models.BooleanField(
        default=False,
        verbose_name="Visible en vitrine",
        help_text="Si vrai, ce modèle est affiché sur la page publique de l'organisation.",
    )
    public_description = models.TextField(
        blank=True,
        verbose_name="Description vitrine (pour les auteurs)",
        help_text="Texte commercial affiché aux auteurs sur la page publique.",
    )
    internal_notes = models.TextField(
        blank=True,
        verbose_name="Notes internes",
        help_text="Visible uniquement par les employés de l'organisation.",
    )
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Modèle de devis"
        verbose_name_plural = "Modèles de devis"
        ordering = ['name']

    def __str__(self):
        return self.name


class QuoteTemplateLot(models.Model):
    """Lot type dans un modèle de devis."""
    template = models.ForeignKey(
        QuoteTemplate, on_delete=models.CASCADE,
        related_name='lots', verbose_name="Modèle",
    )
    name = models.CharField(max_length=200, verbose_name="Nom du lot")
    order = models.PositiveIntegerField(default=0, verbose_name="Ordre")

    class Meta:
        verbose_name = "Lot type"
        verbose_name_plural = "Lots types"
        ordering = ['order']

    def __str__(self):
        return f"{self.template.name} — {self.name}"


class QuoteTemplateItem(models.Model):
    """Poste type dans un lot de modèle."""
    lot = models.ForeignKey(
        QuoteTemplateLot, on_delete=models.CASCADE,
        related_name='items', verbose_name="Lot",
    )
    designation = models.CharField(max_length=300, verbose_name="Désignation")
    unit = models.CharField(max_length=20, choices=UNIT_CHOICES, default='FORFAIT', verbose_name="Unité")
    default_quantity = models.DecimalField(
        max_digits=10, decimal_places=2, null=True, blank=True,
        verbose_name="Quantité par défaut",
    )
    default_unit_price = models.DecimalField(
        max_digits=12, decimal_places=2, null=True, blank=True,
        verbose_name="Prix unitaire par défaut (FCFA)",
    )
    order = models.PositiveIntegerField(default=0, verbose_name="Ordre")

    class Meta:
        verbose_name = "Poste type"
        verbose_name_plural = "Postes types"
        ordering = ['order']

    def __str__(self):
        return self.designation


class Quote(models.Model):
    """DQE réel envoyé à un client — le cœur du système de devis."""
    STATUS_CHOICES = [
        ('DRAFT', 'Brouillon'),
        ('SENT', 'Envoyé'),
        ('ACCEPTED', 'Accepté'),
        ('REJECTED', 'Refusé'),
        ('REVISION_REQUESTED', 'Révision demandée'),
        ('SUPERSEDED', 'Remplacé par une révision'),
        ('EXPIRED', 'Expiré'),
        ('CANCELLED', 'Annulé'),
    ]

    DISCOUNT_TYPE_CHOICES = [
        ('PERCENT', 'Pourcentage'),
        ('AMOUNT', 'Montant fixe'),
    ]

    PUBLISHING_MODEL_CHOICES = [
        ('COMPTE_EDITEUR', 'Édition à compte d\'éditeur'),
        ('COEDITION', 'Coédition'),
        ('COMPTE_AUTEUR', 'Édition à compte d\'auteur accompagnée'),
        ('AUTO_EDITION', 'Auto-édition accompagnée'),
        ('NUMERIQUE_PUR', 'Édition numérique pure'),
        ('REEDITION', 'Réédition'),
    ]

    # Référence unique : DEV-2026-0042
    reference = models.CharField(
        max_length=30, unique=True, editable=False,
        verbose_name="Référence",
    )

    # Lien au modèle (optionnel — permet de savoir d'où vient le devis)
    template = models.ForeignKey(
        QuoteTemplate, on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='quotes',
        verbose_name="Modèle utilisé",
    )

    # Liens polymorphes (un devis concerne SOIT une demande de service, SOIT un manuscrit)
    service_request = models.ForeignKey(
        'services.ServiceRequest', on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='dqe_quotes',
        verbose_name="Demande de service",
    )
    manuscript = models.ForeignKey(
        'manuscripts.Manuscript', on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='dqe_quotes',
        verbose_name="Manuscrit",
    )

    # Émetteur (prestataire ou organisation)
    provider_organization = models.ForeignKey(
        'organizations.Organization', on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='issued_quotes',
        verbose_name="Organisation émettrice",
    )
    provider_profile = models.ForeignKey(
        'users.UserProfile', on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='issued_quotes',
        verbose_name="Profil prestataire",
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True,
        related_name='created_quotes',
        verbose_name="Créé par",
    )

    # Destinataire (client)
    client = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='received_quotes',
        verbose_name="Client",
    )
    client_name = models.CharField(max_length=200, blank=True, verbose_name="Nom du client")
    client_email = models.EmailField(blank=True, verbose_name="Email du client")

    # Objet du devis
    title = models.CharField(max_length=300, verbose_name="Objet du devis")

    # ── Modèle éditorial (obligatoire pour les devis liés à un manuscrit) ──
    publishing_model = models.CharField(
        max_length=20, choices=PUBLISHING_MODEL_CHOICES,
        blank=True, default='',
        verbose_name="Modèle éditorial",
        help_text="Obligatoire pour tout devis lié à un manuscrit.",
    )
    royalty_terms = models.JSONField(
        default=list, blank=True,
        verbose_name="Grille de droits d'auteur",
        help_text='[{"up_to": 1000, "rate": 10}, {"up_to": 3000, "rate": 12}, {"above": 3000, "rate": 14}]',
    )
    print_run = models.PositiveIntegerField(
        null=True, blank=True,
        verbose_name="Tirage prévu (exemplaires)",
    )
    retail_price = models.DecimalField(
        max_digits=10, decimal_places=2, null=True, blank=True,
        verbose_name="Prix de vente prévu (FCFA)",
    )
    author_must_purchase = models.BooleanField(
        default=False,
        verbose_name="Achat obligatoire par l'auteur",
        help_text="Cocher si le contrat impose à l'auteur d'acheter un nombre d'exemplaires.",
    )
    author_purchase_quantity = models.PositiveIntegerField(
        null=True, blank=True,
        verbose_name="Exemplaires en achat libre (optionnel)",
        help_text="Nombre d'exemplaires que l'auteur peut acheter librement, sans obligation.",
    )
    parent_quote = models.ForeignKey(
        'self', on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='revisions',
        verbose_name="Devis parent (historique de négociation)",
    )

    # ── Calculs financiers ──
    subtotal = models.DecimalField(
        max_digits=14, decimal_places=2, default=0,
        verbose_name="Sous-total HT (FCFA)",
    )
    discount_type = models.CharField(
        max_length=10, choices=DISCOUNT_TYPE_CHOICES, default='PERCENT',
        verbose_name="Type de remise",
    )
    discount_value = models.DecimalField(
        max_digits=10, decimal_places=2, default=0,
        verbose_name="Valeur de la remise",
        help_text="Pourcentage (ex: 5.00) ou montant fixe en FCFA.",
    )
    discount_amount = models.DecimalField(
        max_digits=14, decimal_places=2, default=0,
        verbose_name="Montant de la remise (FCFA)",
    )
    subtotal_after_discount = models.DecimalField(
        max_digits=14, decimal_places=2, default=0,
        verbose_name="Sous-total après remise (FCFA)",
    )
    tax_rate = models.DecimalField(
        max_digits=5, decimal_places=2, default=0,
        verbose_name="Taux TVA (%)",
        help_text="0 si exonéré. 18% par défaut au Gabon.",
    )
    tax_amount = models.DecimalField(
        max_digits=14, decimal_places=2, default=0,
        verbose_name="Montant TVA (FCFA)",
    )
    total_ttc = models.DecimalField(
        max_digits=14, decimal_places=2, default=0,
        verbose_name="Total TTC (FCFA)",
    )

    # ── Échéancier de paiement ──
    payment_schedule = models.JSONField(
        default=list, blank=True,
        verbose_name="Échéancier de paiement",
        help_text='[{"label": "À la commande", "percent": 40, "amount": 1290495}, ...]',
    )

    # ── Conditions ──
    delivery_days = models.PositiveIntegerField(
        default=30, verbose_name="Délai de livraison (jours ouvrés)",
    )
    validity_days = models.PositiveIntegerField(
        default=30, verbose_name="Validité du devis (jours)",
    )
    valid_until = models.DateField(
        null=True, blank=True, verbose_name="Valide jusqu'au",
    )
    revision_rounds = models.PositiveIntegerField(
        default=1, verbose_name="Révisions incluses",
    )
    notes = models.TextField(
        blank=True, verbose_name="Notes / conditions particulières",
    )

    # ── Statut & dates ──
    status = models.CharField(
        max_length=20, choices=STATUS_CHOICES, default='DRAFT',
        verbose_name="Statut",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    sent_at = models.DateTimeField(null=True, blank=True, verbose_name="Envoyé le")
    accepted_at = models.DateTimeField(null=True, blank=True, verbose_name="Accepté le")
    rejected_at = models.DateTimeField(null=True, blank=True, verbose_name="Refusé le")
    rejection_reason = models.TextField(blank=True, verbose_name="Motif du refus")

    class Meta:
        verbose_name = "Devis (DQE)"
        verbose_name_plural = "Devis (DQE)"
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['reference']),
            models.Index(fields=['status']),
            models.Index(fields=['-created_at']),
        ]

    def __str__(self):
        return f"{self.reference} — {self.title} ({self.total_ttc} FCFA)"

    def save(self, *args, **kwargs):
        # Générer la référence automatiquement
        if not self.reference:
            from django.utils import timezone
            year = timezone.now().year
            last = Quote.objects.filter(
                reference__startswith=f'DEV-{year}-'
            ).order_by('-reference').first()
            if last:
                try:
                    num = int(last.reference.split('-')[-1]) + 1
                except (ValueError, IndexError):
                    num = 1
            else:
                num = 1
            self.reference = f'DEV-{year}-{num:04d}'

        # Calculer valid_until à partir de validity_days
        if not self.valid_until and self.validity_days:
            from django.utils import timezone
            self.valid_until = (timezone.now() + timezone.timedelta(days=self.validity_days)).date()

        super().save(*args, **kwargs)

    def recalculate(self):
        """Recalculer tous les montants à partir des lignes."""
        from decimal import Decimal, ROUND_HALF_UP

        # Recalculer les sous-totaux de chaque lot
        for lot in self.lots.all():
            lot.subtotal = sum(
                (item.quantity * item.unit_price) for item in lot.items.all()
            )
            lot.save(update_fields=['subtotal'])

        # Sous-total HT
        self.subtotal = sum(lot.subtotal for lot in self.lots.all())

        # Remise
        if self.discount_type == 'PERCENT' and self.discount_value > 0:
            self.discount_amount = (self.subtotal * self.discount_value / Decimal('100')).quantize(Decimal('1'), rounding=ROUND_HALF_UP)
        elif self.discount_type == 'AMOUNT':
            self.discount_amount = self.discount_value
        else:
            self.discount_amount = Decimal('0')

        # Sous-total après remise
        self.subtotal_after_discount = self.subtotal - self.discount_amount

        # TVA
        if self.tax_rate > 0:
            self.tax_amount = (self.subtotal_after_discount * self.tax_rate / Decimal('100')).quantize(Decimal('1'), rounding=ROUND_HALF_UP)
        else:
            self.tax_amount = Decimal('0')

        # Total TTC
        self.total_ttc = self.subtotal_after_discount + self.tax_amount

        # Recalculer l'échéancier
        if self.payment_schedule:
            for milestone in self.payment_schedule:
                pct = Decimal(str(milestone.get('percent', 0)))
                milestone['amount'] = int((self.total_ttc * pct / Decimal('100')).quantize(Decimal('1'), rounding=ROUND_HALF_UP))

        self.save(update_fields=[
            'subtotal', 'discount_amount', 'subtotal_after_discount',
            'tax_amount', 'total_ttc', 'payment_schedule',
        ])

    def validate_editorial_quote(self):
        """
        Valide les règles métier d'un devis éditorial avant envoi.
        Appelé avant le passage de DRAFT à SENT pour un devis lié à un manuscrit.
        Lève ValidationError si une règle est violée.

        Garde-fous anti-Harmattan — aucun n'est contournable par omission de champ.
        """
        if not self.manuscript:
            return  # Pas un devis éditorial, pas de validation spécifique

        model = self.publishing_model
        model_display = self.get_publishing_model_display() if model else '—'

        # 1. Le modèle éditorial doit être renseigné
        if not model:
            raise ValidationError(
                "Un devis lié à un manuscrit doit obligatoirement mentionner "
                "le modèle éditorial (compte d'éditeur, coédition, etc.)."
            )

        # ── Champs rendus obligatoires selon le modèle ──

        # Prix de vente : obligatoire pour tous les modèles
        if not self.retail_price:
            raise ValidationError(
                "Le prix de vente public est obligatoire pour un devis éditorial."
            )

        # Tirage : obligatoire sauf NUMERIQUE_PUR
        if model != 'NUMERIQUE_PUR' and self.print_run is None:
            raise ValidationError(
                f"Le tirage prévu est obligatoire pour un modèle {model_display}."
            )

        # Grille de droits d'auteur : obligatoire pour COMPTE_EDITEUR et COEDITION
        if model in ('COMPTE_EDITEUR', 'COEDITION') and not self.royalty_terms:
            raise ValidationError(
                f"La grille de droits d'auteur est obligatoire pour un modèle {model_display}."
            )

        # 2. Garde-fou de cohérence économique (ratio paramétrable)
        max_ratio = getattr(settings, 'MAX_QUOTE_TO_REVENUE_RATIO', 2.0)
        if self.print_run and self.retail_price and self.total_ttc:
            max_revenue = Decimal(str(self.print_run)) * self.retail_price
            if max_revenue > 0 and self.total_ttc > Decimal(str(max_ratio)) * max_revenue:
                raise ValidationError(
                    f"Le montant du devis ({self.total_ttc:,.0f} FCFA) dépasse "
                    f"{max_ratio}x le chiffre d'affaires théorique maximal "
                    f"({max_revenue:,.0f} FCFA = {self.print_run} ex. × "
                    f"{self.retail_price:,.0f} FCFA). "
                    f"Ce devis est économiquement incohérent."
                )

        # 3. Tirage minimum 300 exemplaires (sauf numérique pur)
        if model != 'NUMERIQUE_PUR' and self.print_run is not None and self.print_run < 300:
            raise ValidationError(
                f"Le tirage minimum est de 300 exemplaires "
                f"(tirage prévu : {self.print_run}). "
                f"Pour un tirage inférieur, utilisez le modèle « Édition numérique pure »."
            )

        # 4. Grille de droits d'auteur : plancher à 5% pour compte d'éditeur et coédition
        if model in ('COMPTE_EDITEUR', 'COEDITION') and self.royalty_terms:
            for tier in self.royalty_terms:
                rate = tier.get('rate', 0)
                if rate < 5:
                    raise ValidationError(
                        f"Le taux de droits d'auteur ne peut pas être inférieur à 5 % "
                        f"pour un modèle {model_display}. "
                        f"Taux détecté : {rate} %."
                    )

        # 5. Interdiction d'achat obligatoire par l'auteur
        if self.author_must_purchase and model in ('COMPTE_EDITEUR', 'COEDITION', 'COMPTE_AUTEUR'):
            raise ValidationError(
                f"L'achat obligatoire d'exemplaires par l'auteur est interdit pour un "
                f"modèle {model_display}. Cette pratique est considérée comme abusive "
                f"par Frollot. Si l'auteur souhaite acheter ses livres, il doit le faire "
                f"librement après publication, sans engagement contractuel préalable."
            )


class QuoteLot(models.Model):
    """Lot dans un devis DQE (ex: Préparation éditoriale, Impression...)."""
    quote = models.ForeignKey(
        Quote, on_delete=models.CASCADE,
        related_name='lots', verbose_name="Devis",
    )
    name = models.CharField(max_length=200, verbose_name="Nom du lot")
    order = models.PositiveIntegerField(default=0, verbose_name="Ordre")
    subtotal = models.DecimalField(
        max_digits=14, decimal_places=2, default=0,
        verbose_name="Sous-total du lot (FCFA)",
    )

    class Meta:
        verbose_name = "Lot de devis"
        verbose_name_plural = "Lots de devis"
        ordering = ['order']

    def __str__(self):
        return f"Lot {self.order} — {self.name}"


class QuoteItem(models.Model):
    """Ligne / poste dans un lot de devis DQE."""
    lot = models.ForeignKey(
        QuoteLot, on_delete=models.CASCADE,
        related_name='items', verbose_name="Lot",
    )
    designation = models.CharField(max_length=300, verbose_name="Désignation")
    description = models.TextField(blank=True, verbose_name="Description détaillée")
    unit = models.CharField(max_length=20, choices=UNIT_CHOICES, default='FORFAIT', verbose_name="Unité")
    quantity = models.DecimalField(
        max_digits=10, decimal_places=2, default=1,
        verbose_name="Quantité",
    )
    unit_price = models.DecimalField(
        max_digits=12, decimal_places=2, default=0,
        verbose_name="Prix unitaire (FCFA)",
    )
    total = models.DecimalField(
        max_digits=14, decimal_places=2, default=0,
        verbose_name="Total (FCFA)",
    )
    order = models.PositiveIntegerField(default=0, verbose_name="Ordre")

    class Meta:
        verbose_name = "Ligne de devis"
        verbose_name_plural = "Lignes de devis"
        ordering = ['order']

    def __str__(self):
        return f"{self.designation} — {self.total} FCFA"

    def save(self, *args, **kwargs):
        self.total = self.quantity * self.unit_price
        super().save(*args, **kwargs)
