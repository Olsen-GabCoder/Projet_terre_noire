# Generated data migration: liste de catégories par défaut pour la maison d'édition

from django.db import migrations
from django.utils.text import slugify


def seed_categories(apps, schema_editor):
    Category = apps.get_model('books', 'Category')
    default_names = [
        'Roman',
        'Essai',
        'Poésie',
        'Nouvelle',
        'Science-Fiction',
        'Polar / Thriller',
        'Jeunesse',
        'Théâtre',
        'Biographie',
        'Histoire',
        'Documentaire',
        'Bande dessinée',
        'Conte',
        'Spiritualité',
    ]
    for name in default_names:
        if not Category.objects.filter(name=name).exists():
            slug = slugify(name) or f"categorie-{name[:50]}"
            Category.objects.create(name=name, slug=slug)


def reverse_seed(apps, schema_editor):
    # On ne supprime pas les catégories au reverse (évite de casser les livres existants)
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('books', '0004_add_review_replies_and_likes'),
    ]

    operations = [
        migrations.RunPython(seed_categories, reverse_seed),
    ]
