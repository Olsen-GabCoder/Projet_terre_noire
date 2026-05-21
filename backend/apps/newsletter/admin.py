from django.contrib import admin
from .models import NewsletterSubscriber


@admin.register(NewsletterSubscriber)
class NewsletterSubscriberAdmin(admin.ModelAdmin):
    list_display = ['email', 'subscribed_at', 'confirmed', 'is_active']
    list_filter = ['is_active', 'confirmed']
    search_fields = ['email']
    readonly_fields = ['subscribed_at', 'confirmed_at', 'confirmation_token']
