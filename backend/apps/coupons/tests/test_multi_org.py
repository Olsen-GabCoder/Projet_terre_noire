"""Tests multi-organisations pour le système de coupons."""
from decimal import Decimal
from unittest.mock import patch

from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase

from apps.coupons.models import Coupon, CouponTemplate
from apps.coupons.permissions import get_user_emitter_context
from apps.organizations.models import Organization, OrganizationMembership

User = get_user_model()


class EmitterContextEndpointTest(APITestCase):
    """Tests pour GET /api/coupons/emitter-context/."""

    def setUp(self):
        self.user = User.objects.create_user(
            username='multi', email='multi@test.com', password='TestPass123!',
        )
        self.org_a = Organization.objects.create(
            name='Éditions Alpha', org_type='MAISON_EDITION', owner=self.user,
        )
        self.org_b = Organization.objects.create(
            name='Librairie Beta', org_type='LIBRAIRIE', owner=self.user,
        )
        self.org_c = Organization.objects.create(
            name='Imprimerie Gamma', org_type='IMPRIMERIE', owner=self.user,
        )
        OrganizationMembership.objects.create(
            organization=self.org_a, user=self.user, role='PROPRIETAIRE',
        )
        OrganizationMembership.objects.create(
            organization=self.org_b, user=self.user, role='ADMINISTRATEUR',
        )
        OrganizationMembership.objects.create(
            organization=self.org_c, user=self.user, role='COMMERCIAL',
        )

    def test_emitter_context_multi_orgs(self):
        """User avec 3 orgs → endpoint retourne les 3 avec leurs rôles."""
        self.client.force_authenticate(user=self.user)
        resp = self.client.get('/api/coupons/emitter-context/')
        self.assertEqual(resp.status_code, 200)
        self.assertTrue(resp.data['can_emit'])
        self.assertIsNone(resp.data['provider_profile'])
        orgs = resp.data['organizations']
        self.assertEqual(len(orgs), 3)
        names = {o['name'] for o in orgs}
        self.assertEqual(names, {'Éditions Alpha', 'Librairie Beta', 'Imprimerie Gamma'})
        # Vérifier les rôles
        roles_by_name = {o['name']: o['role'] for o in orgs}
        self.assertEqual(roles_by_name['Éditions Alpha'], 'PROPRIETAIRE')
        self.assertEqual(roles_by_name['Librairie Beta'], 'ADMINISTRATEUR')
        self.assertEqual(roles_by_name['Imprimerie Gamma'], 'COMMERCIAL')
        # Vérifier les org_type
        types_by_name = {o['name']: o['org_type'] for o in orgs}
        self.assertEqual(types_by_name['Éditions Alpha'], 'MAISON_EDITION')
        self.assertEqual(types_by_name['Librairie Beta'], 'LIBRAIRIE')

    def test_emitter_context_zero_orgs(self):
        """User sans org éligible → can_emit=false."""
        nobody = User.objects.create_user(
            username='nobody', email='nobody@test.com', password='TestPass123!',
        )
        self.client.force_authenticate(user=nobody)
        resp = self.client.get('/api/coupons/emitter-context/')
        self.assertEqual(resp.status_code, 200)
        self.assertFalse(resp.data['can_emit'])
        self.assertEqual(resp.data['organizations'], [])
        self.assertIsNone(resp.data['provider_profile'])

    def test_emitter_context_with_provider_profile(self):
        """User prestataire → provider_profile peuplé."""
        from apps.users.models import UserProfile
        prov = User.objects.create_user(
            username='prov', email='prov@test.com', password='TestPass123!',
            first_name='Jean', last_name='Correcteur',
        )
        UserProfile.objects.create(user=prov, profile_type='CORRECTEUR')
        self.client.force_authenticate(user=prov)
        resp = self.client.get('/api/coupons/emitter-context/')
        self.assertEqual(resp.status_code, 200)
        self.assertTrue(resp.data['can_emit'])
        self.assertEqual(resp.data['organizations'], [])
        pp = resp.data['provider_profile']
        self.assertIsNotNone(pp)
        self.assertEqual(pp['profile_type'], 'CORRECTEUR')
        self.assertEqual(pp['display_name'], 'Jean Correcteur')

    def test_emitter_context_unauthenticated(self):
        resp = self.client.get('/api/coupons/emitter-context/')
        self.assertEqual(resp.status_code, 401)


