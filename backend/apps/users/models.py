# backend/apps/users/models.py

import uuid

from django.conf import settings
from django.contrib.auth.models import AbstractUser
from django.db import models
from django.core.validators import RegexValidator
from django.utils import timezone
from django.utils.text import slugify


class User(AbstractUser):
    """
    Modèle utilisateur personnalisé pour Frollot — Plateforme Sociale du Livre.
    Hérite de AbstractUser et ajoute les champs spécifiques au contexte africain
    (Mobile Money, adresse complète, etc.)
    """
    
    # Validateur pour le numéro de téléphone - ASSOUPLI
    phone_regex = RegexValidator(
        regex=r'^\+?\d{8,15}$',
        message="Le numéro de téléphone doit contenir entre 8 et 15 chiffres. Format accepté: +243123456789 ou 0123456789"
    )
    
    # Champs supplémentaires - TÉLÉPHONE CORRIGÉ
    phone_number = models.CharField(
        validators=[phone_regex],
        max_length=20,
        unique=True,
        null=True,  # ✅ AJOUTÉ: Permet NULL en base de données
        blank=True,  # ✅ AJOUTÉ: Permet champ vide dans les formulaires
        verbose_name="Numéro de téléphone",
        help_text="Format: +243XXXXXXXXX (requis pour Mobile Money)"
    )
    
    address = models.TextField(
        blank=True,
        null=True,
        verbose_name="Adresse complète",
        help_text="Rue, avenue, numéro, quartier"
    )
    
    city = models.CharField(
        max_length=100,
        blank=True,
        null=True,
        verbose_name="Ville"
    )
    
    country = models.CharField(
        max_length=100,
        default="Gabon",
        verbose_name="Pays"
    )
    
    profile_image = models.ImageField(
        upload_to='users/avatars/',
        blank=True,
        null=True,
        verbose_name="Photo de profil"
    )

    # Préférences utilisateur
    receive_newsletter = models.BooleanField(
        default=False,
        verbose_name="Recevoir la newsletter"
    )
    
    # Sécurité — invalidation des tokens après changement de mot de passe
    token_version = models.PositiveIntegerField(
        default=0,
        verbose_name="Version du token",
        help_text="Incrémenté à chaque changement de mot de passe pour invalider les anciens tokens.",
    )

    # TOTP 2FA
    totp_secret = models.CharField(
        max_length=32,
        blank=True,
        null=True,
        verbose_name="Secret TOTP",
    )
    totp_enabled = models.BooleanField(
        default=False,
        verbose_name="2FA TOTP activé",
    )

    # Métadonnées
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name="Date d'inscription"
    )
    updated_at = models.DateTimeField(
        auto_now=True,
        verbose_name="Dernière modification"
    )

    # Acceptation des CGU
    terms_accepted_at = models.DateTimeField(
        null=True, blank=True,
        verbose_name="Date d'acceptation des CGU",
        help_text="Horodatage côté serveur au moment de l'inscription.",
    )
    terms_version = models.CharField(
        max_length=20, blank=True, default='',
        verbose_name="Version des CGU acceptées",
        help_text="Date de publication des CGU acceptées (ex: 2026-04-11).",
    )

    # Suppression de compte
    deletion_requested_at = models.DateTimeField(
        null=True, blank=True,
        verbose_name="Date de demande de suppression",
    )

    class Meta:
        verbose_name = "Utilisateur"
        verbose_name_plural = "Utilisateurs"
        ordering = ['-date_joined']
    
    def __str__(self):
        return f"{self.get_full_name()} ({self.email})"
    
    def get_full_name(self):
        """
        Retourne le nom complet de l'utilisateur
        """
        full_name = f"{self.first_name} {self.last_name}".strip()
        return full_name if full_name else self.username
    
    @property
    def has_complete_profile(self):
        """
        Vérifie si le profil est complet (nécessaire pour passer commande)
        """
        return all([
            self.first_name,
            self.last_name,
            self.phone_number,
            self.address,
            self.city,
        ])
    
    @property
    def full_address(self):
        """
        Retourne l'adresse complète formatée
        """
        parts = []
        if self.address:
            parts.append(self.address)
        if self.city:
            parts.append(self.city)
        if self.country:
            parts.append(self.country)
        return ", ".join(parts) if parts else "Adresse non renseignée"

    @property
    def is_platform_admin(self):
        """Vérifie si l'utilisateur est Super Admin Frollot."""
        return self.is_staff or self.is_superuser

    @property
    def active_profiles(self):
        """Retourne les profils actifs de l'utilisateur."""
        return self.profiles.filter(is_active=True)

    @property
    def profile_types(self):
        """Retourne la liste des types de profils actifs."""
        return list(self.profiles.filter(is_active=True).values_list('profile_type', flat=True))

    def has_profile(self, profile_type):
        """Vérifie si l'utilisateur possède un profil actif du type donné."""
        return self.profiles.filter(profile_type=profile_type, is_active=True).exists()


