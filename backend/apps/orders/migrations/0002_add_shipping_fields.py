# Generated manually for shipping cost support

import django.core.validators
from django.db import migrations, models


def backfill_subtotal(apps, schema_editor):
    """Pour les commandes existantes : subtotal = total_amount, shipping_cost = 0."""
    Order = apps.get_model('orders', 'Order')
    for order in Order.objects.all():
        order.subtotal = order.total_amount
        order.shipping_cost = 0
        order.save()


class Migration(migrations.Migration):

    dependencies = [
        ('orders', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='order',
            name='subtotal',
            field=models.DecimalField(decimal_places=2, default=0, max_digits=10, validators=[django.core.validators.MinValueValidator(0)]),
        ),
        migrations.AddField(
            model_name='order',
            name='shipping_cost',
            field=models.DecimalField(decimal_places=2, default=0, max_digits=10, validators=[django.core.validators.MinValueValidator(0)]),
        ),
        migrations.RunPython(backfill_subtotal, migrations.RunPython.noop),
    ]
