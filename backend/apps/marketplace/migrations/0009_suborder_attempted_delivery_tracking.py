from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('marketplace', '0008_suborder_reminder_and_shipment_alert'),
    ]

    operations = [
        migrations.AlterField(
            model_name='suborder',
            name='status',
            field=models.CharField(
                choices=[
                    ('PENDING', 'En attente'),
                    ('CONFIRMED', 'Confirmé par le vendeur'),
                    ('PREPARING', 'En préparation'),
                    ('READY', 'Prêt pour livraison'),
                    ('SHIPPED', 'Expédié'),
                    ('ATTEMPTED', 'Tentative de livraison échouée'),
                    ('DELIVERED', 'Livré'),
                    ('CANCELLED', 'Annulé'),
                ],
                default='PENDING',
                max_length=20,
            ),
        ),
        migrations.AddField(
            model_name='suborder',
            name='attempt_count',
            field=models.PositiveIntegerField(default=0, verbose_name='Nombre de tentatives'),
        ),
        migrations.AddField(
            model_name='suborder',
            name='last_attempt_at',
            field=models.DateTimeField(blank=True, null=True, verbose_name='Dernière tentative'),
        ),
        migrations.AddField(
            model_name='suborder',
            name='last_attempt_reason',
            field=models.CharField(blank=True, max_length=200, verbose_name='Raison dernière tentative'),
        ),
    ]