class GetUserEmitterContextUnitTest(APITestCase):
    """Tests unitaires pour get_user_emitter_context avec multi-orgs."""

    def setUp(self):
        self.user = User.objects.create_user(
            username='multi', email='multi@test.com', password='TestPass123!',
        )
        self.org_a = Organization.objects.create(
            name='Org A', org_type='MAISON_EDITION', owner=self.user,
        )
        self.org_b = Organization.objects.create(
            name='Org B', org_type='LIBRAIRIE', owner=self.user,
        )
        OrganizationMembership.objects.create(
            organization=self.org_a, user=self.user, role='PROPRIETAIRE',
        )
        OrganizationMembership.objects.create(
            organization=self.org_b, user=self.user, role='COMMERCIAL',
        )

    def test_multi_orgs_without_id_raises(self):
        """Multi-orgs sans organization_id → ValueError."""
        with self.assertRaises(ValueError) as cm:
            get_user_emitter_context(self.user)
        self.assertIn('plusieurs organisations', str(cm.exception))

    def test_with_valid_org_id(self):
        """Multi-orgs avec organization_id valide → retourne le bon contexte."""
        ctx = get_user_emitter_context(self.user, organization_id=self.org_b.id)
        self.assertEqual(ctx['type'], 'organization')
        self.assertEqual(ctx['organization'].id, self.org_b.id)
        self.assertIsNone(ctx['provider_profile'])

    def test_with_invalid_org_id(self):
        """User passe un organization_id d'une org où il n'a pas de rôle → ValueError."""
        other_org = Organization.objects.create(
            name='Org X', org_type='IMPRIMERIE',
            owner=User.objects.create_user(
                username='other', email='other@test.com', password='TestPass123!',
            ),
        )
        with self.assertRaises(ValueError) as cm:
            get_user_emitter_context(self.user, organization_id=other_org.id)
        self.assertIn("rôle coupon-manager", str(cm.exception))

    def test_mono_org_no_id_required(self):
        """Mono-org sans organization_id → rétrocompatible, retourne l'unique org."""
        mono_user = User.objects.create_user(
            username='mono', email='mono@test.com', password='TestPass123!',
        )
        org = Organization.objects.create(
            name='Solo Org', org_type='MAISON_EDITION', owner=mono_user,
        )
        OrganizationMembership.objects.create(
            organization=org, user=mono_user, role='PROPRIETAIRE',
        )
        ctx = get_user_emitter_context(mono_user)
        self.assertEqual(ctx['type'], 'organization')
        self.assertEqual(ctx['organization'].id, org.id)


class MultiOrgCouponSendTest(APITestCase):
    """Tests envoi/filtrage multi-orgs via les vues API."""

    def setUp(self):
        self.user = User.objects.create_user(
            username='multi', email='multi@test.com', password='TestPass123!',
        )
        self.org_a = Organization.objects.create(
            name='Org A', org_type='MAISON_EDITION', owner=self.user,
        )
        self.org_b = Organization.objects.create(
            name='Org B', org_type='LIBRAIRIE', owner=self.user,
        )
        OrganizationMembership.objects.create(
            organization=self.org_a, user=self.user, role='PROPRIETAIRE',
        )
        OrganizationMembership.objects.create(
            organization=self.org_b, user=self.user, role='COMMERCIAL',
        )
        self.tpl_a = CouponTemplate.objects.create(
            organization=self.org_a, name='Tpl A', discount_type='PERCENT',
            discount_value=Decimal('10'), default_expiry_days=30,
        )
        self.tpl_b = CouponTemplate.objects.create(
            organization=self.org_b, name='Tpl B', discount_type='FIXED',
            discount_value=Decimal('500'), default_expiry_days=30,
        )

    @patch('apps.coupons.tasks.send_coupons_batch_task.delay')
    def test_send_coupon_respects_organization_id(self, mock_delay):
        """User multi-orgs envoie un coupon avec organization_id=A → coupon rattaché à A."""
        self.client.force_authenticate(user=self.user)
        resp = self.client.post('/api/coupons/send/', {
            'template_id': self.tpl_a.id,
            'recipient_emails': ['buyer@test.com'],
            'organization_id': self.org_a.id,
        })
        self.assertEqual(resp.status_code, 202)
        coupon = Coupon.objects.get(recipient_email='buyer@test.com')
        self.assertEqual(coupon.organization_id, self.org_a.id)

    def test_templates_list_filtered_by_organization_id(self):
        """User multi-orgs liste templates avec organization_id=A → ne voit que ceux de A."""
        self.client.force_authenticate(user=self.user)
        resp = self.client.get(f'/api/coupons/templates/?organization_id={self.org_a.id}')
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(len(resp.data), 1)
        self.assertEqual(resp.data[0]['name'], 'Tpl A')

    def test_templates_list_filtered_by_org_b(self):
        """User multi-orgs liste templates avec organization_id=B → ne voit que ceux de B."""
        self.client.force_authenticate(user=self.user)
        resp = self.client.get(f'/api/coupons/templates/?organization_id={self.org_b.id}')
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(len(resp.data), 1)
        self.assertEqual(resp.data[0]['name'], 'Tpl B')

    def test_delete_template_respects_organization_id(self):
        """User multi-orgs supprime un template de A → OK. Template de B → 404."""
        self.client.force_authenticate(user=self.user)
        # Supprimer template de A via contexte A → OK
        resp = self.client.delete(
            f'/api/coupons/templates/{self.tpl_a.id}/?organization_id={self.org_a.id}'
        )
        self.assertEqual(resp.status_code, 204)
        # Tenter de supprimer template de B en passant org A → 404
        resp = self.client.delete(
            f'/api/coupons/templates/{self.tpl_b.id}/?organization_id={self.org_a.id}'
        )
        self.assertEqual(resp.status_code, 404)

    def test_multi_orgs_without_organization_id_returns_400(self):
        """User multi-orgs appelle templates sans organization_id → 400."""
        self.client.force_authenticate(user=self.user)
        resp = self.client.get('/api/coupons/templates/')
        self.assertEqual(resp.status_code, 400)
        self.assertIn('plusieurs organisations', resp.data['error'])


