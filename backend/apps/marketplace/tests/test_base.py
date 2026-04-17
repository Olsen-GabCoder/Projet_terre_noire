"""Shared fixtures for marketplace tests."""
from decimal import Decimal

from django.test import TestCase
from rest_framework.test import APIClient

from apps.books.models import Category, Author, Book
from apps.marketplace.models import (
    BookListing, SubOrder, CommissionConfig, VendorWallet, DeliveryWallet,
)
from apps.orders.models import Order, OrderItem
from apps.organizations.models import Organization, OrganizationMembership
from apps.users.models import User, UserProfile


class MarketplaceTestBase(TestCase):
    """Base class providing common fixtures for all marketplace tests."""

    @classmethod
    def setUpTestData(cls):
        # ── Users ──
        cls.vendor_user = User.objects.create_user(
            username='vendor1', email='vendor@test.com', password='Testpass1!',
            first_name='Vendeur', last_name='Test',
        )
        cls.buyer_user = User.objects.create_user(
            username='buyer1', email='buyer@test.com', password='Testpass1!',
            first_name='Acheteur', last_name='Test',
        )
        cls.delivery_user = User.objects.create_user(
            username='delivery1', email='delivery@test.com', password='Testpass1!',
            first_name='Livreur', last_name='Test',
        )
        cls.admin_user = User.objects.create_user(
            username='admin1', email='admin@test.com', password='Testpass1!',
            first_name='Admin', last_name='Test', is_staff=True, is_superuser=True,
        )
        cls.random_user = User.objects.create_user(
            username='random1', email='random@test.com', password='Testpass1!',
        )

        # ── Profiles ──
        cls.delivery_profile = UserProfile.objects.create(
            user=cls.delivery_user, profile_type='LIVREUR', is_active=True,
        )
        # Vendor user also gets a LECTEUR profile (common pattern)
        UserProfile.objects.create(
            user=cls.vendor_user, profile_type='LECTEUR', is_active=True,
        )

        # ── Organization ──
        cls.vendor_org = Organization.objects.create(
            name='Librairie Test', org_type='LIBRAIRIE',
            email='librairie@test.com', city='Libreville',
            owner=cls.vendor_user,
        )
        cls.vendor_membership = OrganizationMembership.objects.create(
            organization=cls.vendor_org, user=cls.vendor_user,
            role='PROPRIETAIRE', is_active=True,
        )

        # ── Book ──
        cls.category = Category.objects.create(name='Roman MKT Test')
        cls.author = Author.objects.create(full_name='Auteur Test')
        cls.book = Book.objects.create(
            title='Livre Test', reference='978-TEST-001',
            description='Un livre de test', price=Decimal('5000'),
            category=cls.category, author=cls.author, format='PAPIER',
        )

        # ── Listing ──
        cls.listing = BookListing.objects.create(
            book=cls.book, vendor=cls.vendor_org,
            price=Decimal('5000'), stock=10, is_active=True,
        )

        # ── Commission ──
        cls.commission = CommissionConfig.objects.create(
            platform_commission_percent=Decimal('10.00'),
            delivery_base_fee=Decimal('1500'),
        )

    def setUp(self):
        self.client = APIClient()

    # ── Helpers ──

    def _auth(self, user):
        self.client.force_authenticate(user=user)

    def _create_order(self, user=None, total=Decimal('5000')):
        user = user or self.buyer_user
        order = Order.objects.create(
            user=user, status='PAID', subtotal=total,
            total_amount=total, shipping_address='123 Rue Test',
            shipping_phone='+24101234567', shipping_city='Libreville',
        )
        return order

    def _create_suborder(self, order=None, vendor=None, subtotal=Decimal('5000'),
                         delivery_fee=Decimal('1500'), status='PENDING',
                         delivery_agent=None):
        order = order or self._create_order()
        vendor = vendor or self.vendor_org
        return SubOrder.objects.create(
            order=order, vendor=vendor, subtotal=subtotal,
            shipping_cost=Decimal('0'), delivery_fee=delivery_fee,
            status=status, delivery_agent=delivery_agent,
        )

    def _create_order_with_suborder(self, **so_kwargs):
        order = self._create_order()
        so = self._create_suborder(order=order, **so_kwargs)
        OrderItem.objects.create(
            order=order, book=self.book, quantity=1,
            price=self.listing.price, listing=self.listing, sub_order=so,
            vendor=self.vendor_org,
        )
        return order, so
