from django.contrib import admin
from .models import CouponTemplate, Coupon


@admin.register(CouponTemplate)
class CouponTemplateAdmin(admin.ModelAdmin):
    list_display = [
        'name', 'commercial_title', 'category', 'discount_type', 'discount_value',
        'is_system', 'is_published', 'clone_count', 'target_emitter_type', 'display_order',
    ]
    list_filter = ['is_system', 'is_published', 'category', 'discount_type', 'target_emitter_type']
    search_fields = ['name', 'commercial_title', 'system_slug']
    readonly_fields = ['quota_used', 'clone_count', 'created_at', 'updated_at']
    raw_id_fields = ['provider_profile', 'created_by', 'cloned_from']

    fieldsets = (
        ('Identité & marketing', {
            'fields': ('name', 'commercial_title', 'subtitle', 'marketing_description', 'category', 'tags', 'icon', 'accent_color'),
        }),
        ('Réduction', {
            'fields': ('discount_type', 'discount_value', 'min_order_amount', 'max_discount_amount'),
        }),
        ('Conditions', {
            'fields': ('first_order_only', 'min_customer_age_days'),
        }),
        ('Validité & quotas', {
            'fields': ('default_expiry_days', 'valid_from', 'valid_until', 'total_quota', 'quota_used', 'per_customer_limit'),
        }),
        ('Système & bibliothèque', {
            'fields': ('is_system', 'system_slug', 'is_published', 'target_emitter_type', 'display_order', 'clone_count', 'cloned_from'),
        }),
        ('Émetteur', {
            'fields': ('organization', 'provider_profile', 'created_by', 'is_active'),
        }),
        ('Dates', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',),
        }),
    )


@admin.register(Coupon)
class CouponAdmin(admin.ModelAdmin):
    list_display = [
        'code', 'discount_type', 'discount_value', 'organization', 'provider_profile',
        'status', 'recipient_email', 'used_by', 'is_active',
        'usage_count', 'max_uses', 'valid_until',
    ]
    list_filter = ['status', 'discount_type', 'organization', 'provider_profile', 'is_active']
    search_fields = ['code', 'recipient_email', 'organization__name']
    readonly_fields = [
        'usage_count', 'used_by', 'used_at', 'used_on_order',
        'created_at', 'updated_at',
    ]
    raw_id_fields = ['recipient', 'used_by', 'created_by', 'template', 'used_on_order', 'provider_profile']
