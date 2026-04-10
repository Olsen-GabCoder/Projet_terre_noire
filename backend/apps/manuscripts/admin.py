from django.contrib import admin
from .models import Manuscript


@admin.register(Manuscript)
class ManuscriptAdmin(admin.ModelAdmin):
    list_display = [
        'title',
        'author_name',
        'email',
        'genre',
        'language',
        'target_organization',
        'is_open_market',
        'status',
        'submitted_at',
    ]
    list_filter = ['status', 'genre', 'language', 'is_open_market', 'submitted_at']
    search_fields = ['title', 'author_name', 'email', 'pen_name']
    readonly_fields = ['submitted_at', 'reviewed_at', 'reviewed_by']
    list_editable = ['status']
    date_hierarchy = 'submitted_at'
    raw_id_fields = ['submitter', 'target_organization', 'reviewed_by']
    fieldsets = (
        (None, {
            'fields': ('title', 'author_name', 'pen_name', 'status'),
        }),
        ('Contact', {
            'fields': ('email', 'phone_number', 'country'),
        }),
        ('Manuscrit', {
            'fields': ('genre', 'language', 'page_count', 'file', 'description'),
        }),
        ('Frollot Connect', {
            'fields': ('submitter', 'target_organization', 'is_open_market'),
        }),
        ('Examen', {
            'fields': ('reviewed_by', 'reviewed_at', 'rejection_reason'),
        }),
        ('Administration', {
            'fields': ('terms_accepted', 'submitted_at'),
        }),
    )
