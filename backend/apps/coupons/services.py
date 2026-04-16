"""Services métier pour les coupons Frollot (organisations + prestataires)."""
import logging
from datetime import timedelta
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.db.models import Q
from django.utils import timezone

from .models import Coupon

logger = logging.getLogger(__name__)
User = get_user_model()


# ── Helpers émetteur ──

def get_emitter_name_from_fields(organization, provider_profile):
    """Retourne le nom lisible de l'émetteur (org, prestataire ou plateforme)."""
    if organization:
        return organization.name
    if provider_profile:
        return provider_profile.user.get_full_name() or provider_profile.user.username
    return 'Frollot'


def get_emitter_name(coupon):
    """Retourne le nom lisible de l'émetteur d'un coupon."""
    return get_emitter_name_from_fields(coupon.organization, coupon.provider_profile)


def _discount_label(coupon):
    """Helper pour afficher la réduction en texte."""
    if coupon.discount_type == 'PERCENT':
        return f"-{coupon.discount_value}%"
    elif coupon.discount_type == 'FIXED':
        return f"-{coupon.discount_value} FCFA"
    return "Livraison offerte"


def calc_discount(discount_type, discount_value, applicable_subtotal):
    """Calcule le montant de réduction (factorisé pour Order et ServiceOrder)."""
    if discount_type == 'PERCENT':
        return applicable_subtotal * (discount_value / Decimal('100'))
    elif discount_type == 'FIXED':
        return min(discount_value, applicable_subtotal)
    elif discount_type == 'FREE_SHIPPING':
        return Decimal('0')
    return Decimal('0')


# ── Envoi ──

def send_single_coupon(coupon_id):
    """Envoie l'email pour un coupon unique. Met à jour PENDING → SENT ou FAILED."""
    try:
        coupon = Coupon.objects.select_related(
            'organization', 'provider_profile__user', 'template',
        ).get(id=coupon_id)
    except Coupon.DoesNotExist:
        logger.error("Coupon #%s introuvable pour envoi.", coupon_id)
        return False

    if coupon.status != 'PENDING':
        logger.warning("Coupon #%s statut=%s, skip envoi.", coupon_id, coupon.status)
        return False

    try:
        from apps.core.email import send_coupon_email
        send_coupon_email(coupon, coupon.recipient_email, coupon.custom_message)
    except Exception as e:
        logger.exception("Échec envoi coupon #%s à %s : %s", coupon.id, coupon.recipient_email, e)
        coupon.status = 'FAILED'
        coupon.save(update_fields=['status', 'updated_at'])
        return False

    coupon.status = 'SENT'
    coupon.save(update_fields=['status', 'updated_at'])

    if coupon.recipient_id:
        try:
            from apps.notifications.services import create_notification
            emitter = get_emitter_name(coupon)
            create_notification(
                coupon.recipient, 'COUPON_RECEIVED',
                f'Coupon reçu de {emitter}',
                message=f'Code {coupon.code} — {_discount_label(coupon)}',
                link='/dashboard/coupons',
            )
        except Exception:
            logger.exception("Échec notification COUPON_RECEIVED pour coupon %s", coupon.code)

    logger.info("Coupon %s envoyé à %s", coupon.code, coupon.recipient_email)
    return True


