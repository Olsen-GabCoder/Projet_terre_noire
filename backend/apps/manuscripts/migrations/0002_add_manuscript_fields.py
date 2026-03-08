# Generated manually

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('manuscripts', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='manuscript',
            name='pen_name',
            field=models.CharField(blank=True, max_length=200, verbose_name='Pseudonyme / Nom de plume'),
        ),
        migrations.AddField(
            model_name='manuscript',
            name='country',
            field=models.CharField(blank=True, max_length=100, verbose_name='Pays / Nationalité'),
        ),
        migrations.AddField(
            model_name='manuscript',
            name='genre',
            field=models.CharField(
                choices=[
                    ('ROMAN', 'Roman'),
                    ('NOUVELLE', 'Nouvelle / Recueil de nouvelles'),
                    ('POESIE', 'Poésie'),
                    ('ESSAI', 'Essai'),
                    ('THEATRE', 'Théâtre'),
                    ('JEUNESSE', 'Littérature jeunesse'),
                    ('BD', 'Bande dessinée'),
                    ('AUTRE', 'Autre'),
                ],
                default='ROMAN',
                max_length=20,
                verbose_name='Genre littéraire',
            ),
        ),
        migrations.AddField(
            model_name='manuscript',
            name='language',
            field=models.CharField(
                choices=[
                    ('FR', 'Français'),
                    ('EN', 'Anglais'),
                    ('AR', 'Arabe'),
                    ('PT', 'Portugais'),
                    ('ES', 'Espagnol'),
                    ('AUTRE', 'Autre'),
                ],
                default='FR',
                max_length=10,
                verbose_name='Langue du manuscrit',
            ),
        ),
        migrations.AddField(
            model_name='manuscript',
            name='page_count',
            field=models.PositiveIntegerField(blank=True, null=True, verbose_name='Nombre de pages'),
        ),
        migrations.AddField(
            model_name='manuscript',
            name='terms_accepted',
            field=models.BooleanField(default=False, verbose_name='Conditions acceptées'),
        ),
    ]
