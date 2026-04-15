from datetime import timedelta
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone

from apps.coupons.models import Coupon, CouponTemplate
from apps.organizations.models import Organization, OrganizationMembership
from apps.orders.models import Order

User = get_user_model()


class CouponTemplateModelTest(TestCase):
    """Tests for CouponTemplate model."""

    def setUp(self):
        self.owner = User.objects.create_user(
            username='owner', email='owner@example.com', password='TestPass123!',
        )
        self.org = Organization.objects.create(
            name='Éditions Test', org_type='MAISON_EDITION', owner=self.owner,
        )

    def test_create_template(self):
        tpl = CouponTemplate.objects.create(
            organization=self.org,
            name='-10% fidélité',
            discount_type='PERCENT',
            discount_value=Decimal('10.00'),
            default_expiry_days=30,
            created_by=self.owner,
        )
        self.assertEqual(str(tpl), '-10% fidélité (Éditions Test)')
        self.assertTrue(tpl.is_active)
        self.assertEqual(tpl.min_order_amount, Decimal('0'))

    def test_two_templates_different_names_ok(self):
        CouponTemplate.objects.create(
            organization=self.org, name='Offre A',
            discount_type='FIXED', discount_value=Decimal('500'),
        )
        tpl2 = CouponTemplate.objects.create(
            organization=self.org, name='Offre B',
            discount_type='FIXED', discount_value=Decimal('1000'),
        )
        self.assertEqual(CouponTemplate.objects.filter(organization=self.org).count(), 2)

    def test_template_free_shipping(self):
        tpl = CouponTemplate.objects.create(
            organization=self.org, name='Livraison offerte',
            discount_type='FREE_SHIPPING', discount_value=Decimal('0'),
        )
        self.assertEqual(tpl.discount_type, 'FREE_SHIPPING')
        self.assertEqual(tpl.discount_value, Decimal('0'))

    def test_created_by_nullable(self):
        """created_by peut être null (coupons créés avant la feature)."""
        tpl = CouponTemplate.objects.create(
            organization=self.org, name='Sans créateur',
            discount_type='PERCENT', discount_value=Decimal('5'),
            created_by=None,
        )
        self.assertIsNone(tpl.created_by)


class CouponGenerateCodeTest(TestCase):
    """Tests for Coupon.generate_code()."""

    def test_code_format(self):
        code = Coupon.generate_code()
        self.assertTrue(code.startswith('FROLLOT-'))
        self.assertEqual(len(code), 14)  # FROLLOT- (8) + 6 chars

    def test_code_uniqueness(self):
        codes = {Coupon.generate_code() for _ in range(50)}
        self.assertEqual(len(codes), 50)

    def test_no_collision_with_existing(self):
        existing_code = Coupon.generate_code()
        Coupon.objects.create(
            code=existing_code, discount_type='PERCENT',
            discount_value=Decimal('10'), status='SENT',
        )
        new_code = Coupon.generate_code()
        self.assertNotEqual(existing_code, new_code)


class CouponStrTest(TestCase):
    """Tests for Coupon.__str__()."""

    def test_percent_str(self):
        c = Coupon(code='TEST-A', discount_type='PERCENT', discount_value=Decimal('10'))
        self.assertIn('TEST-A', str(c))
        self.assertIn('%', str(c))

    def test_fixed_str(self):
        c = Coupon(code='TEST-B', discount_type='FIXED', discount_value=Decimal('5000'))
        self.assertIn('TEST-B', str(c))
        self.assertIn('FCFA', str(c))

    def test_free_shipping_str(self):
        c = Coupon(code='TEST-C', discount_type='FREE_SHIPPING', discount_value=Decimal('0'))
        self.assertEqual(str(c), 'TEST-C (Livraison offerte)')


