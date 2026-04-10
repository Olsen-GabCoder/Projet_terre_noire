"""
Seed : rattache les livres existants et en crée de nouveaux pour chaque organisation.
Usage : python manage.py seed_organizations
"""
import random
from decimal import Decimal

from django.core.management.base import BaseCommand
from django.utils.text import slugify

from apps.books.models import Book, Category, Author
from apps.organizations.models import Organization
from apps.marketplace.models import BookListing
from apps.library.models import LibraryCatalogItem


# ─── Nouveaux livres par maison d'édition ────────────────────────────

NDZE_BOOKS = [
    {
        'title': "Les Enfants du fleuve",
        'author': "Léonora Miano",
        'category': "Roman",
        'description': "Dans le delta du Wouri, deux familles que tout oppose voient leurs destins se croiser au fil de l'eau. Un roman fluvial sur l'héritage et la réconciliation.",
        'price': 7200,
        'format': 'PAPIER',
        'rating': 4.3,
    },
    {
        'title': "Théâtre des ombres",
        'author': "Henri Lopes",
        'category': "Théâtre",
        'description': "Trois pièces courtes explorant les masques sociaux dans l'Afrique urbaine contemporaine. Entre comédie et drame, Lopes interroge nos doubles vies.",
        'price': 5500,
        'format': 'PAPIER',
        'rating': 4.0,
    },
    {
        'title': "Kirikou et les ombres de Douala",
        'author_new': ("Gaston Essomba", "Auteur camerounais de littérature jeunesse, Gaston Essomba marie contes traditionnels et aventures urbaines modernes."),
        'category': "Littérature jeunesse",
        'description': "Kirikou découvre Douala et ses mystères. Un conte illustré qui mêle tradition bassa et modernité pour les 6-12 ans.",
        'price': 3800,
        'format': 'PAPIER',
        'rating': 4.6,
    },
    {
        'title': "Makala : chroniques dessinées du Cameroun",
        'author_new': ("Elyon's", "Bédéiste camerounais reconnu, Elyon's est l'un des pionniers de la BD africaine contemporaine."),
        'category': "Bande dessinée",
        'description': "Recueil de strips humoristiques et satiriques sur le quotidien camerounais. Regards tendres et acérés sur une société en mutation.",
        'price': 9500,
        'format': 'PAPIER',
        'rating': 4.4,
    },
    {
        'title': "L'Aube sur le Mont Fako",
        'author_new': ("Calixthe Beyala", "Romancière franco-camerounaise, prix Grand prix du roman de l'Académie française. Son œuvre explore la condition des femmes africaines."),
        'category': "Roman",
        'description': "Une jeune femme quitte Douala pour le Mont Cameroun à la recherche de sa grand-mère guérisseuse. Roman initiatique entre deux mondes.",
        'price': 6800,
        'format': 'PAPIER',
        'rating': 4.5,
    },
    {
        'title': "Contes du pays bamiléké",
        'author_new': ("Gaston Essomba", None),  # reuse
        'category': "Littérature jeunesse",
        'description': "Dix contes traditionnels de l'Ouest-Cameroun, réécrits pour les enfants d'aujourd'hui. Sagesse ancestrale et humour.",
        'price': 3200,
        'format': 'PAPIER',
        'rating': 4.2,
    },
]

