"""
Genere couvertures avant + arriere pour les livres, et portraits des auteurs.
Usage : python manage.py generate_covers
        python manage.py generate_covers --all
"""
import os
import textwrap
import random

from django.core.management.base import BaseCommand
from django.conf import settings
from PIL import Image, ImageDraw, ImageFont


PALETTES = [
    ("#1a1a2e", "#16213e", "#e94560", "#ffffff"),
    ("#0f3460", "#16213e", "#e94560", "#ffffff"),
    ("#2d132c", "#801336", "#ee4540", "#ffffff"),
    ("#1b262c", "#0f4c75", "#3282b8", "#ffffff"),
    ("#0b0c10", "#1f2833", "#66fcf1", "#ffffff"),
    ("#212121", "#323232", "#fca311", "#ffffff"),
    ("#2b2d42", "#3d405b", "#ef233c", "#ffffff"),
    ("#264653", "#2a9d8f", "#e9c46a", "#ffffff"),
    ("#003049", "#d62828", "#fcbf49", "#ffffff"),
    ("#10002b", "#3c096c", "#9d4edd", "#ffffff"),
    ("#1b2838", "#171a21", "#66c0f4", "#ffffff"),
    ("#1d3557", "#457b9d", "#e63946", "#ffffff"),
    ("#2d00f7", "#6a00f4", "#e500a4", "#ffffff"),
    ("#1a1a40", "#270082", "#7a2048", "#ffffff"),
    ("#0d1b2a", "#1b263b", "#415a77", "#e0e1dd"),
    ("#3d0066", "#240046", "#c77dff", "#ffffff"),
    ("#14213d", "#14213d", "#fca311", "#ffffff"),
    ("#1b1b1e", "#44344f", "#e0aaff", "#ffffff"),
    ("#0a1128", "#001f54", "#034078", "#fefcfb"),
    ("#011627", "#011627", "#2ec4b6", "#fdfffc"),
    ("#1c1c1c", "#383838", "#ff6f61", "#ffffff"),
    ("#041c32", "#04293a", "#ecb365", "#ffffff"),
    ("#190019", "#2b124c", "#dba39a", "#ffffff"),
    ("#0d1321", "#1d2d44", "#3e5c76", "#f0ebd8"),
]


def hex_to_rgb(h):
    h = h.lstrip('#')
    return tuple(int(h[i:i+2], 16) for i in (0, 2, 4))


def draw_gradient(draw, width, height, c1, c2):
    r1, g1, b1 = hex_to_rgb(c1)
    r2, g2, b2 = hex_to_rgb(c2)
    for y in range(height):
        t = y / height
        draw.line([(0, y), (width, y)], fill=(
            int(r1 + (r2 - r1) * t),
            int(g1 + (g2 - g1) * t),
            int(b1 + (b2 - b1) * t),
        ))


def get_font(size, bold=False):
    paths = [
        ("C:/Windows/Fonts/segoeuib.ttf" if bold else "C:/Windows/Fonts/segoeui.ttf"),
        ("C:/Windows/Fonts/arialbd.ttf" if bold else "C:/Windows/Fonts/arial.ttf"),
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf" if bold else "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
    ]
    for fp in paths:
        if os.path.exists(fp):
            try:
                return ImageFont.truetype(fp, size)
            except Exception:
                continue
    return ImageFont.load_default()


