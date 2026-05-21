"""
Management command : recalcule popularity_score et trending_score pour tous les livres.
Usage : python manage.py update_scores
Peut etre lance en cron quotidien ou apres un import de donnees.
"""

from django.core.management.base import BaseCommand
from apps.books.scoring import compute_popularity_scores, compute_trending_scores


class Command(BaseCommand):
    help = "Recalcule les scores de popularite et de tendance pour tous les livres."

    def handle(self, *args, **options):
        self.stdout.write("Calcul des scores de popularite...")
        pop = compute_popularity_scores()
        self.stdout.write(self.style.SUCCESS(f"  {pop} livres mis a jour (popularite)"))

        self.stdout.write("Calcul des scores de tendance...")
        trend = compute_trending_scores()
        self.stdout.write(self.style.SUCCESS(f"  {trend} livres mis a jour (tendance)"))

        self.stdout.write(self.style.SUCCESS("Scores recalcules avec succes."))
