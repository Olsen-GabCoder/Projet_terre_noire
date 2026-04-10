from django.contrib import admin
from .models import (
    ServiceListing, ServiceRequest, ServiceQuote, ServiceOrder,
    EditorialProject, ProjectTask, PrintRequest,
    ProfessionalWallet, ProfessionalWalletTransaction,
    QuoteTemplate, QuoteTemplateLot, QuoteTemplateItem, Quote, QuoteLot, QuoteItem,
)


@admin.register(ServiceListing)
class ServiceListingAdmin(admin.ModelAdmin):
    list_display = ['title', 'provider', 'service_type', 'base_price', 'is_active', 'created_at']
    list_filter = ['service_type', 'price_type', 'is_active']
    search_fields = ['title', 'provider__user__first_name', 'provider__user__last_name']
    raw_id_fields = ['provider']
    prepopulated_fields = {'slug': ('title',)}


@admin.register(ServiceRequest)
class ServiceRequestAdmin(admin.ModelAdmin):
    list_display = ['title', 'client', 'provider_profile', 'status', 'created_at']
    list_filter = ['status']
    search_fields = ['title', 'client__first_name', 'client__last_name', 'client__email']
    raw_id_fields = ['client', 'listing', 'provider_profile']


@admin.register(ServiceQuote)
class ServiceQuoteAdmin(admin.ModelAdmin):
    list_display = ['id', 'request', 'price', 'turnaround_days', 'status', 'valid_until', 'created_at']
    list_filter = ['status']
    search_fields = ['request__title']
    raw_id_fields = ['request']


@admin.register(ServiceOrder)
class ServiceOrderAdmin(admin.ModelAdmin):
    list_display = ['id', 'client', 'provider', 'status', 'amount', 'platform_fee', 'deadline', 'created_at']
    list_filter = ['status']
    search_fields = ['client__first_name', 'client__last_name', 'client__email']
    raw_id_fields = ['request', 'quote', 'client', 'provider']


@admin.register(ProfessionalWallet)
class ProfessionalWalletAdmin(admin.ModelAdmin):
    list_display = ['professional', 'balance', 'total_earned', 'total_withdrawn', 'updated_at']
    search_fields = ['professional__user__first_name', 'professional__user__last_name']
    raw_id_fields = ['professional']


@admin.register(ProfessionalWalletTransaction)
class ProfessionalWalletTransactionAdmin(admin.ModelAdmin):
    list_display = ['id', 'wallet', 'transaction_type', 'amount', 'service_order', 'created_at']
    list_filter = ['transaction_type']
    raw_id_fields = ['wallet', 'service_order']


@admin.register(EditorialProject)
class EditorialProjectAdmin(admin.ModelAdmin):
    list_display = ['title', 'organization', 'status', 'manuscript', 'book', 'created_at']
    list_filter = ['status']
    search_fields = ['title', 'organization__name']
    raw_id_fields = ['manuscript', 'organization', 'book']


@admin.register(ProjectTask)
class ProjectTaskAdmin(admin.ModelAdmin):
    list_display = ['title', 'project', 'task_type', 'assigned_to', 'status', 'due_date', 'created_at']
    list_filter = ['task_type', 'status']
    search_fields = ['title', 'project__title']
    raw_id_fields = ['project', 'service_order', 'assigned_to']


@admin.register(PrintRequest)
class PrintRequestAdmin(admin.ModelAdmin):
    list_display = ['id', 'book', 'printer', 'requester', 'quantity', 'status', 'created_at']
    list_filter = ['status']
    search_fields = ['book__title', 'printer__name', 'requester__first_name', 'requester__last_name']
    raw_id_fields = ['book', 'project', 'requester', 'requester_org', 'printer']


class QuoteTemplateItemInline(admin.TabularInline):
    model = QuoteTemplateItem
    extra = 1

class QuoteTemplateLotInline(admin.TabularInline):
    model = QuoteTemplateLot
    extra = 1
    show_change_link = True

@admin.register(QuoteTemplate)
class QuoteTemplateAdmin(admin.ModelAdmin):
    list_display = ['name', 'organization', 'is_active', 'created_at']
    list_filter = ['is_active', 'organization']
    inlines = [QuoteTemplateLotInline]
    prepopulated_fields = {'slug': ('name',)}

@admin.register(QuoteTemplateLot)
class QuoteTemplateLotAdmin(admin.ModelAdmin):
    list_display = ['template', 'name', 'order']
    list_filter = ['template']
    inlines = [QuoteTemplateItemInline]

class QuoteItemInline(admin.TabularInline):
    model = QuoteItem
    extra = 0
    readonly_fields = ['total']

class QuoteLotInline(admin.TabularInline):
    model = QuoteLot
    extra = 0
    show_change_link = True
    readonly_fields = ['subtotal']

@admin.register(Quote)
class QuoteAdmin(admin.ModelAdmin):
    list_display = ['reference', 'title', 'status', 'client_display', 'total_ttc', 'created_at']
    list_filter = ['status', 'provider_organization']
    search_fields = ['reference', 'title', 'client_name', 'client_email']
    readonly_fields = ['reference', 'subtotal', 'discount_amount', 'subtotal_after_discount', 'tax_amount', 'total_ttc']
    inlines = [QuoteLotInline]

    def client_display(self, obj):
        if obj.client:
            return obj.client.get_full_name() or obj.client.username
        return obj.client_name or obj.client_email or '—'
    client_display.short_description = 'Client'

@admin.register(QuoteLot)
class QuoteLotAdmin(admin.ModelAdmin):
    list_display = ['quote', 'name', 'order', 'subtotal']
    inlines = [QuoteItemInline]
