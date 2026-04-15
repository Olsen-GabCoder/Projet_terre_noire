# Remove legacy discount_percent and discount_amount fields

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('coupons', '0003_data_migrate_coupons'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='coupon',
            name='discount_percent',
        ),
        migrations.RemoveField(
            model_name='coupon',
            name='discount_amount',
        ),
    ]
