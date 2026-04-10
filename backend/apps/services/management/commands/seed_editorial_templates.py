"""
Commande idempotente : crée les 6 modèles de devis éditoriaux globaux Frollot.
Utilise get_or_create sur le slug pour ne jamais créer de doublons.
N'écrase pas les templates existants (permet aux orgs de les cloner et modifier).
"""
from django.core.management.base import BaseCommand
from apps.services.models import QuoteTemplate, QuoteTemplateLot, QuoteTemplateItem


TEMPLATES = [
    {
        'slug': 'frollot-compte-editeur',
        'name': 'Édition à compte d\'éditeur',
        'publishing_model': 'COMPTE_EDITEUR',
        'description': 'L\'éditeur finance l\'intégralité de la production. L\'auteur ne paie rien.',
        'public_description': (
            'Votre manuscrit a convaincu notre comité de lecture. Nous prenons en charge '
            'l\'intégralité du processus éditorial — de la correction de votre texte jusqu\'à '
            'sa mise en librairie — sans aucun frais de votre part. En échange, nous devenons '
            'partenaires : vous touchez des droits sur chaque exemplaire vendu, dès le premier, '
            'et nous travaillons ensemble à faire vivre votre livre le plus longtemps possible.'
        ),
        'lots': [
            {
                'name': 'Préparation éditoriale',
                'items': [
                    ('Évaluation éditoriale approfondie', 'FORFAIT', 1, 150000),
                    ('Correction orthotypographique (2 passages)', 'FORFAIT', 1, 300000),
                    ('Mise en page intérieure', 'PAGE', 220, 750),
                ],
            },
            {
                'name': 'Fabrication',
                'items': [
                    ('Conception de couverture (1re et 4e)', 'FORFAIT', 1, 100000),
                    ('ISBN + code-barres + dépôt légal', 'FORFAIT', 1, 45000),
                ],
            },
            {
                'name': 'Production',
                'items': [
                    ('Impression 500 exemplaires', 'EXEMPLAIRE', 500, 2200),
                    ('Services de presse (20 exemplaires)', 'EXEMPLAIRE', 20, 2200),
                ],
            },
            {
                'name': 'Diffusion et promotion',
                'items': [
                    ('Référencement catalogue Frollot', 'FORFAIT', 1, 0),
                    ('Mise en place librairies partenaires', 'FORFAIT', 1, 75000),
                    ('Conversion et mise en ligne ebook', 'FORFAIT', 1, 75000),
                    ('Pack promotion (visuels + réseaux sociaux)', 'FORFAIT', 1, 75000),
                ],
            },
        ],
    },
    {
        'slug': 'frollot-coedition',
        'name': 'Coédition',
        'publishing_model': 'COEDITION',
        'description': 'L\'éditeur assure le travail éditorial. L\'auteur contribue aux frais d\'impression.',
        'public_description': (
            'Votre manuscrit a retenu notre attention et nous souhaitons l\'accompagner. '
            'La coédition est un partenariat honnête : nous apportons notre savoir-faire '
            'éditorial complet — correction, mise en page, couverture, distribution — et '
            'vous contribuez aux frais d\'impression. En retour, vos droits d\'auteur sont '
            'plus élevés que dans un modèle classique, parce que vous avez pris votre part '
            'du risque. Chaque ligne de ce devis est détaillée. Vous savez exactement à quoi '
            'sert chaque franc investi.'
        ),
        'lots': [
            {
                'name': 'Préparation éditoriale (à la charge de l\'éditeur)',
                'items': [
                    ('Évaluation éditoriale approfondie', 'FORFAIT', 1, 0),
                    ('Correction orthotypographique (2 passages)', 'FORFAIT', 1, 0),
                    ('Mise en page intérieure', 'FORFAIT', 1, 0),
                    ('Conception de couverture', 'FORFAIT', 1, 0),
                    ('ISBN + code-barres + dépôt légal', 'FORFAIT', 1, 0),
                ],
            },
            {
                'name': 'Impression (à la charge de l\'auteur)',
                'items': [
                    ('Impression 500 exemplaires', 'EXEMPLAIRE', 500, 2200),
                ],
            },
            {
                'name': 'Diffusion (à la charge de l\'éditeur)',
                'items': [
                    ('Référencement catalogue Frollot', 'FORFAIT', 1, 0),
                    ('Mise en place librairies partenaires', 'FORFAIT', 1, 0),
                    ('Conversion ebook', 'FORFAIT', 1, 0),
                ],
            },
        ],
    },
    {
        'slug': 'frollot-compte-auteur',
        'name': 'Édition à compte d\'auteur accompagnée',
        'publishing_model': 'COMPTE_AUTEUR',
        'description': 'L\'auteur finance la production. L\'éditeur apporte son savoir-faire et sa rigueur.',
        'public_description': (
            'Vous croyez en votre texte et vous êtes prêt à investir pour le voir publié '
            'dans les meilleures conditions. La différence avec un simple prestataire '
            'd\'impression, c\'est que nous mettons notre exigence éditoriale au service de '
            'votre projet : votre livre passera entre les mains des mêmes correcteurs, '
            'maquettistes et graphistes que nos titres à compte d\'éditeur. Même qualité, '
            'même rigueur, même fierté dans l\'objet final.\n\n'
            'Exemple concret : pour un livre vendu 5 000 FCFA en librairie partenaire, '
            'après commission Frollot (15 %) et marge libraire (30 %), vous touchez '
            '2 975 FCFA par exemplaire. Pour une vente directe sur Frollot, vous touchez '
            '4 250 FCFA, soit 85 % du prix public.'
        ),
        'lots': [
            {
                'name': 'Préparation éditoriale',
                'items': [
                    ('Lecture critique et retour structuré', 'FORFAIT', 1, 100000),
                    ('Correction orthotypographique (2 passages)', 'FORFAIT', 1, 300000),
                ],
            },
            {
                'name': 'Fabrication',
                'items': [
                    ('Mise en page intérieure', 'PAGE', 220, 750),
                    ('Conception de couverture (1re et 4e)', 'FORFAIT', 1, 100000),
                    ('Épreuves et bon à tirer', 'FORFAIT', 1, 0),
                ],
            },
            {
                'name': 'Production',
                'items': [
                    ('ISBN + code-barres + dépôt légal', 'FORFAIT', 1, 45000),
                    ('Impression 500 exemplaires', 'EXEMPLAIRE', 500, 2200),
                ],
            },
            {
                'name': 'Diffusion et distribution',
                'items': [
                    ('Référencement catalogue Frollot', 'FORFAIT', 1, 0),
                    ('Mise en place librairies partenaires', 'FORFAIT', 1, 75000),
                    ('Conversion et mise en ligne ebook', 'FORFAIT', 1, 75000),
                ],
            },
            {
                'name': 'Promotion',
                'items': [
                    ('Pack réseaux sociaux (visuels + textes)', 'FORFAIT', 1, 75000),
                    ('Services de presse (10 exemplaires)', 'EXEMPLAIRE', 10, 2200),
                ],
            },
        ],
    },
    {
        'slug': 'frollot-auto-edition',
        'name': 'Auto-édition accompagnée (à la carte)',
        'publishing_model': 'AUTO_EDITION',
        'description': 'L\'auteur choisit les prestations dont il a besoin, une par une.',
        'public_description': (
            'Vous savez ce que vous voulez. Peut-être que votre texte est déjà corrigé '
            'et que vous n\'avez besoin que d\'une mise en page. Peut-être que vous avez '
            'déjà une couverture et que c\'est l\'impression qui vous manque. L\'auto-édition '
            'accompagnée vous donne accès à chaque prestation séparément, au prix juste, '
            'sans obligation de prendre un forfait complet.\n\n'
            'Vous restez propriétaire de votre œuvre à 100 %. Nous sommes votre prestataire, '
            'pas votre éditeur. Et si une maison d\'édition présente sur Frollot s\'intéresse '
            'à votre texte, vous pouvez à tout moment convertir votre projet en coédition '
            'ou en édition à compte d\'éditeur.'
        ),
        'lots': [
            {
                'name': 'Prestations éditoriales (à la carte)',
                'items': [
                    ('Diagnostic éditorial', 'FORFAIT', 1, 75000),
                    ('Correction orthotypographique', 'PAGE', 220, 1500),
                    ('Correction stylistique approfondie', 'PAGE', 220, 2500),
                ],
            },
            {
                'name': 'Fabrication (à la carte)',
                'items': [
                    ('Mise en page simple (roman, essai)', 'PAGE', 220, 1000),
                    ('Mise en page complexe (illustré, jeunesse)', 'PAGE', 220, 3000),
                    ('Conception couverture standard', 'FORFAIT', 1, 75000),
                    ('Conception couverture premium', 'FORFAIT', 1, 150000),
                ],
            },
            {
                'name': 'Production (à la carte)',
                'items': [
                    ('ISBN + code-barres', 'FORFAIT', 1, 35000),
                    ('Dépôt légal', 'FORFAIT', 1, 20000),
                    ('Conversion ebook (EPUB + PDF)', 'FORFAIT', 1, 60000),
                    ('Impression (sur devis imprimeur)', 'EXEMPLAIRE', 500, 2200),
                ],
            },
        ],
    },
    {
        'slug': 'frollot-numerique-pur',
        'name': 'Édition numérique pure',
        'publishing_model': 'NUMERIQUE_PUR',
        'description': 'Publication exclusivement numérique. Pas d\'impression, coût minimal.',
        'public_description': (
            'Le numérique change les règles du jeu. Plus besoin d\'avancer des centaines '
            'de milliers de francs pour imprimer des exemplaires qui dormiront peut-être '
            'dans un carton. Votre livre est disponible instantanément, partout en Afrique '
            'francophone et au-delà, accessible depuis un téléphone, une tablette ou un '
            'ordinateur.\n\n'
            'Le coût d\'entrée est le plus bas de tous nos modèles. La qualité éditoriale '
            'est exactement la même. Et vos droits d\'auteur sont les plus élevés, parce '
            'qu\'il n\'y a ni imprimeur, ni distributeur, ni libraire à rémunérer entre '
            'votre texte et votre lecteur.'
        ),
        'lots': [
            {
                'name': 'Préparation éditoriale',
                'items': [
                    ('Correction orthotypographique (2 passages)', 'FORFAIT', 1, 300000),
                    ('Mise en page numérique (EPUB + PDF optimisé)', 'FORFAIT', 1, 100000),
                    ('Conception de couverture numérique', 'FORFAIT', 1, 75000),
                ],
            },
            {
                'name': 'Publication',
                'items': [
                    ('ISBN numérique + métadonnées', 'FORFAIT', 1, 35000),
                    ('Mise en ligne Frollot (lecture + téléchargement)', 'FORFAIT', 1, 0),
                    ('Fiche catalogue illustrée', 'FORFAIT', 1, 0),
                ],
            },
        ],
    },
    {
        'slug': 'frollot-reedition',
        'name': 'Réédition',
        'publishing_model': 'REEDITION',
        'description': 'Nouvelle vie pour un livre épuisé. Couverture actualisée, nouvelle distribution.',
        'public_description': (
            'Votre livre a déjà existé, mais il n\'est plus disponible. Les exemplaires '
            'sont épuisés, l\'éditeur précédent ne réimprime pas, ou vous avez récupéré '
            'vos droits. La réédition lui donne un nouveau souffle : couverture actualisée, '
            'mise en page modernisée, corrections de coquilles accumulées, et surtout — '
            'une nouvelle distribution, sur Frollot et au-delà.'
        ),
        'lots': [
            {
                'name': 'Préparation éditoriale',
                'items': [
                    ('Relecture et correction de coquilles', 'FORFAIT', 1, 150000),
                    ('Nouvelle mise en page', 'FORFAIT', 1, 100000),
                    ('Nouvelle couverture', 'FORFAIT', 1, 75000),
                ],
            },
            {
                'name': 'Production',
                'items': [
                    ('Nouvel ISBN + dépôt légal', 'FORFAIT', 1, 45000),
                    ('Impression 300 exemplaires', 'EXEMPLAIRE', 300, 2500),
                    ('Conversion ebook', 'FORFAIT', 1, 60000),
                ],
            },
        ],
    },
]