RAPPONDA_BOOKS = [
    {
        'title': "Le Dernier Orateur de Lambaréné",
        'author_new': ("Jean-Divassa Nyama", "Écrivain gabonais, Jean-Divassa Nyama est une figure majeure de la littérature gabonaise, auteur de romans et pièces de théâtre."),
        'category': "Roman",
        'description': "Le vieux Moussavou est le dernier à connaître les mythes fondateurs de son clan. Un roman sur la transmission face à l'oubli.",
        'price': 6500,
        'format': 'PAPIER',
        'rating': 4.1,
    },
    {
        'title': "Paroles de nuit à Port-Gentil",
        'author_new': ("Bessora", "Écrivaine franco-gabonaise, Bessora mêle autobiographie et fiction dans une œuvre qui interroge l'identité métisse."),
        'category': "Poésie",
        'description': "Recueil de poèmes nocturnes écrits entre le Cap Lopez et l'île Mandji. Mer, pétrole et mélancolie.",
        'price': 4500,
        'format': 'PAPIER',
        'rating': 4.3,
    },
    {
        'title': "Agonies",
        'author_new': ("Jean-Divassa Nyama", None),  # reuse
        'category': "Théâtre",
        'description': "Pièce en trois actes sur les tiraillements d'un intellectuel gabonais entre modernité et tradition. Primée au Concours théâtral interafricain.",
        'price': 4800,
        'format': 'PAPIER',
        'rating': 3.9,
    },
    {
        'title': "L'Enfant des masques",
        'author_new': ("Sylvie Ntsame", "Romancière gabonaise, Sylvie Ntsame explore les thèmes de l'enfance et de la spiritualité fang dans une prose poétique."),
        'category': "Roman",
        'description': "Mvet, 10 ans, est choisi pour porter le masque sacré lors du Bwiti. Mais le monde moderne gronde aux portes du village.",
        'price': 5800,
        'format': 'PAPIER',
        'rating': 4.4,
    },
    {
        'title': "Nouvelles de l'Ogooué",
        'author_new': ("Bessora", None),  # reuse
        'category': "Nouvelle",
        'description': "Sept nouvelles ancrées le long du fleuve Ogooué. Pêcheurs, orpailleurs et rêveurs y croisent leurs destins.",
        'price': 5200,
        'format': 'PAPIER',
        'rating': 4.0,
    },
    {
        'title': "Histoire du Gabon : des origines à l'indépendance",
        'author_new': ("André Raponda-Walker", "Abbé Raponda-Walker, ethnologue et linguiste gabonais, est l'auteur d'ouvrages fondamentaux sur l'histoire et les langues du Gabon."),
        'category': "Histoire",
        'description': "Réédition du classique de l'abbé Raponda-Walker. Ouvrage de référence sur l'histoire précoloniale et coloniale du Gabon.",
        'price': 12000,
        'format': 'PAPIER',
        'rating': 4.7,
        'is_bestseller': True,
    },
]


