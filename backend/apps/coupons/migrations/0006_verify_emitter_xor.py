"""
Migration garde-fou : vérifie qu'aucun Coupon ni CouponTemplate existant
ne viole la contrainte d'exclusivité XOR (organization XOR provider_profile).
Ne modifie aucune donnée.
"""
from django.db import migrations


def verify_emitter_xor(apps, schema_editor):
    Coupon = apps.get_model('coupons', 'Coupon')
    CouponTemplate = apps.get_model('coupons', 'CouponTemplate')

    # Coupons ayant les DEUX champs remplis
    bad_coupons = Coupon.objects.filter(
        organization__isnull=False,
        provider_profile__isnull=False,
    ).count()
    if bad_coupons:
        raise Exception(
            f"{bad_coupons} coupon(s) violate emitter XOR constraint "
            f"(both organization and provider_profile are set)."
        )

    # CouponTemplates ayant les DEUX champs remplis
    bad_templates = CouponTemplate.objects.filter(
        organization__isnull=False,
        provider_profile__isnull=False,
    ).count()
    if bad_templates:
        raise Exception(
            f"{bad_templates} coupon template(s) violate emitter XOR constraint "
            f"(both organization and provider_profile are set)."
        )


class Migration(migrations.Migration):

    dependencies = [
        ('coupons', '0005_coupon_provider_profile'),
    ]

    operations = [
        migrations.RunPython(verify_emitter_xor, migrations.RunPython.noop),
    ]
