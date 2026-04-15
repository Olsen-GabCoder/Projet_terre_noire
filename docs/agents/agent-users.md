# agent-users

## Identité

- **Nom** : agent-users
- **Type** : spécialisé
- **Domaine métier** : Authentification, comptes utilisateur, profils multi-rôles, 2FA TOTP, OAuth, sessions, sécurité

## Périmètre backend

- Apps Django : `apps/users/`
- Modèles gérés : User, FailedLoginAttempt, EmailVerificationToken, LoginHistory, ActiveSession, TOTPBackupCode, TOTPChallenge, SocialAccount, UserProfile
- Admin Django : `apps/users/admin.py`

## Périmètre frontend

- Pages :
  - `pages/Login.jsx` → `/login`
  - `pages/Register.jsx` → `/register`
  - `pages/ForgotPassword.jsx` → `/forgot-password`
  - `pages/ResetPassword.jsx` → `/reset-password`
  - `pages/VerifyEmail.jsx` → `/verify-email`
  - `pages/dashboard/DashboardOverview.jsx` → `/dashboard`
  - `pages/dashboard/SettingsPage.jsx` → `/dashboard/settings`
  - `pages/dashboard/SecuritySettings.jsx` → `/dashboard/security`
  - `pages/admin/AdminUsers.jsx` → `/admin-dashboard/users`
- Composants :
  - `components/ProtectedRoute.jsx`
  - `components/SessionTimeoutWarning.jsx`
  - `components/OnboardingModal.jsx`
  - `components/PasswordStrengthMeter.jsx`
  - `components/settings/SectionProfile.jsx`
  - `components/settings/SectionRoles.jsx`
  - `components/settings/SectionAppearance.jsx`
  - `components/settings/SectionNotifications.jsx`
  - `components/settings/SectionSecurity.jsx`
  - `components/settings/SectionPrivacy.jsx`
  - `components/sidebar/content/UserSidebar.jsx`
  - `components/sidebar/content/AuthSidebar.jsx`
- Hooks : aucun propre
- Services API : `authService`, `profileService` dans `services/api.js`
- Styles CSS : `Auth.css`, `Login.css`, `Register.css`, `Profile.css`, `Settings.css`, `SettingsPage.css`, `DashboardOverview.css`, `Onboarding.css`
- Contexts : `context/AuthContext.jsx`

## Périmètre i18n

- Sections de fr.json/en.json : `login`, `register`, `onboarding`, `dashboard` (sous-clés settings/security)

## Périmètre tests

- Backend : `backend/apps/users/tests.py`
- Frontend : `frontend/src/pages/Login.test.jsx`, `frontend/src/pages/Register.test.jsx`, `frontend/src/context/AuthContext.test.jsx`, `frontend/src/components/ProtectedRoute.test.jsx`

## Interfaces avec les autres agents

- **Consomme depuis** :
  - agent-connect : `organizations.models.OrganizationMembership`, `organizations.models.Invitation` (pour afficher les orgs de l'utilisateur, invitations)
  - agent-infra : `core.email` (vérification email, reset password, notifications compte)
- **Expose à** :
  - Tous les agents : `users.models.User` (FK omniprésente), `users.models.UserProfile` (profils multi-rôles)
  - agent-connect : données utilisateur pour membership
  - agent-services : UserProfile pour profil prestataire
  - agent-livraison : UserProfile pour profil livreur
  - agent-coupons : UserProfile pour émetteur prestataire
- **Zones de couplage critique** :
  - Auth ↔ Organisations (Section 5.2)
  - User est le modèle le plus transversal — tout changement de schéma User impacte tous les modules

## Exclusions explicites

- `apps/notifications/` (→ agent-infra)
- `apps/orders/` (commandes, paiements)
- `apps/marketplace/` (marketplace)
- `apps/services/` (services pro)
- `apps/coupons/` (coupons)
- `apps/social/` (réseau social)
- `apps/books/` (catalogue)
- `apps/library/` (bibliothèque)
- `apps/organizations/` (ne modifie pas — consomme en lecture)
- Pages `dashboard/Delivery*` (→ agent-livraison)
- `components/NotificationCenter.jsx` (→ agent-infra)

## Protocole de travail

1. Avant de démarrer : lire `CHARTE_AGENTS.md` et la fiche de cet agent.
2. Vérifier que le chantier ne déborde pas du périmètre.
3. Si débordement potentiel : demander autorisation à agent-intégrateur.
4. Travailler sur une branche `agent/users/<chantier>`.
5. Tests systématiques.
6. Récap final selon le format de la charte.
7. Soumission à agent-intégrateur.
8. Pas de commit autonome.

## Notes spécifiques

- 3 TODO dans le code backend — à investiguer.
- Le modèle `User` a un `token_version` pour invalider les JWT lors du changement de mot de passe — ne pas oublier de l'incrémenter.
- TOTP 2FA : setup → verify-setup → verify-login → disable. Codes de secours : 10 codes générés, regeneration possible.
- OAuth : Google, Facebook, GitHub. Le flow OAuth se termine par `OAuthFinalizeView` (création/liaison de compte).
- `FailedLoginAttempt` pour le lockout — seuil configurable.
- `EmailVerificationToken` expire en 24h.
- `ActiveSession` : suivi device type, IP, expiry. Révocation unitaire ou totale.
- UserProfile rôles : LECTEUR, AUTEUR, EDITEUR, CORRECTEUR, ILLUSTRATEUR, TRADUCTEUR, LIVREUR — un utilisateur peut avoir plusieurs profils.
- `DashboardOverview.jsx` agrège des compteurs de tous les domaines (`DashboardCountsView`) — ce composant fait des appels cross-domaine en lecture seule.
- `AdminUsers.jsx` est une page admin rattachée à ce domaine mais l'infra admin appartient à agent-infra.
