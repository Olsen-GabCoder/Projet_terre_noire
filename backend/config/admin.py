"""
Personnalisation de l'admin Django — Charte Frollot.
"""
from django.conf import settings
from django.contrib import admin

admin.site.site_header = "Frollot — Administration"
admin.site.site_title = "Frollot Admin"
admin.site.index_title = "Tableau de bord"
admin.site.site_url = getattr(settings, 'FRONTEND_URL', '/')
