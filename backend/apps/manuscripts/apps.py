from django.apps import AppConfig

class ManuscriptsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.manuscripts'

    def ready(self):
        import apps.manuscripts.signals  # noqa: F401
