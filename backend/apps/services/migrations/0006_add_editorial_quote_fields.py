"""
Ajoute les champs éditoriaux sur Quote et QuoteTemplate :
- Quote : publishing_model, royalty_terms, print_run, retail_price, parent_quote, statut REVISION_REQUESTED
- QuoteTemplate : publishing_model, is_public, public_description, internal_notes
"""
import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('services', '0005_add_dqe_quote_system'),
    ]

    operations = [
        # ── Quote : nouveaux champs éditoriaux ──
        migrations.AlterField(
            model_name='quote',
            name='status',
            field=models.CharField(
                choices=[
                    ('DRAFT', 'Brouillon'),
                    ('SENT', 'Envoyé'),
                    ('ACCEPTED', 'Accepté'),
                    ('REJECTED', 'Refusé'),
                    ('REVISION_REQUESTED', 'Révision demandée'),
                    ('EXPIRED', 'Expiré'),
                    ('CANCELLED', 'Annulé'),
                ],
                default='DRAFT',
                max_length=20,
                verbose_name='Statut',
            ),
        ),
        migrations.AddField(
            model_name='quote',
            name='publishing_model',
            field=models.CharField(
                blank=True,
                choices=[
                    ('COMPTE_EDITEUR', "Édition à compte d'éditeur"),
                    ('COEDITION', 'Coédition'),
                    ('COMPTE_AUTEUR', "Édition à compte d'auteur accompagnée"),
                    ('AUTO_EDITION', 'Auto-édition accompagnée'),
                    ('NUMERIQUE_PUR', 'Édition numérique pure'),
                    ('REEDITION', 'Réédition'),
                ],
                default='',
                help_text='Obligatoire pour tout devis lié à un manuscrit.',
                max_length=20,
                verbose_name='Modèle éditorial',
            ),
        ),
        migrations.AddField(
            model_name='quote',
            name='royalty_terms',
            field=models.JSONField(
                blank=True,
                default=list,
                help_text='[{"up_to": 1000, "rate": 10}, {"up_to": 3000, "rate": 12}, {"above": 3000, "rate": 14}]',
                verbose_name="Grille de droits d'auteur",
            ),
        ),
        migrations.AddField(
            model_name='quote',
            name='print_run',
            field=models.PositiveIntegerField(
                blank=True,
                null=True,
                verbose_name='Tirage prévu (exemplaires)',
            ),
        ),
        migrations.AddField(
            model_name='quote',
            name='retail_price',
            field=models.DecimalField(
                blank=True,
                decimal_places=2,
                max_digits=10,
                null=True,
                verbose_name='Prix de vente prévu (FCFA)',
            ),
        ),
        migrations.AddField(
            model_name='quote',
            name='parent_quote',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='revisions',
                to='services.quote',
                verbose_name='Devis parent (historique de négociation)',
            ),
        ),
        # ── QuoteTemplate : champs vitrine ──
        migrations.AddField(
            model_name='quotetemplate',
            name='publishing_model',
            field=models.CharField(
                blank=True,
                choices=[
                    ('COMPTE_EDITEUR', "Édition à compte d'éditeur"),
                    ('COEDITION', 'Coédition'),
                    ('COMPTE_AUTEUR', "Édition à compte d'auteur accompagnée"),
                    ('AUTO_EDITION', 'Auto-édition accompagnée'),
                    ('NUMERIQUE_PUR', 'Édition numérique pure'),
                    ('REEDITION', 'Réédition'),
                ],
                default='',
                max_length=20,
                verbose_name='Modèle éditorial',
            ),
        ),
        migrations.AddField(
            model_name='quotetemplate',
            name='is_public',
            field=models.BooleanField(
                default=False,
                help_text="Si vrai, ce modèle est affiché sur la page publique de l'organisation.",
                verbose_name='Visible en vitrine',
            ),
        ),
        migrations.AddField(
            model_name='quotetemplate',
            name='public_description',
            field=models.TextField(
                blank=True,
                help_text='Texte commercial affiché aux auteurs sur la page publique.',
                verbose_name='Description vitrine (pour les auteurs)',
            ),
        ),
        migrations.AddField(
            model_name='quotetemplate',
            name='internal_notes',
            field=models.TextField(
                blank=True,
                help_text="Visible uniquement par les employés de l'organisation.",
                verbose_name='Notes internes',
            ),
        ),
    ]
