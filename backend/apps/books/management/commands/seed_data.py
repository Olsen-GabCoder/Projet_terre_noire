"""
Commande de seed : injecte des données réalistes pour tester Frollot.
Usage : python manage.py seed_data
        python manage.py seed_data --reset  (supprime tout avant de recréer)
"""
import random
import uuid
from decimal import Decimal
from datetime import timedelta

from django.core.management.base import BaseCommand
from django.utils import timezone
from django.contrib.auth import get_user_model

User = get_user_model()


# ─── DONNÉES BRUTES ───────────────────────────────────────────────

CATEGORIES = [
    "Roman", "Nouvelle", "Poésie", "Essai", "Théâtre",
    "Littérature jeunesse", "Bande dessinée", "Histoire",
    "Philosophie", "Science-fiction", "Policier", "Biographie",
]

AUTHORS = [
    ("Chimamanda Ngozi Adichie", "Chimamanda Ngozi Adichie est une écrivaine nigériane, auteure de romans primés explorant l'identité, la migration et le féminisme."),
    ("Alain Mabanckou", "Alain Mabanckou est un écrivain franco-congolais, lauréat du prix Renaudot, connu pour son style vif et humoristique."),
    ("Léonora Miano", "Léonora Miano est une romancière franco-camerounaise dont l'œuvre explore l'histoire et l'identité afro-descendante."),
    ("Ngugi wa Thiong'o", "Ngugi wa Thiong'o est un écrivain kényan de renommée mondiale, défenseur des langues africaines en littérature."),
    ("Aminata Sow Fall", "Aminata Sow Fall est une pionnière de la littérature sénégalaise, première femme africaine à publier un roman en français."),
    ("Fatou Diome", "Fatou Diome est une écrivaine franco-sénégalaise dont les récits explorent l'immigration et le rêve européen."),
    ("Yasmina Khadra", "Yasmina Khadra est un écrivain algérien, ancien officier de l'armée, auteur de thrillers géopolitiques acclamés."),
    ("Scholastique Mukasonga", "Scholastique Mukasonga est une écrivaine rwandaise, rescapée du génocide, lauréate du prix Renaudot."),
    ("Mohamed Mbougar Sarr", "Mohamed Mbougar Sarr est un écrivain sénégalais, plus jeune lauréat du prix Goncourt en 2021."),
    ("Djaïli Amadou Amal", "Djaïli Amadou Amal est une écrivaine camerounaise, militante pour les droits des femmes au Sahel."),
    ("Henri Lopes", "Henri Lopes est un écrivain et diplomate congolais, figure majeure de la littérature francophone africaine."),
    ("Véronique Tadjo", "Véronique Tadjo est une écrivaine et artiste ivoirienne, auteure d'œuvres poétiques et romanesques primées."),
]

