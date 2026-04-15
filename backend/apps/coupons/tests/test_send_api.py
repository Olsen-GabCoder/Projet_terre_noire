from decimal import Decimal
from unittest.mock import patch

from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase

from apps.coupons.models import Coupon, CouponTemplate
from apps.organizations.models import Organization, OrganizationMembership

User = get_user_model()


class CouponSendAPITest(APITestCase):
    """Tests pour POST /api/coupons/send/."""

    def setUp(self):
        self.owner = User.objects.create_user(
            username='vendor', email='vendor@test.com', password='TestPass123!',
        )
        self.org = Organization.objects.create(
            name='Éditions A', org_type='MAISON_EDITION', owner=self.owner,
        )
        OrganizationMembership.objects.create(
            organization=self.org, user=self.owner, role='PROPRIETAIRE',
        )
        self.tpl = CouponTemplate.objects.create(
            organization=self.org, name='-10%', discount_type='PERCENT',
            discount_value=Decimal('10'), default_expiry_days=30,
        )
        self.recipient = User.objects.create_user(
            username='buyer', email='buyer@test.com', password='TestPass123!',
        )

    @patch('apps.coupons.tasks.send_coupons_batch_task.delay')
    def test_send_ok(self, mock_delay):
        self.client.force_authenticate(user=self.owner)
        resp = self.client.post('/api/coupons/send/', {
            'template_id': self.tpl.id,
            'recipient_emails': ['buyer@test.com', 'new@test.com', 'other@test.com'],
            'custom_message': 'Merci pour votre fidélité !',
        })
        self.assertEqual(resp.status_code, 202)
        self.assertTrue(resp.data['queued'])
        self.assertEqual(resp.data['count'], 3)

        # 3 coupons créés en PENDING
        coupons = Coupon.objects.filter(organization=self.org)
        self.assertEqual(coupons.count(), 3)
        self.assertTrue(all(c.status == 'PENDING' for c in coupons))
        self.assertTrue(all(c.code.startswith('FROLLOT-') for c in coupons))

        # buyer@test.com doit avoir recipient FK linkée
        buyer_coupon = coupons.get(recipient_email='buyer@test.com')
        self.assertEqual(buyer_coupon.recipient, self.recipient)

        # Celery task appelée
        mock_delay.assert_called_once()

    @patch('apps.coupons.tasks.send_coupons_batch_task.delay')
    def test_send_deduplicates_emails(self, mock_delay):
        self.client.force_authenticate(user=self.owner)
        resp = self.client.post('/api/coupons/send/', {
            'template_id': self.tpl.id,
            'recipient_emails': ['buyer@test.com', 'BUYER@test.com'],
        })
        self.assertEqual(resp.status_code, 202)
        self.assertEqual(resp.data['count'], 1)

    def test_send_by_membre_forbidden(self):
        membre = User.objects.create_user(
            username='membre', email='membre@test.com', password='TestPass123!',
        )
        OrganizationMembership.objects.create(
            organization=self.org, user=membre, role='MEMBRE',
        )
        self.client.force_authenticate(user=membre)
        resp = self.client.post('/api/coupons/send/', {
            'template_id': self.tpl.id,
            'recipient_emails': ['buyer@test.com'],
        })
        self.assertEqual(resp.status_code, 403)

    @patch('apps.coupons.tasks.send_coupons_batch_task.delay')
    def test_send_other_org_template_rejected(self, mock_delay):
        other_owner = User.objects.create_user(
            username='other_vendor', email='other_vendor@test.com', password='TestPass123!',
        )
        other_org = Organization.objects.create(
            name='Éditions B', org_type='MAISON_EDITION', owner=other_owner,
        )
        OrganizationMembership.objects.create(
            organization=other_org, user=other_owner, role='PROPRIETAIRE',
        )
        other_tpl = CouponTemplate.objects.create(
            organization=other_org, name='Other', discount_type='FIXED', discount_value=500,
        )
        self.client.force_authenticate(user=self.owner)
        resp = self.client.post('/api/coupons/send/', {
            'template_id': other_tpl.id,
            'recipient_emails': ['buyer@test.com'],
        })
        self.assertEqual(resp.status_code, 400)

    @patch('apps.coupons.tasks.send_coupons_batch_task.delay')
    def test_send_max_20_recipients(self, mock_delay):
        self.client.force_authenticate(user=self.owner)
        emails = [f'user{i}@test.com' for i in range(21)]
        resp = self.client.post('/api/coupons/send/', {
            'template_id': self.tpl.id,
            'recipient_emails': emails,
        })
        self.assertEqual(resp.status_code, 400)
