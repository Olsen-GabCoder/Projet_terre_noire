import uuid

from django.conf import settings
from django.db import models
from django.utils import timezone


class LibraryCatalogItem(models.Model):
    """Livre disponible dans une bibliothèque, avec suivi des exemplaires."""
    library = models.ForeignKey(
        'organizations.Organization', on_delete=models.CASCADE,
        related_name='catalog_items', verbose_name="Bibliothèque",
        limit_choices_to={'org_type': 'BIBLIOTHEQUE'},
    )
    book = models.ForeignKey(
        'books.Book', on_delete=models.CASCADE,
        related_name='library_catalog_items', verbose_name="Livre",
    )
    total_copies = models.PositiveIntegerField(default=1, verbose_name="Exemplaires total")
    available_copies = models.PositiveIntegerField(default=1, verbose_name="Exemplaires disponibles")
    allows_digital_loan = models.BooleanField(default=False, verbose_name="Prêt numérique autorisé")
    max_loan_days = models.PositiveIntegerField(default=21, verbose_name="Durée max du prêt (jours)")
    is_active = models.BooleanField(default=True, verbose_name="Actif")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Élément catalogue bibliothèque"
        verbose_name_plural = "Éléments catalogue bibliothèque"
        unique_together = [['library', 'book']]
        indexes = [
            models.Index(fields=['library', 'is_active']),
            models.Index(fields=['book', 'is_active']),
        ]
        ordering = ['-created_at']

    def clean(self):
        if self.available_copies > self.total_copies:
            from django.core.exceptions import ValidationError
            raise ValidationError("Les exemplaires disponibles ne peuvent pas dépasser le total.")

    def __str__(self):
        return f"{self.book.title} @ {self.library.name} ({self.available_copies}/{self.total_copies})"


class LibraryMembership(models.Model):
    """Adhésion d'un utilisateur à une bibliothèque."""
    MEMBERSHIP_TYPE_CHOICES = [
        ('STANDARD', 'Standard'),
        ('PREMIUM', 'Premium'),
        ('STUDENT', 'Étudiant'),
    ]

    library = models.ForeignKey(
        'organizations.Organization', on_delete=models.CASCADE,
        related_name='library_memberships', verbose_name="Bibliothèque",
        limit_choices_to={'org_type': 'BIBLIOTHEQUE'},
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
        related_name='library_memberships', verbose_name="Adhérent",
    )
    membership_number = models.CharField(
        max_length=20, unique=True, editable=False,
        verbose_name="Numéro d'adhérent",
    )
    membership_type = models.CharField(
        max_length=20, choices=MEMBERSHIP_TYPE_CHOICES, default='STANDARD',
        verbose_name="Type d'adhésion",
    )
    is_active = models.BooleanField(default=True, verbose_name="Actif")
    expires_at = models.DateTimeField(verbose_name="Date d'expiration")
    joined_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Adhésion bibliothèque"
        verbose_name_plural = "Adhésions bibliothèque"
        unique_together = [['library', 'user']]
        ordering = ['-joined_at']

    def save(self, *args, **kwargs):
        if not self.membership_number:
            self.membership_number = f"BIB{self.library_id:04d}{uuid.uuid4().hex[:6].upper()}"
        super().save(*args, **kwargs)

    @property
    def is_expired(self):
        return timezone.now() > self.expires_at

    def __str__(self):
        return f"{self.membership_number} — {self.user.get_full_name()} @ {self.library.name}"


class BookLoan(models.Model):
    """Prêt d'un livre (physique ou numérique)."""
    LOAN_TYPE_CHOICES = [
        ('PHYSICAL', 'Physique'),
        ('DIGITAL', 'Numérique'),
    ]
    STATUS_CHOICES = [
        ('REQUESTED', 'Demandé'),
        ('APPROVED', 'Approuvé'),
        ('ACTIVE', 'En cours'),
        ('OVERDUE', 'En retard'),
        ('RETURNED', 'Retourné'),
        ('CANCELLED', 'Annulé'),
    ]

    catalog_item = models.ForeignKey(
        LibraryCatalogItem, on_delete=models.CASCADE,
        related_name='loans', verbose_name="Élément catalogue",
    )
    borrower = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='book_loans', verbose_name="Emprunteur",
    )
    loan_type = models.CharField(max_length=10, choices=LOAN_TYPE_CHOICES)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='REQUESTED')
    borrowed_at = models.DateTimeField(null=True, blank=True, verbose_name="Date d'emprunt")
    due_date = models.DateTimeField(null=True, blank=True, verbose_name="Date de retour prévue")
    returned_at = models.DateTimeField(null=True, blank=True, verbose_name="Date de retour effectif")
    notes = models.TextField(blank=True, verbose_name="Notes")
    reminder_sent = models.PositiveIntegerField(default=0, verbose_name="Rappels envoyés")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Prêt de livre"
        verbose_name_plural = "Prêts de livres"
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['borrower', 'status']),
            models.Index(fields=['catalog_item', 'status']),
            models.Index(fields=['due_date']),
        ]

    @property
    def is_overdue(self):
        return self.status == 'ACTIVE' and self.due_date and timezone.now() > self.due_date

    def __str__(self):
        return f"Prêt #{self.id} — {self.catalog_item.book.title} → {self.borrower.get_full_name()}"


class LoanExtension(models.Model):
    """Demande de prolongation d'un prêt."""
    loan = models.ForeignKey(
        BookLoan, on_delete=models.CASCADE,
        related_name='extensions', verbose_name="Prêt",
    )
    extended_days = models.PositiveIntegerField(verbose_name="Jours de prolongation")
    approved = models.BooleanField(default=False, verbose_name="Approuvé")
    requested_at = models.DateTimeField(auto_now_add=True)
    approved_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        verbose_name = "Prolongation de prêt"
        verbose_name_plural = "Prolongations de prêts"
        ordering = ['-requested_at']

    def __str__(self):
        return f"Extension +{self.extended_days}j pour Prêt #{self.loan_id}"


class BookReservation(models.Model):
    """Réservation d'un livre indisponible (file d'attente FIFO)."""
    STATUS_CHOICES = [
        ('PENDING', 'En attente'),
        ('NOTIFIED', 'Notifié'),
        ('FULFILLED', 'Satisfaite'),
        ('CANCELLED', 'Annulée'),
        ('EXPIRED', 'Expirée'),
    ]

    catalog_item = models.ForeignKey(
        LibraryCatalogItem, on_delete=models.CASCADE,
        related_name='reservations', verbose_name="Élément catalogue",
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
        related_name='book_reservations', verbose_name="Utilisateur",
    )
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING', db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    notified_at = models.DateTimeField(null=True, blank=True)
    expires_at = models.DateTimeField(null=True, blank=True, verbose_name="Expiration après notification")

    class Meta:
        verbose_name = "Réservation"
        verbose_name_plural = "Réservations"
        ordering = ['created_at']

    def __str__(self):
        return f"Réservation {self.catalog_item.book.title} par {self.user.get_full_name()}"