class Command(BaseCommand):
    help = "Rattache les livres existants aux organisations et en crée de nouveaux"

    def handle(self, *args, **options):
        frollot = Organization.objects.get(id=7)
        ndze = Organization.objects.get(id=8)
        rapponda = Organization.objects.get(id=9)
        phenix = Organization.objects.get(id=10)
        bng = Organization.objects.get(id=11)

        # ─── 1. Rattacher les 30 livres existants à Éditions Frollot ───
        updated = Book.objects.filter(
            publisher_organization__isnull=True,
        ).update(publisher_organization=frollot)
        self.stdout.write(self.style.SUCCESS(
            f"[1/5] {updated} livres rattachés à {frollot.name}"
        ))

        # ─── 2. Créer les livres Ndzé Éditions ───
        created_ndze = self._create_books(NDZE_BOOKS, ndze)
        self.stdout.write(self.style.SUCCESS(
            f"[2/5] {created_ndze} livres créés pour {ndze.name}"
        ))

        # ─── 3. Créer les livres Éditions Rapponda-Walker ───
        created_rapponda = self._create_books(RAPPONDA_BOOKS, rapponda)
        self.stdout.write(self.style.SUCCESS(
            f"[3/5] {created_rapponda} livres créés pour {rapponda.name}"
        ))

        # ─── 4. Créer BookListings pour Librairie Le Phénix ───
        listings_created = self._create_listings(phenix)
        self.stdout.write(self.style.SUCCESS(
            f"[4/5] {listings_created} BookListings créés pour {phenix.name}"
        ))

        # ─── 5. Créer LibraryCatalogItems pour la Bibliothèque Nationale ───
        catalog_created = self._create_catalog_items(bng)
        self.stdout.write(self.style.SUCCESS(
            f"[5/5] {catalog_created} LibraryCatalogItems créés pour {bng.name}"
        ))

        # Résumé
        total_books = Book.objects.count()
        total_listings = BookListing.objects.count()
        total_catalog = LibraryCatalogItem.objects.count()
        self.stdout.write(self.style.SUCCESS(
            f"\nRésumé : {total_books} livres | {total_listings} listings | {total_catalog} items bibliothèque"
        ))

    def _get_or_create_author(self, name, bio=None):
        author, created = Author.objects.get_or_create(
            full_name=name,
            defaults={
                'slug': slugify(name),
                'biography': bio or '',
            },
        )
        return author

    def _get_category(self, name):
        try:
            return Category.objects.get(name=name)
        except Category.DoesNotExist:
            return Category.objects.create(name=name, slug=slugify(name))

    def _create_books(self, books_data, org):
        created = 0
        for b in books_data:
            if Book.objects.filter(title=b['title']).exists():
                continue

            # Author
            if 'author_new' in b:
                author_name, author_bio = b['author_new']
                author = self._get_or_create_author(author_name, author_bio)
            else:
                author = Author.objects.get(full_name=b['author'])

            category = self._get_category(b['category'])

            ref = f"ISBN-{org.id}-{slugify(b['title'])[:20]}-{random.randint(1000,9999)}"

            Book.objects.create(
                title=b['title'],
                slug=slugify(b['title']),
                reference=ref,
                description=b['description'],
                price=Decimal(str(b['price'])),
                format=b.get('format', 'PAPIER'),
                available=True,
                category=category,
                author=author,
                rating=Decimal(str(b.get('rating', 0))),
                is_bestseller=b.get('is_bestseller', False),
                publisher_organization=org,
            )
            created += 1
        return created

    def _create_listings(self, librairie):
        """Crée des BookListings pour la librairie — elle vend une sélection de livres."""
        # Prendre des livres de chaque éditeur
        books = list(Book.objects.filter(available=True).order_by('?')[:20])
        created = 0

        conditions = ['NEW', 'NEW', 'NEW', 'USED_GOOD', 'USED_FAIR']

        for book in books:
            if BookListing.objects.filter(book=book, vendor=librairie).exists():
                continue

            condition = random.choice(conditions)
            base_price = float(book.price)

            if condition == 'NEW':
                price = base_price * random.uniform(0.95, 1.10)
                original_price = base_price * 1.15 if random.random() > 0.6 else None
            elif condition == 'USED_GOOD':
                price = base_price * random.uniform(0.55, 0.75)
                original_price = base_price
            else:
                price = base_price * random.uniform(0.35, 0.55)
                original_price = base_price

            BookListing.objects.create(
                book=book,
                vendor=librairie,
                price=Decimal(str(round(price / 100) * 100)),  # arrondi centaines
                original_price=Decimal(str(round(original_price / 100) * 100)) if original_price else None,
                stock=random.randint(1, 15),
                condition=condition,
                is_active=True,
            )
            created += 1
        return created

    def _create_catalog_items(self, bibliotheque):
        """Crée des LibraryCatalogItems pour la bibliothèque — elle possède une sélection."""
        books = list(Book.objects.filter(available=True).order_by('?')[:15])
        created = 0

        for book in books:
            if LibraryCatalogItem.objects.filter(book=book, library=bibliotheque).exists():
                continue

            total = random.randint(1, 5)
            available = random.randint(0, total)

            LibraryCatalogItem.objects.create(
                library=bibliotheque,
                book=book,
                total_copies=total,
                available_copies=available,
                allows_digital_loan=book.format == 'EBOOK' or random.random() > 0.7,
                max_loan_days=random.choice([14, 21, 30]),
                is_active=True,
            )
            created += 1
        return created
