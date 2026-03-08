"""
Teste l'envoi d'email via SMTP.
Usage : python manage.py test_email votre@email.com
"""
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = "Envoie un email de test pour vérifier la config SMTP"

    def add_arguments(self, parser):
        parser.add_argument('email', type=str, help='Adresse email de destination')

    def handle(self, *args, **options):
        from django.conf import settings
        from django.core.mail import send_mail

        to = options['email']
        self.stdout.write(f"Envoi d'un email de test vers {to}...")

        try:
            send_mail(
                subject="Test SMTP — Terre Noire Éditions",
                message="Ceci est un email de test. Si vous le recevez, la configuration SMTP fonctionne.",
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[to],
                fail_silently=False,
            )
            self.stdout.write(self.style.SUCCESS("Email envoyé avec succès. Vérifiez votre boîte (et les spams)."))
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"Erreur : {e}"))
