"""Ajoute le lien optionnel Author → User pour le système auteur unifié."""

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('books', '0010_add_total_sales'),
    ]

    operations = [
        migrations.AddField(
            model_name='author',
            name='user',
            field=models.OneToOneField(
                blank=True,
                help_text='Si lié, le nom, la bio et la photo sont synchronisés depuis le profil.',
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='author_profile',
                to=settings.AUTH_USER_MODEL,
                verbose_name='Compte utilisateur lié',
            ),
        ),
    ]
