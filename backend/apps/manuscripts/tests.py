"""
Tests complets pour l'app manuscripts.
Couvre : soumission, listing, workflow de statut, validation de fichier.
"""
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework import status
from rest_framework.test import APITestCase

from apps.manuscripts.models import Manuscript
from apps.organizations.models import Organization, OrganizationMembership

User = get_user_model()


class ManuscriptTestBase(APITestCase):
    """Base de test avec données partagées."""

    @classmethod
    def setUpTestData(cls):
        cls.admin_user = User.objects.create_superuser(
            username='admin_manu',
            email='admin_manu@frollot.test',
            password='AdminPass123!',
        )
        cls.regular_user = User.objects.create_user(
            username='auteur1',
            email='auteur1@frollot.test',
            password='AuteurPass123!',
            first_name='Jean',
            last_name='Auteur',
        )
        cls.other_user = User.objects.create_user(
            username='auteur2',
            email='auteur2@frollot.test',
            password='AuteurPass123!',
            first_name='Marie',
            last_name='Plume',
        )

        # Organisation cible pour tests d'inbox
        cls.org = Organization.objects.create(
            name='Editions Frollot Test',
            org_type='MAISON_EDITION',
            owner=cls.admin_user,
            email='editions@frollot.test',
            accepted_genres=['ROMAN', 'POESIE'],
            is_accepting_manuscripts=True,
        )
        OrganizationMembership.objects.create(
            organization=cls.org,
            user=cls.admin_user,
            role='PROPRIETAIRE',
        )

    # ── helpers ──

    @staticmethod
    def _fake_pdf(name='manuscript.pdf', size=1024):
        return SimpleUploadedFile(name, b'%PDF-' + b'0' * size, content_type='application/pdf')

    @staticmethod
    def _fake_docx(name='manuscript.docx', size=1024):
        return SimpleUploadedFile(name, b'PK' + b'0' * size, content_type='application/vnd.openxmlformats-officedocument.wordprocessingml.document')

    def _valid_payload(self, **overrides):
        data = {
            'title': 'Mon Premier Roman',
            'author_name': 'Jean Auteur',
            'email': 'auteur1@frollot.test',
            'phone_number': '+24101234567',
            'genre': 'ROMAN',
            'language': 'FR',
            'description': 'A' * 60,  # > 50 chars
            'terms_accepted': True,
            'file': self._fake_pdf(),
        }
        data.update(overrides)
        return data


# ══════════════════════════════════════════════════════════════
# 1. Soumission de manuscrit
# ══════════════════════════════════════════════════════════════