def add_decorations(img, accent_rgb):
    overlay = Image.new('RGBA', img.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(overlay)
    W, H = img.size
    d.ellipse([W - 250, -100, W + 100, 250], fill=accent_rgb + (25,))
    d.ellipse([-80, H - 300, 220, H + 20], fill=accent_rgb + (20,))
    for i in range(3):
        d.line([(0, 350 + i * 8), (W, 250 + i * 8)], fill=accent_rgb + (12 + i * 5,), width=2)
    return Image.alpha_composite(img.convert('RGBA'), overlay).convert('RGB')


def text_center(draw, y, text, font, fill, width):
    bbox = draw.textbbox((0, 0), text, font=font)
    tw = bbox[2] - bbox[0]
    draw.text(((width - tw) // 2, y), text, font=font, fill=fill)
    return bbox[3] - bbox[1]


# ═══════════════════════════════════════════════
#  COUVERTURE AVANT
# ═══════════════════════════════════════════════

def generate_front_cover(title, author_name, category_name, idx, path):
    W, H = 600, 900
    p = PALETTES[idx % len(PALETTES)]
    bg_top, bg_bottom, accent, txt = p
    accent_rgb = hex_to_rgb(accent)

    img = Image.new('RGB', (W, H))
    draw = ImageDraw.Draw(img)
    draw_gradient(draw, W, H, bg_top, bg_bottom)
    img = add_decorations(img, accent_rgb)
    draw = ImageDraw.Draw(img)

    # Barre haut
    draw.rectangle([(0, 0), (W, 6)], fill=accent)

    # Categorie pill
    font_cat = get_font(16)
    cat = (category_name or "LITTERATURE").upper()
    bbox = draw.textbbox((0, 0), cat, font=font_cat)
    tw = bbox[2] - bbox[0]
    px = (W - tw) // 2 - 16
    draw.rounded_rectangle([px, 46, px + tw + 32, 74], radius=12, fill=accent)
    draw.text(((W - tw) // 2, 50), cat, font=font_cat, fill=txt)

    # Separateur
    draw.line([(W // 2 - 30, 100), (W // 2 + 30, 100)], fill=accent, width=3)

    # Titre
    font_title = get_font(40, bold=True)
    lines = textwrap.wrap(title, width=18)
    if len(lines) > 4:
        font_title = get_font(32, bold=True)
        lines = textwrap.wrap(title, width=22)

    heights = []
    for l in lines:
        bb = draw.textbbox((0, 0), l, font=font_title)
        heights.append(bb[3] - bb[1] + 10)
    total_h = sum(heights)
    y = 130 + (350 - total_h) // 2
    for i, l in enumerate(lines):
        text_center(draw, y, l, font_title, txt, W)
        y += heights[i]

    # Separateur auteur
    sep_y = 500
    draw.line([(80, sep_y), (W - 80, sep_y)], fill=accent_rgb, width=1)

    # Auteur
    font_author = get_font(22)
    for l in textwrap.wrap(author_name, width=30):
        sep_y += 18
        text_center(draw, sep_y, l, font_author, accent, W)

    # Editeur
    font_pub = get_font(14, bold=True)
    text_center(draw, H - 50, "FROLLOT EDITIONS", font_pub, txt, W)
    draw.rectangle([(0, H - 8), (W, H)], fill=accent)

    os.makedirs(os.path.dirname(path), exist_ok=True)
    img.save(path, 'JPEG', quality=92)


# ═══════════════════════════════════════════════
#  COUVERTURE ARRIERE (4e de couverture)
# ═══════════════════════════════════════════════

def generate_back_cover(title, author_name, description, price, isbn, idx, path):
    W, H = 600, 900
    p = PALETTES[idx % len(PALETTES)]
    bg_top, bg_bottom, accent, txt = p
    accent_rgb = hex_to_rgb(accent)

    img = Image.new('RGB', (W, H))
    draw = ImageDraw.Draw(img)
    draw_gradient(draw, W, H, bg_top, bg_bottom)

    # Fond un peu plus clair que la couverture avant (distinction visuelle)
    overlay = Image.new('RGBA', (W, H), (255, 255, 255, 8))
    img = Image.alpha_composite(img.convert('RGBA'), overlay).convert('RGB')
    draw = ImageDraw.Draw(img)

    # Barre haut
    draw.rectangle([(0, 0), (W, 4)], fill=accent)

    margin = 60
    y = 60

    # Editeur en haut
    font_pub = get_font(13, bold=True)
    text_center(draw, y, "FROLLOT EDITIONS", font_pub, accent, W)
    y += 40

    # Ligne
    draw.line([(margin, y), (W - margin, y)], fill=accent_rgb, width=1)
    y += 30

    # Resume / Description
    font_desc = get_font(18)
    desc_lines = textwrap.wrap(description or "Aucune description disponible.", width=38)
    max_lines = 14
    for i, l in enumerate(desc_lines[:max_lines]):
        text_center(draw, y, l, font_desc, txt, W)
        y += 28
    if len(desc_lines) > max_lines:
        text_center(draw, y, "...", font_desc, txt, W)
        y += 28

    y += 20

    # Ligne separatrice
    draw.line([(margin, y), (W - margin, y)], fill=accent_rgb, width=1)
    y += 30

    # Citation ou accroche
    font_quote = get_font(15)
    quote = f'"{title}" - {author_name}'
    for l in textwrap.wrap(quote, width=42):
        bb = draw.textbbox((0, 0), l, font=font_quote)
        tw = bb[2] - bb[0]
        draw.text(((W - tw) // 2, y), l, font=font_quote, fill=accent)
        y += 24

    # Bas de page : prix + ISBN
    font_info = get_font(14)
    font_price = get_font(28, bold=True)

    # Prix
    price_text = f"{int(price)} FCFA" if price else ""
    if price_text:
        # Fond pour le prix
        bb = draw.textbbox((0, 0), price_text, font=font_price)
        pw = bb[2] - bb[0]
        ph = bb[3] - bb[1]
        px = W - margin - pw - 20
        py = H - 90
        draw.rounded_rectangle([px - 12, py - 8, px + pw + 12, py + ph + 8], radius=10, fill=accent)
        draw.text((px, py), price_text, font=font_price, fill=txt)

    # ISBN
    if isbn:
        draw.text((margin, H - 80), f"ISBN: {isbn}", font=font_info, fill=hex_to_rgb(txt))

    # Code-barres simplifie (lignes verticales decoratives)
    bar_x = margin
    bar_y = H - 55
    random.seed(hash(isbn or title))
    for i in range(40):
        w = random.choice([1, 2, 1, 1, 3, 1])
        if random.random() > 0.3:
            draw.rectangle([bar_x, bar_y, bar_x + w, bar_y + 30], fill=hex_to_rgb(txt))
        bar_x += w + 1

    # Barre bas
    draw.rectangle([(0, H - 4), (W, H)], fill=accent)

    os.makedirs(os.path.dirname(path), exist_ok=True)
    img.save(path, 'JPEG', quality=92)


# ═══════════════════════════════════════════════
#  PORTRAIT AUTEUR
# ═══════════════════════════════════════════════

def generate_author_portrait(full_name, idx, path):
    S = 500
    img = Image.new('RGB', (S, S))
    draw = ImageDraw.Draw(img)

    # Fond degrade circulaire simule
    p = PALETTES[idx % len(PALETTES)]
    bg_top, bg_bottom, accent, txt = p
    draw_gradient(draw, S, S, bg_top, bg_bottom)

    accent_rgb = hex_to_rgb(accent)

    # Grand cercle de fond
    overlay = Image.new('RGBA', (S, S), (0, 0, 0, 0))
    od = ImageDraw.Draw(overlay)
    od.ellipse([50, 50, S - 50, S - 50], fill=accent_rgb + (30,))
    od.ellipse([80, 80, S - 80, S - 80], fill=hex_to_rgb(bg_bottom) + (200,))
    img = Image.alpha_composite(img.convert('RGBA'), overlay).convert('RGB')
    draw = ImageDraw.Draw(img)

    # Initiales en tres gros au centre
    parts = full_name.split()
    initials = (parts[0][0] + (parts[-1][0] if len(parts) > 1 else '')).upper()

    font_initials = get_font(120, bold=True)
    bb = draw.textbbox((0, 0), initials, font=font_initials)
    tw = bb[2] - bb[0]
    th = bb[3] - bb[1]
    draw.text(((S - tw) // 2, (S - th) // 2 - 40), initials, font=font_initials, fill=accent)

    # Nom en dessous
    font_name = get_font(20, bold=True)
    lines = textwrap.wrap(full_name, width=24)
    y = S // 2 + 60
    for l in lines:
        text_center(draw, y, l, font_name, txt, S)
        y += 28

    # Petit texte "Auteur Frollot"
    font_sub = get_font(12)
    text_center(draw, y + 10, "AUTEUR FROLLOT", font_sub, accent, S)

    os.makedirs(os.path.dirname(path), exist_ok=True)
    img.save(path, 'JPEG', quality=92)


# ═══════════════════════════════════════════════
#  COMMANDE
# ═══════════════════════════════════════════════

class Command(BaseCommand):
    help = "Genere couvertures (avant + arriere) et portraits auteurs"

    def add_arguments(self, parser):
        parser.add_argument('--all', action='store_true', help='Regenere tout')

    def handle(self, *args, **options):
        from apps.books.models import Book, Author

        regen = options['all']
        media = settings.MEDIA_ROOT
        covers_dir = os.path.join(media, 'books', 'covers')
        backs_dir = os.path.join(media, 'books', 'back_covers')
        authors_dir = os.path.join(media, 'authors')
        os.makedirs(covers_dir, exist_ok=True)
        os.makedirs(backs_dir, exist_ok=True)
        os.makedirs(authors_dir, exist_ok=True)

        # ── Livres : couverture avant + arriere ──
        books = Book.objects.select_related('author', 'category').all()
        front_count = 0
        back_count = 0

        for i, book in enumerate(books):
            slug = book.slug or f"book-{book.id}"

            # Couverture avant
            if not book.cover_image or regen:
                fname = f"{slug}.jpg"
                fpath = os.path.join(covers_dir, fname)
                self.stdout.write(f"  Couverture avant : {book.title}")
                try:
                    generate_front_cover(
                        book.title,
                        book.author.full_name if book.author else "Inconnu",
                        book.category.name if book.category else "Litterature",
                        i, fpath,
                    )
                    book.cover_image = f"books/covers/{fname}"
                    front_count += 1
                except Exception as e:
                    self.stderr.write(f"    ERREUR: {e}")

            # Couverture arriere
            if not book.back_cover_image or regen:
                bname = f"{slug}_back.jpg"
                bpath = os.path.join(backs_dir, bname)
                self.stdout.write(f"  Couverture arriere : {book.title}")
                try:
                    generate_back_cover(
                        book.title,
                        book.author.full_name if book.author else "Inconnu",
                        book.description,
                        book.price,
                        book.reference,
                        i, bpath,
                    )
                    book.back_cover_image = f"books/back_covers/{bname}"
                    back_count += 1
                except Exception as e:
                    self.stderr.write(f"    ERREUR: {e}")

            book.save(update_fields=['cover_image', 'back_cover_image'])

        # ── Auteurs : portraits ──
        authors = Author.objects.all()
        author_count = 0

        for i, author in enumerate(authors):
            if author.photo and not regen:
                continue

            slug = author.slug or f"author-{author.id}"
            aname = f"{slug}.jpg"
            apath = os.path.join(authors_dir, aname)
            self.stdout.write(f"  Portrait : {author.full_name}")
            try:
                generate_author_portrait(author.full_name, i + 7, apath)
                author.photo = f"authors/{aname}"
                author.save(update_fields=['photo'])
                author_count += 1
            except Exception as e:
                self.stderr.write(f"    ERREUR: {e}")

        self.stdout.write("")
        self.stdout.write(self.style.SUCCESS(f"Couvertures avant  : {front_count}"))
        self.stdout.write(self.style.SUCCESS(f"Couvertures arriere: {back_count}"))
        self.stdout.write(self.style.SUCCESS(f"Portraits auteurs  : {author_count}"))
        self.stdout.write(self.style.SUCCESS("Termine !"))
