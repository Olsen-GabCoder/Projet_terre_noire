from django.contrib import admin
from django.core.cache import cache
from .models import SiteConfig, DeliveryZone


@admin.register(SiteConfig)
class SiteConfigAdmin(admin.ModelAdmin):
    list_display = ['shipping_free_threshold', 'shipping_cost', 'updated_at']

    def has_add_permission(self, request):
        return not SiteConfig.objects.exists()

    def has_delete_permission(self, request, obj=None):
        return False

    def save_model(self, request, obj, form, change):
        super().save_model(request, obj, form, change)
        cache.delete('delivery_config')


@admin.register(DeliveryZone)
class DeliveryZoneAdmin(admin.ModelAdmin):
    list_display = ['name', 'shipping_cost', 'shipping_free_threshold', 'estimated_days_min', 'estimated_days_max', 'is_active']
    list_editable = ['shipping_cost', 'shipping_free_threshold', 'is_active']
    list_filter = ['is_active']
    search_fields = ['name']
