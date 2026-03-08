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
        'status',
        'submitted_at',
    ]
    list_filter = ['status', 'genre', 'language', 'submitted_at']
    search_fields = ['title', 'author_name', 'email', 'pen_name']
    readonly_fields = ['submitted_at']
    list_editable = ['status']
    date_hierarchy = 'submitted_at'
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
        ('Administration', {
            'fields': ('terms_accepted', 'submitted_at'),
        }),
    )
