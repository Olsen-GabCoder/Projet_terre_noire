from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('orders', '0009_coupon_template_and_coupon_v2'),
    ]

    operations = [
        migrations.AddField(
            model_name='order',
            name='client_request_id',
            field=models.UUIDField(blank=True, db_index=True, null=True),
        ),
        migrations.AddIndex(
            model_name='order',
            index=models.Index(fields=['user', 'client_request_id'], name='orders_orde_user_id_crid_idx'),
        ),
    ]
