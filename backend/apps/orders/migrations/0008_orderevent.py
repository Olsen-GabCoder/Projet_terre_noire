import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('orders', '0007_account_deletion_set_null'),
        ('marketplace', '0009_suborder_attempted_delivery_tracking'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='OrderEvent',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('event_type', models.CharField(choices=[
                    ('ORDER_CREATED', 'Commande créée'),
                    ('PAYMENT_RECEIVED', 'Paiement reçu'),
                    ('PAYMENT_FAILED', 'Paiement échoué'),
                    ('STATUS_CHANGE', 'Changement de statut'),
                    ('DELIVERY_ASSIGNED', 'Livreur assigné'),
                    ('DELIVERY_ATTEMPTED', 'Tentative de livraison'),
                    ('CANCELLATION', 'Annulation'),
                    ('STOCK_RESTORED', 'Stock restauré'),
                    ('COUPON_RESTORED', 'Coupon restauré'),
                    ('WALLET_CREDITED', 'Portefeuille crédité'),
                ], max_length=50)),
                ('actor_role', models.CharField(blank=True, default='system', max_length=20)),
                ('from_status', models.CharField(blank=True, max_length=20)),
                ('to_status', models.CharField(blank=True, max_length=20)),
                ('metadata', models.JSONField(blank=True, default=dict)),
                ('description', models.CharField(max_length=300)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('order', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='events', to='orders.order')),
                ('sub_order', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='events', to='marketplace.suborder')),
                ('actor', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='order_events', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'verbose_name': 'Événement commande',
                'verbose_name_plural': 'Événements commandes',
                'ordering': ['-created_at'],
                'indexes': [models.Index(fields=['order', '-created_at'], name='orders_order_order_i_idx')],
            },
        ),
    ]
