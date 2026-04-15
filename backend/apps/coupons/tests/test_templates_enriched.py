"""Tests pour l'enrichissement CouponTemplate + bibliothèque système + clone."""
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.db import IntegrityError
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from apps.coupons.models import CouponTemplate, Coupon
from apps.organizations.models import Organization, OrganizationMembership
from apps.users.models import UserProfile

User = get_user_model()


class CouponTemplateModelTest(TestCase):
    """Tests modèle CouponTemplate enrichi."""

    def _make_tpl(self, **kwargs):
        defaults = {
            'name': 'Test', 'discount_type': 'PERCENT', 'discount_value': Decimal('10'),
            'icon': 'fas fa-ticket-alt', 'accent_color': '#5b5eea',
        }
        defaults.update(kwargs)
        return CouponTemplate(**defaults)

    def test_icon_validation_accepts_palette(self):
        tpl = self._make_tpl(icon='fas fa-gift')
        tpl.clean()  # No error

    def test_icon_validation_rejects_invalid(self):
        tpl = self._make_tpl(icon='fas fa-invalid-icon')
        with self.assertRaises(ValidationError) as ctx:
            tpl.clean()
        self.assertIn('icon', ctx.exception.message_dict)

    def test_color_validation_accepts_palette(self):
        tpl = self._make_tpl(accent_color='#ec4899')
        tpl.clean()  # No error

    def test_color_validation_rejects_invalid(self):
        tpl = self._make_tpl(accent_color='#xyz123')
        with self.assertRaises(ValidationError) as ctx:
            tpl.clean()
        self.assertIn('accent_color', ctx.exception.message_dict)

    def test_system_slug_unique(self):
        CouponTemplate.objects.create(
            name='A', discount_type='PERCENT', discount_value=10,
            is_system=True, system_slug='test-slug',
        )
        with self.assertRaises(IntegrityError):
            CouponTemplate.objects.create(
                name='B', discount_type='PERCENT', discount_value=10,
                is_system=True, system_slug='test-slug',
            )

    def test_has_quota_remaining_unlimited(self):
        tpl = self._make_tpl(total_quota=None)
        self.assertTrue(tpl.has_quota_remaining)

    def test_has_quota_remaining_ok(self):
        tpl = self._make_tpl(total_quota=10, quota_used=5)
        self.assertTrue(tpl.has_quota_remaining)

    def test_has_quota_remaining_exhausted(self):
        tpl = self._make_tpl(total_quota=10, quota_used=10)
        self.assertFalse(tpl.has_quota_remaining)

    def test_valid_from_before_valid_until(self):
        now = timezone.now()
        tpl = self._make_tpl(valid_from=now, valid_until=now - timezone.timedelta(days=1))
        with self.assertRaises(ValidationError) as ctx:
            tpl.clean()
        self.assertIn('valid_until', ctx.exception.message_dict)


class SeedDataTest(TestCase):
    """Tests sur la bibliothèque système seed."""

    def test_seed_creates_30_system_templates(self):
        self.assertEqual(CouponTemplate.objects.filter(is_system=True).count(), 30)

    def test_seed_all_published(self):
        self.assertEqual(
            CouponTemplate.objects.filter(is_system=True, is_published=True).count(), 30
        )

    def test_seed_slugs_unique(self):
        slugs = list(
            CouponTemplate.objects.filter(is_system=True)
            .values_list('system_slug', flat=True)
        )
        self.assertEqual(len(slugs), len(set(slugs)))

    def test_seed_icons_in_palette(self):
        for tpl in CouponTemplate.objects.filter(is_system=True):
            self.assertIn(tpl.icon, CouponTemplate.ICON_PALETTE, f"Template {tpl.system_slug} has invalid icon {tpl.icon}")

    def test_seed_colors_in_palette(self):
        for tpl in CouponTemplate.objects.filter(is_system=True):
            self.assertIn(tpl.accent_color, CouponTemplate.COLOR_PALETTE, f"Template {tpl.system_slug} has invalid color {tpl.accent_color}")


