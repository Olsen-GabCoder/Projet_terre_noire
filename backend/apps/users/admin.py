# backend/apps/users/admin.py

from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.utils.html import format_html
from django.urls import path
from django.shortcuts import redirect, get_object_or_404
from django.contrib import messages
from .models import User


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    """
    Configuration de l'interface d'administration pour le modèle User personnalisé.
    Reproduit la page React de gestion des utilisateurs.
    """
    
    # Champs affichés dans la liste (alignés avec React)
    list_display = [
        'id',
        'username',
        'email',
        'get_full_name',
        'phone_number',
        'city',
        'date_joined',
        'status_badge',
        'admin_actions_column',
    ]
    
    list_display_links = ['username']
    
    # Filtres latéraux désactivés (design épuré, aligné page React)
    list_filter = []
    
    # Champs de recherche
    search_fields = [
        'username',
        'email',
        'first_name',
        'last_name',
        'phone_number',
    ]
    
    # Actions groupées (Activer / Désactiver)
    actions = ['activate_users', 'deactivate_users']
    
    # Organisation des champs dans le formulaire de détail
    fieldsets = (
        ('Informations de connexion', {
            'fields': ('username', 'password')
        }),
        ('Informations personnelles', {
            'fields': ('first_name', 'last_name', 'email', 'phone_number', 'profile_image')
        }),
        ('Adresse', {
            'fields': ('address', 'city', 'country')
        }),
        ('Préférences', {
            'fields': ('receive_newsletter',)
        }),
        ('Statut et rôles', {
            'fields': ('is_active', 'is_staff', 'is_superuser', 'groups', 'user_permissions')
        }),
        ('Dates importantes', {
            'fields': ('last_login', 'date_joined', 'created_at', 'updated_at')
        }),
    )
    
    readonly_fields = ['date_joined', 'last_login', 'created_at', 'updated_at']
    
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': (
                'username',
                'email',
                'phone_number',
                'first_name',
                'last_name',
                'password1',
                'password2',
                'is_staff',
                'is_active',
            )
        }),
    )
    
    ordering = ['-date_joined']
    
    def status_badge(self, obj):
        """Badge Actif/Inactif comme dans React."""
        if obj.is_active:
            return format_html(
                '<span class="tn-status-badge tn-status-badge--active">Actif</span>'
            )
        return format_html(
            '<span class="tn-status-badge tn-status-badge--inactive">Inactif</span>'
        )
    status_badge.short_description = 'Statut'
    
    def admin_actions_column(self, obj):
        """Liens Détails + Activer/Désactiver comme dans React."""
        from django.urls import reverse
        change_url = reverse('admin:users_user_change', args=[obj.pk])
        toggle_url = reverse('admin:users_user_toggle', args=[obj.pk])
        if obj.is_active:
            toggle_label = 'Désactiver'
            toggle_class = 'tn-btn-toggle--deactivate'
        else:
            toggle_label = 'Activer'
            toggle_class = 'tn-btn-toggle--activate'
        icon = 'fa-user-slash' if obj.is_active else 'fa-user-check'
        confirm_msg = "Êtes-vous sûr de vouloir désactiver cet utilisateur ?" if obj.is_active else "Êtes-vous sûr de vouloir activer cet utilisateur ?"
        return format_html(
            '<a href="{}" class="tn-btn-view"><i class="fas fa-eye"></i> Détails</a> '
            '<a href="{}" class="tn-btn-toggle {}" onclick="return confirm(\'{}\');"><i class="fas {}"></i> {}</a>',
            change_url,
            toggle_url,
            toggle_class,
            confirm_msg,
            icon,
            toggle_label,
        )
    admin_actions_column.short_description = 'Actions'
    
    def activate_users(self, request, queryset):
        count = queryset.update(is_active=True)
        self.message_user(request, f"{count} utilisateur(s) activé(s).", messages.SUCCESS)
    activate_users.short_description = "Activer les utilisateurs sélectionnés"
    
    def deactivate_users(self, request, queryset):
        count = queryset.update(is_active=False)
        self.message_user(request, f"{count} utilisateur(s) désactivé(s).", messages.SUCCESS)
    deactivate_users.short_description = "Désactiver les utilisateurs sélectionnés"
    
    def get_urls(self):
        urls = super().get_urls()
        custom = [
            path('<int:pk>/toggle/', self.admin_site.admin_view(self.toggle_user_view), name='users_user_toggle'),
        ]
        return custom + urls
    
    def toggle_user_view(self, request, pk):
        """Bascule is_active et redirige vers la changelist."""
        user = get_object_or_404(User, pk=pk)
        user.is_active = not user.is_active
        user.save()
        status = 'activé' if user.is_active else 'désactivé'
        self.message_user(request, f"Utilisateur {status}.", messages.SUCCESS)
        return redirect('admin:users_user_changelist')
    
    def changelist_view(self, request, extra_context=None):
        """Ajoute les stats (Total, Actifs, Inactifs) au contexte."""
        extra_context = extra_context or {}
        qs = self.get_queryset(request)
        extra_context['tn_total_users'] = qs.count()
        extra_context['tn_active_users'] = qs.filter(is_active=True).count()
        extra_context['tn_inactive_users'] = extra_context['tn_total_users'] - extra_context['tn_active_users']
        return super().changelist_view(request, extra_context)