BOOKS = [
    # (titre, ref, description, prix, catégorie_idx, auteur_idx, format, bestseller, rating)
    ("Americanah", "978-2-07-046155-1", "Ifemelu quitte le Nigeria pour les États-Unis. Entre racisme, amour et nostalgie, elle trace un chemin entre deux mondes. Un roman puissant sur l'identité et l'appartenance.", 8500, 0, 0, "PAPIER", True, 4.7),
    ("L'Hibiscus pourpre", "978-2-07-042783-9", "Kambili grandit sous la tyrannie d'un père catholique violent. Sa découverte de la liberté chez sa tante bouleverse sa vision du monde.", 6500, 0, 0, "PAPIER", False, 4.5),
    ("Verre Cassé", "978-2-02-085856-8", "Au bar Le Crédit a voyagé, Verre Cassé note les histoires des habitués dans un cahier. Une fresque comique et tragique du Congo-Brazzaville.", 7200, 0, 1, "PAPIER", True, 4.6),
    ("Mémoires de porc-épic", "978-2-02-090483-8", "Un porc-épic raconte sa vie de double maléfique. Prix Renaudot 2006, une fable africaine entre humour noir et tradition orale.", 7800, 0, 1, "PAPIER", False, 4.3),
    ("Rouge Impératrice", "978-2-246-81387-4", "Dans une Afrique du futur unifiée, une histoire d'amour interraciale défie les conventions. Un roman visionnaire et sensuel.", 9200, 5, 2, "PAPIER", True, 4.4),
    ("Crépuscule du tourment", "978-2-246-86124-0", "Quatre femmes, un homme. Chacune prend la parole pour raconter sa blessure. Un roman choral sur les relations entre hommes et femmes en Afrique.", 8100, 0, 2, "PAPIER", False, 4.2),
    ("Décoloniser l'esprit", "978-2-7071-8469-7", "Essai fondateur sur la nécessité d'écrire en langues africaines. Un manifeste intellectuel qui a bouleversé la littérature postcoloniale.", 6800, 3, 3, "PAPIER", False, 4.8),
    ("La Grève des Bàttu", "978-2-7087-0460-2", "Quand les mendiants de Dakar disparaissent des rues, la société sénégalaise est contrainte de se regarder en face. Un classique.", 5500, 0, 4, "PAPIER", False, 4.1),
    ("Le Ventre de l'Atlantique", "978-2-7578-4012-3", "Entre Niodior et Strasbourg, Salie raconte le rêve d'Europe et le prix de l'exil. Un récit autobiographique poignant.", 7500, 0, 5, "PAPIER", True, 4.5),
    ("Les Hirondelles de Kaboul", "978-2-266-13282-0", "À Kaboul sous les Talibans, deux couples tentent de survivre. Un roman bouleversant sur l'amour et l'oppression.", 6900, 0, 6, "PAPIER", True, 4.6),
    ("Ce que le jour doit à la nuit", "978-2-266-19190-2", "Algérie, des années 30 à l'indépendance. Younes, élevé par un oncle pharmacien, vit un amour impossible avec une Française.", 8800, 0, 6, "PAPIER", False, 4.4),
    ("Notre-Dame du Nil", "978-2-07-013944-7", "Au Rwanda des années 70, dans un lycée de jeunes filles, les tensions ethniques couvent. Prix Renaudot 2012.", 7100, 0, 7, "PAPIER", False, 4.3),
    ("La plus secrète mémoire des hommes", "978-2-8098-4115-4", "Un jeune écrivain sénégalais enquête sur un roman maudit des années 30. Prix Goncourt 2021. Un chef-d'œuvre labyrinthique.", 9500, 0, 8, "PAPIER", True, 4.9),
    ("Terre ceinte", "978-2-8098-1587-2", "Dans une ville africaine assiégée par des islamistes, des destins se croisent. Premier roman magistral de Mbougar Sarr.", 7200, 0, 8, "PAPIER", False, 4.2),
    ("Les Impatientes", "978-2-07-289663-0", "Trois femmes peules racontent le mariage forcé, la polygamie et la violence. Prix Goncourt des lycéens 2020.", 6800, 0, 9, "PAPIER", True, 4.7),
    ("Munyal, les larmes de la patience", "978-2-36-890064-5", "Le combat silencieux des femmes du Sahel contre les traditions oppressives. Un cri de liberté.", 6200, 0, 9, "PAPIER", False, 4.1),
    ("Le Pleurer-Rire", "978-2-7087-0403-9", "Portrait satirique d'un dictateur africain et de sa cour. Un classique de la littérature congolaise.", 5800, 0, 10, "PAPIER", False, 4.0),
    ("Loin de mon père", "978-2-7427-9276-6", "Nina revient en Côte d'Ivoire pour l'enterrement de son père et découvre des secrets de famille.", 6500, 0, 11, "PAPIER", False, 4.2),
    # Ebooks
    ("Americanah (ebook)", "978-2-07-046155-1E", "Version numérique du roman acclamé de Chimamanda Ngozi Adichie.", 4500, 0, 0, "EBOOK", False, 4.7),
    ("La plus secrète mémoire des hommes (ebook)", "978-2-8098-4115-4E", "Version numérique du Prix Goncourt 2021 de Mohamed Mbougar Sarr.", 5500, 0, 8, "EBOOK", False, 4.9),
    # Jeunesse / BD / Poésie
    ("Petit Bodiel et autres contes de la savane", "978-2-234-06524-8", "Contes peuls traditionnels adaptés pour les jeunes lecteurs. Sagesse et aventure au cœur de l'Afrique.", 4200, 5, 4, "PAPIER", False, 4.0),
    ("Aya de Yopougon (Tome 1)", "978-2-07-057311-7", "La vie quotidienne à Abidjan dans les années 70. Humour, amour et insouciance. BD culte.", 9800, 6, 11, "PAPIER", True, 4.6),
    ("Poèmes de la mémoire fertile", "978-2-7427-1234-5", "Recueil poétique explorant la mémoire, l'exil et la terre natale. Vers libres d'une beauté saisissante.", 4800, 2, 11, "PAPIER", False, 4.3),
    ("Philosophie africaine : Mythes et réalités", "978-2-7071-4567-3", "Essai fondamental sur l'existence d'une philosophie proprement africaine. Débat et réflexion.", 7500, 8, 3, "PAPIER", False, 4.1),
]