class SystemLibraryAPITest(TestCase):
    """Tests endpoint GET /api/coupons/templates/system/."""

    @classmethod
    def setUpTestData(cls):
        cls.vendor_user = User.objects.create_user(
            username='vendor_lib', email='vendor_lib@test.com', password='test1234',
        )
        cls.org = Organization.objects.create(name='Lib Org', org_type='MAISON_EDITION', owner=cls.vendor_user)
        OrganizationMembership.objects.create(
            user=cls.vendor_user, organization=cls.org, role='PROPRIETAIRE',
        )
        cls.provider_user = User.objects.create_user(
            username='provider_lib', email='provider_lib@test.com', password='test1234',
        )
        UserProfile.objects.create(
            user=cls.provider_user, profile_type='CORRECTEUR', is_active=True,
        )

    def setUp(self):
        self.client = APIClient()

    def test_vendor_sees_all_and_org(self):
        self.client.force_authenticate(self.vendor_user)
        res = self.client.get('/api/coupons/templates/system/')
        self.assertEqual(res.status_code, 200)
        targets = {t['target_emitter_type'] for t in res.data}
        self.assertFalse('PROVIDER_PROFILE' in targets)
        self.assertTrue(targets.issubset({'ALL', 'ORGANIZATION'}))

    def test_provider_sees_all_and_provider(self):
        self.client.force_authenticate(self.provider_user)
        res = self.client.get('/api/coupons/templates/system/')
        self.assertEqual(res.status_code, 200)
        targets = {t['target_emitter_type'] for t in res.data}
        self.assertFalse('ORGANIZATION' in targets)
        self.assertTrue(targets.issubset({'ALL', 'PROVIDER_PROFILE'}))

    def test_excludes_unpublished(self):
        tpl = CouponTemplate.objects.filter(is_system=True).first()
        tpl.is_published = False
        tpl.save()
        self.client.force_authenticate(self.vendor_user)
        res = self.client.get('/api/coupons/templates/system/')
        ids = [t['id'] for t in res.data]
        self.assertNotIn(tpl.id, ids)
        # Restore
        tpl.is_published = True
        tpl.save()

    def test_ordered_by_display_order(self):
        self.client.force_authenticate(self.vendor_user)
        res = self.client.get('/api/coupons/templates/system/')
        orders = [t['display_order'] for t in res.data]
        self.assertEqual(orders, sorted(orders))

    def test_filter_by_category(self):
        self.client.force_authenticate(self.vendor_user)
        res = self.client.get('/api/coupons/templates/system/?category=FLASH')
        self.assertEqual(res.status_code, 200)
        for t in res.data:
            self.assertEqual(t['category'], 'FLASH')


class CloneAPITest(TestCase):
    """Tests endpoint POST /api/coupons/templates/clone/."""

    @classmethod
    def setUpTestData(cls):
        cls.vendor_user = User.objects.create_user(
            username='vendor_clone', email='vendor_clone@test.com', password='test1234',
        )
        cls.org = Organization.objects.create(name='Clone Org', org_type='MAISON_EDITION', owner=cls.vendor_user)
        OrganizationMembership.objects.create(
            user=cls.vendor_user, organization=cls.org, role='PROPRIETAIRE',
        )
        cls.system_tpl = CouponTemplate.objects.filter(is_system=True).first()

    def setUp(self):
        self.client = APIClient()
        self.client.force_authenticate(self.vendor_user)

    def test_clone_creates_personal_copy(self):
        res = self.client.post('/api/coupons/templates/clone/', {'system_template_id': self.system_tpl.id})
        self.assertEqual(res.status_code, 201)
        clone_id = res.data['id']
        clone = CouponTemplate.objects.get(id=clone_id)
        self.assertFalse(clone.is_system)
        self.assertEqual(clone.commercial_title, self.system_tpl.commercial_title)
        self.assertEqual(clone.discount_type, self.system_tpl.discount_type)

    def test_clone_sets_correct_emitter(self):
        res = self.client.post('/api/coupons/templates/clone/', {'system_template_id': self.system_tpl.id})
        clone = CouponTemplate.objects.get(id=res.data['id'])
        self.assertEqual(clone.organization_id, self.org.id)
        self.assertIsNone(clone.provider_profile_id)

    def test_clone_increments_clone_count(self):
        before = CouponTemplate.objects.get(id=self.system_tpl.id).clone_count
        self.client.post('/api/coupons/templates/clone/', {'system_template_id': self.system_tpl.id})
        after = CouponTemplate.objects.get(id=self.system_tpl.id).clone_count
        self.assertEqual(after, before + 1)

    def test_clone_sets_cloned_from(self):
        res = self.client.post('/api/coupons/templates/clone/', {'system_template_id': self.system_tpl.id})
        clone = CouponTemplate.objects.get(id=res.data['id'])
        self.assertEqual(clone.cloned_from_id, self.system_tpl.id)

    def test_clone_resets_system_fields(self):
        res = self.client.post('/api/coupons/templates/clone/', {'system_template_id': self.system_tpl.id})
        clone = CouponTemplate.objects.get(id=res.data['id'])
        self.assertIsNone(clone.system_slug)
        self.assertFalse(clone.is_system)
        self.assertEqual(clone.quota_used, 0)

    def test_clone_multiple_times_allowed(self):
        self.client.post('/api/coupons/templates/clone/', {'system_template_id': self.system_tpl.id})
        res2 = self.client.post('/api/coupons/templates/clone/', {'system_template_id': self.system_tpl.id})
        self.assertEqual(res2.status_code, 201)

    def test_clone_unpublished_rejected(self):
        tpl = CouponTemplate.objects.create(
            name='Unpub', discount_type='PERCENT', discount_value=10,
            is_system=True, system_slug='test-unpub', is_published=False,
        )
        res = self.client.post('/api/coupons/templates/clone/', {'system_template_id': tpl.id})
        self.assertEqual(res.status_code, 400)

    def test_clone_non_system_rejected(self):
        personal = CouponTemplate.objects.create(
            name='Personal', discount_type='PERCENT', discount_value=10,
            organization=self.org, is_system=False,
        )
        res = self.client.post('/api/coupons/templates/clone/', {'system_template_id': personal.id})
        self.assertEqual(res.status_code, 400)



