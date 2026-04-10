"""Ajoute le modèle DeliveryRate — tarifs de livraison par livreur."""

import django.core.validators
import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0011_add_editeur_profile_fields'),
        ('marketplace', '0003_deliverywallettransaction'),
    ]

    operations = [
        migrations.CreateModel(
            name='DeliveryRate',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('zone_name', models.CharField(max_length=100, verbose_name='Nom de la zone')),
                ('country', models.CharField(max_length=2, verbose_name='Pays')),
                ('cities', models.JSONField(default=list, verbose_name='Villes couvertes')),
                ('price', models.DecimalField(decimal_places=2, max_digits=12, validators=[django.core.validators.MinValueValidator(0)], verbose_name='Tarif de livraison')),
                ('currency', models.CharField(default='XAF', max_length=3, verbose_name='Devise')),
                ('estimated_days_min', models.PositiveIntegerField(default=1, verbose_name='Délai min (jours)')),
                ('estimated_days_max', models.PositiveIntegerField(default=3, verbose_name='Délai max (jours)')),
                ('is_active', models.BooleanField(default=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('agent', models.ForeignKey(
                    limit_choices_to={'profile_type': 'LIVREUR'},
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='delivery_rates',
                    to='users.userprofile',
                    verbose_name='Livreur',
                )),
            ],
            options={
                'verbose_name': 'Tarif de livraison',
                'verbose_name_plural': 'Tarifs de livraison',
                'ordering': ['price'],
            },
        ),
    ]