USERS_DATA = [
    ("amina", "amina.bongo@gmail.com", "Amina", "Bongo", "+24107654321", "Quartier Louis, Rue 12", "Libreville", "Gabon"),
    ("jean_claude", "jc.moussavou@yahoo.fr", "Jean-Claude", "Moussavou", "+24106789012", "Avenue des Cocotiers 45", "Port-Gentil", "Gabon"),
    ("fatima", "fatima.ndong@outlook.com", "Fatima", "Ndong", "+24105432109", "Boulevard Triomphal 8", "Franceville", "Gabon"),
    ("paul_emile", "paul.ondo@gmail.com", "Paul-Émile", "Ondo Mba", "+24104321098", "Cité des Ailes, Bloc C", "Oyem", "Gabon"),
    ("marie", "marie.obame@gmail.com", "Marie-Claire", "Obame Nguema", "+24103210987", "Rue du Commerce 23", "Lambaréné", "Gabon"),
    ("ibrahim", "ibrahim.sow@hotmail.com", "Ibrahim", "Sow", "+22176543210", "Médina, Rue 15 x 22", "Dakar", "Sénégal"),
    ("chloe", "chloe.dupont@gmail.com", "Chloé", "Dupont", "+33612345678", "15 Rue Soufflot", "Paris", "France"),
    ("kwame", "kwame.asante@gmail.com", "Kwame", "Asante", "+23354321098", "Osu Oxford Street 88", "Accra", "Ghana"),
]

GABONESE_CITIES = ["Libreville", "Port-Gentil", "Franceville", "Oyem", "Lambaréné", "Mouila", "Tchibanga", "Makokou"]

COUPONS = [
    ("BIENVENUE10", 10, 0, True),
    ("FROLLOT20", 20, 0, True),
    ("LECTURE500", 0, 500, True),
    ("NOEL2025", 15, 0, False),
    ("RENTREE", 0, 1000, True),
]

NEWSLETTER_EMAILS = [
    "lecteur1@gmail.com", "biblio_fan@yahoo.fr", "roman_addict@outlook.com",
    "poesie_lover@gmail.com", "afrolit@hotmail.com", "bookworm_gab@gmail.com",
    "culture_libre@yahoo.fr", "lire_cest_vivre@gmail.com",
]


