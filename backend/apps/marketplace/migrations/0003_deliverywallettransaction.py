"""Ajoute le modèle DeliveryWalletTransaction pour le suivi des gains livreurs."""

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('marketplace', '0002_commissionconfig_service_commission_percent'),
    ]

    operations = [
        migrations.CreateModel(
            name='DeliveryWalletTransaction',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('transaction_type', models.CharField(choices=[
                    ('CREDIT_DELIVERY', 'Crédit — Livraison'),
                    ('DEBIT_WITHDRAWAL', 'Débit — Retrait'),
                    ('CREDIT_BONUS', 'Crédit — Bonus'),
                ], max_length=30)),
                ('amount', models.DecimalField(decimal_places=2, max_digits=12)),
                ('description', models.TextField(blank=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('sub_order', models.ForeignKey(
                    blank=True, null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    to='marketplace.suborder',
                )),
                ('wallet', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='transactions',
                    to='marketplace.deliverywallet',
                )),
            ],
            options={
                'verbose_name': 'Transaction livreur',
                'verbose_name_plural': 'Transactions livreur',
                'ordering': ['-created_at'],
            },
        ),
    ]