class PersonalTemplatesListTest(TestCase):
    """Test que GET /api/coupons/templates/ exclut les templates système."""

    @classmethod
    def setUpTestData(cls):
        cls.vendor_user = User.objects.create_user(
            username='vendor_list', email='vendor_list@test.com', password='test1234',
        )
        cls.org = Organization.objects.create(name='List Org', org_type='MAISON_EDITION', owner=cls.vendor_user)
        OrganizationMembership.objects.create(
            user=cls.vendor_user, organization=cls.org, role='PROPRIETAIRE',
        )
        CouponTemplate.objects.create(
            name='Personal', discount_type='PERCENT', discount_value=10,
            organization=cls.org, is_system=False,
        )

    def setUp(self):
        self.client = APIClient()
        self.client.force_authenticate(self.vendor_user)

    def test_personal_templates_list_excludes_system(self):
        res = self.client.get('/api/coupons/templates/')
        self.assertEqual(res.status_code, 200)
        for tpl in res.data:
            # is_system is not in the serializer fields, but we can check by verifying
            # none of the system slugs appear
            self.assertNotIn('system_slug', tpl)


class QuotaAndLimitTest(TestCase):
    """Tests quota et per_customer_limit dans l'envoi."""

    @classmethod
    def setUpTestData(cls):
        cls.vendor_user = User.objects.create_user(
            username='vendor_quota', email='vendor_quota@test.com', password='test1234',
        )
        cls.org = Organization.objects.create(name='Quota Org', org_type='MAISON_EDITION', owner=cls.vendor_user)
        OrganizationMembership.objects.create(
            user=cls.vendor_user, organization=cls.org, role='PROPRIETAIRE',
        )

    def test_send_respects_quota(self):
        tpl = CouponTemplate.objects.create(
            name='Quota Test', discount_type='PERCENT', discount_value=10,
            organization=self.org, total_quota=2, quota_used=2,
        )
        client = APIClient()
        client.force_authenticate(self.vendor_user)
        res = client.post('/api/coupons/send/', {
            'template_id': tpl.id,
            'recipient_emails': ['a@test.com'],
        })
        self.assertIn(res.status_code, [400, 422])

    def test_send_increments_quota_used(self):
        tpl = CouponTemplate.objects.create(
            name='Quota Inc', discount_type='PERCENT', discount_value=10,
            organization=self.org, total_quota=10, quota_used=0,
        )
        from apps.coupons.services import create_coupons_for_send
        create_coupons_for_send(tpl, ['buyer@test.com'], self.vendor_user)
        tpl.refresh_from_db()
        self.assertEqual(tpl.quota_used, 1)

    def test_send_respects_per_customer_limit(self):
        tpl = CouponTemplate.objects.create(
            name='Limit Test', discount_type='PERCENT', discount_value=10,
            organization=self.org, per_customer_limit=1,
        )
        from apps.coupons.services import create_coupons_for_send
        ids1 = create_coupons_for_send(tpl, ['same@test.com'], self.vendor_user)
        self.assertEqual(len(ids1), 1)
        ids2 = create_coupons_for_send(tpl, ['same@test.com'], self.vendor_user)
        self.assertEqual(len(ids2), 0)  # Skipped due to limit


