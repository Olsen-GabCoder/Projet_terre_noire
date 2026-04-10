"""
Tests complets pour l'app users — Frollot.

Couvre : inscription, authentification JWT (cookies), profil,
changement de mot de passe, UserProfile (roles), permissions.
"""
from unittest.mock import patch

from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase

from apps.users.models import UserProfile

User = get_user_model()

# ──────────────────────────────────────────────
# Helpers
# ──────────────────────────────────────────────

REGISTER_URL = '/api/users/register/'
LOGIN_URL = '/api/token/'
CHECK_AUTH_URL = '/api/users/check-auth/'
PROFILE_URL = '/api/users/me/'
CHANGE_PASSWORD_URL = '/api/users/me/change-password/'
USER_PROFILES_URL = '/api/users/me/profiles/'
USER_LIST_URL = '/api/users/'

VALID_PASSWORD = 'S3cure!Pass#2025'
WEAK_PASSWORD = '123'


def _registration_payload(**overrides):
    """Retourne un payload d'inscription valide, modifiable via overrides."""
    data = {
        'username': 'alice',
        'email': 'alice@example.com',
        'password': VALID_PASSWORD,
        'password_confirm': VALID_PASSWORD,
        'first_name': 'Alice',
        'last_name': 'Dupont',
    }
    data.update(overrides)
    return data


class _AuthMixin:
    """Mixin pour creer un utilisateur actif et s'authentifier via JWT cookie."""

    def _create_user(self, username='bob', email='bob@example.com',
                     password=VALID_PASSWORD, is_active=True, **extra):
        user = User.objects.create_user(
            username=username,
            email=email,
            password=password,
            first_name='Bob',
            last_name='Martin',
            is_active=is_active,
            **extra,
        )
        return user

    def _login(self, username='bob@example.com', password=VALID_PASSWORD):
        """Effectue un login via le endpoint JWT cookie.
        Le client de test conserve les cookies automatiquement."""
        return self.client.post(LOGIN_URL, {
            'username': username,
            'password': password,
        })

    def _create_and_login(self, **user_kwargs):
        user = self._create_user(**user_kwargs)
        self._login(username=user.email, password=user_kwargs.get('password', VALID_PASSWORD))
        return user


# ══════════════════════════════════════════════
# 1. REGISTRATION
# ══════════════════════════════════════════════

class RegistrationTests(_AuthMixin, APITestCase):
    """Tests d'inscription."""

    @patch('apps.core.tasks.send_welcome_registration_task.delay')
    @patch('apps.core.email.send_templated_email')
    def test_register_success(self, mock_email, mock_task):
        """Une inscription valide retourne 201 et cree l'utilisateur."""
        response = self.client.post(REGISTER_URL, _registration_payload())
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn('user', response.data)
        self.assertTrue(User.objects.filter(username='alice').exists())
        # Un profil LECTEUR est cree automatiquement
        user = User.objects.get(username='alice')
        self.assertTrue(
            UserProfile.objects.filter(user=user, profile_type='LECTEUR').exists()
        )

    @patch('apps.core.tasks.send_welcome_registration_task.delay')
    @patch('apps.core.email.send_templated_email')
    def test_register_user_created_inactive(self, mock_email, mock_task):
        """L'utilisateur est cree avec is_active=False (verification email requise)."""
        self.client.post(REGISTER_URL, _registration_payload())
        user = User.objects.get(username='alice')
        self.assertFalse(user.is_active)

    @patch('apps.core.tasks.send_welcome_registration_task.delay')
    @patch('apps.core.email.send_templated_email')
    def test_register_duplicate_email(self, mock_email, mock_task):
        """Dupliquer un email retourne 400."""
        self.client.post(REGISTER_URL, _registration_payload())
        response = self.client.post(REGISTER_URL, _registration_payload(
            username='alice2',
        ))
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    @patch('apps.core.tasks.send_welcome_registration_task.delay')
    @patch('apps.core.email.send_templated_email')
    def test_register_duplicate_username(self, mock_email, mock_task):
        """Dupliquer un username retourne 400."""
        self.client.post(REGISTER_URL, _registration_payload())
        response = self.client.post(REGISTER_URL, _registration_payload(
            email='other@example.com',
        ))
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_register_missing_fields(self):
        """Champs manquants retournent 400."""
        response = self.client.post(REGISTER_URL, {'username': 'lonely'})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_register_password_mismatch(self):
        """Mots de passe differents retournent 400."""
        response = self.client.post(REGISTER_URL, _registration_payload(
            password_confirm='DifferentPass!1',
        ))
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_register_weak_password(self):
        """Un mot de passe trop faible retourne 400."""
        response = self.client.post(REGISTER_URL, _registration_payload(
            password=WEAK_PASSWORD,
            password_confirm=WEAK_PASSWORD,
        ))
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_register_common_password(self):
        """Un mot de passe trop courant retourne 400."""
        response = self.client.post(REGISTER_URL, _registration_payload(
            password='password123',
            password_confirm='password123',
        ))
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


