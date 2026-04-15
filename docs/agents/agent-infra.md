# agent-infra

## Identité

- **Nom** : agent-infra
- **Type** : spécialisé
- **Domaine métier** : Infrastructure transversale (email, tâches async, PDF, notifications, configuration, layouts, routing, design system, i18n structure)

## Périmètre backend

- Apps Django : `apps/core/`, `apps/notifications/`
- Modèles gérés dans core : SiteConfig, DeliveryZone
- Modèles gérés dans notifications : Notification
- Fichiers core spécifiques : `email.py`, `tasks.py`, `invoice.py`, `models.py`, `views.py`, `serializers.py`, `admin.py`
- Settings : `backend/config/settings.py`, `backend/config/urls.py`, `backend/config/celery.py`, `backend/config/wsgi.py`
- Templates emails : `backend/templates/emails/*.html` (tous)
- Requirements : `backend/requirements.txt`
- Admin Django : `apps/core/admin.py`, `apps/notifications/admin.py`

## Périmètre frontend

- Pages :
  - `pages/Home.jsx` → `/`
  - `pages/NotFound.jsx` → `/*`
  - `pages/Notifications.jsx` → `/notifications`
  - `pages/Privacy.jsx` → `/privacy`
  - `pages/CGV.jsx` → `/cgv`
  - `pages/Terms.jsx` → `/terms`
  - `pages/Cookies.jsx` → `/cookies`
- Composants :
  - `components/Header.jsx`
  - `components/Footer.jsx`
  - `components/AppSidebar.jsx`
  - `components/DashboardLayout.jsx`
  - `components/admin/AdminLayout.jsx`
  - `components/admin/AdminProtectedRoute.jsx`
  - `components/SEO.jsx`
  - `components/Breadcrumbs.jsx`
  - `components/CosmosBackground.jsx`
  - `components/PageHero.jsx`
  - `components/ErrorBoundary.jsx`
  - `components/LoadingSpinner.jsx`
  - `components/LoadingButton.jsx`
  - `components/SessionTimeoutWarning.jsx` (partagé avec agent-users pour le contenu, infra pour le composant)
  - `components/NotificationCenter.jsx`
  - `components/sidebar/SideBlock.jsx`
  - `components/sidebar/SideBookCard.jsx`
  - `components/sidebar/SideUserCard.jsx`
  - `components/sidebar/SideNavLinks.jsx`
  - `components/sidebar/SideStats.jsx`
  - `components/sidebar/SideQuote.jsx`
  - `components/sidebar/SideAnecdote.jsx`
  - `components/sidebar/content/LegalSidebar.jsx`
- Hooks :
  - `hooks/useHomeData.js`
  - `hooks/useReveal.js`
- Services API : configuration Axios, intercepteurs auth, refresh token, CSRF dans `services/api.js` ; `configService` ; structure de `notificationService`
- Styles CSS : `design-tokens.css`, `Home.css`, `Header.css`, `Footer.css`, `AppSidebar.css`, `Dashboard.css`, `DashboardLayout.css`, `Admin.css`, `AdminDashboard.css`, `NotFound.css`, `NotificationCenter.css`, `LoadingSpinner.css`, `CosmosBackground.css`, `PageHero.css`, `Privacy.css`, `CGV.css`, `Terms.css`, `Cookies.css`
- Fichiers structurels :
  - `frontend/src/App.jsx` (routing principal, lazy loading, Suspense)
  - `frontend/src/services/api.js` (client HTTP, intercepteurs, namespaces)
  - `frontend/src/i18n/` (configuration i18next, structure)
  - `frontend/src/main.jsx` (point d'entrée)
  - `frontend/src/index.css`
- Contexts : `context/DeliveryConfigContext.jsx` (configuration livraison globale)

## Périmètre i18n

- Sections de fr.json/en.json : `errorBoundary`, `common`, `nav`, `header`, `footer`, `sidebar`, `home`
- Responsabilité structurelle : synchronisation des clés FR/EN (vérification, pas contenu métier)

## Périmètre tests

- Backend : `backend/apps/core/tests.py`, `backend/apps/notifications/tests.py`
- Frontend : `frontend/src/App.test.jsx`, `frontend/src/components/Header.test.jsx`, `frontend/src/services/api.test.js`, `frontend/src/services/notificationService.test.js`

## Interfaces avec les autres agents

- **Consomme depuis** :
  - agent-users : `users.models.User` (contexte email, notifications)
- **Expose à** :
  - Tous les agents : `core.email.send_templated_email()`, `core.tasks` (tâches Celery), `core.invoice` (PDF), `notifications` (création de notifications)
  - Tous les agents frontend : `App.jsx` (routing), `api.js` (client HTTP), `DashboardLayout` (layout dashboard), `AdminLayout` + `AdminProtectedRoute` (infra admin), `design-tokens.css` (variables CSS), composants sidebar
- **Zones de couplage critique** :
  - Core email est le hub le plus importé (40 imports) — bottleneck de maintenance
  - Core tasks (24 imports) — orchestration async
  - Notifications est consommé par 6 modules métier

## Exclusions explicites

- Logique métier de toute app (books, orders, services, coupons, marketplace, social, library, organizations, manuscripts, users)
- Pages métier (sauf Home, NotFound, pages légales, Notifications)
- Modèles métier — ne crée/modifie jamais de modèles dans les apps métier
- Contenu i18n métier (les agents métier gèrent leurs clés, agent-infra vérifie la cohérence structurelle)

## Protocole de travail

1. Avant de démarrer : lire `CHARTE_AGENTS.md` et la fiche de cet agent.
2. Vérifier que le chantier ne déborde pas du périmètre.
3. Si débordement potentiel : demander autorisation à agent-intégrateur.
4. Travailler sur une branche `agent/infra/<chantier>`.
5. Tests systématiques.
6. Récap final selon le format de la charte.
7. Soumission à agent-intégrateur.
8. Pas de commit autonome.

## Notes spécifiques

- **core.email** utilise des lazy imports (import à l'intérieur des fonctions) pour éviter les circularités — pattern à surveiller mais ne pas refactorer sans raison.
- `App.jsx` est le fichier le plus sensible du frontend (498 lignes, tout le routing) — toute modification doit être testée exhaustivement.
- `api.js` gère le refresh token, le CSRF, et les intercepteurs 401 — critique pour la sécurité.
- `design-tokens.css` est la source de vérité du design system — tout changement impacte visuellement toute l'app.
- Les templates emails (`backend/templates/emails/`) contiennent du HTML — le contenu métier est dicté par les agents métier, mais la structure et l'envoi sont gérés ici.
- `AdminLayout.jsx`, `AdminProtectedRoute.jsx` et le bloc routing `/admin-dashboard/*` dans `App.jsx` sont la propriété exclusive de agent-infra. Les pages admin métier sont gérées par les agents métier respectifs.
- `AdminDashboard.jsx` (`pages/admin/AdminDashboard.jsx`) est la page d'accueil admin avec stats agrégées — propriété agent-infra.
- Notification types : ORDER_CREATED, ORDER_PAID, PAYMENT_FAILED, SUBORDER_STATUS, ORDER_DELIVERED, DELIVERY_ATTEMPTED, ORG_INVITATION, MANUSCRIPT_STATUS, COUPON_RECEIVED, COUPON_REVOKED — ajout de nouveaux types à coordonner avec l'agent métier concerné.
