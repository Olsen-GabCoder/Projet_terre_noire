from django.contrib import admin
from .models import Coupon


@admin.register(Coupon)
class CouponAdmin(admin.ModelAdmin):
    list_display = ['code', 'discount_percent', 'discount_amount', 'is_active', 'usage_count', 'max_uses', 'valid_until']
    list_filter = ['is_active']
    search_fields = ['code']
    readonly_fields = ['usage_count', 'created_at', 'updated_at']
