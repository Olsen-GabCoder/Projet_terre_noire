"""
Signaux Frollot Connect — mise à jour automatique des stats de réputation.
"""
from django.db.models import Avg
from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver

from .models import OrganizationReview


@receiver(post_save, sender=OrganizationReview)
@receiver(post_delete, sender=OrganizationReview)
def update_organization_reputation(sender, instance, **kwargs):
    """Recalcule avg_rating et review_count de l'organisation après chaque avis."""
    org = instance.organization
    stats = org.reviews.aggregate(avg=Avg('rating'))
    org.avg_rating = stats['avg'] or 0
    org.review_count = org.reviews.count()
    org.save(update_fields=['avg_rating', 'review_count'])
