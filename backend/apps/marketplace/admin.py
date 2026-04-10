from django.contrib import admin
from .models import (
    BookListing, SubOrder, CommissionConfig,
    VendorWallet, WalletTransaction, DeliveryWallet,
)


@admin.register(BookListing)
class BookListingAdmin(admin.ModelAdmin):
    list_display = ['book', 'vendor', 'price', 'stock', 'condition', 'is_active', 'created_at']
    list_filter = ['is_active', 'condition', 'vendor__org_type']
    search_fields = ['book__title', 'vendor__name']
    raw_id_fields = ['book', 'vendor']


@admin.register(SubOrder)
class SubOrderAdmin(admin.ModelAdmin):
    list_display = ['id', 'order', 'vendor', 'status', 'subtotal', 'delivery_agent', 'created_at']
    list_filter = ['status']
    search_fields = ['order__id', 'vendor__name']
    raw_id_fields = ['order', 'vendor', 'delivery_agent']


@admin.register(CommissionConfig)
class CommissionConfigAdmin(admin.ModelAdmin):
    list_display = ['platform_commission_percent', 'delivery_base_fee', 'updated_at']


@admin.register(VendorWallet)
class VendorWalletAdmin(admin.ModelAdmin):
    list_display = ['vendor', 'balance', 'total_earned', 'total_withdrawn', 'updated_at']
    search_fields = ['vendor__name']
    raw_id_fields = ['vendor']


@admin.register(WalletTransaction)
class WalletTransactionAdmin(admin.ModelAdmin):
    list_display = ['wallet', 'transaction_type', 'amount', 'sub_order', 'created_at']
    list_filter = ['transaction_type']
    raw_id_fields = ['wallet', 'sub_order']


@admin.register(DeliveryWallet)
class DeliveryWalletAdmin(admin.ModelAdmin):
    list_display = ['agent', 'balance', 'total_earned', 'total_withdrawn']
    raw_id_fields = ['agent']
