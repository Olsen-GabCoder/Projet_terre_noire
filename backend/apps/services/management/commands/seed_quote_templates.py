"""
Seed des modèles de devis DQE prédéfinis.
Usage: python manage.py seed_quote_templates
"""
from django.core.management.base import BaseCommand
from apps.services.models import QuoteTemplate, QuoteTemplateLot, QuoteTemplateItem

TEMPLATES = [
    {
        'name': 'Édition complète',
        'slug': 'edition-complete',
        'description': 'Prise en charge complète de la publication : correction, mise en page, couverture, impression.',
        'lots': [
            {
                'name': 'Préparation éditoriale',
                'items': [
                    {'designation': 'Lecture et évaluation du manuscrit', 'unit': 'FORFAIT', 'default_unit_price': 50000},
                    {'designation': 'Correction orthographique et grammaticale', 'unit': 'PAGE', 'default_unit_price': 350},
                    {'designation': 'Correction stylistique', 'unit': 'PAGE', 'default_unit_price': 500},
                    {'designation': 'Réécriture partielle', 'unit': 'PAGE', 'default_unit_price': 1200},
                    {'designation': 'Relecture finale (BAT)', 'unit': 'FORFAIT', 'default_unit_price': 40000},
                ],
            },
            {
                'name': 'Production',
                'items': [
                    {'designation': 'Mise en page intérieure', 'unit': 'PAGE', 'default_unit_price': 400},
                    {'designation': 'Création couverture (1re)', 'unit': 'FORFAIT', 'default_unit_price': 150000},
                    {'designation': 'Création 4e de couverture', 'unit': 'FORFAIT', 'default_unit_price': 80000},
                    {'designation': 'ISBN et dépôt légal', 'unit': 'FORFAIT', 'default_unit_price': 25000},
                ],
            },
            {
                'name': 'Impression',
                'items': [
                    {'designation': 'Impression offset', 'unit': 'EXEMPLAIRE', 'default_unit_price': 3200},
                    {'designation': 'Reliure dos carré collé', 'unit': 'EXEMPLAIRE', 'default_unit_price': 800},
                    {'designation': 'Pelliculage mat couverture', 'unit': 'EXEMPLAIRE', 'default_unit_price': 350},
                ],
            },
            {
                'name': 'Distribution',
                'items': [
                    {'designation': 'Référencement catalogue Frollot', 'unit': 'FORFAIT', 'default_unit_price': 15000},
                    {'designation': 'Envoi exemplaires auteur', 'unit': 'EXEMPLAIRE', 'default_unit_price': 2500},
                ],
            },
        ],
    },
    {
        'name': 'Correction seule',
        'slug': 'correction-seule',
        'description': 'Services de correction sans mise en page ni impression.',
        'lots': [
            {
                'name': 'Correction',
                'items': [
                    {'designation': 'Correction orthographique et grammaticale', 'unit': 'PAGE', 'default_unit_price': 350},
                    {'designation': 'Correction typographique', 'unit': 'PAGE', 'default_unit_price': 250},
                    {'designation': 'Correction stylistique', 'unit': 'PAGE', 'default_unit_price': 500},
                    {'designation': 'Réécriture', 'unit': 'PAGE', 'default_unit_price': 1200},
                    {'designation': 'Relecture finale', 'unit': 'FORFAIT', 'default_unit_price': 30000},
                ],
            },
        ],
    },
    {
        'name': 'Mise en page',
        'slug': 'mise-en-page',
        'description': 'Maquette intérieure et couverture.',
        'lots': [
            {
                'name': 'Maquette intérieure',
                'items': [
                    {'designation': 'Mise en page texte', 'unit': 'PAGE', 'default_unit_price': 400},
                    {'designation': 'Intégration illustrations', 'unit': 'PLANCHE', 'default_unit_price': 5000},
                    {'designation': 'Table des matières et index', 'unit': 'FORFAIT', 'default_unit_price': 15000},
                ],
            },
            {
                'name': 'Couverture',
                'items': [
                    {'designation': 'Création couverture', 'unit': 'FORFAIT', 'default_unit_price': 150000},
                    {'designation': 'Création 4e de couverture', 'unit': 'FORFAIT', 'default_unit_price': 80000},
                    {'designation': 'Tranche / dos', 'unit': 'FORFAIT', 'default_unit_price': 20000},
                ],
            },
        ],
    },
    {
        'name': 'Impression',
        'slug': 'impression',
        'description': "Services d'impression et de reliure.",
        'lots': [
            {
                'name': 'Prépresse',
                'items': [
                    {'designation': 'Vérification fichiers impression', 'unit': 'FORFAIT', 'default_unit_price': 15000},
                    {'designation': 'Épreuve couleur (BAT)', 'unit': 'FORFAIT', 'default_unit_price': 25000},
                ],
            },
            {
                'name': 'Impression & reliure',
                'items': [
                    {'designation': 'Impression offset intérieur', 'unit': 'EXEMPLAIRE', 'default_unit_price': 3200},
                    {'designation': 'Impression numérique intérieur', 'unit': 'EXEMPLAIRE', 'default_unit_price': 4500},
                    {'designation': 'Reliure dos carré collé', 'unit': 'EXEMPLAIRE', 'default_unit_price': 800},
                    {'designation': 'Reliure agrafée', 'unit': 'EXEMPLAIRE', 'default_unit_price': 400},
                    {'designation': 'Pelliculage mat', 'unit': 'EXEMPLAIRE', 'default_unit_price': 350},
                    {'designation': 'Pelliculage brillant', 'unit': 'EXEMPLAIRE', 'default_unit_price': 350},
                    {'designation': 'Vernis sélectif', 'unit': 'EXEMPLAIRE', 'default_unit_price': 600},
                ],
            },
            {
                'name': 'Livraison',
                'items': [
                    {'designation': 'Conditionnement et emballage', 'unit': 'FORFAIT', 'default_unit_price': 15000},
                    {'designation': 'Livraison', 'unit': 'FORFAIT', 'default_unit_price': 25000},
                ],
            },
        ],
    },
    {
        'name': 'Traduction',
        'slug': 'traduction',
        'description': 'Traduction littéraire et adaptation.',
        'lots': [
            {
                'name': 'Traduction',
                'items': [
                    {'designation': 'Traduction littéraire', 'unit': 'MOT', 'default_unit_price': 15},
                    {'designation': 'Relecture bilingue', 'unit': 'PAGE', 'default_unit_price': 600},
                    {'designation': 'Adaptation culturelle', 'unit': 'FORFAIT', 'default_unit_price': 50000},
                ],
            },
        ],
    },
    {
        'name': 'Illustration',
        'slug': 'illustration',
        'description': 'Illustrations de couverture et intérieures.',
        'lots': [
            {
                'name': 'Illustrations',
                'items': [
                    {'designation': 'Illustration de couverture', 'unit': 'FORFAIT', 'default_unit_price': 200000},
                    {'designation': 'Illustration intérieure', 'unit': 'PLANCHE', 'default_unit_price': 50000},
                    {'designation': 'Retouche / modification', 'unit': 'HEURE', 'default_unit_price': 8000},
                ],
            },
        ],
    },
    {
        'name': 'Ebook / Numérique',
        'slug': 'ebook-numerique',
        'description': 'Conversion et diffusion numérique.',
        'lots': [
            {
                'name': 'Production numérique',
                'items': [
                    {'designation': 'Conversion EPUB / MOBI', 'unit': 'FORFAIT', 'default_unit_price': 40000},
                    {'designation': 'Mise en forme PDF interactif', 'unit': 'FORFAIT', 'default_unit_price': 35000},
                    {'designation': 'Métadonnées et référencement', 'unit': 'FORFAIT', 'default_unit_price': 10000},
                    {'designation': 'Diffusion plateformes (Frollot, Amazon, etc.)', 'unit': 'FORFAIT', 'default_unit_price': 20000},
                ],
            },
        ],
    },
    {
        'name': 'Service à la carte',
        'slug': 'service-a-la-carte',
        'description': 'Devis libre — ajoutez vos propres lignes.',
        'lots': [
            {
                'name': 'Prestations',
                'items': [],
            },
        ],
    },
]


