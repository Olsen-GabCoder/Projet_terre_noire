"""
Signaux pour les clubs de lecture.
Crée des notifications in-app quand :
- Un nouveau message est posté dans un club
- Un membre rejoint un club
- Un membre est mentionné via @username
"""
import logging
import re

from django.db.models.signals import post_save
from django.dispatch import receiver

from apps.notifications.services import create_notification

logger = logging.getLogger(__name__)

MENTION_RE = re.compile(r'@(\w+)')


@receiver(post_save, sender='social.BookClubMessage')
def notify_club_on_new_message(sender, instance, created, **kwargs):
    """
    Quand un message est posté, notifier tous les membres du club
    sauf l'auteur du message.

    Throttle : on ne notifie pas si l'auteur a déjà posté dans
    les 2 dernières minutes (évite le spam de notifications pour
    des messages consécutifs rapides).
    """
    if not created or not instance.author:
        return

    from apps.social.models import BookClubMessage

    # Throttle : vérifier si l'auteur a déjà envoyé un message récemment
    from django.utils import timezone
    from datetime import timedelta
    recent_cutoff = timezone.now() - timedelta(minutes=2)
    recent_count = BookClubMessage.objects.filter(
        club=instance.club,
        author=instance.author,
        created_at__gte=recent_cutoff,
    ).exclude(pk=instance.pk).count()

    if recent_count > 0:
        return  # L'auteur vient de poster — pas de nouvelle notification

    club = instance.club
    author_name = instance.author.get_full_name() or instance.author.username

    # Prévisualisation du contenu
    if instance.message_type == 'TEXT' and instance.content:
        preview = instance.content[:80] + ('…' if len(instance.content) > 80 else '')
    elif instance.message_type == 'IMAGE':
        preview = '📷 Image'
    elif instance.message_type == 'VOICE':
        preview = '🎤 Note vocale'
    elif instance.message_type == 'FILE':
        preview = '📎 Fichier'
    else:
        preview = 'Nouveau message'

    # Notifier chaque membre actif sauf l'auteur
    member_users = (
        club.memberships
        .filter(user__isnull=False)
        .exclude(user=instance.author)
        .select_related('user')
    )

    for membership in member_users:
        create_notification(
            recipient=membership.user,
            notification_type='CLUB_MESSAGE',
            title=f'{author_name} dans {club.name}',
            message=preview,
            link=f'/clubs/{club.slug}',
            metadata={
                'club_id': club.id,
                'club_slug': club.slug,
                'message_id': instance.id,
                'author_id': instance.author_id,
            },
        )


@receiver(post_save, sender='social.BookClubMessage')
def notify_club_on_mention(sender, instance, created, **kwargs):
    """
    Quand un message contient @username, notifier les membres mentionnés.
    Seuls les usernames correspondant à des membres du club sont notifiés.
    """
    if not created or not instance.author or not instance.content:
        return

    mentioned_usernames = set(MENTION_RE.findall(instance.content))
    if not mentioned_usernames:
        return

    club = instance.club
    author_name = instance.author.get_full_name() or instance.author.username

    # Trouver les membres du club dont le username est mentionné
    mentioned_members = (
        club.memberships
        .filter(user__username__in=mentioned_usernames, user__isnull=False)
        .exclude(user=instance.author)
        .select_related('user')
    )

    preview = instance.content[:80] + ('…' if len(instance.content) > 80 else '')

    for membership in mentioned_members:
        create_notification(
            recipient=membership.user,
            notification_type='CLUB_MENTION',
            title=f'{author_name} vous a mentionné dans {club.name}',
            message=preview,
            link=f'/clubs/{club.slug}',
            metadata={
                'club_id': club.id,
                'club_slug': club.slug,
                'message_id': instance.id,
                'author_id': instance.author_id,
            },
        )


@receiver(post_save, sender='social.BookClubMembership')
def notify_club_on_member_joined(sender, instance, created, **kwargs):
    """
    Quand un membre rejoint un club, notifier les admins du club.
    """
    if not created:
        return

    club = instance.club
    new_member = instance.user
    member_name = new_member.get_full_name() or new_member.username

    # Notifier les admins/créateur (pas le nouveau membre lui-même)
    admin_memberships = (
        club.memberships
        .filter(role='ADMIN', user__isnull=False)
        .exclude(user=new_member)
        .select_related('user')
    )

    for admin_membership in admin_memberships:
        create_notification(
            recipient=admin_membership.user,
            notification_type='CLUB_MEMBER_JOINED',
            title=f'{member_name} a rejoint {club.name}',
            message=f'{member_name} est maintenant membre de votre club.',
            link=f'/clubs/{club.slug}',
            metadata={
                'club_id': club.id,
                'club_slug': club.slug,
                'user_id': new_member.id,
            },
        )

    # Notifier aussi le créateur s'il n'est pas admin (cas orphelin)
    if club.creator and club.creator != new_member:
        is_already_notified = admin_memberships.filter(user=club.creator).exists()
        if not is_already_notified:
            create_notification(
                recipient=club.creator,
                notification_type='CLUB_MEMBER_JOINED',
                title=f'{member_name} a rejoint {club.name}',
                message=f'{member_name} est maintenant membre de votre club.',
                link=f'/clubs/{club.slug}',
                metadata={
                    'club_id': club.id,
                    'club_slug': club.slug,
                    'user_id': new_member.id,
                },
            )
