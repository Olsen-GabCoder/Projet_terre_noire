"""Ajoute le modèle DeliveryZone pour les frais de livraison par zone."""

from django.db import migrations, models
import django.core.validators


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='DeliveryZone',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=100, unique=True, verbose_name='Nom de la zone')),
                ('cities', models.JSONField(blank=True, default=list, help_text='Liste de noms de villes. Ex: ["Libreville", "Owendo", "Akanda"]', verbose_name='Villes couvertes')),
                ('shipping_cost', models.DecimalField(decimal_places=2, default=2000, max_digits=10, validators=[django.core.validators.MinValueValidator(0)], verbose_name='Frais de livraison (FCFA)')),
                ('shipping_free_threshold', models.DecimalField(decimal_places=2, default=25000, max_digits=10, validators=[django.core.validators.MinValueValidator(0)], verbose_name='Seuil livraison gratuite (FCFA)')),
                ('estimated_days_min', models.PositiveIntegerField(default=1, verbose_name='Délai min (jours)')),
                ('estimated_days_max', models.PositiveIntegerField(default=3, verbose_name='Délai max (jours)')),
                ('is_active', models.BooleanField(default=True)),
            ],
            options={
                'verbose_name': 'Zone de livraison',
                'verbose_name_plural': 'Zones de livraison',
                'ordering': ['name'],
            },
        ),
    ]
