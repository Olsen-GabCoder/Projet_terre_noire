from django.contrib import admin
from .models import ContactMessage


@admin.register(ContactMessage)
class ContactMessageAdmin(admin.ModelAdmin):
    list_display = ['subject', 'name', 'email', 'created_at', 'is_read']
    list_filter = ['subject', 'is_read']
    search_fields = ['name', 'email', 'message']
    readonly_fields = ['created_at']
    list_editable = ['is_read']
