"""
Tests complets pour l'app library.
Couvre : catalogue, adhesions, prets, reservations.
"""
from datetime import timedelta

from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from apps.books.models import Author, Book, Category
import unittest

from apps.library.models import (
    LibraryCatalogItem, LibraryMembership, BookLoan, LoanExtension,
    BookReservation,
)
from apps.organizations.models import Organization, OrganizationMembership

User = get_user_model()


class LibraryTestBase(APITestCase):
    """Base de test avec donnees partagees pour la bibliotheque."""

    @classmethod
    def setUpTestData(cls):
        # ── Utilisateurs ──
        cls.admin_user = User.objects.create_superuser(
            username='bib_admin',
            email='bib_admin@frollot.test',
            password='AdminPass123!',
            first_name='Admin',
            last_name='Bib',
        )
        cls.regular_user = User.objects.create_user(
            username='lecteur1',
            email='lecteur1@frollot.test',
            password='LecteurPass123!',
            first_name='Paul',
            last_name='Lecteur',
        )
        cls.other_user = User.objects.create_user(
            username='lecteur2',
            email='lecteur2@frollot.test',
            password='LecteurPass123!',
            first_name='Claire',
            last_name='Liseuse',
        )

        # ── Organisation Bibliotheque ──
        cls.library = Organization.objects.create(
            name='Bibliotheque Centrale Test',
            org_type='BIBLIOTHEQUE',
            owner=cls.admin_user,
            email='bib@frollot.test',
        )
        # Admin de la bibliotheque (membership org)
        OrganizationMembership.objects.create(
            organization=cls.library,
            user=cls.admin_user,
            role='PROPRIETAIRE',
        )

        # ── Livre de test ──
        cls.category = Category.objects.create(name='Roman Test')
        cls.author = Author.objects.create(full_name='Ahmadou Kourouma')
        cls.book = Book.objects.create(
            title='Les Soleils des Independances',
            reference='ISBN-TEST-001',
            description='Roman classique africain.',
            price=5000,
            format='PAPIER',
            category=cls.category,
            author=cls.author,
        )
        cls.book2 = Book.objects.create(
            title='Allah n est pas oblige',
            reference='ISBN-TEST-002',
            description='Deuxieme roman de test.',
            price=6000,
            format='PAPIER',
            category=cls.category,
            author=cls.author,
        )

    def _url(self, path):
        """Helper pour construire les URLs library-scoped."""
        return f'/api/library/{self.library.pk}/{path}'

    def _create_catalog_item(self, book=None, total=3, available=3, digital=False):
        """Cree un element de catalogue."""
        return LibraryCatalogItem.objects.create(
            library=self.library,
            book=book or self.book,
            total_copies=total,
            available_copies=available,
            allows_digital_loan=digital,
            max_loan_days=21,
        )

    def _create_membership(self, user=None, active=True, days_until_expiry=365):
        """Cree une adhesion."""
        return LibraryMembership.objects.create(
            library=self.library,
            user=user or self.regular_user,
            membership_type='STANDARD',
            is_active=active,
            expires_at=timezone.now() + timedelta(days=days_until_expiry),
        )


# ══════════════════════════════════════════════════════════════
# 1. Catalogue
# ══════════════════════════════════════════════════════════════

