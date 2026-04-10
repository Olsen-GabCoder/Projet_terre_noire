"""Permissions spécifiques aux services professionnels Frollot."""
from rest_framework import permissions

from apps.organizations.models import OrganizationMembership
from apps.users.models import UserProfile


class IsServiceProvider(permissions.BasePermission):
    """L'utilisateur doit avoir un profil actif de prestataire de services."""
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.user.is_platform_admin:
            return True
        return UserProfile.objects.filter(
            user=request.user,
            profile_type__in=['CORRECTEUR', 'ILLUSTRATEUR', 'TRADUCTEUR'],
            is_active=True,
        ).exists()


class IsListingProvider(permissions.BasePermission):
    """L'utilisateur doit être le propriétaire du profil prestataire de l'offre."""
    def has_object_permission(self, request, view, obj):
        if request.user.is_platform_admin:
            return True
        return obj.provider.user == request.user


class IsServiceClient(permissions.BasePermission):
    """L'utilisateur doit être le client de la demande de service."""
    def has_object_permission(self, request, view, obj):
        if request.user.is_platform_admin:
            return True
        return obj.client == request.user


class IsServiceParticipant(permissions.BasePermission):
    """L'utilisateur doit être le client ou le prestataire de la commande de service."""
    def has_object_permission(self, request, view, obj):
        if request.user.is_platform_admin:
            return True
        return obj.client == request.user or obj.provider.user == request.user


class IsPublisherMember(permissions.BasePermission):
    """L'utilisateur doit être membre d'une maison d'édition."""
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.user.is_platform_admin:
            return True
        return OrganizationMembership.objects.filter(
            user=request.user,
            is_active=True,
            organization__org_type='MAISON_EDITION',
        ).exists()


class IsPrinterMember(permissions.BasePermission):
    """L'utilisateur doit être membre d'une imprimerie."""
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.user.is_platform_admin:
            return True
        return OrganizationMembership.objects.filter(
            user=request.user,
            is_active=True,
            organization__org_type='IMPRIMERIE',
        ).exists()
