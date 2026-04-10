"""
Ajoute les états intermédiaires du parcours manuscrit-devis :
- QUOTE_SENT, COUNTER_PROPOSAL, QUOTE_REJECTED dans status
- open_market_locked, open_market_deadline pour la fenêtre de comparaison
"""
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('manuscripts', '0007_add_dqe_quote_system'),
    ]

    operations = [
        migrations.AlterField(
            model_name='manuscript',
            name='status',
            field=models.CharField(
                choices=[
                    ('PENDING', 'En attente'),
                    ('REVIEWING', 'En cours d\'examen'),
                    ('QUOTE_SENT', 'Devis envoyé'),
                    ('COUNTER_PROPOSAL', 'Contre-proposition'),
                    ('QUOTE_REJECTED', 'Devis refusé par l\'auteur'),
                    ('ACCEPTED', 'Accepté'),
                    ('REJECTED', 'Rejeté'),
                ],
                default='PENDING',
                max_length=20,
                verbose_name='Statut',
            ),
        ),
        migrations.AddField(
            model_name='manuscript',
            name='open_market_locked',
            field=models.BooleanField(
                default=False,
                help_text="L'auteur déclare avoir reçu toutes les offres attendues.",
                verbose_name='Marché ouvert verrouillé',
            ),
        ),
        migrations.AddField(
            model_name='manuscript',
            name='open_market_deadline',
            field=models.DateTimeField(
                blank=True,
                null=True,
                help_text='Fin de la fenêtre de 15 jours pour comparer les devis.',
                verbose_name='Date limite de comparaison',
            ),
        ),
    ]
