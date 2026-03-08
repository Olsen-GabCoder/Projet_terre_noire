from django.db import models
from django.core.validators import FileExtensionValidator


class Manuscript(models.Model):
    STATUS_CHOICES = [
        ('PENDING', 'En attente'),
        ('REVIEWING', 'En cours d\'examen'),
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
    
    submitted_at = models.DateTimeField(auto_now_add=True, verbose_name="Date de soumission")
    
    class Meta:
        verbose_name = "Manuscrit"
        verbose_name_plural = "Manuscrits"
        ordering = ['-submitted_at']
    
    def __str__(self):
        return f"{self.title} - {self.author_name}"