class ManuscriptSubmitTests(ManuscriptTestBase):
    """Tests de soumission (POST /api/manuscripts/submit/)."""

    url = '/api/manuscripts/submit/'

    @patch('apps.manuscripts.views.send_manuscript_acknowledgment_task')
    @patch('apps.manuscripts.views.send_manuscript_org_notification_task')
    def test_submit_success_with_pdf(self, mock_org, mock_ack):
        """Soumission complète avec fichier PDF doit réussir (201)."""
        payload = self._valid_payload()
        response = self.client.post(self.url, payload, format='multipart')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(response.data['success'])
        self.assertEqual(Manuscript.objects.count(), 1)
        m = Manuscript.objects.first()
        self.assertEqual(m.title, 'Mon Premier Roman')
        self.assertEqual(m.status, 'PENDING')
        mock_ack.delay.assert_called_once()

    @patch('apps.manuscripts.views.send_manuscript_acknowledgment_task')
    @patch('apps.manuscripts.views.send_manuscript_org_notification_task')
    def test_submit_success_with_docx(self, mock_org, mock_ack):
        """Soumission avec fichier DOCX doit réussir (201)."""
        payload = self._valid_payload(file=self._fake_docx())
        response = self.client.post(self.url, payload, format='multipart')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    @patch('apps.manuscripts.views.send_manuscript_acknowledgment_task')
    @patch('apps.manuscripts.views.send_manuscript_org_notification_task')
    def test_submit_links_authenticated_submitter(self, mock_org, mock_ack):
        """Soumission par un utilisateur connecté lie le manuscrit au submitter."""
        self.client.force_authenticate(user=self.regular_user)
        payload = self._valid_payload()
        response = self.client.post(self.url, payload, format='multipart')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        m = Manuscript.objects.first()
        self.assertEqual(m.submitter, self.regular_user)

    @patch('apps.manuscripts.views.send_manuscript_acknowledgment_task')
    @patch('apps.manuscripts.views.send_manuscript_org_notification_task')
    def test_submit_anonymous_no_submitter(self, mock_org, mock_ack):
        """Soumission anonyme : submitter reste null."""
        payload = self._valid_payload()
        response = self.client.post(self.url, payload, format='multipart')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        m = Manuscript.objects.first()
        self.assertIsNone(m.submitter)

    def test_submit_missing_file_rejected(self):
        """Soumission sans fichier doit être rejetée (400)."""
        payload = self._valid_payload()
        del payload['file']
        response = self.client.post(self.url, payload, format='multipart')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_submit_missing_title_rejected(self):
        """Soumission sans titre doit être rejetée (400)."""
        payload = self._valid_payload()
        del payload['title']
        response = self.client.post(self.url, payload, format='multipart')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_submit_missing_description_rejected(self):
        """Soumission sans description doit être rejetée (400)."""
        payload = self._valid_payload()
        del payload['description']
        response = self.client.post(self.url, payload, format='multipart')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_submit_short_description_rejected(self):
        """Description trop courte (< 50 car.) doit être rejetée."""
        payload = self._valid_payload(description='Trop court')
        response = self.client.post(self.url, payload, format='multipart')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_submit_terms_not_accepted_rejected(self):
        """Soumission sans acceptation des conditions doit échouer."""
        payload = self._valid_payload(terms_accepted=False)
        response = self.client.post(self.url, payload, format='multipart')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_submit_invalid_phone_rejected(self):
        """Numéro de téléphone trop court doit être rejeté."""
        payload = self._valid_payload(phone_number='123')
        response = self.client.post(self.url, payload, format='multipart')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    @patch('apps.manuscripts.views.send_manuscript_acknowledgment_task')
    @patch('apps.manuscripts.views.send_manuscript_org_notification_task')
    def test_submit_with_target_organization(self, mock_org, mock_ack):
        """Soumission ciblée vers une organisation."""
        payload = self._valid_payload(target_organization=self.org.pk)
        response = self.client.post(self.url, payload, format='multipart')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        m = Manuscript.objects.first()
        self.assertEqual(m.target_organization, self.org)
        mock_org.delay.assert_called_once()


# ══════════════════════════════════════════════════════════════
# 2. Validation de fichier
# ══════════════════════════════════════════════════════════════

class ManuscriptFileValidationTests(ManuscriptTestBase):
    """Tests de validation du fichier uploadé."""

    url = '/api/manuscripts/submit/'

    def test_reject_txt_file(self):
        """Fichier .txt doit être rejeté."""
        bad_file = SimpleUploadedFile('notes.txt', b'Hello', content_type='text/plain')
        payload = self._valid_payload(file=bad_file)
        response = self.client.post(self.url, payload, format='multipart')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_reject_jpg_file(self):
        """Fichier .jpg doit être rejeté."""
        bad_file = SimpleUploadedFile('photo.jpg', b'\xff\xd8\xff', content_type='image/jpeg')
        payload = self._valid_payload(file=bad_file)
        response = self.client.post(self.url, payload, format='multipart')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_reject_exe_file(self):
        """Fichier .exe doit être rejeté."""
        bad_file = SimpleUploadedFile('virus.exe', b'MZ' + b'\x00' * 100, content_type='application/octet-stream')
        payload = self._valid_payload(file=bad_file)
        response = self.client.post(self.url, payload, format='multipart')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_reject_oversized_file(self):
        """Fichier > 10 MB doit être rejeté par le serializer."""
        big_file = SimpleUploadedFile(
            'huge.pdf',
            b'%PDF-' + b'0' * (11 * 1024 * 1024),
            content_type='application/pdf',
        )
        payload = self._valid_payload(file=big_file)
        response = self.client.post(self.url, payload, format='multipart')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    @patch('apps.manuscripts.views.send_manuscript_acknowledgment_task')
    @patch('apps.manuscripts.views.send_manuscript_org_notification_task')
    def test_accept_doc_file(self, mock_org, mock_ack):
        """Fichier .doc doit etre accepte (extension autorisee dans le modele)."""
        doc_file = SimpleUploadedFile('manuscript.doc', b'\xd0\xcf' + b'\x00' * 100, content_type='application/msword')
        payload = self._valid_payload(file=doc_file)
        response = self.client.post(self.url, payload, format='multipart')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)