class Command(BaseCommand):
    help = "Injecte des données réalistes pour tester Frollot"

    def add_arguments(self, parser):
        parser.add_argument('--reset', action='store_true', help='Supprime les données existantes avant insertion')

    def handle(self, *args, **options):
        from apps.books.models import Category, Author, Book, BookReview
        from apps.orders.models import Order, OrderItem, Payment
        from apps.manuscripts.models import Manuscript
        from apps.newsletter.models import NewsletterSubscriber
        from apps.wishlist.models import WishlistItem
        from apps.coupons.models import Coupon
        from apps.users.models import UserProfile

        if options['reset']:
            self.stdout.write("Suppression des données existantes...")
            BookReview.objects.all().delete()
            OrderItem.objects.all().delete()
            Payment.objects.all().delete()
            Order.objects.all().delete()
            WishlistItem.objects.all().delete()
            Manuscript.objects.all().delete()
            Coupon.objects.all().delete()
            NewsletterSubscriber.objects.all().delete()
            Book.objects.all().delete()
            Author.objects.all().delete()
            Category.objects.all().delete()
            UserProfile.objects.filter(user__is_superuser=False).delete()
            User.objects.filter(is_superuser=False).delete()
            self.stdout.write(self.style.SUCCESS("Données supprimées."))

        # ── Catégories ──
        self.stdout.write("Création des catégories...")
        cats = []
        for name in CATEGORIES:
            cat, _ = Category.objects.get_or_create(name=name)
            cats.append(cat)

        # ── Auteurs ──
        self.stdout.write("Création des auteurs...")
        authors = []
        for full_name, bio in AUTHORS:
            author, _ = Author.objects.get_or_create(full_name=full_name, defaults={'biography': bio})
            authors.append(author)

        # ── Livres ──
        self.stdout.write("Création des livres...")
        books = []
        for title, ref, desc, price, cat_idx, auth_idx, fmt, best, rating in BOOKS:
            book, created = Book.objects.get_or_create(
                reference=ref,
                defaults={
                    'title': title,
                    'description': desc,
                    'price': Decimal(str(price)),
                    'format': fmt,
                    'category': cats[cat_idx],
                    'author': authors[auth_idx],
                    'is_bestseller': best,
                    'rating': Decimal(str(rating)),
                    'rating_count': random.randint(5, 120),
                    'available': True,
                    'original_price': Decimal(str(int(price * 1.2))) if random.random() > 0.6 else None,
                },
            )
            books.append(book)

        # ── Utilisateurs ──
        self.stdout.write("Création des utilisateurs...")
        users = []
        for uname, email, first, last, phone, addr, city, country in USERS_DATA:
            user, created = User.objects.get_or_create(
                email=email,
                defaults={
                    'username': uname,
                    'first_name': first,
                    'last_name': last,
                    'phone_number': phone,
                    'address': addr,
                    'city': city,
                    'country': country,
                    'receive_newsletter': random.choice([True, False]),
                    'is_active': True,
                },
            )
            if created:
                user.set_password('Frollot2026!')
                user.save()
                # Profil LECTEUR par défaut
                UserProfile.objects.get_or_create(user=user, profile_type='LECTEUR')
                # Certains ont des rôles supplémentaires
                if random.random() > 0.6:
                    extra = random.choice(['AUTEUR', 'CORRECTEUR', 'TRADUCTEUR'])
                    UserProfile.objects.get_or_create(user=user, profile_type=extra)
            users.append(user)

        # ── Commandes ──
        self.stdout.write("Création des commandes...")
        statuses = ['PENDING', 'PAID', 'SHIPPED', 'DELIVERED', 'CANCELLED']
        providers = ['MOBICASH', 'AIRTEL', 'CASH', 'VISA']
        now = timezone.now()

        for user in users:
            num_orders = random.randint(1, 5)
            for _ in range(num_orders):
                num_items = random.randint(1, 4)
                order_books = random.sample(books, min(num_items, len(books)))
                subtotal = Decimal('0')
                items_data = []
                for b in order_books:
                    qty = random.randint(1, 3)
                    items_data.append((b, qty, b.price))
                    subtotal += b.price * qty

                shipping = Decimal(str(random.choice([1500, 2000, 2500, 3000])))
                discount = Decimal('0')
                coupon = ''
                if random.random() > 0.7:
                    discount = Decimal(str(random.randint(500, 2000)))
                    coupon = random.choice(['BIENVENUE10', 'FROLLOT20', 'LECTURE500'])

                total = max(subtotal + shipping - discount, Decimal('0'))
                status = random.choice(statuses)
                days_ago = random.randint(1, 180)

                order = Order.objects.create(
                    user=user,
                    status=status,
                    subtotal=subtotal,
                    shipping_cost=shipping,
                    discount_amount=discount,
                    coupon_code=coupon or '',
                    total_amount=total,
                    shipping_address=user.address or 'Adresse non renseignée',
                    shipping_phone=user.phone_number or '+24100000000',
                    shipping_city=user.city or random.choice(GABONESE_CITIES),
                    created_at=now - timedelta(days=days_ago),
                )
                # Fix created_at (auto_now_add)
                Order.objects.filter(pk=order.pk).update(created_at=now - timedelta(days=days_ago))

                for b, qty, price in items_data:
                    OrderItem.objects.create(order=order, book=b, quantity=qty, price=price)

                # Paiement pour les commandes non-pending
                if status != 'PENDING':
                    Payment.objects.create(
                        order=order,
                        transaction_id=f"TXN-{uuid.uuid4().hex[:12].upper()}",
                        provider=random.choice(providers),
                        status='SUCCESS' if status != 'CANCELLED' else 'FAILED',
                        amount=total,
                    )

        # ── Avis ──
        self.stdout.write("Création des avis...")
        comments_pos = [
            "Un chef-d'œuvre absolu. La prose est magnifique et l'histoire captivante du début à la fin.",
            "Je l'ai lu d'une traite. Impossible de le poser une fois commencé !",
            "Une écriture puissante qui vous transporte. Je recommande vivement.",
            "Très beau roman, profond et touchant. Un incontournable de la littérature africaine.",
            "Superbe découverte ! L'auteur a un talent rare pour raconter des histoires universelles.",
            "Magnifique. Chaque page est un bijou. J'ai été émue aux larmes.",
            "Un livre qui fait réfléchir. Je le relirai certainement.",
            "Excellent ! La qualité de l'édition Frollot est remarquable en plus.",
        ]
        comments_neg = [
            "Le début est prometteur mais j'ai trouvé la fin décevante.",
            "Pas mal mais un peu long à certains passages. Style intéressant cependant.",
            "Je m'attendais à mieux vu les critiques. Correct sans plus.",
        ]

        for user in users:
            reviewed = random.sample(books, min(random.randint(2, 6), len(books)))
            for book in reviewed:
                rating = random.choices([3, 4, 5], weights=[15, 35, 50])[0]
                comment = random.choice(comments_pos if rating >= 4 else comments_neg)
                BookReview.objects.get_or_create(
                    user=user, book=book, parent=None,
                    defaults={'rating': rating, 'comment': comment},
                )

        # ── Wishlist ──
        self.stdout.write("Création des wishlists...")
        for user in users:
            wished = random.sample(books, random.randint(2, 8))
            for book in wished:
                WishlistItem.objects.get_or_create(user=user, book=book)

        # ── Manuscrits ──
        self.stdout.write("Création des manuscrits...")
        manuscripts_data = [
            ("Les Ombres de Lambaréné", "Amina Bongo", "ROMAN", "FR", 280, "Un roman qui explore les secrets d'une famille gabonaise sur trois générations, entre tradition et modernité."),
            ("Cris du fleuve Ogooué", "Jean-Claude Moussavou", "POESIE", "FR", 85, "Recueil de poèmes sur la beauté sauvage du Gabon et la mélancolie de l'exil intérieur."),
            ("Le Dernier Griot de Médina", "Ibrahim Sow", "ROMAN", "FR", 320, "Quand le dernier griot d'un quartier de Dakar meurt, son petit-fils part à la recherche des histoires perdues."),
            ("Mwana : Enfants de la forêt", "Fatima Ndong", "JEUNESSE", "FR", 120, "Conte illustré pour enfants sur une petite fille qui découvre les secrets de la forêt équatoriale."),
            ("Franceville, ville fantôme", "Paul-Émile Ondo Mba", "NOUVELLE", "FR", 150, "Nouvelles sur la vie quotidienne dans une ville de province gabonaise, entre espoir et désillusion."),
        ]
        ms_statuses = ['PENDING', 'REVIEWING', 'ACCEPTED', 'REJECTED']
        for title, author_name, genre, lang, pages, desc in manuscripts_data:
            Manuscript.objects.get_or_create(
                title=title,
                defaults={
                    'submitter': random.choice(users),
                    'author_name': author_name,
                    'email': f"{author_name.split()[0].lower()}@email.com",
                    'phone_number': f"+241{''.join([str(random.randint(0,9)) for _ in range(8)])}",
                    'country': 'Gabon',
                    'genre': genre,
                    'language': lang,
                    'page_count': pages,
                    'file': 'manuscripts/placeholder.pdf',
                    'description': desc,
                    'terms_accepted': True,
                    'status': random.choice(ms_statuses),
                },
            )

        # ── Coupons ──
        self.stdout.write("Création des coupons...")
        for code, pct, amt, active in COUPONS:
            Coupon.objects.get_or_create(
                code=code,
                defaults={
                    'discount_percent': Decimal(str(pct)) if pct else None,
                    'discount_amount': Decimal(str(amt)),
                    'is_active': active,
                    'valid_from': now - timedelta(days=30),
                    'valid_until': now + timedelta(days=180) if active else now - timedelta(days=10),
                    'max_uses': random.randint(50, 500),
                    'usage_count': random.randint(0, 30),
                },
            )

        # ── Newsletter ──
        self.stdout.write("Création des abonnés newsletter...")
        for email in NEWSLETTER_EMAILS:
            NewsletterSubscriber.objects.get_or_create(email=email)
        # Ajouter les utilisateurs abonnés
        for user in users:
            if user.receive_newsletter:
                NewsletterSubscriber.objects.get_or_create(email=user.email)

        # ── Résumé ──
        self.stdout.write("")
        self.stdout.write(self.style.SUCCESS("=" * 50))
        self.stdout.write(self.style.SUCCESS("  SEED TERMINÉ AVEC SUCCÈS"))
        self.stdout.write(self.style.SUCCESS("=" * 50))
        self.stdout.write(f"  Catégories    : {Category.objects.count()}")
        self.stdout.write(f"  Auteurs       : {Author.objects.count()}")
        self.stdout.write(f"  Livres        : {Book.objects.count()}")
        self.stdout.write(f"  Utilisateurs  : {User.objects.count()}")
        self.stdout.write(f"  Commandes     : {Order.objects.count()}")
        self.stdout.write(f"  Paiements     : {Payment.objects.count()}")
        self.stdout.write(f"  Avis          : {BookReview.objects.count()}")
        self.stdout.write(f"  Wishlists     : {WishlistItem.objects.count()}")
        self.stdout.write(f"  Manuscrits    : {Manuscript.objects.count()}")
        self.stdout.write(f"  Coupons       : {Coupon.objects.count()}")
        self.stdout.write(f"  Newsletter    : {NewsletterSubscriber.objects.count()}")
        self.stdout.write("")
        self.stdout.write(f"  Mot de passe de tous les utilisateurs test : Frollot2026!")
        self.stdout.write(self.style.SUCCESS("=" * 50))
