"""
Configuration Celery pour Frollot.
Lance le worker : celery -A config worker -l info
Lance le beat  : celery -A config beat -l info
"""
import os

from celery import Celery
from celery.schedules import crontab

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

app = Celery('frollot')
app.config_from_object('django.conf:settings', namespace='CELERY')
app.autodiscover_tasks()

app.conf.beat_schedule = {
    'cancel-stale-pending-orders': {
        'task': 'apps.core.tasks.cancel_stale_pending_orders',
        'schedule': crontab(minute=0),  # Toutes les heures
    },
    'expire-overdue-quotes': {
        'task': 'apps.core.tasks.expire_overdue_quotes',
        'schedule': crontab(hour=2, minute=0),  # Tous les jours à 2h UTC
    },
    'auto-complete-reviewed-orders': {
        'task': 'apps.core.tasks.auto_complete_reviewed_orders',
        'schedule': crontab(hour=3, minute=0),  # Tous les jours à 3h UTC
    },
    'send-loan-reminders': {
        'task': 'apps.core.tasks.send_loan_reminders',
        'schedule': crontab(hour=8, minute=0),  # Tous les jours à 8h UTC (9h Libreville)
    },
    'alert-unassigned-suborders': {
        'task': 'apps.core.tasks.alert_unassigned_suborders',
        'schedule': crontab(hour=9, minute=0),  # Tous les jours à 9h UTC (10h Libreville)
    },
}
