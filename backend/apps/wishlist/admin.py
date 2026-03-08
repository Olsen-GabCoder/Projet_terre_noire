from django.contrib import admin
from .models import WishlistItem


@admin.register(WishlistItem)
class WishlistItemAdmin(admin.ModelAdmin):
    list_display = ['user', 'book', 'added_at']
    list_filter = ['added_at']
    search_fields = ['user__email', 'book__title']
