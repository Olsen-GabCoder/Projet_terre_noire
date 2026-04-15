"""Copie description_for_email → marketing_description pour les templates existants."""
from django.db import migrations


def copy_description(apps, schema_editor):
    CouponTemplate = apps.get_model('coupons', 'CouponTemplate')
    for tpl in CouponTemplate.objects.filter(marketing_description='').exclude(description_for_email=''):
        tpl.marketing_description = tpl.description_for_email
        tpl.save(update_fields=['marketing_description'])


class Migration(migrations.Migration):

    dependencies = [
        ('coupons', '0007_enrich_coupon_template'),
    ]

    operations = [
        migrations.RunPython(copy_description, migrations.RunPython.noop),
    ]