def create_coupons_for_send(template, recipient_emails, created_by, custom_message='', custom_expiry_days=None):
    """Crée les coupons en base (PENDING). L'envoi email est délégué à Celery."""
    from django.db.models import F
    from rest_framework.exceptions import ValidationError

    # Vérifier le quota global du template
    if not template.has_quota_remaining:
        raise ValidationError("Le quota de ce template est épuisé.")
    if template.total_quota is not None:
        remaining = template.total_quota - template.quota_used
        if len(recipient_emails) > remaining:
            raise ValidationError(f"Quota insuffisant : {remaining} coupon(s) restant(s) sur ce template.")

    expiry_days = custom_expiry_days or template.default_expiry_days
    now = timezone.now()
    coupon_ids = []

    for email in recipient_emails:
        # Vérifier per_customer_limit
        if template.per_customer_limit:
            existing_count = Coupon.objects.filter(
                template=template, recipient_email__iexact=email,
            ).count()
            if existing_count >= template.per_customer_limit:
                logger.warning(
                    "Limite par client atteinte pour %s sur template %s (%d/%d), skip.",
                    email, template.name, existing_count, template.per_customer_limit,
                )
                continue

        recipient_user = User.objects.filter(email__iexact=email).first()
        coupon = Coupon.objects.create(
            code=Coupon.generate_code(),
            discount_type=template.discount_type,
            discount_value=template.discount_value,
            min_order_amount=template.min_order_amount,
            organization=template.organization,
            provider_profile=template.provider_profile,
            template=template,
            recipient_email=email.lower(),
            recipient=recipient_user,
            status='PENDING',
            valid_from=now,
            valid_until=now + timedelta(days=expiry_days),
            max_uses=1,
            created_by=created_by,
            custom_message=custom_message,
        )
        coupon_ids.append(coupon.id)

    # Incrémenter quota_used
    if coupon_ids:
        from .models import CouponTemplate
        CouponTemplate.objects.filter(id=template.id).update(
            quota_used=F('quota_used') + len(coupon_ids),
        )

    return coupon_ids


def revoke_coupon(coupon, revoked_by):
    """Révoque un coupon envoyé mais non utilisé."""
    if coupon.status not in ('SENT', 'PENDING'):
        raise ValueError("Seuls les coupons SENT ou PENDING peuvent être révoqués.")

    coupon.status = 'REVOKED'
    coupon.save(update_fields=['status', 'updated_at'])

    try:
        from apps.core.email import send_coupon_revoked_email
        send_coupon_revoked_email(coupon)
    except Exception:
        logger.exception("Erreur envoi email révocation coupon %s", coupon.code)

    if coupon.recipient_id:
        from apps.notifications.services import create_notification
        emitter = get_emitter_name(coupon)
        create_notification(
            coupon.recipient, 'COUPON_REVOKED',
            f'Coupon révoqué par {emitter}',
            message=f'Le code {coupon.code} n\'est plus valide.',
            link='/dashboard/coupons',
        )

    logger.info("Coupon %s révoqué par %s", coupon.code, revoked_by)


# ── Applicable ──

def get_applicable_coupons(user, cart_item_ids=None, service_quote_id=None):
    """
    Retourne les coupons du user applicables au contexte donné.
    - cart_item_ids : panier livres (filtre par org des items)
    - service_quote_id : devis service (filtre par provider_profile du prestataire)
    - aucun : tous les coupons SENT du user
    """
    now = timezone.now()
    base_qs = Coupon.objects.filter(
        Q(recipient=user) | Q(recipient_email__iexact=user.email),
        status='SENT', is_active=True,
    ).filter(
        Q(valid_until__isnull=True) | Q(valid_until__gte=now),
    ).select_related('organization', 'provider_profile__user', 'template')

    if cart_item_ids:
        from apps.books.models import Book
        books = Book.objects.filter(id__in=cart_item_ids).select_related('publisher_organization')
        org_ids = {b.publisher_organization_id for b in books if b.publisher_organization_id}
        return base_qs.filter(
            Q(organization_id__in=org_ids) | Q(organization__isnull=True, provider_profile__isnull=True),
        )

    if service_quote_id:
        from apps.services.models import ServiceQuote
        try:
            quote = ServiceQuote.objects.select_related('request__provider_profile').get(id=service_quote_id)
            provider_profile_id = quote.request.provider_profile_id
            return base_qs.filter(
                Q(provider_profile_id=provider_profile_id) | Q(organization__isnull=True, provider_profile__isnull=True),
            )
        except ServiceQuote.DoesNotExist:
            return Coupon.objects.none()

    # Aucun filtre : tous les coupons SENT du user
    return base_qs
