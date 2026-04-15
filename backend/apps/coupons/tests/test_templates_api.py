from decimal import Decimal

from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase

from apps.coupons.models import CouponTemplate
from apps.organizations.models import Organization, OrganizationMembership

User = get_user_model()


class CouponTemplateAPITest(APITestCase):
    """Tests CRUD pour /api/coupons/templates/."""

    def setUp(self):
        self.owner = User.objects.create_user(
            username='owner', email='owner@test.com', password='TestPass123!',
        )
        self.org = Organization.objects.create(
            name='Éditions A', org_type='MAISON_EDITION', owner=self.owner,
        )
        OrganizationMembership.objects.create(
            organization=self.org, user=self.owner, role='PROPRIETAIRE',
        )

        self.other_user = User.objects.create_user(
            username='other', email='other@test.com', password='TestPass123!',
        )
        self.other_org = Organization.objects.create(
            name='Éditions B', org_type='MAISON_EDITION', owner=self.other_user,
        )
        OrganizationMembership.objects.create(
            organization=self.other_org, user=self.other_user, role='PROPRIETAIRE',
        )

        self.membre = User.objects.create_user(
            username='membre', email='membre@test.com', password='TestPass123!',
        )
        OrganizationMembership.objects.create(
            organization=self.org, user=self.membre, role='MEMBRE',
        )

    def test_create_template(self):
        self.client.force_authenticate(user=self.owner)
        resp = self.client.post('/api/coupons/templates/', {
            'name': '-10% fidélité',
            'discount_type': 'PERCENT',
            'discount_value': '10.00',
            'default_expiry_days': 30,
        })
        self.assertEqual(resp.status_code, 201)
        self.assertEqual(resp.data['name'], '-10% fidélité')
        self.assertEqual(CouponTemplate.objects.filter(is_system=False).count(), 1)

    def test_create_template_by_membre_forbidden(self):
        self.client.force_authenticate(user=self.membre)
        resp = self.client.post('/api/coupons/templates/', {
            'name': 'Test', 'discount_type': 'FIXED', 'discount_value': '500',
        })
        self.assertEqual(resp.status_code, 403)

    def test_list_templates_scoped_to_org(self):
        CouponTemplate.objects.create(
            organization=self.org, name='T1', discount_type='PERCENT', discount_value=10,
        )
        CouponTemplate.objects.create(
            organization=self.other_org, name='T2', discount_type='FIXED', discount_value=500,
        )
        self.client.force_authenticate(user=self.owner)
        resp = self.client.get('/api/coupons/templates/')
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(len(resp.data), 1)
        self.assertEqual(resp.data[0]['name'], 'T1')

    def test_update_template(self):
        tpl = CouponTemplate.objects.create(
            organization=self.org, name='T1', discount_type='PERCENT', discount_value=10,
        )
        self.client.force_authenticate(user=self.owner)
        resp = self.client.patch(f'/api/coupons/templates/{tpl.id}/', {
            'discount_value': '15.00',
        })
        self.assertEqual(resp.status_code, 200)
        tpl.refresh_from_db()
        self.assertEqual(tpl.discount_value, Decimal('15.00'))

    def test_update_other_org_template_404(self):
        tpl = CouponTemplate.objects.create(
            organization=self.other_org, name='T2', discount_type='FIXED', discount_value=500,
        )
        self.client.force_authenticate(user=self.owner)
        resp = self.client.patch(f'/api/coupons/templates/{tpl.id}/', {'discount_value': '999'})
        self.assertEqual(resp.status_code, 404)

    def test_delete_template(self):
        tpl = CouponTemplate.objects.create(
            organization=self.org, name='T1', discount_type='PERCENT', discount_value=10,
        )
        self.client.force_authenticate(user=self.owner)
        resp = self.client.delete(f'/api/coupons/templates/{tpl.id}/')
        self.assertEqual(resp.status_code, 204)
        self.assertEqual(CouponTemplate.objects.filter(is_system=False).count(), 0)

    def test_unauthenticated_forbidden(self):
        resp = self.client.get('/api/coupons/templates/')
        self.assertEqual(resp.status_code, 401)

    def test_percent_validation_over_100(self):
        self.client.force_authenticate(user=self.owner)
        resp = self.client.post('/api/coupons/templates/', {
            'name': 'Bad', 'discount_type': 'PERCENT', 'discount_value': '150',
        })
        self.assertEqual(resp.status_code, 400)

    def test_create_template_as_provider(self):
        from apps.users.models import UserProfile
        prov_user = User.objects.create_user(
            username='prov', email='prov@test.com', password='TestPass123!',
        )
        UserProfile.objects.create(user=prov_user, profile_type='CORRECTEUR')
        self.client.force_authenticate(user=prov_user)
        resp = self.client.post('/api/coupons/templates/', {
            'name': '-10% correction', 'discount_type': 'PERCENT', 'discount_value': '10',
        })
        self.assertEqual(resp.status_code, 201)
        tpl = CouponTemplate.objects.get(name='-10% correction')
        self.assertIsNotNone(tpl.provider_profile)
        self.assertIsNone(tpl.organization)