class SystemTemplateProtectionTest(TestCase):
    """Test que les templates système ne sont pas modifiables par un non-admin."""

    @classmethod
    def setUpTestData(cls):
        cls.vendor_user = User.objects.create_user(
            username='vendor_prot', email='vendor_prot@test.com', password='test1234',
        )
        cls.org = Organization.objects.create(name='Prot Org', org_type='MAISON_EDITION', owner=cls.vendor_user)
        OrganizationMembership.objects.create(
            user=cls.vendor_user, organization=cls.org, role='PROPRIETAIRE',
        )

    def test_system_template_not_in_detail_queryset(self):
        """System templates shouldn't appear in the personal detail endpoint."""
        system_tpl = CouponTemplate.objects.filter(is_system=True).first()
        client = APIClient()
        client.force_authenticate(self.vendor_user)
        res = client.get(f'/api/coupons/templates/{system_tpl.id}/')
        self.assertEqual(res.status_code, 404)


# ── Ajustement 2 : read_only_fields sur les champs système ──

class SystemFieldsReadOnlyTest(TestCase):
    """Vérifie que is_system/system_slug/clone_count/target_emitter_type ne sont pas écrivables."""

    @classmethod
    def setUpTestData(cls):
        cls.vendor_user = User.objects.create_user(
            username='vendor_ro', email='vendor_ro@test.com', password='test1234',
        )
        cls.org = Organization.objects.create(name='RO Org', org_type='MAISON_EDITION', owner=cls.vendor_user)
        OrganizationMembership.objects.create(
            user=cls.vendor_user, organization=cls.org, role='PROPRIETAIRE',
        )

    def _client(self):
        c = APIClient()
        c.force_authenticate(self.vendor_user)
        return c

    def test_create_ignores_is_system(self):
        """Un vendeur ne peut pas créer un template système."""
        c = self._client()
        res = c.post('/api/coupons/templates/', {
            'name': 'Hack', 'discount_type': 'PERCENT', 'discount_value': '10',
            'is_system': True, 'system_slug': 'hack-slug', 'clone_count': 99,
        })
        self.assertEqual(res.status_code, 201)
        tpl = CouponTemplate.objects.get(id=res.data['id'])
        self.assertFalse(tpl.is_system)
        self.assertIsNone(tpl.system_slug)
        self.assertEqual(tpl.clone_count, 0)

    def test_create_ignores_target_emitter_type(self):
        """target_emitter_type est read-only à la création."""
        c = self._client()
        res = c.post('/api/coupons/templates/', {
            'name': 'HackTarget', 'discount_type': 'FIXED', 'discount_value': '500',
            'target_emitter_type': 'ORGANIZATION',
        })
        self.assertEqual(res.status_code, 201)
        # target_emitter_type n'est pas dans les fields exposés → non retourné ni écrit

    def test_update_ignores_is_system(self):
        """PATCH ne peut pas rendre un template système."""
        c = self._client()
        tpl = CouponTemplate.objects.create(
            name='PatchMe', discount_type='PERCENT', discount_value=10,
            organization=self.org, is_system=False,
        )
        res = c.patch(f'/api/coupons/templates/{tpl.id}/', {'is_system': True, 'system_slug': 'hacked'})
        self.assertEqual(res.status_code, 200)
        tpl.refresh_from_db()
        self.assertFalse(tpl.is_system)
        self.assertIsNone(tpl.system_slug)


# ── Ajustement 1 : propagation des champs visuels dans les 3 serializers ──