class VendorCustomersMultiOrgTest(APITestCase):
    """Tests vendor-customers multi-orgs."""

    def setUp(self):
        self.user = User.objects.create_user(
            username='multi', email='multi@test.com', password='TestPass123!',
        )
        self.org_a = Organization.objects.create(
            name='Org A', org_type='MAISON_EDITION', owner=self.user,
        )
        self.org_b = Organization.objects.create(
            name='Org B', org_type='LIBRAIRIE', owner=self.user,
        )
        OrganizationMembership.objects.create(
            organization=self.org_a, user=self.user, role='PROPRIETAIRE',
        )
        OrganizationMembership.objects.create(
            organization=self.org_b, user=self.user, role='COMMERCIAL',
        )
        # Créer des commandes pour org A
        from apps.marketplace.models import SubOrder
        from apps.orders.models import Order
        self.buyer_a = User.objects.create_user(
            username='ba', email='ba@test.com', password='TestPass123!',
        )
        self.buyer_b = User.objects.create_user(
            username='bb', email='bb@test.com', password='TestPass123!',
        )
        order_a = Order.objects.create(
            user=self.buyer_a, subtotal=5000, total_amount=5000,
            shipping_address='Addr', shipping_phone='123', shipping_city='City',
        )
        SubOrder.objects.create(order=order_a, vendor=self.org_a, subtotal=5000)
        order_b = Order.objects.create(
            user=self.buyer_b, subtotal=3000, total_amount=3000,
            shipping_address='Addr', shipping_phone='123', shipping_city='City',
        )
        SubOrder.objects.create(order=order_b, vendor=self.org_b, subtotal=3000)

    def test_vendor_customers_respects_organization_id(self):
        """User multi-orgs appelle vendor-customers avec organization_id=A → clients de A uniquement."""
        self.client.force_authenticate(user=self.user)
        resp = self.client.get(f'/api/coupons/vendor-customers/?organization_id={self.org_a.id}')
        self.assertEqual(resp.status_code, 200)
        emails = {c['email'] for c in resp.data}
        self.assertIn('ba@test.com', emails)
        self.assertNotIn('bb@test.com', emails)


class ThrottlePerUserNotPerOrgTest(APITestCase):
    """Vérifier que le throttle est par user, pas par org."""

    def setUp(self):
        self.user = User.objects.create_user(
            username='multi', email='multi@test.com', password='TestPass123!',
        )
        self.org_a = Organization.objects.create(
            name='Org A', org_type='MAISON_EDITION', owner=self.user,
        )
        self.org_b = Organization.objects.create(
            name='Org B', org_type='LIBRAIRIE', owner=self.user,
        )
        OrganizationMembership.objects.create(
            organization=self.org_a, user=self.user, role='PROPRIETAIRE',
        )
        OrganizationMembership.objects.create(
            organization=self.org_b, user=self.user, role='COMMERCIAL',
        )
        self.tpl_a = CouponTemplate.objects.create(
            organization=self.org_a, name='Tpl A', discount_type='PERCENT',
            discount_value=Decimal('10'), default_expiry_days=30,
        )
        self.tpl_b = CouponTemplate.objects.create(
            organization=self.org_b, name='Tpl B', discount_type='FIXED',
            discount_value=Decimal('500'), default_expiry_days=30,
        )

    def test_throttle_is_per_user_not_per_org(self):
        """Le throttle CouponSendThrottle est par user (scope='coupon_send'), vérifié par introspection."""
        from apps.coupons.throttles import CouponSendThrottle
        throttle = CouponSendThrottle()
        self.assertEqual(throttle.scope, 'coupon_send')
        # UserRateThrottle utilise user.pk comme cache key, pas l'org
        self.assertTrue(issubclass(CouponSendThrottle, __import__('rest_framework.throttling', fromlist=['UserRateThrottle']).UserRateThrottle))
