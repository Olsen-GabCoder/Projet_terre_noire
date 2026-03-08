
from django.apps import AppConfig


class BooksConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.books'
    verbose_name = 'Gestion des Livres'

    def ready(self):
        import apps.books.signals  # noqa: F401

