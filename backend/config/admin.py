"""
Personnalisation de l'admin Django — Charte Terre Noire Éditions.
"""
from django.conf import settings
from django.contrib import admin

admin.site.site_header = "Terre Noire Éditions — Administration"
admin.site.site_title = "Terre Noire Admin"
admin.site.index_title = "Tableau de bord"
admin.site.site_url = getattr(settings, 'FRONTEND_URL', '/')