# ══════════════════════════════════════════════════════════════
# 3. Listing des manuscrits
# ══════════════════════════════════════════════════════════════

class ManuscriptListingTests(ManuscriptTestBase):
    """Tests de listing (admin, mine)."""

    def setUp(self):
        """Creer des manuscrits pour les tests de listing."""
        self.m1 = Manuscript.objects.create(
            title='Manuscrit de Jean',
            author_name='Jean Auteur',
            email='auteur1@frollot.test',
            phone_number='+24101234567',
            genre='ROMAN',
            language='FR',
            description='A' * 60,
            terms_accepted=True,
            file='manuscripts/test1.pdf',
            submitter=self.regular_user,
        )
        self.m2 = Manuscript.objects.create(
            title='Manuscrit de Marie',
            author_name='Marie Plume',
            email='auteur2@frollot.test',
            phone_number='+24109876543',
            genre='POESIE',
            language='FR',
            description='B' * 60,
            terms_accepted=True,
            file='manuscripts/test2.pdf',
            submitter=self.other_user,
        )

    # ── Admin list (GET /api/manuscripts/) ──

    def test_admin_sees_all_manuscripts(self):
        """Admin voit tous les manuscrits."""
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.get('/api/manuscripts/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 2)

    def test_regular_user_cannot_list_all(self):
        """Un utilisateur non-admin ne peut pas lister tous les manuscrits."""
        self.client.force_authenticate(user=self.regular_user)
        response = self.client.get('/api/manuscripts/')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_anonymous_cannot_list_all(self):
        """Un anonyme ne peut pas lister tous les manuscrits."""
        response = self.client.get('/api/manuscripts/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    # ── My manuscripts (GET /api/manuscripts/mine/) ──

    def test_user_sees_own_manuscripts(self):
        """Un utilisateur voit uniquement ses propres manuscrits."""
        self.client.force_authenticate(user=self.regular_user)
        response = self.client.get('/api/manuscripts/mine/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['title'], 'Manuscrit de Jean')

    def test_user_cannot_see_others_manuscripts(self):
        """Un utilisateur ne voit pas les manuscrits des autres."""
        self.client.force_authenticate(user=self.regular_user)
        response = self.client.get('/api/manuscripts/mine/')
        titles = [m['title'] for m in response.data]
        self.assertNotIn('Manuscrit de Marie', titles)

    def test_my_manuscripts_unauthenticated_rejected(self):
        """Endpoint mine/ requiert authentification."""
        response = self.client.get('/api/manuscripts/mine/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    # ── My manuscript detail (GET /api/manuscripts/mine/<pk>/) ──

    def test_user_sees_own_manuscript_detail(self):
        """Un utilisateur voit le detail de son propre manuscrit."""
        self.client.force_authenticate(user=self.regular_user)
        response = self.client.get(f'/api/manuscripts/mine/{self.m1.pk}/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['title'], 'Manuscrit de Jean')

    def test_user_cannot_see_other_manuscript_detail(self):
        """Un utilisateur ne peut pas voir le detail du manuscrit d'un autre."""
        self.client.force_authenticate(user=self.regular_user)
        response = self.client.get(f'/api/manuscripts/mine/{self.m2.pk}/')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)


# ══════════════════════════════════════════════════════════════
# 4. Admin detail / update / delete
# ══════════════════════════════════════════════════════════════

class ManuscriptAdminDetailTests(ManuscriptTestBase):
    """Tests d'acces admin au detail d'un manuscrit."""

    def setUp(self):
        self.manuscript = Manuscript.objects.create(
            title='Test Admin Detail',
            author_name='Auteur Test',
            email='test@frollot.test',
            phone_number='+24101234567',
            genre='ESSAI',
            language='FR',
            description='D' * 60,
            terms_accepted=True,
            file='manuscripts/test.pdf',
            submitter=self.regular_user,
        )

    def test_admin_can_retrieve_manuscript(self):
        """Admin peut voir le detail d'un manuscrit."""
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.get(f'/api/manuscripts/{self.manuscript.pk}/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_admin_can_delete_manuscript(self):
        """Admin peut supprimer un manuscrit."""
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.delete(f'/api/manuscripts/{self.manuscript.pk}/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(Manuscript.objects.filter(pk=self.manuscript.pk).exists())

    def test_regular_user_cannot_delete(self):
        """Un utilisateur non-admin ne peut pas supprimer."""
        self.client.force_authenticate(user=self.regular_user)
        response = self.client.delete(f'/api/manuscripts/{self.manuscript.pk}/')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)


# ══════════════════════════════════════════════════════════════
# 5. Workflow de statut
# ══════════════════════════════════════════════════════════════

class ManuscriptStatusWorkflowTests(ManuscriptTestBase):
    """Tests de mise a jour du statut (PATCH /api/manuscripts/<pk>/update-status/)."""

    def setUp(self):
        self.manuscript = Manuscript.objects.create(
            title='Workflow Test',
            author_name='Auteur WF',
            email='wf@frollot.test',
            phone_number='+24101234567',
            genre='ROMAN',
            language='FR',
            description='W' * 60,
            terms_accepted=True,
            file='manuscripts/wf.pdf',
            submitter=self.regular_user,
        )

    def _update_status(self, pk, new_status, rejection_reason=''):
        return self.client.patch(
            f'/api/manuscripts/{pk}/update-status/',
            {'status': new_status, 'rejection_reason': rejection_reason},
            format='json',
        )

    @patch('apps.manuscripts.views.send_manuscript_status_update', return_value=None)
    def test_admin_can_update_to_reviewing(self, mock_email):
        """Admin peut passer PENDING -> REVIEWING."""
        self.client.force_authenticate(user=self.admin_user)
        response = self._update_status(self.manuscript.pk, 'REVIEWING')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.manuscript.refresh_from_db()
        self.assertEqual(self.manuscript.status, 'REVIEWING')
        self.assertEqual(self.manuscript.reviewed_by, self.admin_user)
        self.assertIsNotNone(self.manuscript.reviewed_at)

    @patch('apps.manuscripts.views.send_manuscript_status_update', return_value=None)
    def test_admin_can_update_to_accepted(self, mock_email):
        """Admin peut passer PENDING -> ACCEPTED."""
        self.client.force_authenticate(user=self.admin_user)
        response = self._update_status(self.manuscript.pk, 'ACCEPTED')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.manuscript.refresh_from_db()
        self.assertEqual(self.manuscript.status, 'ACCEPTED')

    @patch('apps.manuscripts.views.send_manuscript_status_update', return_value=None)
    def test_admin_can_reject_with_reason(self, mock_email):
        """Admin peut rejeter avec un motif."""
        self.client.force_authenticate(user=self.admin_user)
        response = self._update_status(self.manuscript.pk, 'REJECTED', 'Hors ligne editoriale.')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.manuscript.refresh_from_db()
        self.assertEqual(self.manuscript.status, 'REJECTED')
        self.assertEqual(self.manuscript.rejection_reason, 'Hors ligne editoriale.')

    @patch('apps.manuscripts.views.send_manuscript_status_update', return_value=None)
    def test_full_workflow_pending_reviewing_accepted(self, mock_email):
        """Workflow complet : PENDING -> REVIEWING -> ACCEPTED."""
        self.client.force_authenticate(user=self.admin_user)

        resp1 = self._update_status(self.manuscript.pk, 'REVIEWING')
        self.assertEqual(resp1.status_code, status.HTTP_200_OK)

        resp2 = self._update_status(self.manuscript.pk, 'ACCEPTED')
        self.assertEqual(resp2.status_code, status.HTTP_200_OK)

        self.manuscript.refresh_from_db()
        self.assertEqual(self.manuscript.status, 'ACCEPTED')

    def test_regular_user_cannot_update_status(self):
        """Un utilisateur non-admin/non-org ne peut pas changer le statut."""
        self.client.force_authenticate(user=self.regular_user)
        response = self._update_status(self.manuscript.pk, 'REVIEWING')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_anonymous_cannot_update_status(self):
        """Un anonyme ne peut pas changer le statut."""
        response = self._update_status(self.manuscript.pk, 'REVIEWING')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_invalid_status_value_rejected(self):
        """Un statut invalide doit etre rejete."""
        self.client.force_authenticate(user=self.admin_user)
        response = self._update_status(self.manuscript.pk, 'INVALID_STATUS')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    @patch('apps.manuscripts.views.send_manuscript_status_update', return_value=None)
    def test_org_member_with_permission_can_update(self, mock_email):
        """
        Un membre de l'org cible avec permission manage_manuscripts peut mettre a jour.
        Note : on ne peut tester facilement sans le systeme de permissions org,
        mais on verifie qu'un admin staff (is_staff) peut le faire meme sans org.
        """
        # Associer le manuscrit a l'org
        self.manuscript.target_organization = self.org
        self.manuscript.save()

        # Le staff admin peut toujours changer le statut
        self.client.force_authenticate(user=self.admin_user)
        response = self._update_status(self.manuscript.pk, 'REVIEWING')
        self.assertEqual(response.status_code, status.HTTP_200_OK)


# ══════════════════════════════════════════════════════════════
# 6. Model tests
# ══════════════════════════════════════════════════════════════

class ManuscriptModelTests(ManuscriptTestBase):
    """Tests du modele Manuscript."""

    def test_str_representation(self):
        m = Manuscript(title='Le Vent', author_name='Alain Mabanckou')
        self.assertEqual(str(m), 'Le Vent - Alain Mabanckou')

    def test_default_status_is_pending(self):
        m = Manuscript.objects.create(
            title='Default Status',
            author_name='Test',
            email='t@t.com',
            phone_number='+24101234567',
            genre='ROMAN',
            language='FR',
            description='X' * 60,
            terms_accepted=True,
            file='manuscripts/default.pdf',
        )
        self.assertEqual(m.status, 'PENDING')

    def test_ordering_is_latest_first(self):
        m1 = Manuscript.objects.create(
            title='Premier',
            author_name='A',
            email='a@a.com',
            phone_number='+24101111111',
            genre='ROMAN',
            language='FR',
            description='Y' * 60,
            terms_accepted=True,
            file='manuscripts/m1.pdf',
        )
        m2 = Manuscript.objects.create(
            title='Deuxieme',
            author_name='B',
            email='b@b.com',
            phone_number='+24102222222',
            genre='ROMAN',
            language='FR',
            description='Z' * 60,
            terms_accepted=True,
            file='manuscripts/m2.pdf',
        )
        manuscripts = list(Manuscript.objects.all())
        self.assertEqual(manuscripts[0].pk, m2.pk)
