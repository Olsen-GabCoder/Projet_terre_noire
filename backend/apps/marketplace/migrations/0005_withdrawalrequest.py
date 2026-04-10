"""Ajoute le modele WithdrawalRequest pour les retraits wallet."""
import django.core.validators
import django.db.models.deletion
from decimal import Decimal
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('marketplace', '0004_deliveryrate'),
    ]

    operations = [
        migrations.CreateModel(
            name='WithdrawalRequest',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('wallet_type', models.CharField(choices=[('VENDOR', 'Vendeur'), ('DELIVERY', 'Livreur'), ('PROFESSIONAL', 'Professionnel')], max_length=20)),
                ('amount', models.DecimalField(decimal_places=2, max_digits=12, validators=[django.core.validators.MinValueValidator(Decimal('1000'))], verbose_name='Montant')),
                ('currency', models.CharField(default='XAF', max_length=3)),
                ('provider', models.CharField(choices=[('MOBICASH', 'Mobicash (Gabon Telecom)'), ('AIRTEL', 'Airtel Money')], max_length=20)),
                ('phone_number', models.CharField(max_length=20, verbose_name='Numero Mobile Money')),
                ('status', models.CharField(choices=[('PENDING', 'En attente'), ('PROCESSING', 'En cours'), ('COMPLETED', 'Termine'), ('FAILED', 'Echoue'), ('CANCELLED', 'Annule')], default='PENDING', max_length=20)),
                ('transaction_id', models.CharField(blank=True, max_length=100, null=True, verbose_name='Reference transaction provider')),
                ('failure_reason', models.TextField(blank=True, default='')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('processed_at', models.DateTimeField(blank=True, null=True)),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='withdrawal_requests', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'verbose_name': 'Demande de retrait',
                'verbose_name_plural': 'Demandes de retrait',
                'ordering': ['-created_at'],
            },
        ),
    ]
