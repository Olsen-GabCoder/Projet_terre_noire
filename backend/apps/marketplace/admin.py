from django.contrib import admin
from .models import (
    BookListing, SubOrder, CommissionConfig,
    VendorWallet, WalletTransaction, DeliveryWallet,
    DeliveryWalletTransaction,
)
from .delivery_models import DeliveryRate
from .withdrawal_models import WithdrawalRequest


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


@admin.register(DeliveryWalletTransaction)
class DeliveryWalletTransactionAdmin(admin.ModelAdmin):
    list_display = ['wallet', 'transaction_type', 'amount', 'created_at']
    list_filter = ['transaction_type']
    readonly_fields = ['created_at']
    raw_id_fields = ['wallet', 'sub_order']


@admin.register(DeliveryRate)
class DeliveryRateAdmin(admin.ModelAdmin):
    list_display = ['agent', 'zone_name', 'country', 'price', 'currency', 'is_active']
    list_filter = ['country', 'is_active']
    search_fields = ['zone_name']
    raw_id_fields = ['agent']


@admin.register(WithdrawalRequest)
class WithdrawalRequestAdmin(admin.ModelAdmin):
    list_display = ['user', 'wallet_type', 'amount', 'provider', 'status', 'created_at']
    list_filter = ['status', 'provider', 'wallet_type']
    search_fields = ['user__username', 'phone_number']
    readonly_fields = ['created_at', 'processed_at']
    raw_id_fields = ['user']
