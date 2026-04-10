"""
Signaux Frollot Connect — mise à jour automatique des stats prestataires.
"""
from django.db.models import Avg
from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver

from .models import ServiceProviderReview, ServiceOrder


@receiver(post_save, sender=ServiceProviderReview)
@receiver(post_delete, sender=ServiceProviderReview)
def update_provider_reputation(sender, instance, **kwargs):
    """Recalcule avg_rating et review_count du prestataire après chaque avis."""
    profile = instance.provider
    stats = ServiceProviderReview.objects.filter(provider=profile).aggregate(avg=Avg('rating'))
    profile.avg_rating = stats['avg'] or 0
    profile.review_count = ServiceProviderReview.objects.filter(provider=profile).count()
    profile.save(update_fields=['avg_rating', 'review_count'])


@receiver(post_save, sender=ServiceOrder)
def update_provider_completed_projects(sender, instance, **kwargs):
    """Incrémente le compteur de projets terminés quand une commande est complétée."""
    if instance.status == 'COMPLETED':
        profile = instance.provider
        profile.completed_projects = ServiceOrder.objects.filter(
            provider=profile, status='COMPLETED',
        ).count()
        profile.save(update_fields=['completed_projects'])
