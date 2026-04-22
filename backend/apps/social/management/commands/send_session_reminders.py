"""
Management command to send session reminders 24h before.
Run via cron: python manage.py send_session_reminders
Recommended: every hour.
"""
from datetime import timedelta

from django.core.management.base import BaseCommand
from django.utils import timezone

from apps.notifications.services import create_notification
from apps.social.models import ClubSession


class Command(BaseCommand):
    help = 'Send CLUB_SESSION_REMINDER notifications for sessions starting in the next 24h.'

    def handle(self, *args, **options):
        now = timezone.now()
        window_start = now + timedelta(hours=23)
        window_end = now + timedelta(hours=25)

        # Sessions starting between 23h and 25h from now (1h window to avoid duplicates)
        sessions = (
            ClubSession.objects
            .filter(scheduled_at__gte=window_start, scheduled_at__lte=window_end)
            .select_related('club')
            .prefetch_related('club__memberships__user')
        )

        count = 0
        for session in sessions:
            club = session.club
            session_date = session.scheduled_at.strftime('%d/%m à %H:%M')
            for membership in club.memberships.filter(user__isnull=False).select_related('user'):
                create_notification(
                    recipient=membership.user,
                    notification_type='CLUB_SESSION_REMINDER',
                    title=f'Séance demain : {session.title}',
                    message=f'{club.name} — {session_date} · {"En ligne" if session.is_online else session.location or "Lieu à confirmer"}',
                    link=f'/clubs/{club.slug}',
                    metadata={
                        'club_id': club.id,
                        'club_slug': club.slug,
                        'session_id': session.id,
                    },
                )
                count += 1

        self.stdout.write(self.style.SUCCESS(f'{count} reminder(s) sent for {sessions.count()} session(s).'))
