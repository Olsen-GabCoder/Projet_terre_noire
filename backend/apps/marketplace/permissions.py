"""Permissions spécifiques à la marketplace Frollot."""
from rest_framework import permissions

from apps.organizations.models import OrganizationMembership


class IsVendorMember(permissions.BasePermission):
    """
    L'utilisateur doit être membre d'une organisation vendeur
    (MAISON_EDITION ou LIBRAIRIE) avec un rôle suffisant.
    """
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.user.is_platform_admin:
            return True
        return OrganizationMembership.objects.filter(
            user=request.user,
            is_active=True,
            organization__org_type__in=['MAISON_EDITION', 'LIBRAIRIE'],
            role__in=['PROPRIETAIRE', 'ADMINISTRATEUR', 'COMMERCIAL'],
        ).exists()


class IsListingOwner(permissions.BasePermission):
    """L'utilisateur doit être membre de l'organisation propriétaire du listing."""
    def has_object_permission(self, request, view, obj):
        if request.user.is_platform_admin:
            return True
        return OrganizationMembership.objects.filter(
            user=request.user,
            organization=obj.vendor,
            is_active=True,
            role__in=['PROPRIETAIRE', 'ADMINISTRATEUR', 'COMMERCIAL'],
        ).exists()


class IsSubOrderVendor(permissions.BasePermission):
    """L'utilisateur doit être membre de l'organisation vendeur de la sous-commande."""
    def has_object_permission(self, request, view, obj):
        if request.user.is_platform_admin:
            return True
        return OrganizationMembership.objects.filter(
            user=request.user,
            organization=obj.vendor,
            is_active=True,
            role__in=['PROPRIETAIRE', 'ADMINISTRATEUR', 'COMMERCIAL'],
        ).exists()


class IsDeliveryAgent(permissions.BasePermission):
    """L'utilisateur doit avoir un profil LIVREUR actif."""
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.user.is_platform_admin:
            return True
        return request.user.has_profile('LIVREUR')