class FailedLoginAttempt(models.Model):
    """Tentative de connexion échouée — pour le lockout de compte."""
    email = models.EmailField(db_index=True, verbose_name="Email tenté")
    ip_address = models.GenericIPAddressField(verbose_name="Adresse IP")
    attempted_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Tentative de connexion échouée"
        verbose_name_plural = "Tentatives de connexion échouées"
        ordering = ['-attempted_at']
        indexes = [
            models.Index(fields=['email', '-attempted_at']),
        ]

    def __str__(self):
        return f"{self.email} — {self.ip_address} — {self.attempted_at}"


class EmailVerificationToken(models.Model):
    """Token de vérification d'email envoyé à l'inscription."""
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
        related_name='email_verification_token',
        verbose_name="Utilisateur",
    )
    token = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    created_at = models.DateTimeField(auto_now_add=True)
    is_used = models.BooleanField(default=False)

    class Meta:
        verbose_name = "Token de vérification email"
        verbose_name_plural = "Tokens de vérification email"

    @property
    def is_expired(self):
        from datetime import timedelta
        return timezone.now() > self.created_at + timedelta(hours=24)

    def __str__(self):
        return f"Vérification {self.user.email} — {'utilisé' if self.is_used else 'actif'}"


class LoginHistory(models.Model):
    """Historique des connexions (réussies et échouées)."""
    STATUS_CHOICES = [
        ('SUCCESS', 'Succès'),
        ('FAILED', 'Échoué'),
        ('TOTP_PENDING', 'En attente TOTP'),
        ('BLOCKED', 'Bloqué'),
    ]
    FAILURE_REASON_CHOICES = [
        ('INVALID_PASSWORD', 'Mot de passe invalide'),
        ('ACCOUNT_LOCKED', 'Compte verrouillé'),
        ('INVALID_TOTP', 'Code TOTP invalide'),
        ('UNVERIFIED_EMAIL', 'Email non vérifié'),
    ]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='login_history',
        verbose_name="Utilisateur",
    )
    email_used = models.EmailField(verbose_name="Email utilisé")
    ip_address = models.GenericIPAddressField(verbose_name="Adresse IP")
    device_info = models.CharField(max_length=200, blank=True, verbose_name="Info appareil")
    user_agent = models.TextField(blank=True, verbose_name="User Agent")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, verbose_name="Statut")
    failure_reason = models.CharField(
        max_length=30,
        choices=FAILURE_REASON_CHOICES,
        blank=True,
        null=True,
        verbose_name="Raison de l'échec",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Historique de connexion"
        verbose_name_plural = "Historiques de connexion"
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', '-created_at']),
        ]

    def __str__(self):
        return f"{self.email_used} — {self.status} — {self.created_at}"


class ActiveSession(models.Model):
    """Session active d'un utilisateur (liée au JWT)."""
    DEVICE_TYPE_CHOICES = [
        ('DESKTOP', 'Ordinateur'),
        ('MOBILE', 'Mobile'),
        ('TABLET', 'Tablette'),
        ('UNKNOWN', 'Inconnu'),
    ]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='active_sessions',
        verbose_name="Utilisateur",
    )
    session_key = models.UUIDField(unique=True, default=uuid.uuid4, verbose_name="Clé de session")
    device_name = models.CharField(max_length=200, verbose_name="Nom de l'appareil")
    device_type = models.CharField(max_length=20, choices=DEVICE_TYPE_CHOICES, default='UNKNOWN', verbose_name="Type d'appareil")
    ip_address = models.GenericIPAddressField(verbose_name="Adresse IP")
    user_agent = models.TextField(blank=True, verbose_name="User Agent")
    last_active_at = models.DateTimeField(auto_now=True, verbose_name="Dernière activité")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Créée le")
    expires_at = models.DateTimeField(verbose_name="Expire le")

    class Meta:
        verbose_name = "Session active"
        verbose_name_plural = "Sessions actives"
        ordering = ['-last_active_at']

    def __str__(self):
        return f"{self.user} — {self.device_name} — {self.session_key}"


class TOTPBackupCode(models.Model):
    """Code de secours TOTP."""
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='totp_backup_codes',
        verbose_name="Utilisateur",
    )
    code_hash = models.CharField(max_length=128, verbose_name="Hash du code")
    is_used = models.BooleanField(default=False, verbose_name="Utilisé")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Code de secours TOTP"
        verbose_name_plural = "Codes de secours TOTP"

    def __str__(self):
        return f"Backup code for {self.user} — {'used' if self.is_used else 'active'}"


