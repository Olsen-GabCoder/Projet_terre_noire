"""
Tâches Celery pour les coupons Frollot.
- Envoi async des emails de coupon
- Expiration automatique des coupons périmés
"""
import logging

logger = logging.getLogger(__name__)

try:
    from celery import shared_task
except ImportError:
    def shared_task(func=None, **kwargs):
        def decorator(f):
            def delay(*args, **kw):
                try:
                    return f(None, *args, **kw)
                except Exception:
                    logger.exception("Erreur tâche %s", f.__name__)
            f.delay = delay
            f.apply_async = lambda args=(), kwargs=None, **kw: delay(*args)
            f.apply = lambda args=(), kwargs=None, **kw: f(None, *(args or ()))
            return f
        if func is not None:
            return decorator(func)
        return decorator


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def send_single_coupon_task(self, coupon_id):
    """Envoie l'email pour un coupon unique."""
    from apps.coupons.services import send_single_coupon
    try:
        send_single_coupon(coupon_id)
    except Exception as exc:
        logger.exception("Erreur envoi coupon #%s", coupon_id)
        self.retry(exc=exc)


@shared_task(bind=True, max_retries=1)
def send_coupons_batch_task(self, coupon_ids):
    """Envoie les emails pour une liste de coupons (un par un)."""
    from apps.coupons.services import send_single_coupon
    for coupon_id in coupon_ids:
        try:
            send_single_coupon(coupon_id)
        except Exception:
            logger.exception("Erreur envoi coupon #%s dans le batch", coupon_id)


@shared_task(bind=True, max_retries=1)
def expire_stale_coupons(self):
    """Expire les coupons SENT dont valid_until est dépassé."""
    from django.utils import timezone
    from apps.coupons.models import Coupon

    now = timezone.now()
    count = Coupon.objects.filter(
        status='SENT',
        valid_until__lt=now,
    ).update(status='EXPIRED')

    if count:
        logger.info("expire_stale_coupons: %d coupon(s) expirés.", count)
