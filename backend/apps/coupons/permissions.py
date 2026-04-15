"""Permissions pour le système de coupons (organisations + prestataires individuels)."""
from rest_framework import permissions

from apps.organizations.models import OrganizationMembership

COUPON_MANAGER_ROLES = ['PROPRIETAIRE', 'ADMINISTRATEUR', 'COMMERCIAL']
SERVICE_PROVIDER_TYPES = ['CORRECTEUR', 'ILLUSTRATEUR', 'TRADUCTEUR']


def get_user_emitter_context(user, emitter_type=None, organization_id=None):
    """
    Retourne le contexte émetteur du user pour les coupons.

    Returns dict:
        {"type": "organization", "organization": org, "provider_profile": None}
        {"type": "provider_profile", "organization": None, "provider_profile": profile}
        None si aucun contexte qualifiant.

    Args:
        user: User instance.
        emitter_type: 'organization' | 'provider_profile' | None.
        organization_id: int | None — requis si le user est multi-orgs.

    Raises ValueError si:
        - user a les deux contextes (org+provider) et emitter_type n'est pas fourni.
        - user est multi-orgs, emitter_type='organization', et organization_id n'est pas fourni.
        - organization_id fourni mais le user n'a pas de membership éligible dans cette org.
    """
    orgs = _get_orgs(user)
    profile = _get_provider_profile(user)

    has_org = orgs.exists()

    if has_org and profile:
        if not emitter_type:
            raise ValueError(
                "Vous êtes à la fois membre d'une organisation et prestataire indépendant. "
                "Précisez le paramètre emitter_type=organization ou emitter_type=provider_profile."
            )
        if emitter_type == 'organization':
            org = _resolve_org(orgs, organization_id)
            return {"type": "organization", "organization": org, "provider_profile": None}
        elif emitter_type == 'provider_profile':
            return {"type": "provider_profile", "organization": None, "provider_profile": profile}
        else:
            raise ValueError("emitter_type doit être 'organization' ou 'provider_profile'.")

    if has_org:
        org = _resolve_org(orgs, organization_id)
        return {"type": "organization", "organization": org, "provider_profile": None}
    if profile:
        return {"type": "provider_profile", "organization": None, "provider_profile": profile}
    return None


def _resolve_org(orgs_qs, organization_id=None):
    """
    Résout l'org à utiliser à partir du queryset d'orgs éligibles.

    - Si une seule org : retourne celle-là (rétrocompatible mono-org).
    - Si organization_id fourni : vérifie que l'org est dans le queryset.
    - Si multi-orgs sans organization_id : ValueError.
    """
    if organization_id is not None:
        try:
            return orgs_qs.get(id=organization_id)
        except orgs_qs.model.DoesNotExist:
            raise ValueError(
                "Vous n'avez pas de rôle coupon-manager dans l'organisation demandée."
            )

    # Pas d'organization_id fourni
    count = orgs_qs.count()
    if count == 1:
        return orgs_qs.first()
    if count > 1:
        raise ValueError(
            "Vous êtes membre de plusieurs organisations. "
            "Précisez le paramètre organization_id pour indiquer laquelle utiliser."
        )
    # count == 0 — ne devrait pas arriver car appelé seulement si has_org
    return None


def get_user_coupon_org(user):
    """Rétrocompatibilité : retourne l'org du user si contexte org."""
    return _get_orgs(user).first()


def _get_orgs(user):
    """Retourne le queryset des organisations éligibles coupons pour ce user."""
    from apps.organizations.models import Organization
    org_ids = OrganizationMembership.objects.filter(
        user=user, is_active=True, role__in=COUPON_MANAGER_ROLES,
    ).values_list('organization_id', flat=True)
    return Organization.objects.filter(id__in=org_ids).order_by('name')


def _get_provider_profile(user):
    from apps.users.models import UserProfile
    return UserProfile.objects.filter(
        user=user, profile_type__in=SERVICE_PROVIDER_TYPES, is_active=True,
    ).first()


class IsCouponEmitter(permissions.BasePermission):
    """User doit être org coupon-manager OU prestataire de services actif."""
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.user.is_platform_admin:
            return True
        return _get_orgs(request.user).exists() or _get_provider_profile(request.user) is not None


# Alias rétrocompatibilité
IsOrgCouponManager = IsCouponEmitter