# ══════════════════════════════════════════════
# 2. AUTHENTICATION (JWT cookies)
# ══════════════════════════════════════════════

class AuthenticationTests(_AuthMixin, APITestCase):
    """Tests d'authentification JWT via cookies."""

    def setUp(self):
        self.user = self._create_user()

    def test_login_success(self):
        """Login valide retourne 200 et set les cookies."""
        response = self._login()
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('user', response.data)

    def test_login_sets_cookies(self):
        """Apres login, les cookies access_token et refresh_token sont presents."""
        response = self._login()
        self.assertIn('access_token', response.cookies)
        self.assertIn('refresh_token', response.cookies)

    def test_check_auth_after_login(self):
        """Apres login, check-auth retourne les infos de l'utilisateur."""
        self._login()
        response = self.client.get(CHECK_AUTH_URL)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data.get('authenticated'))
        self.assertEqual(response.data['user']['email'], 'bob@example.com')

    def test_login_wrong_password(self):
        """Mauvais mot de passe retourne 401."""
        response = self._login(password='WrongPass!99')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_login_nonexistent_user(self):
        """Utilisateur inexistant retourne 401."""
        response = self._login(username='ghost@example.com', password=VALID_PASSWORD)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_login_inactive_user(self):
        """Un utilisateur inactif ne peut pas se connecter."""
        self._create_user(username='inactive', email='inactive@example.com', is_active=False)
        response = self._login(username='inactive@example.com')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_login_with_username_field(self):
        """Le champ 'username' accepte aussi l'email (EmailTokenObtainPairSerializer)."""
        response = self.client.post(LOGIN_URL, {
            'username': 'bob@example.com',
            'password': VALID_PASSWORD,
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_logout(self):
        """Apres logout, check-auth retourne 401."""
        self._login()
        self.client.post('/api/users/logout/')
        response = self.client.get(CHECK_AUTH_URL)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


# ══════════════════════════════════════════════
# 3. PROFILE (get / update)
# ══════════════════════════════════════════════

class ProfileTests(_AuthMixin, APITestCase):
    """Tests du profil utilisateur (me/)."""

    def setUp(self):
        self.user = self._create_and_login()

    def test_get_profile(self):
        """GET /api/users/me/ retourne le profil de l'utilisateur connecte."""
        response = self.client.get(PROFILE_URL)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['username'], 'bob')
        self.assertEqual(response.data['email'], 'bob@example.com')

    def test_update_profile_patch(self):
        """PATCH /api/users/me/ met a jour les champs fournis."""
        response = self.client.patch(
            PROFILE_URL,
            {'first_name': 'Robert', 'city': 'Libreville'},
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.user.refresh_from_db()
        self.assertEqual(self.user.first_name, 'Robert')
        self.assertEqual(self.user.city, 'Libreville')

    def test_update_profile_put(self):
        """PUT /api/users/me/ met a jour le profil complet."""
        response = self.client.put(
            PROFILE_URL,
            {
                'first_name': 'Robert',
                'last_name': 'Martin',
                'country': 'Cameroun',
            },
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.user.refresh_from_db()
        self.assertEqual(self.user.country, 'Cameroun')

    def test_get_profile_unauthenticated(self):
        """GET /api/users/me/ sans auth retourne 401."""
        self.client.logout()
        self.client.cookies.clear()
        response = self.client.get(PROFILE_URL)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_update_profile_unauthenticated(self):
        """PATCH /api/users/me/ sans auth retourne 401."""
        self.client.logout()
        self.client.cookies.clear()
        response = self.client.patch(PROFILE_URL, {'first_name': 'Hacker'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_profile_response_contains_expected_fields(self):
        """La reponse du profil contient les champs attendus."""
        response = self.client.get(PROFILE_URL)
        expected_fields = [
            'id', 'username', 'email', 'first_name', 'last_name',
            'full_name', 'phone_number', 'city', 'country',
        ]
        for field in expected_fields:
            self.assertIn(field, response.data, f"Champ manquant : {field}")


# ══════════════════════════════════════════════
# 4. PASSWORD CHANGE
# ══════════════════════════════════════════════

class PasswordChangeTests(_AuthMixin, APITestCase):
    """Tests de changement de mot de passe."""

    def setUp(self):
        self.user = self._create_and_login()

    def test_change_password_success(self):
        """Changement de mot de passe valide retourne 200."""
        new_password = 'NewS3cure!Pass#2026'
        response = self.client.put(
            CHANGE_PASSWORD_URL,
            {
                'old_password': VALID_PASSWORD,
                'new_password': new_password,
                'new_password_confirm': new_password,
            },
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Verifier que le nouveau mot de passe fonctionne
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password(new_password))

    def test_change_password_increments_token_version(self):
        """Le changement de mot de passe incremente token_version."""
        old_version = self.user.token_version
        new_password = 'NewS3cure!Pass#2026'
        self.client.put(
            CHANGE_PASSWORD_URL,
            {
                'old_password': VALID_PASSWORD,
                'new_password': new_password,
                'new_password_confirm': new_password,
            },
            format='json',
        )
        self.user.refresh_from_db()
        self.assertEqual(self.user.token_version, old_version + 1)

    def test_change_password_wrong_old_password(self):
        """Mauvais ancien mot de passe retourne 400."""
        response = self.client.put(
            CHANGE_PASSWORD_URL,
            {
                'old_password': 'WrongOldPass!1',
                'new_password': 'NewS3cure!Pass#2026',
                'new_password_confirm': 'NewS3cure!Pass#2026',
            },
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_change_password_mismatch_confirm(self):
        """new_password != new_password_confirm retourne 400."""
        response = self.client.put(
            CHANGE_PASSWORD_URL,
            {
                'old_password': VALID_PASSWORD,
                'new_password': 'NewS3cure!Pass#2026',
                'new_password_confirm': 'Mismatch!Pass#2026',
            },
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_change_password_weak_new_password(self):
        """Un nouveau mot de passe trop faible retourne 400."""
        response = self.client.put(
            CHANGE_PASSWORD_URL,
            {
                'old_password': VALID_PASSWORD,
                'new_password': '123',
                'new_password_confirm': '123',
            },
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_change_password_unauthenticated(self):
        """Changement de mot de passe sans auth retourne 401."""
        self.client.logout()
        self.client.cookies.clear()
        response = self.client.put(
            CHANGE_PASSWORD_URL,
            {
                'old_password': VALID_PASSWORD,
                'new_password': 'NewS3cure!Pass#2026',
                'new_password_confirm': 'NewS3cure!Pass#2026',
            },
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


# ══════════════════════════════════════════════
# 5. USER PROFILES (roles multiples)
# ══════════════════════════════════════════════

class UserProfileRolesTests(_AuthMixin, APITestCase):
    """Tests des profils metier (LECTEUR, AUTEUR, etc.)."""

    def setUp(self):
        self.user = self._create_and_login()

    def test_list_profiles(self):
        """GET /api/users/me/profiles/ retourne la liste des profils."""
        # Creer un profil LECTEUR (normalement deja present si inscription normale)
        UserProfile.objects.get_or_create(user=self.user, profile_type='LECTEUR')
        response = self.client.get(USER_PROFILES_URL)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsInstance(response.data, list)

    def test_create_profile_auteur(self):
        """Creer un profil AUTEUR retourne 201."""
        response = self.client.post(
            USER_PROFILES_URL,
            {'profile_type': 'AUTEUR', 'bio': 'Ecrivain passionne'},
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(
            UserProfile.objects.filter(
                user=self.user, profile_type='AUTEUR', is_active=True
            ).exists()
        )

    def test_create_profile_lecteur(self):
        """Creer un profil LECTEUR retourne 201 (ou existe deja)."""
        # Si le profil LECTEUR existe deja en actif, le endpoint le refuse
        existing = UserProfile.objects.filter(
            user=self.user, profile_type='LECTEUR', is_active=True
        ).exists()
        if existing:
            response = self.client.post(
                USER_PROFILES_URL,
                {'profile_type': 'LECTEUR'},
                format='json',
            )
            self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        else:
            response = self.client.post(
                USER_PROFILES_URL,
                {'profile_type': 'LECTEUR'},
                format='json',
            )
            self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_duplicate_active_profile_rejected(self):
        """Creer un profil actif en double retourne 400."""
        self.client.post(
            USER_PROFILES_URL,
            {'profile_type': 'AUTEUR'},
            format='json',
        )
        response = self.client.post(
            USER_PROFILES_URL,
            {'profile_type': 'AUTEUR'},
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_create_profile_correcteur(self):
        """Creer un profil CORRECTEUR retourne 201."""
        response = self.client.post(
            USER_PROFILES_URL,
            {'profile_type': 'CORRECTEUR'},
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_create_multiple_different_profiles(self):
        """Un utilisateur peut avoir plusieurs types de profils actifs."""
        self.client.post(USER_PROFILES_URL, {'profile_type': 'AUTEUR'}, format='json')
        self.client.post(USER_PROFILES_URL, {'profile_type': 'CORRECTEUR'}, format='json')
        response = self.client.get(USER_PROFILES_URL)
        profile_types = [p['profile_type'] for p in response.data]
        self.assertIn('AUTEUR', profile_types)
        self.assertIn('CORRECTEUR', profile_types)

    def test_profiles_unauthenticated(self):
        """Acces aux profils sans auth retourne 401."""
        self.client.logout()
        self.client.cookies.clear()
        response = self.client.get(USER_PROFILES_URL)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_create_profile_invalid_type(self):
        """Un type de profil invalide retourne 400."""
        response = self.client.post(
            USER_PROFILES_URL,
            {'profile_type': 'INVALID_TYPE'},
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


# ══════════════════════════════════════════════
# 6. PERMISSIONS (acces non authentifie)
# ══════════════════════════════════════════════

class PermissionsTests(_AuthMixin, APITestCase):
    """Tests de permissions — endpoints proteges sans authentification."""

    def test_check_auth_unauthenticated(self):
        """check-auth sans cookie retourne 401."""
        response = self.client.get(CHECK_AUTH_URL)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_profile_unauthenticated(self):
        """GET /api/users/me/ sans auth retourne 401."""
        response = self.client.get(PROFILE_URL)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_change_password_unauthenticated(self):
        """PUT change-password sans auth retourne 401."""
        response = self.client.put(CHANGE_PASSWORD_URL, {}, format='json')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_user_profiles_unauthenticated(self):
        """GET /api/users/me/profiles/ sans auth retourne 401."""
        response = self.client.get(USER_PROFILES_URL)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_user_list_unauthenticated(self):
        """GET /api/users/ (admin) sans auth retourne 401."""
        response = self.client.get(USER_LIST_URL)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_user_list_non_admin(self):
        """GET /api/users/ par un utilisateur non-admin retourne 403."""
        self._create_and_login()
        response = self.client.get(USER_LIST_URL)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_user_list_admin(self):
        """GET /api/users/ par un admin retourne 200."""
        self._create_user(
            username='admin', email='admin@example.com',
            is_active=True, is_staff=True, is_superuser=True,
        )
        self._login(username='admin@example.com')
        response = self.client.get(USER_LIST_URL)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_register_is_public(self):
        """POST /api/users/register/ est accessible sans authentification."""
        # On verifie juste que ce n'est pas un 401/403
        response = self.client.post(REGISTER_URL, {})
        self.assertNotIn(response.status_code, [
            status.HTTP_401_UNAUTHORIZED,
            status.HTTP_403_FORBIDDEN,
        ])

    def test_login_is_public(self):
        """POST /api/token/ est accessible sans authentification."""
        response = self.client.post(LOGIN_URL, {})
        self.assertNotIn(response.status_code, [
            status.HTTP_401_UNAUTHORIZED,
            status.HTTP_403_FORBIDDEN,
        ])


# ══════════════════════════════════════════════
# 7. USER MODEL
# ══════════════════════════════════════════════

class UserModelTests(APITestCase):
    """Tests unitaires sur le modele User."""

    def test_get_full_name(self):
        user = User(first_name='Alice', last_name='Dupont', username='alice')
        self.assertEqual(user.get_full_name(), 'Alice Dupont')

    def test_get_full_name_fallback_to_username(self):
        user = User(first_name='', last_name='', username='alice')
        self.assertEqual(user.get_full_name(), 'alice')

    def test_has_complete_profile_true(self):
        user = User(
            first_name='A', last_name='B',
            phone_number='+241123456', address='Rue 1', city='Libreville',
        )
        self.assertTrue(user.has_complete_profile)

    def test_has_complete_profile_false_missing_city(self):
        user = User(
            first_name='A', last_name='B',
            phone_number='+241123456', address='Rue 1',
        )
        self.assertFalse(user.has_complete_profile)

    def test_full_address(self):
        user = User(address='Rue 1', city='Libreville', country='Gabon')
        self.assertEqual(user.full_address, 'Rue 1, Libreville, Gabon')

    def test_full_address_empty(self):
        user = User()
        self.assertIn('non renseign', user.full_address.lower())

    def test_str_representation(self):
        user = User(first_name='Alice', last_name='Dupont', email='a@b.com', username='alice')
        self.assertIn('Alice Dupont', str(user))
        self.assertIn('a@b.com', str(user))