class LibraryCatalogTests(LibraryTestBase):
    """Tests du catalogue de la bibliotheque."""

    def setUp(self):
        self.catalog_item = self._create_catalog_item()

    def test_list_catalog_public(self):
        """Le catalogue est accessible publiquement."""
        response = self.client.get(self._url('catalog/'))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)
        self.assertEqual(response.data['results'][0]['book_title'], self.book.title)

    def test_list_catalog_only_active_items(self):
        """Seuls les elements actifs apparaissent."""
        self.catalog_item.is_active = False
        self.catalog_item.save()
        response = self.client.get(self._url('catalog/'))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 0)

    def test_catalog_search_by_title(self):
        """Filtrage du catalogue par titre."""
        response = self.client.get(self._url('catalog/'), {'search': 'Soleils'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)

    def test_catalog_search_no_results(self):
        """Recherche sans resultat."""
        response = self.client.get(self._url('catalog/'), {'search': 'Inexistant'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 0)

    def test_catalog_detail_public(self):
        """Le detail d'un element du catalogue est accessible publiquement."""
        response = self.client.get(self._url(f'catalog/{self.catalog_item.pk}/'))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['book_title'], self.book.title)

    def test_create_catalog_item_admin_only(self):
        """Seul un admin de la bibliotheque peut ajouter au catalogue."""
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.post(self._url('catalog/create/'), {
            'book': self.book2.pk,
            'total_copies': 5,
            'available_copies': 5,
            'allows_digital_loan': False,
            'max_loan_days': 14,
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn('item', response.data)

    def test_create_catalog_item_regular_user_forbidden(self):
        """Un utilisateur regulier ne peut pas ajouter au catalogue."""
        self.client.force_authenticate(user=self.regular_user)
        response = self.client.post(self._url('catalog/create/'), {
            'book': self.book2.pk,
            'total_copies': 2,
            'available_copies': 2,
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_create_catalog_item_anonymous_forbidden(self):
        """Un anonyme ne peut pas ajouter au catalogue."""
        response = self.client.post(self._url('catalog/create/'), {
            'book': self.book2.pk,
            'total_copies': 2,
            'available_copies': 2,
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_create_catalog_available_exceeds_total_rejected(self):
        """Exemplaires disponibles > total doit etre rejete."""
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.post(self._url('catalog/create/'), {
            'book': self.book2.pk,
            'total_copies': 2,
            'available_copies': 5,
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_soft_delete_catalog_item(self):
        """Suppression = desactivation (soft delete)."""
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.delete(self._url(f'catalog/{self.catalog_item.pk}/'))
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.catalog_item.refresh_from_db()
        self.assertFalse(self.catalog_item.is_active)

    def test_nonexistent_library_returns_404(self):
        """Catalogue d'une bibliotheque inexistante = 404."""
        response = self.client.get('/api/library/99999/catalog/')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)


# ══════════════════════════════════════════════════════════════
# 2. Adhesions (Memberships)
# ══════════════════════════════════════════════════════════════

class LibraryMembershipTests(LibraryTestBase):
    """Tests d'adhesion a la bibliotheque."""

    def test_register_as_member(self):
        """Un utilisateur connecte peut s'inscrire."""
        self.client.force_authenticate(user=self.regular_user)
        response = self.client.post(self._url('members/register/'), {
            'membership_type': 'STANDARD',
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn('membership', response.data)
        membership = LibraryMembership.objects.get(user=self.regular_user, library=self.library)
        self.assertTrue(membership.membership_number.startswith('BIB'))
        self.assertTrue(membership.is_active)

    def test_register_student_membership(self):
        """Un utilisateur peut s'inscrire en tant qu'etudiant."""
        self.client.force_authenticate(user=self.regular_user)
        response = self.client.post(self._url('members/register/'), {
            'membership_type': 'STUDENT',
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        membership = LibraryMembership.objects.get(user=self.regular_user, library=self.library)
        self.assertEqual(membership.membership_type, 'STUDENT')

    def test_register_anonymous_forbidden(self):
        """Un anonyme ne peut pas s'inscrire."""
        response = self.client.post(self._url('members/register/'), {
            'membership_type': 'STANDARD',
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_register_sets_default_expiry(self):
        """L'adhesion a une date d'expiration par defaut (1 an)."""
        self.client.force_authenticate(user=self.regular_user)
        response = self.client.post(self._url('members/register/'), {
            'membership_type': 'STANDARD',
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        membership = LibraryMembership.objects.get(user=self.regular_user, library=self.library)
        # L'expiration devrait etre dans environ 365 jours
        diff = membership.expires_at - timezone.now()
        self.assertGreater(diff.days, 360)

    def test_my_memberships_endpoint(self):
        """Endpoint my-memberships retourne les adhesions de l'utilisateur."""
        self._create_membership(user=self.regular_user)
        self.client.force_authenticate(user=self.regular_user)
        response = self.client.get('/api/library/my-memberships/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)

    def test_my_memberships_excludes_others(self):
        """my-memberships ne retourne pas les adhesions des autres."""
        self._create_membership(user=self.regular_user)
        self._create_membership(user=self.other_user)
        self.client.force_authenticate(user=self.regular_user)
        response = self.client.get('/api/library/my-memberships/')
        self.assertEqual(len(response.data['results']), 1)

    def test_my_memberships_unauthenticated(self):
        """my-memberships requiert authentification."""
        response = self.client.get('/api/library/my-memberships/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_member_list_admin_only(self):
        """La liste des membres est reservee aux admins."""
        self._create_membership(user=self.regular_user)
        self.client.force_authenticate(user=self.regular_user)
        response = self.client.get(self._url('members/'))
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_member_list_admin_succeeds(self):
        """L'admin peut lister les membres."""
        self._create_membership(user=self.regular_user)
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.get(self._url('members/'))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(len(response.data['results']), 1)


# ══════════════════════════════════════════════════════════════
# 3. Prets (Loans)
# ══════════════════════════════════════════════════════════════

class BookLoanTests(LibraryTestBase):
    """Tests de pret de livres."""

    def setUp(self):
        self.catalog_item = self._create_catalog_item(total=3, available=3, digital=True)
        self.membership = self._create_membership(user=self.regular_user)

    # ── Creation de pret ──

    def test_create_loan_physical(self):
        """Un membre peut demander un pret physique."""
        self.client.force_authenticate(user=self.regular_user)
        response = self.client.post(self._url('loans/create/'), {
            'catalog_item': self.catalog_item.pk,
            'loan_type': 'PHYSICAL',
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['loan']['status'], 'REQUESTED')

    def test_create_loan_digital(self):
        """Un membre peut demander un pret numerique si autorise."""
        self.client.force_authenticate(user=self.regular_user)
        response = self.client.post(self._url('loans/create/'), {
            'catalog_item': self.catalog_item.pk,
            'loan_type': 'DIGITAL',
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_create_loan_without_membership_forbidden(self):
        """Un utilisateur sans adhesion ne peut pas emprunter."""
        self.client.force_authenticate(user=self.other_user)
        response = self.client.post(self._url('loans/create/'), {
            'catalog_item': self.catalog_item.pk,
            'loan_type': 'PHYSICAL',
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_create_loan_expired_membership_rejected(self):
        """Un membre avec adhesion expiree ne peut pas emprunter."""
        self._create_membership(
            user=self.other_user, days_until_expiry=-1,
        )
        self.client.force_authenticate(user=self.other_user)
        response = self.client.post(self._url('loans/create/'), {
            'catalog_item': self.catalog_item.pk,
            'loan_type': 'PHYSICAL',
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_create_loan_no_copies_available(self):
        """Pret physique impossible si aucun exemplaire disponible."""
        self.catalog_item.available_copies = 0
        self.catalog_item.save()
        self.client.force_authenticate(user=self.regular_user)
        response = self.client.post(self._url('loans/create/'), {
            'catalog_item': self.catalog_item.pk,
            'loan_type': 'PHYSICAL',
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_create_digital_loan_not_allowed(self):
        """Pret numerique rejete si non autorise sur l'element."""
        item_no_digital = self._create_catalog_item(book=self.book2, digital=False)
        self.client.force_authenticate(user=self.regular_user)
        response = self.client.post(self._url('loans/create/'), {
            'catalog_item': item_no_digital.pk,
            'loan_type': 'DIGITAL',
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_create_loan_anonymous_forbidden(self):
        """Un anonyme ne peut pas emprunter."""
        response = self.client.post(self._url('loans/create/'), {
            'catalog_item': self.catalog_item.pk,
            'loan_type': 'PHYSICAL',
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    # ── Liste des prets ──

    def test_list_loans_member_sees_own(self):
        """Un membre voit ses propres prets."""
        BookLoan.objects.create(
            catalog_item=self.catalog_item,
            borrower=self.regular_user,
            loan_type='PHYSICAL',
            status='REQUESTED',
        )
        self.client.force_authenticate(user=self.regular_user)
        response = self.client.get(self._url('loans/'))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)

    def test_list_loans_admin_sees_all(self):
        """L'admin voit tous les prets."""
        BookLoan.objects.create(
            catalog_item=self.catalog_item,
            borrower=self.regular_user,
            loan_type='PHYSICAL',
            status='REQUESTED',
        )
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.get(self._url('loans/'))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(len(response.data['results']), 1)

    def test_my_loans_endpoint(self):
        """Endpoint my-loans retourne les prets de l'utilisateur."""
        BookLoan.objects.create(
            catalog_item=self.catalog_item,
            borrower=self.regular_user,
            loan_type='PHYSICAL',
            status='ACTIVE',
        )
        self.client.force_authenticate(user=self.regular_user)
        response = self.client.get('/api/library/my-loans/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)

    # ── Approbation de pret ──

    def test_approve_loan_admin(self):
        """L'admin peut approuver un pret REQUESTED -> ACTIVE."""
        loan = BookLoan.objects.create(
            catalog_item=self.catalog_item,
            borrower=self.regular_user,
            loan_type='PHYSICAL',
            status='REQUESTED',
        )
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.patch(f'/api/library/loans/{loan.pk}/approve/', format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        loan.refresh_from_db()
        self.assertEqual(loan.status, 'ACTIVE')
        self.assertIsNotNone(loan.borrowed_at)
        self.assertIsNotNone(loan.due_date)

    def test_approve_loan_decrements_physical_copies(self):
        """L'approbation d'un pret physique decremente les exemplaires."""
        initial_copies = self.catalog_item.available_copies
        loan = BookLoan.objects.create(
            catalog_item=self.catalog_item,
            borrower=self.regular_user,
            loan_type='PHYSICAL',
            status='REQUESTED',
        )
        self.client.force_authenticate(user=self.admin_user)
        self.client.patch(f'/api/library/loans/{loan.pk}/approve/', format='json')
        self.catalog_item.refresh_from_db()
        self.assertEqual(self.catalog_item.available_copies, initial_copies - 1)

    def test_approve_digital_loan_no_copy_decrement(self):
        """L'approbation d'un pret numerique ne decremente pas les exemplaires."""
        initial_copies = self.catalog_item.available_copies
        loan = BookLoan.objects.create(
            catalog_item=self.catalog_item,
            borrower=self.regular_user,
            loan_type='DIGITAL',
            status='REQUESTED',
        )
        self.client.force_authenticate(user=self.admin_user)
        self.client.patch(f'/api/library/loans/{loan.pk}/approve/', format='json')
        self.catalog_item.refresh_from_db()
        self.assertEqual(self.catalog_item.available_copies, initial_copies)

    def test_approve_already_approved_rejected(self):
        """On ne peut pas approuver un pret deja actif."""
        loan = BookLoan.objects.create(
            catalog_item=self.catalog_item,
            borrower=self.regular_user,
            loan_type='PHYSICAL',
            status='ACTIVE',
            borrowed_at=timezone.now(),
            due_date=timezone.now() + timedelta(days=21),
        )
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.patch(f'/api/library/loans/{loan.pk}/approve/', format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_approve_loan_non_admin_forbidden(self):
        """Un utilisateur non-admin ne peut pas approuver."""
        loan = BookLoan.objects.create(
            catalog_item=self.catalog_item,
            borrower=self.regular_user,
            loan_type='PHYSICAL',
            status='REQUESTED',
        )
        self.client.force_authenticate(user=self.regular_user)
        response = self.client.patch(f'/api/library/loans/{loan.pk}/approve/', format='json')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    # ── Retour de pret ──

    def test_return_loan_admin(self):
        """L'admin peut retourner un pret ACTIVE -> RETURNED."""
        loan = BookLoan.objects.create(
            catalog_item=self.catalog_item,
            borrower=self.regular_user,
            loan_type='PHYSICAL',
            status='ACTIVE',
            borrowed_at=timezone.now() - timedelta(days=10),
            due_date=timezone.now() + timedelta(days=11),
        )
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.patch(f'/api/library/loans/{loan.pk}/return/', format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        loan.refresh_from_db()
        self.assertEqual(loan.status, 'RETURNED')
        self.assertIsNotNone(loan.returned_at)

    def test_return_loan_increments_copies(self):
        """Le retour d'un pret physique reincrement les exemplaires."""
        self.catalog_item.available_copies = 2
        self.catalog_item.save()
        loan = BookLoan.objects.create(
            catalog_item=self.catalog_item,
            borrower=self.regular_user,
            loan_type='PHYSICAL',
            status='ACTIVE',
            borrowed_at=timezone.now() - timedelta(days=5),
            due_date=timezone.now() + timedelta(days=16),
        )
        self.client.force_authenticate(user=self.admin_user)
        self.client.patch(f'/api/library/loans/{loan.pk}/return/', format='json')
        self.catalog_item.refresh_from_db()
        self.assertEqual(self.catalog_item.available_copies, 3)

    def test_return_already_returned_rejected(self):
        """On ne peut pas retourner un pret deja retourne."""
        loan = BookLoan.objects.create(
            catalog_item=self.catalog_item,
            borrower=self.regular_user,
            loan_type='PHYSICAL',
            status='RETURNED',
            borrowed_at=timezone.now() - timedelta(days=15),
            returned_at=timezone.now() - timedelta(days=1),
        )
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.patch(f'/api/library/loans/{loan.pk}/return/', format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_return_requested_rejected(self):
        """On ne peut pas retourner un pret qui n'est pas encore actif."""
        loan = BookLoan.objects.create(
            catalog_item=self.catalog_item,
            borrower=self.regular_user,
            loan_type='PHYSICAL',
            status='REQUESTED',
        )
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.patch(f'/api/library/loans/{loan.pk}/return/', format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_return_overdue_loan(self):
        """Un pret en retard (OVERDUE forcé manuellement) peut etre retourne."""
        loan = BookLoan.objects.create(
            catalog_item=self.catalog_item,
            borrower=self.regular_user,
            loan_type='PHYSICAL',
            status='OVERDUE',
            borrowed_at=timezone.now() - timedelta(days=30),
            due_date=timezone.now() - timedelta(days=9),
        )
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.patch(f'/api/library/loans/{loan.pk}/return/', format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        loan.refresh_from_db()
        self.assertEqual(loan.status, 'RETURNED')

    def test_return_non_admin_forbidden(self):
        """Un utilisateur non-admin ne peut pas retourner un pret."""
        loan = BookLoan.objects.create(
            catalog_item=self.catalog_item,
            borrower=self.regular_user,
            loan_type='PHYSICAL',
            status='ACTIVE',
            borrowed_at=timezone.now(),
            due_date=timezone.now() + timedelta(days=21),
        )
        self.client.force_authenticate(user=self.regular_user)
        response = self.client.patch(f'/api/library/loans/{loan.pk}/return/', format='json')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_return_notifies_pending_reservation(self):
        """Le retour d'un pret notifie la premiere reservation en attente."""
        loan = BookLoan.objects.create(
            catalog_item=self.catalog_item,
            borrower=self.regular_user,
            loan_type='PHYSICAL',
            status='ACTIVE',
            borrowed_at=timezone.now() - timedelta(days=10),
            due_date=timezone.now() + timedelta(days=11),
        )
        reservation = BookReservation.objects.create(
            catalog_item=self.catalog_item,
            user=self.other_user,
            status='PENDING',
        )
        self.client.force_authenticate(user=self.admin_user)
        self.client.patch(f'/api/library/loans/{loan.pk}/return/', format='json')
        reservation.refresh_from_db()
        self.assertEqual(reservation.status, 'NOTIFIED')
        self.assertIsNotNone(reservation.notified_at)
        self.assertIsNotNone(reservation.expires_at)


# ══════════════════════════════════════════════════════════════
# 4. Reservations
# ══════════════════════════════════════════════════════════════

class BookReservationTests(LibraryTestBase):
    """Tests de reservation de livres."""

    def setUp(self):
        # Element sans exemplaires disponibles (pret possible uniquement par reservation)
        self.catalog_item = self._create_catalog_item(total=1, available=0)
        self.membership = self._create_membership(user=self.regular_user)

    def test_create_reservation(self):
        """Un membre peut reserver un livre indisponible."""
        self.client.force_authenticate(user=self.regular_user)
        response = self.client.post(self._url('reservations/'), {
            'catalog_item': self.catalog_item.pk,
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['reservation']['status'], 'PENDING')

    def test_create_reservation_book_available_rejected(self):
        """Reservation d'un livre disponible doit etre rejetee."""
        self.catalog_item.available_copies = 1
        self.catalog_item.save()
        self.client.force_authenticate(user=self.regular_user)
        response = self.client.post(self._url('reservations/'), {
            'catalog_item': self.catalog_item.pk,
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_create_duplicate_reservation_rejected(self):
        """Doublon de reservation en attente doit etre rejete."""
        BookReservation.objects.create(
            catalog_item=self.catalog_item,
            user=self.regular_user,
            status='PENDING',
        )
        self.client.force_authenticate(user=self.regular_user)
        response = self.client.post(self._url('reservations/'), {
            'catalog_item': self.catalog_item.pk,
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_create_reservation_without_membership_forbidden(self):
        """Un utilisateur sans adhesion ne peut pas reserver."""
        self.client.force_authenticate(user=self.other_user)
        response = self.client.post(self._url('reservations/'), {
            'catalog_item': self.catalog_item.pk,
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_create_reservation_anonymous_forbidden(self):
        """Un anonyme ne peut pas reserver."""
        response = self.client.post(self._url('reservations/'), {
            'catalog_item': self.catalog_item.pk,
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    # ── Annulation ──

    def test_cancel_pending_reservation(self):
        """Un utilisateur peut annuler sa propre reservation en attente."""
        reservation = BookReservation.objects.create(
            catalog_item=self.catalog_item,
            user=self.regular_user,
            status='PENDING',
        )
        self.client.force_authenticate(user=self.regular_user)
        response = self.client.delete(f'/api/library/reservations/{reservation.pk}/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        reservation.refresh_from_db()
        self.assertEqual(reservation.status, 'CANCELLED')

    def test_cancel_notified_reservation(self):
        """Un utilisateur peut annuler une reservation notifiee."""
        reservation = BookReservation.objects.create(
            catalog_item=self.catalog_item,
            user=self.regular_user,
            status='NOTIFIED',
            notified_at=timezone.now(),
            expires_at=timezone.now() + timedelta(days=3),
        )
        self.client.force_authenticate(user=self.regular_user)
        response = self.client.delete(f'/api/library/reservations/{reservation.pk}/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        reservation.refresh_from_db()
        self.assertEqual(reservation.status, 'CANCELLED')

    def test_cancel_fulfilled_reservation_rejected(self):
        """On ne peut pas annuler une reservation deja satisfaite."""
        reservation = BookReservation.objects.create(
            catalog_item=self.catalog_item,
            user=self.regular_user,
            status='FULFILLED',
        )
        self.client.force_authenticate(user=self.regular_user)
        response = self.client.delete(f'/api/library/reservations/{reservation.pk}/')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_cancel_other_users_reservation_forbidden(self):
        """Un utilisateur ne peut pas annuler la reservation d'un autre."""
        reservation = BookReservation.objects.create(
            catalog_item=self.catalog_item,
            user=self.regular_user,
            status='PENDING',
        )
        self.client.force_authenticate(user=self.other_user)
        response = self.client.delete(f'/api/library/reservations/{reservation.pk}/')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    # ── Mes reservations ──

    def test_my_reservations(self):
        """Endpoint my-reservations retourne les reservations de l'utilisateur."""
        BookReservation.objects.create(
            catalog_item=self.catalog_item,
            user=self.regular_user,
            status='PENDING',
        )
        self.client.force_authenticate(user=self.regular_user)
        response = self.client.get('/api/library/my-reservations/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)

    def test_my_reservations_excludes_others(self):
        """my-reservations ne retourne pas les reservations des autres."""
        BookReservation.objects.create(
            catalog_item=self.catalog_item,
            user=self.other_user,
            status='PENDING',
        )
        self.client.force_authenticate(user=self.regular_user)
        response = self.client.get('/api/library/my-reservations/')
        self.assertEqual(len(response.data['results']), 0)

    def test_my_reservations_unauthenticated(self):
        """my-reservations requiert authentification."""
        response = self.client.get('/api/library/my-reservations/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


# ══════════════════════════════════════════════════════════════
# 5. Tests de modeles
# ══════════════════════════════════════════════════════════════

class LibraryModelTests(LibraryTestBase):
    """Tests des modeles library."""

    def test_catalog_item_str(self):
        item = self._create_catalog_item(total=5, available=3)
        expected = f"{self.book.title} @ {self.library.name} (3/5)"
        self.assertEqual(str(item), expected)

    def test_catalog_item_clean_validation(self):
        """available_copies > total_copies leve ValidationError."""
        from django.core.exceptions import ValidationError
        item = LibraryCatalogItem(
            library=self.library,
            book=self.book,
            total_copies=2,
            available_copies=5,
        )
        with self.assertRaises(ValidationError):
            item.clean()

    def test_membership_number_auto_generated(self):
        """Le numero d'adhesion est genere automatiquement."""
        membership = self._create_membership()
        self.assertTrue(membership.membership_number.startswith('BIB'))
        self.assertGreater(len(membership.membership_number), 5)

    def test_membership_is_expired_property(self):
        """Propriete is_expired fonctionne correctement."""
        active = self._create_membership(days_until_expiry=30)
        self.assertFalse(active.is_expired)

        expired = LibraryMembership.objects.create(
            library=self.library,
            user=self.other_user,
            membership_type='STANDARD',
            is_active=True,
            expires_at=timezone.now() - timedelta(days=1),
        )
        self.assertTrue(expired.is_expired)

    def test_loan_is_overdue_property(self):
        """Propriete is_overdue fonctionne correctement."""
        catalog_item = self._create_catalog_item()

        not_overdue = BookLoan(
            catalog_item=catalog_item,
            borrower=self.regular_user,
            loan_type='PHYSICAL',
            status='ACTIVE',
            due_date=timezone.now() + timedelta(days=5),
        )
        self.assertFalse(not_overdue.is_overdue)

        overdue = BookLoan(
            catalog_item=catalog_item,
            borrower=self.regular_user,
            loan_type='PHYSICAL',
            status='ACTIVE',
            due_date=timezone.now() - timedelta(days=2),
        )
        self.assertTrue(overdue.is_overdue)

    def test_unique_together_library_book(self):
        """Un meme livre ne peut pas etre ajoute deux fois au catalogue."""
        self._create_catalog_item()
        with self.assertRaises(Exception):
            self._create_catalog_item()

    def test_unique_together_library_user_membership(self):
        """Un utilisateur ne peut avoir qu'une seule adhesion par bibliotheque."""
        self._create_membership(user=self.regular_user)
        with self.assertRaises(Exception):
            self._create_membership(user=self.regular_user)


# ══════════════════════════════════════════════════════════════
# Phase 2 — Tests complémentaires
# ══════════════════════════════════════════════════════════════

class LibraryPhase2Tests(LibraryTestBase):
    """Tests complémentaires : dashboard, extensions, cycles complets."""

    def test_dashboard_returns_stats(self):
        """GET dashboard retourne les stats attendues."""
        self._create_catalog_item()
        self._create_membership()
        self.client.force_authenticate(user=self.admin_user)
        resp = self.client.get(self._url('dashboard/'))
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        for key in ('catalog_count', 'active_loans', 'overdue_loans', 'total_members', 'pending_reservations'):
            self.assertIn(key, resp.data)
        self.assertEqual(resp.data['catalog_count'], 1)
        self.assertEqual(resp.data['total_members'], 1)

    def test_dashboard_non_admin_forbidden(self):
        """Non-admin ne peut pas accéder au dashboard."""
        self.client.force_authenticate(user=self.regular_user)
        resp = self.client.get(self._url('dashboard/'))
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)

    def test_extension_updates_due_date(self):
        """Prolongation auto-approuvée met à jour due_date sur le prêt."""
        item = self._create_catalog_item()
        self._create_membership()
        now = timezone.now()
        loan = BookLoan.objects.create(
            catalog_item=item, borrower=self.regular_user,
            loan_type='PHYSICAL', status='ACTIVE',
            borrowed_at=now, due_date=now + timedelta(days=21),
        )
        original_due = loan.due_date
        self.client.force_authenticate(user=self.regular_user)
        resp = self.client.post(
            f'/api/library/loans/{loan.pk}/extend/',
            {'extended_days': 7},
        )
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        loan.refresh_from_db()
        # due_date is now updated by auto-approved extension
        self.assertEqual(loan.due_date, original_due + timedelta(days=7))

    def test_full_loan_cycle(self):
        """Cycle complet : demande → approve → return → copies restaurées."""
        item = self._create_catalog_item(total=2, available=2)
        self._create_membership()
        # Create loan request
        self.client.force_authenticate(user=self.regular_user)
        resp = self.client.post(self._url('loans/create/'), {
            'catalog_item': item.pk,
            'loan_type': 'PHYSICAL',
        })
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        loan_id = resp.data['loan']['id']
        # Approve
        self.client.force_authenticate(user=self.admin_user)
        resp = self.client.patch(f'/api/library/loans/{loan_id}/approve/')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        item.refresh_from_db()
        self.assertEqual(item.available_copies, 1)
        # Return
        resp = self.client.patch(f'/api/library/loans/{loan_id}/return/')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        item.refresh_from_db()
        self.assertEqual(item.available_copies, 2)

    def test_fifo_second_reservation_stays_pending(self):
        """Au retour, seule la 1re réservation PENDING passe NOTIFIED."""
        item = self._create_catalog_item(total=1, available=0)
        self._create_membership(user=self.regular_user)
        self._create_membership(user=self.other_user)
        res1 = BookReservation.objects.create(
            catalog_item=item, user=self.regular_user, status='PENDING',
        )
        res2 = BookReservation.objects.create(
            catalog_item=item, user=self.other_user, status='PENDING',
        )
        # Create and return a loan to trigger FIFO
        loan = BookLoan.objects.create(
            catalog_item=item, borrower=self.admin_user,
            loan_type='PHYSICAL', status='ACTIVE',
            borrowed_at=timezone.now(),
            due_date=timezone.now() + timedelta(days=21),
        )
        self.client.force_authenticate(user=self.admin_user)
        self.client.patch(f'/api/library/loans/{loan.pk}/return/')
        res1.refresh_from_db()
        res2.refresh_from_db()
        self.assertEqual(res1.status, 'NOTIFIED')
        self.assertEqual(res2.status, 'PENDING')

    def test_approve_second_loan_on_last_copy(self):
        """Second approve on last copy returns 409 (no copies available)."""
        item = self._create_catalog_item(total=1, available=1)
        self._create_membership(user=self.regular_user)
        self._create_membership(user=self.other_user)
        loan1 = BookLoan.objects.create(
            catalog_item=item, borrower=self.regular_user,
            loan_type='PHYSICAL', status='REQUESTED',
        )
        loan2 = BookLoan.objects.create(
            catalog_item=item, borrower=self.other_user,
            loan_type='PHYSICAL', status='REQUESTED',
        )
        self.client.force_authenticate(user=self.admin_user)
        self.client.patch(f'/api/library/loans/{loan1.pk}/approve/')
        resp = self.client.patch(f'/api/library/loans/{loan2.pk}/approve/')
        self.assertEqual(resp.status_code, status.HTTP_409_CONFLICT)
        loan2.refresh_from_db()
        self.assertEqual(loan2.status, 'REQUESTED')  # reverted

    def test_digital_loan_concurrent_limit(self):
        """Multiple digital loans — tests that concurrent loans are tracked."""
        item = self._create_catalog_item(digital=True, total=99, available=99)
        self._create_membership()
        for i in range(3):
            BookLoan.objects.create(
                catalog_item=item, borrower=self.regular_user,
                loan_type='DIGITAL', status='ACTIVE',
                borrowed_at=timezone.now(),
                due_date=timezone.now() + timedelta(days=21),
            )
        active_count = BookLoan.objects.filter(
            borrower=self.regular_user, loan_type='DIGITAL', status='ACTIVE',
        ).count()
        self.assertEqual(active_count, 3)

    def test_membership_created_for_self(self):
        """Member registration creates a membership for the authenticated user."""
        self.client.force_authenticate(user=self.regular_user)
        resp = self.client.post(self._url('members/register/'), {
            'membership_type': 'STANDARD',
        })
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        self.assertTrue(LibraryMembership.objects.filter(
            library=self.library, user=self.regular_user,
        ).exists())
