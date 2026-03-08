"""
Commande pour afficher un résumé de la base de données.
Usage : python manage.py show_data
"""
from django.core.management.base import BaseCommand
from django.db.models import Count


class Command(BaseCommand):
    help = "Affiche un résumé de toutes les données du projet"

    def handle(self, *args, **options):
        from apps.books.models import Book, Author, Category
        from apps.users.models import User
        from apps.orders.models import Order, OrderItem
        from apps.manuscripts.models import Manuscript

        self.stdout.write("\n" + "=" * 50)
        self.stdout.write(self.style.SUCCESS("  RESUME DE LA BASE DE DONNEES"))
        self.stdout.write("=" * 50 + "\n")

        # Users
        users_count = User.objects.count()
        staff_count = User.objects.filter(is_staff=True).count()
        self.stdout.write(f"[Users] Utilisateurs : {users_count} (dont {staff_count} staff)")
        if users_count > 0:
            for u in User.objects.all()[:5]:
                role = " [STAFF]" if u.is_staff else ""
                self.stdout.write(f"   - {u.username} ({u.email}){role}")
            if users_count > 5:
                self.stdout.write(f"   ... et {users_count - 5} autres")

        # Categories
        self.stdout.write(f"\n[Categories] {Category.objects.count()} categorie(s)")
        for c in Category.objects.all():
            nb = Book.objects.filter(category=c).count()
            self.stdout.write(f"   - {c.name} : {nb} livres")

        # Authors
        self.stdout.write(f"\n[Auteurs] {Author.objects.count()} auteur(s)")
        for a in Author.objects.all()[:5]:
            nb = Book.objects.filter(author=a).count()
            self.stdout.write(f"   - {a.full_name} : {nb} livres")
        if Author.objects.count() > 5:
            self.stdout.write(f"   ... et {Author.objects.count() - 5} autres")

        # Books
        books_count = Book.objects.count()
        avail = Book.objects.filter(available=True).count()
        self.stdout.write(f"\n[Livres] {books_count} (dont {avail} disponibles)")
        for b in Book.objects.all()[:5]:
            self.stdout.write(f"   - {b.title} ({b.reference}) - {b.price} FCFA")
        if books_count > 5:
            self.stdout.write(f"   ... et {books_count - 5} autres")

        # Orders
        orders_count = Order.objects.count()
        self.stdout.write(f"\n[Commandes] {orders_count}")
        if orders_count > 0:
            for o in Order.objects.select_related("user").all()[:3]:
                self.stdout.write(f"   - #{o.id} - {o.user.username} - {o.total_amount} FCFA - {o.status}")

        # Manuscripts
        manus_count = Manuscript.objects.count()
        self.stdout.write(f"\n[Manuscrits] {manus_count}")
        if manus_count > 0:
            for m in Manuscript.objects.all()[:3]:
                self.stdout.write(f"   - {m.title} - {m.author_name} - {m.status}")

        self.stdout.write("\n" + "=" * 50 + "\n")