class CouponIsValidForTest(TestCase):
    """Tests for Coupon.is_valid_for() method."""

    def setUp(self):
        self.user = User.objects.create_user(
            username='buyer', email='buyer@example.com', password='TestPass123!',
        )
        self.other_user = User.objects.create_user(
            username='other', email='other@example.com', password='TestPass123!',
        )
        self.now = timezone.now()

    def _make_coupon(self, **overrides):
        defaults = dict(
            code=Coupon.generate_code(),
            discount_type='PERCENT',
            discount_value=Decimal('10'),
            status='SENT',
            is_active=True,
            max_uses=1,
            usage_count=0,
            valid_from=self.now - timedelta(days=1),
            valid_until=self.now + timedelta(days=30),
        )
        defaults.update(overrides)
        return Coupon.objects.create(**defaults)

    def test_valid_coupon(self):
        c = self._make_coupon()
        self.assertTrue(c.is_valid_for(self.user))

    def test_invalid_status_pending(self):
        c = self._make_coupon(status='PENDING')
        self.assertFalse(c.is_valid_for(self.user))

    def test_invalid_status_used(self):
        c = self._make_coupon(status='USED')
        self.assertFalse(c.is_valid_for(self.user))

    def test_invalid_status_expired(self):
        c = self._make_coupon(status='EXPIRED')
        self.assertFalse(c.is_valid_for(self.user))

    def test_invalid_status_revoked(self):
        c = self._make_coupon(status='REVOKED')
        self.assertFalse(c.is_valid_for(self.user))

    def test_inactive(self):
        c = self._make_coupon(is_active=False)
        self.assertFalse(c.is_valid_for(self.user))

    def test_not_yet_valid(self):
        c = self._make_coupon(valid_from=self.now + timedelta(days=1))
        self.assertFalse(c.is_valid_for(self.user))

    def test_expired_date(self):
        c = self._make_coupon(valid_until=self.now - timedelta(hours=1))
        self.assertFalse(c.is_valid_for(self.user))

    def test_max_uses_reached(self):
        c = self._make_coupon(max_uses=1, usage_count=1)
        self.assertFalse(c.is_valid_for(self.user))

    def test_personal_coupon_correct_recipient(self):
        c = self._make_coupon(recipient=self.user)
        self.assertTrue(c.is_valid_for(self.user))

    def test_personal_coupon_wrong_recipient(self):
        c = self._make_coupon(recipient=self.other_user)
        self.assertFalse(c.is_valid_for(self.user))

    def test_personal_coupon_by_email_match(self):
        c = self._make_coupon(recipient_email='buyer@example.com', recipient=None)
        self.assertTrue(c.is_valid_for(self.user))

    def test_personal_coupon_by_email_no_match(self):
        c = self._make_coupon(recipient_email='someone@example.com', recipient=None)
        self.assertFalse(c.is_valid_for(self.user))

    def test_min_order_amount_met(self):
        c = self._make_coupon(min_order_amount=Decimal('5000'))
        self.assertTrue(c.is_valid_for(self.user, scoped_subtotal=Decimal('6000')))

    def test_min_order_amount_not_met(self):
        c = self._make_coupon(min_order_amount=Decimal('5000'))
        self.assertFalse(c.is_valid_for(self.user, scoped_subtotal=Decimal('3000')))

    def test_min_order_amount_not_checked_if_none(self):
        """If scoped_subtotal is not provided, min_order_amount is not checked."""
        c = self._make_coupon(min_order_amount=Decimal('5000'))
        self.assertTrue(c.is_valid_for(self.user))

    def test_no_valid_dates_means_always_valid(self):
        c = self._make_coupon(valid_from=None, valid_until=None)
        self.assertTrue(c.is_valid_for(self.user))

    def test_unlimited_uses(self):
        c = self._make_coupon(max_uses=None, usage_count=999)
        self.assertTrue(c.is_valid_for(self.user))


class CouponApplyTest(TestCase):
    """Tests for Coupon.apply() method."""

    def setUp(self):
        self.user = User.objects.create_user(
            username='buyer', email='buyer@example.com', password='TestPass123!',
        )

    def test_apply_sets_all_fields(self):
        coupon = Coupon.objects.create(
            code='APPLY-TEST', discount_type='PERCENT',
            discount_value=Decimal('10'), status='SENT',
            max_uses=1, usage_count=0,
        )
        order = Order.objects.create(
            user=self.user, subtotal=Decimal('5000'),
            total_amount=Decimal('4500'),
            shipping_address='Addr', shipping_phone='123', shipping_city='City',
        )
        coupon.apply(user=self.user, order=order)
        coupon.refresh_from_db()

        self.assertEqual(coupon.status, 'USED')
        self.assertEqual(coupon.used_by, self.user)
        self.assertIsNotNone(coupon.used_at)
        self.assertEqual(coupon.used_on_order, order)
        self.assertEqual(coupon.usage_count, 1)


class CouponRestoreTest(TestCase):
    """Tests for Coupon.restore() method."""

    def setUp(self):
        self.user = User.objects.create_user(
            username='buyer', email='buyer@example.com', password='TestPass123!',
        )

    def test_restore_resets_all_fields(self):
        order = Order.objects.create(
            user=self.user, subtotal=Decimal('5000'),
            total_amount=Decimal('4500'),
            shipping_address='Addr', shipping_phone='123', shipping_city='City',
        )
        coupon = Coupon.objects.create(
            code='RESTORE-TEST', discount_type='PERCENT',
            discount_value=Decimal('10'), status='USED',
            max_uses=1, usage_count=1,
            used_by=self.user, used_at=timezone.now(), used_on_order=order,
        )
        coupon.restore()
        coupon.refresh_from_db()

        self.assertEqual(coupon.status, 'SENT')
        self.assertIsNone(coupon.used_by)
        self.assertIsNone(coupon.used_at)
        self.assertIsNone(coupon.used_on_order)
        self.assertEqual(coupon.usage_count, 0)

    def test_restore_does_not_go_negative(self):
        coupon = Coupon.objects.create(
            code='RESTORE-NEG', discount_type='FIXED',
            discount_value=Decimal('500'), status='USED',
            usage_count=0,
        )
        coupon.restore()
        coupon.refresh_from_db()
        self.assertEqual(coupon.usage_count, 0)


