# agent-services

## Identité

- **Nom** : agent-services
- **Type** : spécialisé
- **Domaine métier** : Services éditoriaux professionnels (correction, illustration, traduction, maquette), devis, commandes de service, projets éditoriaux, impression

## Périmètre backend

- Apps Django : `apps/services/`
- Modèles gérés : ServiceListing, ServiceRequest, ServiceQuote, ServiceOrder, EditorialProject, ProjectTask, PrintRequest, ProfessionalWallet, ProfessionalWalletTransaction, QuoteTemplate, Quote, ServiceProviderReview
- Admin Django : `apps/services/admin.py`

## Périmètre frontend

- Pages :
  - `pages/Services.jsx` → `/services`
  - `pages/ServiceDetail.jsx` → `/services/:slug`
  - `pages/ServiceRequest.jsx` → `/services/request/:listingId`
  - `pages/dashboard/ProDashboard.jsx` → `/dashboard/services`
  - `pages/dashboard/ProRequests.jsx` → `/dashboard/services/requests`
  - `pages/dashboard/ProOrders.jsx` → `/dashboard/services/orders`
  - `pages/dashboard/ProListings.jsx` → `/dashboard/services/listings`
  - `pages/dashboard/ProWallet.jsx` → `/dashboard/services/wallet`
  - `pages/dashboard/MyServiceRequests.jsx` → `/dashboard/my-service-requests`
  - `pages/dashboard/EditorialProjects.jsx` → `/dashboard/projects`
  - `pages/dashboard/EditorialProjectDetail.jsx` → `/dashboard/projects/:id`
  - `pages/dashboard/Quotes.jsx` → `/dashboard/my-quotes` et `/dashboard/services/quotes`
  - `pages/dashboard/QuoteCreate.jsx` → `/dashboard/services/quotes/create`
  - `pages/dashboard/QuoteDetail.jsx` → `/dashboard/my-quotes/:id` et `/dashboard/services/quotes/:id`
- Composants : aucun propre actuellement
- Hooks : aucun propre
- Services API : endpoints `services/*` dans `services/api.js`
- Styles CSS : `Services.css`, `ServiceDetail.css`, `ServiceRequest.css`, `pro-cards.css`

## Périmètre i18n

- Sections de fr.json/en.json : `services`

## Périmètre tests

- Backend : `backend/apps/services/tests.py`
- Frontend : aucun actuellement — priorité à créer

## Interfaces avec les autres agents

- **Consomme depuis** :
  - agent-connect : `organizations.models.Organization` (imprimeries, prestataires organisés)
  - agent-coupons : `coupons.services` (réduction sur ServiceOrder/ServiceQuote)
  - agent-infra : `core.invoice` (génération PDF factures/devis), `core.email` (notifications), `core.tasks` (tâches Celery), `notifications` (création)
  - agent-users : `users.models.UserProfile` (profil prestataire)
  - agent-connect : `manuscripts.models.Manuscript` (conversion manuscrit → projet éditorial via `CreateProjectFromManuscriptView`)
- **Expose à** :
  - agent-coupons : `services.models.ServiceOrder`, `services.models.ServiceQuote` (pour calcul de réduction)
  - agent-connect : `services.views.CreateProjectFromManuscriptView` (endpoint appelé depuis le contexte manuscrit)
- **Zones de couplage critique** :
  - Coupons ↔ Services (Section 5.2)
  - Manuscrits ↔ Projets éditoriaux (Section 5.2)

## Exclusions explicites

- `apps/marketplace/` (marketplace livres, commandes de livres)
- `apps/orders/` (commandes de livres)
- `apps/organizations/` (ne modifie pas les modèles orga, les consomme en lecture)
- `apps/manuscripts/` (ne modifie pas les modèles manuscrit, les consomme en lecture)
- `apps/social/` (réseau social)
- `apps/coupons/` (modèles coupons — utilise uniquement `coupons.services`)
- `apps/books/` (catalogue)

## Protocole de travail

1. Avant de démarrer : lire `CHARTE_AGENTS.md` et la fiche de cet agent.
2. Vérifier que le chantier ne déborde pas du périmètre.
3. Si débordement potentiel : demander autorisation à agent-intégrateur.
4. Travailler sur une branche `agent/services/<chantier>`.
5. Tests systématiques.
6. Récap final selon le format de la charte.
7. Soumission à agent-intégrateur.
8. Pas de commit autonome.

## Notes spécifiques

- 3 TODO dans le code — à investiguer lors du prochain chantier.
- ServiceOrder a une auto-complétion à 14 jours si le client ne confirme pas la réception du livrable.
- ServiceQuote contient des champs détaillés (méthodologie, jalons, conditions, exclusions) — le serializer est complexe.
- `PublishProjectAsBookView` crée un `Book` depuis un `EditorialProject` — interface vers agent-catalogue via l'intégrateur.
- Les devis PDF et factures PDF utilisent `core.invoice` (ReportLab) — ne pas dupliquer la logique PDF.
