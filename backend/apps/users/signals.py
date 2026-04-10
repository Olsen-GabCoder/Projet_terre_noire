"""
Signaux pour la synchronisation UserProfile(AUTEUR) → books.Author.

Quand un utilisateur active le profil AUTEUR :
- Si un Author avec le même user existe déjà → on s'assure qu'il est lié
- Si un Author avec le même nom existe (sans user) → on le lie
- Sinon → on crée un nouvel Author lié au user
"""
from django.db.models.signals import post_save
from django.dispatch import receiver

from .models import UserProfile


@receiver(post_save, sender=UserProfile)
def sync_author_on_profile_save(sender, instance, created, **kwargs):
    """Crée ou lie un Author quand un profil AUTEUR est activé."""
    if instance.profile_type != 'AUTEUR' or not instance.is_active:
        return

    from apps.books.models import Author

    user = instance.user

    # Déjà lié ?
    if Author.objects.filter(user=user).exists():
        return

    full_name = user.get_full_name() or user.username

    # Auteur existant avec le même nom, pas encore lié ?
    existing = Author.objects.filter(
        full_name__iexact=full_name, user__isnull=True
    ).first()

    if existing:
        existing.user = user
        existing.save(update_fields=['user'])
    else:
        Author.objects.create(
            full_name=full_name,
            user=user,
            biography=instance.bio or '',
        )
