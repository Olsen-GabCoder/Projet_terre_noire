from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('marketplace', '0007_add_ready_at_and_alert_to_suborder'),
    ]

    operations = [
        migrations.AddField(
            model_name='suborder',
            name='reminder_sent',
            field=models.BooleanField(default=False, verbose_name='Rappel vendeur envoyé'),
        ),
        migrations.AddField(
            model_name='suborder',
            name='shipment_alert_sent',
            field=models.BooleanField(default=False, verbose_name='Alerte livraison en retard envoyée'),
        ),
    ]
