"""
Permissions granulaires pour les organisations Frollot.
Chaque rôle interne dispose d'un ensemble de permissions déterministes (en code).
"""
from rest_framework import permissions

from .models import Organization, OrganizationMembership


# Permissions attribuées à chaque rôle interne d'organisation
ORG_ROLE_PERMISSIONS = {
    'PROPRIETAIRE': [
        'org.manage_settings', 'org.manage_members', 'org.manage_billing',
        'org.manage_catalog', 'org.manage_orders', 'org.manage_manuscripts',
        'org.view_stats', 'org.invite_members', 'org.remove_members',
    ],
    'ADMINISTRATEUR': [
        'org.manage_catalog', 'org.manage_orders', 'org.manage_members',
        'org.manage_manuscripts', 'org.view_stats', 'org.invite_members',
    ],
    'EDITEUR': [
        'org.manage_catalog', 'org.manage_manuscripts', 'org.view_stats',
    ],
    'COMMERCIAL': [
        'org.manage_orders', 'org.view_stats',
    ],
    'MEMBRE': [
        'org.view_stats',
    ],
}


def user_has_org_permission(user, organization, permission_codename):
    """Vérifie si l'utilisateur a une permission spécifique dans une organisation."""
    if user.is_platform_admin:
        return True
    membership = OrganizationMembership.objects.filter(
        user=user, organization=organization, is_active=True,
    ).first()
    if not membership:
        return False
    return permission_codename in ORG_ROLE_PERMISSIONS.get(membership.role, [])


def get_user_org_role(user, organization):
    """Retourne le rôle de l'utilisateur dans l'organisation, ou None."""
    membership = OrganizationMembership.objects.filter(
        user=user, organization=organization, is_active=True,
    ).first()
    return membership.role if membership else None


class IsPlatformAdmin(permissions.BasePermission):
    """Vérifie que l'utilisateur est Super Admin Frollot."""
    def has_permission(self, request, view):
        return (
            request.user
            and request.user.is_authenticated
            and request.user.is_platform_admin
        )


class IsOrganizationMember(permissions.BasePermission):
    """L'utilisateur doit être membre actif de l'organisation."""
    def has_permission(self, request, view):
        org_id = view.kwargs.get('org_id') or view.kwargs.get('pk')
        if not org_id:
            return False
        if request.user.is_platform_admin:
            return True
        return OrganizationMembership.objects.filter(
            user=request.user, organization_id=org_id, is_active=True,
        ).exists()


class IsOrganizationAdmin(permissions.BasePermission):
    """L'utilisateur doit être PROPRIETAIRE ou ADMINISTRATEUR de l'organisation."""
    def has_permission(self, request, view):
        org_id = view.kwargs.get('org_id') or view.kwargs.get('pk')
        if not org_id:
            return False
        if request.user.is_platform_admin:
            return True
        return OrganizationMembership.objects.filter(
            user=request.user, organization_id=org_id, is_active=True,
            role__in=['PROPRIETAIRE', 'ADMINISTRATEUR'],
        ).exists()


class HasOrgPermission(permissions.BasePermission):
    """
    Vérifie un codename de permission spécifique.
    La vue doit définir `required_permission` (ex: 'org.manage_catalog').
    """
    def has_permission(self, request, view):
        org_id = view.kwargs.get('org_id') or view.kwargs.get('pk')
        perm = getattr(view, 'required_permission', None)
        if not org_id or not perm:
            return False
        org = Organization.objects.filter(id=org_id).first()
        if not org:
            return False
        return user_has_org_permission(request.user, org, perm)
