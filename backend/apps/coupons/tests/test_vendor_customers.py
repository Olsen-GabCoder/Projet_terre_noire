from decimal import Decimal

from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase

from apps.marketplace.models import SubOrder
from apps.orders.models import Order
from apps.organizations.models import Organization, OrganizationMembership

User = get_user_model()


class VendorCustomerListTest(APITestCase):
    """Tests pour GET /api/coupons/vendor-customers/."""

    def setUp(self):
        self.owner = User.objects.create_user(
            username='vendor', email='vendor@test.com', password='TestPass123!',
        )
        self.org = Organization.objects.create(
            name='Org A', org_type='MAISON_EDITION', owner=self.owner,
        )
        OrganizationMembership.objects.create(
            organization=self.org, user=self.owner, role='PROPRIETAIRE',
        )
        # Create some orders with SubOrders
        self.buyer1 = User.objects.create_user(
            username='b1', email='b1@test.com', password='TestPass123!',
            first_name='Jean', last_name='Dupont',
        )
        self.buyer2 = User.objects.create_user(
            username='b2', email='b2@test.com', password='TestPass123!',
            first_name='Marie', last_name='Martin',
        )
        for buyer in [self.buyer1, self.buyer1, self.buyer2]:
            order = Order.objects.create(
                user=buyer, subtotal=5000, total_amount=5000,
                shipping_address='Addr', shipping_phone='123', shipping_city='City',
            )
            SubOrder.objects.create(order=order, vendor=self.org, subtotal=5000)

    def test_returns_customers(self):
        self.client.force_authenticate(user=self.owner)
        resp = self.client.get('/api/coupons/vendor-customers/')
        self.assertEqual(resp.status_code, 200)
        emails = {c['email'] for c in resp.data}
        self.assertIn('b1@test.com', emails)
        self.assertIn('b2@test.com', emails)

    def test_non_member_forbidden(self):
        other = User.objects.create_user(
            username='rando', email='rando@test.com', password='TestPass123!',
        )
        self.client.force_authenticate(user=other)
        resp = self.client.get('/api/coupons/vendor-customers/')
        self.assertEqual(resp.status_code, 403)
