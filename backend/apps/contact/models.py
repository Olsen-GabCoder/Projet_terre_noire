from django.db import models


class ContactMessage(models.Model):
    """Message envoyé via le formulaire de contact."""
    SUBJECT_CHOICES = [
        ('Commande', 'Question commande'),
        ('Manuscrit', 'Soumission manuscrit'),
        ('Partenariat', 'Partenariat'),
        ('Autre', 'Autre'),
    ]

    name = models.CharField(max_length=200, verbose_name="Nom")
    email = models.EmailField(verbose_name="Email")
    subject = models.CharField(max_length=50, choices=SUBJECT_CHOICES, default='Autre', verbose_name="Sujet")
    message = models.TextField(verbose_name="Message")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Date d'envoi")
    is_read = models.BooleanField(default=False, verbose_name="Lu")

    class Meta:
        verbose_name = "Message de contact"
        verbose_name_plural = "Messages de contact"
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.subject} - {self.email} ({self.created_at.date()})"
