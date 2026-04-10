from django.contrib import admin
from .models import (
    LibraryCatalogItem, LibraryMembership, BookLoan,
    LoanExtension, BookReservation,
)


@admin.register(LibraryCatalogItem)
class LibraryCatalogItemAdmin(admin.ModelAdmin):
    list_display = ['book', 'library', 'total_copies', 'available_copies', 'allows_digital_loan', 'is_active', 'created_at']
    list_filter = ['is_active', 'allows_digital_loan', 'library']
    search_fields = ['book__title', 'library__name']
    raw_id_fields = ['book', 'library']


@admin.register(LibraryMembership)
class LibraryMembershipAdmin(admin.ModelAdmin):
    list_display = ['membership_number', 'user', 'library', 'membership_type', 'is_active', 'expires_at', 'joined_at']
    list_filter = ['membership_type', 'is_active', 'library']
    search_fields = ['membership_number', 'user__email', 'user__first_name', 'user__last_name', 'library__name']
    raw_id_fields = ['user', 'library']


@admin.register(BookLoan)
class BookLoanAdmin(admin.ModelAdmin):
    list_display = ['id', 'catalog_item', 'borrower', 'loan_type', 'status', 'borrowed_at', 'due_date', 'returned_at']
    list_filter = ['loan_type', 'status']
    search_fields = ['catalog_item__book__title', 'borrower__email', 'borrower__first_name', 'borrower__last_name']
    raw_id_fields = ['catalog_item', 'borrower']


@admin.register(LoanExtension)
class LoanExtensionAdmin(admin.ModelAdmin):
    list_display = ['id', 'loan', 'extended_days', 'approved', 'requested_at', 'approved_at']
    list_filter = ['approved']
    search_fields = ['loan__catalog_item__book__title', 'loan__borrower__email']
    raw_id_fields = ['loan']


@admin.register(BookReservation)
class BookReservationAdmin(admin.ModelAdmin):
    list_display = ['id', 'catalog_item', 'user', 'status', 'created_at', 'notified_at', 'expires_at']
    list_filter = ['status']
    search_fields = ['catalog_item__book__title', 'user__email', 'user__first_name', 'user__last_name']
    raw_id_fields = ['catalog_item', 'user']