class CouponProviderProfileTest(TestCase):
    """Tests for provider_profile support on Coupon and CouponTemplate."""

    def setUp(self):
        self.user = User.objects.create_user(
            username='provider', email='provider@example.com', password='TestPass123!',
        )
        from apps.users.models import UserProfile
        self.profile = UserProfile.objects.create(
            user=self.user, profile_type='CORRECTEUR',
        )
        self.org_owner = User.objects.create_user(
            username='orgowner', email='orgowner@example.com', password='TestPass123!',
        )
        self.org = Organization.objects.create(
            name='Éditions Test', org_type='MAISON_EDITION', owner=self.org_owner,
        )

    def test_coupon_with_provider_profile(self):
        c = Coupon.objects.create(
            code='PROV-001', discount_type='PERCENT', discount_value=Decimal('10'),
            status='SENT', provider_profile=self.profile,
        )
        self.assertEqual(c.provider_profile, self.profile)
        self.assertIsNone(c.organization)

    def test_coupon_emitter_xor_violation(self):
        from django.db import IntegrityError
        with self.assertRaises(IntegrityError):
            Coupon.objects.create(
                code='XOR-FAIL', discount_type='PERCENT', discount_value=Decimal('10'),
                status='SENT', organization=self.org, provider_profile=self.profile,
            )

    def test_coupon_emitter_both_null_ok(self):
        c = Coupon.objects.create(
            code='PLAT-001', discount_type='PERCENT', discount_value=Decimal('5'),
            status='SENT',
        )
        self.assertIsNone(c.organization)
        self.assertIsNone(c.provider_profile)

    def test_template_with_provider_profile(self):
        tpl = CouponTemplate.objects.create(
            provider_profile=self.profile, name='Promo correcteur',
            discount_type='PERCENT', discount_value=Decimal('15'),
        )
        self.assertEqual(tpl.provider_profile, self.profile)
        self.assertIsNone(tpl.organization)

    def test_template_emitter_xor_violation(self):
        from django.db import IntegrityError
        with self.assertRaises(IntegrityError):
            CouponTemplate.objects.create(
                organization=self.org, provider_profile=self.profile,
                name='XOR fail', discount_type='FIXED', discount_value=Decimal('500'),
            )

    def test_template_same_name_different_emitters_ok(self):
        CouponTemplate.objects.create(
            organization=self.org, name='Promo', discount_type='PERCENT', discount_value=Decimal('10'),
        )
        CouponTemplate.objects.create(
            provider_profile=self.profile, name='Promo', discount_type='PERCENT', discount_value=Decimal('10'),
        )
        self.assertEqual(CouponTemplate.objects.filter(name='Promo').count(), 2)

    def test_is_valid_for_provider_profile_match(self):
        c = Coupon.objects.create(
            code='PROV-MATCH', discount_type='PERCENT', discount_value=Decimal('10'),
            status='SENT', is_active=True, max_uses=1,
            provider_profile=self.profile,
        )
        self.assertTrue(c.is_valid_for(self.user, provider_profile_id=self.profile.id))

    def test_is_valid_for_provider_profile_mismatch(self):
        other_user = User.objects.create_user(
            username='other_prov', email='other_prov@example.com', password='TestPass123!',
        )
        from apps.users.models import UserProfile
        other_profile = UserProfile.objects.create(user=other_user, profile_type='ILLUSTRATEUR')
        c = Coupon.objects.create(
            code='PROV-MISMATCH', discount_type='PERCENT', discount_value=Decimal('10'),
            status='SENT', is_active=True, max_uses=1,
            provider_profile=self.profile,
        )
        self.assertFalse(c.is_valid_for(self.user, provider_profile_id=other_profile.id))

    def test_apply_with_no_order(self):
        """apply() with order=None for service coupons."""
        c = Coupon.objects.create(
            code='SVC-APPLY', discount_type='FIXED', discount_value=Decimal('500'),
            status='SENT', max_uses=1,
        )
        c.apply(user=self.user, order=None)
        c.refresh_from_db()
        self.assertEqual(c.status, 'USED')
        self.assertIsNone(c.used_on_order)
        self.assertEqual(c.used_by, self.user)

    def test_get_emitter_name_org(self):
        from apps.coupons.services import get_emitter_name
        c = Coupon.objects.create(
            code='NAME-ORG', discount_type='PERCENT', discount_value=Decimal('10'),
            status='SENT', organization=self.org,
        )
        self.assertEqual(get_emitter_name(c), 'Éditions Test')

    def test_get_emitter_name_provider(self):
        from apps.coupons.services import get_emitter_name
        c = Coupon.objects.create(
            code='NAME-PROV', discount_type='PERCENT', discount_value=Decimal('10'),
            status='SENT', provider_profile=self.profile,
        )
        name = get_emitter_name(c)
        self.assertIn('provider', name.lower())

    def test_get_emitter_name_platform(self):
        from apps.coupons.services import get_emitter_name
        c = Coupon.objects.create(
            code='NAME-PLAT', discount_type='PERCENT', discount_value=Decimal('5'),
            status='SENT',
        )
        self.assertEqual(get_emitter_name(c), 'Frollot')