class Command(BaseCommand):
    help = 'Crée les 6 modèles de devis éditoriaux globaux Frollot (idempotent).'

    def handle(self, *args, **options):
        created_count = 0
        skipped_count = 0

        for tpl_data in TEMPLATES:
            template, created = QuoteTemplate.objects.get_or_create(
                slug=tpl_data['slug'],
                defaults={
                    'name': tpl_data['name'],
                    'description': tpl_data['description'],
                    'public_description': tpl_data['public_description'],
                    'publishing_model': tpl_data['publishing_model'],
                    'organization': None,  # Global Frollot
                    'is_public': False,  # Privé par défaut
                    'is_active': True,
                },
            )

            if not created:
                skipped_count += 1
                self.stdout.write(f'  SKIP  {tpl_data["slug"]} (existe deja)')
                continue

            created_count += 1

            for lot_order, lot_data in enumerate(tpl_data['lots'], start=1):
                lot = QuoteTemplateLot.objects.create(
                    template=template,
                    name=lot_data['name'],
                    order=lot_order,
                )
                for item_order, item_tuple in enumerate(lot_data['items'], start=1):
                    designation, unit, qty, price = item_tuple
                    QuoteTemplateItem.objects.create(
                        lot=lot,
                        designation=designation,
                        unit=unit,
                        default_quantity=qty,
                        default_unit_price=price,
                        order=item_order,
                    )

            self.stdout.write(self.style.SUCCESS(
                f'  OK    {tpl_data["slug"]} ({len(tpl_data["lots"])} lots)'
            ))

        self.stdout.write('')
        self.stdout.write(self.style.SUCCESS(
            f'Termine : {created_count} cree(s), {skipped_count} existant(s).'
        ))
