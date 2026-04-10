from django.contrib import admin

from .models import Organization, OrganizationMembership, Invitation


class OrganizationMembershipInline(admin.TabularInline):
    model = OrganizationMembership
    extra = 0
    fields = ['user', 'role', 'is_active', 'joined_at']
    readonly_fields = ['joined_at']
    raw_id_fields = ['user']


@admin.register(Organization)
class OrganizationAdmin(admin.ModelAdmin):
    list_display = ['name', 'org_type', 'city', 'country', 'is_active', 'is_verified', 'owner', 'created_at']
    list_filter = ['org_type', 'is_active', 'is_verified']
    search_fields = ['name', 'slug', 'email', 'city']
    readonly_fields = ['slug', 'created_at', 'updated_at']
    raw_id_fields = ['owner']
    inlines = [OrganizationMembershipInline]


@admin.register(OrganizationMembership)
class OrganizationMembershipAdmin(admin.ModelAdmin):
    list_display = ['user', 'organization', 'role', 'is_active', 'joined_at']
    list_filter = ['role', 'is_active']
    search_fields = ['user__username', 'user__email', 'organization__name']
    raw_id_fields = ['user', 'organization']


@admin.register(Invitation)
class InvitationAdmin(admin.ModelAdmin):
    list_display = ['email', 'organization', 'role', 'status', 'invited_by', 'created_at', 'expires_at']
    list_filter = ['status', 'role']
    search_fields = ['email', 'organization__name']
    readonly_fields = ['token', 'created_at']
    raw_id_fields = ['organization', 'invited_by']