class Command(BaseCommand):
    help = 'Crée les modèles de devis DQE prédéfinis'

    def handle(self, *args, **options):
        created = 0
        for tpl_data in TEMPLATES:
            tpl, was_created = QuoteTemplate.objects.get_or_create(
                slug=tpl_data['slug'],
                defaults={
                    'name': tpl_data['name'],
                    'description': tpl_data['description'],
                },
            )
            if not was_created:
                self.stdout.write(f'  [SKIP] {tpl.name} (existe deja)')
                continue

            for lot_order, lot_data in enumerate(tpl_data['lots'], start=1):
                lot = QuoteTemplateLot.objects.create(
                    template=tpl,
                    name=lot_data['name'],
                    order=lot_order,
                )
                for item_order, item_data in enumerate(lot_data['items'], start=1):
                    QuoteTemplateItem.objects.create(
                        lot=lot,
                        designation=item_data['designation'],
                        unit=item_data.get('unit', 'FORFAIT'),
                        default_unit_price=item_data.get('default_unit_price'),
                        default_quantity=item_data.get('default_quantity'),
                        order=item_order,
                    )
            created += 1
            self.stdout.write(self.style.SUCCESS(f'  [OK] {tpl.name}'))

        self.stdout.write(self.style.SUCCESS(f'\n{created} modele(s) cree(s).'))