class TOTPChallenge(models.Model):
    """Challenge TOTP temporaire lors de la connexion 2FA."""
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='totp_challenges',
        verbose_name="Utilisateur",
    )
    token = models.UUIDField(unique=True, default=uuid.uuid4, verbose_name="Token de challenge")
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField(verbose_name="Expire le")

    class Meta:
        verbose_name = "Challenge TOTP"
        verbose_name_plural = "Challenges TOTP"

    @property
    def is_expired(self):
        return timezone.now() > self.expires_at

    def __str__(self):
        return f"TOTP challenge for {self.user} — {'expired' if self.is_expired else 'active'}"


class SocialAccount(models.Model):
    """Compte social lié (Google, Facebook, GitHub)."""
    PROVIDER_CHOICES = [
        ('GOOGLE', 'Google'),
        ('FACEBOOK', 'Facebook'),
        ('GITHUB', 'GitHub'),
    ]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='social_accounts',
        verbose_name="Utilisateur",
    )
    provider = models.CharField(max_length=20, choices=PROVIDER_CHOICES, verbose_name="Fournisseur")
    provider_uid = models.CharField(max_length=200, verbose_name="UID fournisseur")
    email = models.EmailField(blank=True, verbose_name="Email")
    extra_data = models.JSONField(default=dict, blank=True, verbose_name="Données supplémentaires")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Compte social"
        verbose_name_plural = "Comptes sociaux"
        unique_together = [['provider', 'provider_uid']]

    def __str__(self):
        return f"{self.user} — {self.provider} ({self.provider_uid})"


class UserProfile(models.Model):
    """
    Profil métier d'un utilisateur sur Frollot.
    Un utilisateur peut activer plusieurs profils (Lecteur, Auteur, etc.).
    """
    PROFILE_TYPE_CHOICES = [
        ('LECTEUR', 'Lecteur'),
        ('AUTEUR', 'Auteur'),
        ('EDITEUR', 'Éditeur'),
        ('CORRECTEUR', 'Correcteur / Relecteur'),
        ('ILLUSTRATEUR', 'Illustrateur / Graphiste'),
        ('TRADUCTEUR', 'Traducteur'),
        ('LIVREUR', 'Livreur indépendant'),
    ]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='profiles',
        verbose_name="Utilisateur",
    )
    profile_type = models.CharField(
        max_length=20,
        choices=PROFILE_TYPE_CHOICES,
        verbose_name="Type de profil",
    )
    slug = models.SlugField(
        max_length=250,
        unique=True,
        blank=True,
        verbose_name="Slug (URL publique)",
    )
    profile_image = models.ImageField(
        upload_to='profiles/photos/',
        blank=True, null=True,
        verbose_name="Photo professionnelle",
        help_text="Photo distincte de l'avatar utilisateur, utilisée sur la vitrine publique.",
    )
    cover_image = models.ImageField(
        upload_to='profiles/covers/',
        blank=True, null=True,
        verbose_name="Image de couverture",
        help_text="Bannière affichée en haut de la vitrine publique du professionnel.",
    )
    bio = models.TextField(
        blank=True,
        verbose_name="Biographie / Description",
    )
    website = models.URLField(
        blank=True,
        verbose_name="Site web / Portfolio",
    )
    is_active = models.BooleanField(
        default=True,
        verbose_name="Profil actif",
    )
    is_verified = models.BooleanField(
        default=False,
        verbose_name="Vérifié par la plateforme",
    )
    metadata = models.JSONField(
        default=dict,
        blank=True,
        verbose_name="Données spécifiques au profil",
        help_text="Ex: zones de couverture (livreur), langues (traducteur), tarifs (correcteur)...",
    )

    # Frollot Connect — Réputation (dénormalisée pour perf vitrine)
    avg_rating = models.DecimalField(
        max_digits=3, decimal_places=2, default=0,
        verbose_name="Note moyenne",
    )
    review_count = models.IntegerField(
        default=0,
        verbose_name="Nombre d'avis",
    )
    completed_projects = models.IntegerField(
        default=0,
        verbose_name="Projets terminés",
    )
    avg_response_days = models.IntegerField(
        null=True, blank=True,
        verbose_name="Temps de réponse moyen (jours)",
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Profil utilisateur"
        verbose_name_plural = "Profils utilisateurs"
        unique_together = [['user', 'profile_type']]
        ordering = ['user', 'profile_type']

    def save(self, *args, **kwargs):
        if not self.slug:
            base = slugify(f"{self.user.get_full_name()}-{self.get_profile_type_display()}")
            slug = base
            counter = 1
            while UserProfile.objects.filter(slug=slug).exclude(pk=self.pk).exists():
                slug = f"{base}-{counter}"
                counter += 1
            self.slug = slug
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.user.get_full_name()} — {self.get_profile_type_display()}"