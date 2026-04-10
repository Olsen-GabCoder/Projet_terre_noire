"""Permissions spécifiques à la bibliothèque Frollot."""
from rest_framework import permissions

from apps.organizations.models import OrganizationMembership
from .models import LibraryMembership


class IsLibraryAdmin(permissions.BasePermission):
    """
    L'utilisateur doit être PROPRIETAIRE ou ADMINISTRATEUR
    de l'organisation BIBLIOTHEQUE identifiée par view.kwargs['org_id'].
    """
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.user.is_platform_admin:
            return True
        org_id = view.kwargs.get('org_id')
        if not org_id:
            return False
        return OrganizationMembership.objects.filter(
            user=request.user,
            organization_id=org_id,
            organization__org_type='BIBLIOTHEQUE',
            is_active=True,
            role__in=['PROPRIETAIRE', 'ADMINISTRATEUR'],
        ).exists()


class IsLibraryMember(permissions.BasePermission):
    """
    L'utilisateur doit avoir une adhésion active (non expirée)
    à la bibliothèque identifiée par view.kwargs['org_id'].
    """
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.user.is_platform_admin:
            return True
        org_id = view.kwargs.get('org_id')
        if not org_id:
            return False
        from django.utils import timezone
        return LibraryMembership.objects.filter(
            user=request.user,
            library_id=org_id,
            is_active=True,
            expires_at__gt=timezone.now(),
        ).exists()