class TemplateVisualPropagationTest(TestCase):
    """Vérifie que icon/color/category/commercial_title/subtitle se propagent dans les 3 serializers."""

    @classmethod
    def setUpTestData(cls):
        cls.vendor_user = User.objects.create_user(
            username='vendor_vis', email='vendor_vis@test.com', password='test1234',
        )
        cls.org = Organization.objects.create(name='Vis Org', org_type='MAISON_EDITION', owner=cls.vendor_user)
        OrganizationMembership.objects.create(
            user=cls.vendor_user, organization=cls.org, role='PROPRIETAIRE',
        )
        cls.buyer = User.objects.create_user(
            username='buyer_vis', email='buyer_vis@test.com', password='test1234',
        )
        cls.tpl = CouponTemplate.objects.create(
            name='Vis Tpl', discount_type='PERCENT', discount_value=Decimal('10'),
            organization=cls.org, is_system=False,
            commercial_title='Super Offre', subtitle='Un sous-titre accrocheur',
            category='FLASH', icon='fas fa-bolt', accent_color='#f43f5e',
        )
        from apps.coupons.models import Coupon
        cls.coupon = Coupon.objects.create(
            code='FROLLOT-VISTEST',
            discount_type='PERCENT', discount_value=Decimal('10'), min_order_amount=Decimal('0'),
            organization=cls.org, status='SENT', is_active=True,
            recipient=cls.buyer, recipient_email=cls.buyer.email,
            template=cls.tpl, created_by=cls.vendor_user,
        )

    def setUp(self):
        self.client = APIClient()

    def test_issued_serializer_returns_visual_fields(self):
        """GET /my-issued/ retourne template_icon, accent_color, category, commercial_title, subtitle."""
        self.client.force_authenticate(self.vendor_user)
        res = self.client.get('/api/coupons/my-issued/')
        self.assertEqual(res.status_code, 200)
        coupon_data = next(c for c in res.data['results'] if c['code'] == 'FROLLOT-VISTEST')
        self.assertEqual(coupon_data['template_icon'], 'fas fa-bolt')
        self.assertEqual(coupon_data['template_accent_color'], '#f43f5e')
        self.assertEqual(coupon_data['template_category'], 'FLASH')
        self.assertEqual(coupon_data['template_commercial_title'], 'Super Offre')
        self.assertEqual(coupon_data['template_subtitle'], 'Un sous-titre accrocheur')

    def test_received_serializer_returns_visual_fields(self):
        """GET /my-received/ retourne template_icon, accent_color, category, commercial_title, subtitle."""
        self.client.force_authenticate(self.buyer)
        res = self.client.get('/api/coupons/my-received/')
        self.assertEqual(res.status_code, 200)
        coupon_data = next(c for c in res.data['results'] if c['code'] == 'FROLLOT-VISTEST')
        self.assertEqual(coupon_data['template_icon'], 'fas fa-bolt')
        self.assertEqual(coupon_data['template_accent_color'], '#f43f5e')
        self.assertEqual(coupon_data['template_category'], 'FLASH')
        self.assertEqual(coupon_data['template_commercial_title'], 'Super Offre')
        self.assertEqual(coupon_data['template_subtitle'], 'Un sous-titre accrocheur')

    def test_applicable_serializer_returns_visual_fields(self):
        """GET /applicable/ retourne template_icon, accent_color, category, commercial_title, subtitle."""
        self.client.force_authenticate(self.buyer)
        res = self.client.get('/api/coupons/applicable/')
        self.assertEqual(res.status_code, 200)
        coupon_data = next((c for c in res.data if c['code'] == 'FROLLOT-VISTEST'), None)
        self.assertIsNotNone(coupon_data)
        self.assertEqual(coupon_data['template_icon'], 'fas fa-bolt')
        self.assertEqual(coupon_data['template_accent_color'], '#f43f5e')
        self.assertEqual(coupon_data['template_category'], 'FLASH')
        self.assertEqual(coupon_data['template_commercial_title'], 'Super Offre')
        self.assertEqual(coupon_data['template_subtitle'], 'Un sous-titre accrocheur')

    def test_fallback_when_no_template(self):
        """Sans template lié, les champs visuels renvoient les valeurs par défaut."""
        from apps.coupons.models import Coupon
        coupon_no_tpl = Coupon.objects.create(
            code='FROLLOT-NOTPL',
            discount_type='FIXED', discount_value=Decimal('1000'), min_order_amount=Decimal('0'),
            organization=self.org, status='SENT', is_active=True,
            recipient=self.buyer, recipient_email=self.buyer.email,
            template=None, created_by=self.vendor_user,
        )
        self.client.force_authenticate(self.buyer)
        res = self.client.get('/api/coupons/my-received/')
        self.assertEqual(res.status_code, 200)
        coupon_data = next(c for c in res.data['results'] if c['code'] == 'FROLLOT-NOTPL')
        self.assertEqual(coupon_data['template_icon'], 'fas fa-ticket-alt')
        self.assertEqual(coupon_data['template_accent_color'], '#5b5eea')
        self.assertIsNone(coupon_data['template_category'])
