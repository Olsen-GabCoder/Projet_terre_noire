from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models
from django.core.validators import FileExtensionValidator
from django.utils import timezone


class Manuscript(models.Model):
    STATUS_CHOICES = [
        ('PENDING', 'En attente'),
        ('REVIEWING', 'En cours d\'examen'),
        ('QUOTE_SENT', 'Devis envoyé'),
        ('COUNTER_PROPOSAL', 'Contre-proposition'),
        ('QUOTE_REJECTED', 'Devis refusé par l\'auteur'),
        ('ACCEPTED', 'Accepté'),
        ('REJECTED', 'Rejeté'),
    ]

    GENRE_CHOICES = [
        ('ROMAN', 'Roman'),
        ('NOUVELLE', 'Nouvelle / Recueil de nouvelles'),
        ('POESIE', 'Poésie'),
        ('ESSAI', 'Essai'),
        ('THEATRE', 'Théâtre'),
        ('JEUNESSE', 'Littérature jeunesse'),
        ('BD', 'Bande dessinée'),
        ('AUTRE', 'Autre'),
    ]

    LANGUAGE_CHOICES = [
        ('FR', 'Français'),
        ('EN', 'Anglais'),
        ('AR', 'Arabe'),
        ('PT', 'Portugais'),
        ('ES', 'Espagnol'),
        ('AUTRE', 'Autre'),
    ]

    submitter = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='submitted_manuscripts', verbose_name="Soumis par",
    )

    # Frollot Connect — Soumission ciblée
    target_organization = models.ForeignKey(
        'organizations.Organization', on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='received_manuscripts',
        verbose_name="Organisation cible",
        help_text="Maison d'édition ciblée pour cette soumission. Vide = soumission générale.",
    )
    is_open_market = models.BooleanField(
        default=False,
        verbose_name="Marché ouvert",
        help_text="Si vrai, visible par toutes les maisons d'édition acceptant ce genre.",
    )

    title = models.CharField(max_length=300, verbose_name="Titre du manuscrit")
    author_name = models.CharField(max_length=200, verbose_name="Nom de l'auteur")
    pen_name = models.CharField(max_length=200, blank=True, verbose_name="Pseudonyme / Nom de plume")
    email = models.EmailField(verbose_name="Email de contact")
    phone_number = models.CharField(max_length=20, verbose_name="Numéro de téléphone")
    country = models.CharField(max_length=100, blank=True, verbose_name="Pays / Nationalité")

    genre = models.CharField(max_length=20, choices=GENRE_CHOICES, default='ROMAN', verbose_name="Genre littéraire")
    language = models.CharField(max_length=10, choices=LANGUAGE_CHOICES, default='FR', verbose_name="Langue du manuscrit")
    page_count = models.PositiveIntegerField(null=True, blank=True, verbose_name="Nombre de pages")

    file = models.FileField(
        upload_to='manuscripts/',
        validators=[FileExtensionValidator(allowed_extensions=['pdf', 'docx', 'doc'])],
        verbose_name="Fichier manuscrit"
    )

    description = models.TextField(verbose_name="Description du manuscrit")
    terms_accepted = models.BooleanField(verbose_name="Conditions acceptées")

    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='PENDING',
        verbose_name="Statut"
    )

    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='reviewed_manuscripts', verbose_name="Examiné par",
    )
    reviewed_at = models.DateTimeField(
        null=True, blank=True, verbose_name="Date d'examen",
    )
    rejection_reason = models.TextField(
        blank=True, default='', verbose_name="Motif du refus",
        help_text="Feedback envoyé à l'auteur en cas de refus.",
    )

    submitted_at = models.DateTimeField(auto_now_add=True, verbose_name="Date de soumission")

    # Marché ouvert — fenêtre de comparaison des devis
    open_market_locked = models.BooleanField(
        default=False,
        verbose_name="Marché ouvert verrouillé",
        help_text="L'auteur déclare avoir reçu toutes les offres attendues.",
    )
    open_market_deadline = models.DateTimeField(
        null=True, blank=True,
        verbose_name="Date limite de comparaison",
        help_text="Fin de la fenêtre de 15 jours pour comparer les devis.",
    )

    class Meta:
        verbose_name = "Manuscrit"
        verbose_name_plural = "Manuscrits"
        ordering = ['-submitted_at']
        indexes = [
            models.Index(fields=['status']),
            models.Index(fields=['submitter']),
            models.Index(fields=['-submitted_at']),
        ]

    def __str__(self):
        return f"{self.title} - {self.author_name}"

    # ── Transitions de statut verrouillées ──

    # Matrice des transitions légales : {état_actuel: [états_cibles_possibles]}
    ALLOWED_TRANSITIONS = {
        'PENDING': ['REVIEWING', 'REJECTED'],
        'REVIEWING': ['QUOTE_SENT', 'REJECTED'],
        'QUOTE_SENT': ['ACCEPTED', 'QUOTE_REJECTED', 'COUNTER_PROPOSAL', 'REVIEWING'],
        'COUNTER_PROPOSAL': ['QUOTE_SENT', 'QUOTE_REJECTED', 'REVIEWING'],
        'QUOTE_REJECTED': ['REVIEWING'],
        'ACCEPTED': [],
        'REJECTED': ['REVIEWING'],
    }

    def _get_linked_quotes(self):
        """Retourne les devis DQE liés à ce manuscrit."""
        return self.dqe_quotes.all()

    def _has_sent_quote(self):
        return self._get_linked_quotes().filter(status='SENT').exists()

    def _has_accepted_quote(self):
        return self._get_linked_quotes().filter(status='ACCEPTED').exists()

    def _has_revision_requested_quote(self):
        return self._get_linked_quotes().filter(status='REVISION_REQUESTED').exists()

    def _all_quotes_terminal(self):
        """Vrai si tous les devis liés sont dans un état terminal (REJECTED, CANCELLED, EXPIRED)."""
        quotes = self._get_linked_quotes()
        if not quotes.exists():
            return False
        return not quotes.exclude(status__in=['REJECTED', 'CANCELLED', 'EXPIRED']).exists()

    def transition_status(self, new_status, user, rejection_reason=''):
        """
        Point d'entrée unique pour changer le statut d'un manuscrit.
        Vérifie les préconditions métier et lève ValidationError si la transition est illégale.
        """
        old_status = self.status

        # 1. La transition est-elle dans la matrice ?
        allowed = self.ALLOWED_TRANSITIONS.get(old_status, [])
        if new_status not in allowed:
            raise ValidationError(
                f"Transition interdite : {old_status} -> {new_status}. "
                f"Transitions possibles depuis {old_status} : {', '.join(allowed) or 'aucune'}."
            )

        # 2. Vérifications métier par état cible
        if new_status == 'QUOTE_SENT':
            if not self._has_sent_quote():
                raise ValidationError(
                    "Impossible de passer en 'Devis envoyé' : aucun devis n'a été envoyé "
                    "pour ce manuscrit. Créez et envoyez un devis d'abord."
                )

        elif new_status == 'ACCEPTED':
            if not self._has_accepted_quote():
                raise ValidationError(
                    "Impossible d'accepter ce manuscrit : aucun devis accepté par l'auteur "
                    "n'est associé à ce manuscrit. Pas de devis accepté, pas d'acceptation."
                )

        elif new_status == 'COUNTER_PROPOSAL':
            if not self._has_revision_requested_quote():
                raise ValidationError(
                    "Impossible de passer en 'Contre-proposition' : aucun devis n'est en attente "
                    "de révision pour ce manuscrit."
                )

        elif new_status == 'QUOTE_REJECTED':
            if not self._all_quotes_terminal():
                raise ValidationError(
                    "Impossible de passer en 'Devis refusé' : il reste des devis en cours "
                    "(envoyés ou en brouillon) pour ce manuscrit."
                )

        # Retour en REVIEWING depuis QUOTE_SENT : autorisé seulement si tous les devis sont terminaux
        if old_status == 'QUOTE_SENT' and new_status == 'REVIEWING':
            if not self._all_quotes_terminal():
                raise ValidationError(
                    "Impossible de revenir en examen : il reste des devis actifs "
                    "pour ce manuscrit. Attendez leur expiration ou annulation."
                )

        # 3. Appliquer la transition
        self.status = new_status
        self.reviewed_by = user
        self.reviewed_at = timezone.now()
        if new_status == 'REJECTED' and rejection_reason:
            self.rejection_reason = rejection_reason
        self.save(update_fields=['status', 'reviewed_by', 'reviewed_at', 'rejection_reason'])
