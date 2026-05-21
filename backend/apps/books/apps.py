
from django.apps import AppConfig


class BooksConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.books'
    verbose_name = 'Gestion des Livres'

    def ready(self):
        from apps.books import signals  # noqa: F401
        signals.connect_order_signals()

