# Data migration: convert old discount_percent/discount_amount → discount_type/discount_value

from django.db import migrations


def migrate_coupons_forward(apps, schema_editor):
    Coupon = apps.get_model('coupons', 'Coupon')
    for coupon in Coupon.objects.all():
        if coupon.discount_percent and coupon.discount_percent > 0:
            coupon.discount_type = 'PERCENT'
            coupon.discount_value = coupon.discount_percent
        elif coupon.discount_amount and coupon.discount_amount > 0:
            coupon.discount_type = 'FIXED'
            coupon.discount_value = coupon.discount_amount
        else:
            coupon.discount_type = 'PERCENT'
            coupon.discount_value = 0

        # Legacy coupons are platform-wide, keep organization=None
        # Mark as SENT (active and usable) to preserve existing behavior
        coupon.status = 'SENT'
        coupon.save(update_fields=[
            'discount_type', 'discount_value', 'status',
        ])


def migrate_coupons_backward(apps, schema_editor):
    Coupon = apps.get_model('coupons', 'Coupon')
    for coupon in Coupon.objects.all():
        if coupon.discount_type == 'PERCENT':
            coupon.discount_percent = coupon.discount_value
            coupon.discount_amount = 0
        elif coupon.discount_type == 'FIXED':
            coupon.discount_percent = None
            coupon.discount_amount = coupon.discount_value
        else:
            coupon.discount_percent = None
            coupon.discount_amount = 0
        coupon.save(update_fields=['discount_percent', 'discount_amount'])


class Migration(migrations.Migration):

    dependencies = [
        ('coupons', '0002_coupon_template_and_coupon_v2'),
    ]

    operations = [
        migrations.RunPython(migrate_coupons_forward, migrate_coupons_backward),
    ]
