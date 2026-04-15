# agent-connect

## Identité

- **Nom** : agent-connect
- **Type** : spécialisé
- **Domaine métier** : Organisations (maisons d'édition, librairies, bibliothèques, imprimeries), annuaire professionnel, manuscrits, invitations, inquiries

## Périmètre backend

- Apps Django : `apps/organizations/`, `apps/manuscripts/`
- Modèles gérés dans organizations : Organization, OrganizationMembership, Invitation, OrganizationReview, Inquiry
- Modèles gérés dans manuscripts : Manuscript
- Admin Django : `apps/organizations/admin.py`, `apps/manuscripts/admin.py`

## Périmètre frontend

- Pages :
  - `pages/Organizations.jsx` → `/organizations`
  - `pages/OrganizationDetail.jsx` → `/organizations/:slug`
  - `pages/Professionals.jsx` → `/professionals`
  - `pages/ProfessionalDetail.jsx` → `/professionals/:slug`
  - `pages/Inquiries.jsx` → `/inquiries`
  - `pages/InquiryDetail.jsx` → `/inquiries/:id`
  - `pages/InquiryNew.jsx` → `/inquiries/new`
  - `pages/SubmitManuscript.jsx` → `/submit-manuscript`
  - `pages/dashboard/OrgDashboard.jsx` → `/dashboard/organizations/:id`
  - `pages/dashboard/OrgManuscripts.jsx` → `/dashboard/organizations/:id/manuscripts`
  - `pages/dashboard/OrgBooks.jsx` → `/dashboard/organizations/:id/books`
  - `pages/dashboard/OrgPrintRequests.jsx` → `/dashboard/organizations/:id/print-requests`
  - `pages/dashboard/OrgSettings.jsx` → `/dashboard/organizations/:id/settings`
  - `pages/dashboard/MyManuscripts.jsx` → `/dashboard/my-manuscripts`
  - `pages/dashboard/MyInvitations.jsx` → `/dashboard/invitations`
  - `pages/admin/AdminManuscripts.jsx` → `/admin-dashboard/manuscripts`
- Composants :
  - `components/sidebar/content/ConnectSidebar.jsx`
- Hooks : aucun propre
- Services API : `organizationService`, `invitationService` dans `services/api.js`, endpoints `manuscripts/*`, `professionals/*`, `inquiries/*`
- Styles CSS : `Organizations.css`, `OrganizationDetail.css`, `Professionals.css`, `ProfessionalDetail.css`, `OrgBooks.css`, `SubmitManuscript.css`, `Inquiries.css`

## Périmètre i18n

- Sections de fr.json/en.json : sous-clés `pages` (organizations, professionals, manuscripts, inquiries)

## Périmètre tests

- Backend : `backend/apps/organizations/tests.py`, `backend/apps/manuscripts/tests.py`
- Frontend : aucun actuellement — priorité à créer

## Interfaces avec les autres agents

- **Consomme depuis** :
  - agent-services : `services.views.CreateProjectFromManuscriptView` (conversion manuscrit → projet)
  - agent-library : `library.models` (bibliothèques liées à des organisations de type BIBLIOTHEQUE)
  - agent-users : `users.models.User`, `users.models.UserProfile` (membres, auteurs)
  - agent-infra : `core.email` (notifications invitations, manuscrits), `notifications` (création)
- **Expose à** :
  - agent-catalogue : `organizations.models.Organization` (éditeur d'un livre)
  - agent-marketplace : `organizations.models.Organization` (vendeur)
  - agent-services : `organizations.models.Organization` (imprimerie, prestataire organisé), `manuscripts.models.Manuscript`
  - agent-coupons : `organizations.models.Organization` (émetteur de coupons)
  - agent-library : `organizations.models.Organization` (bibliothèque)
  - agent-social : `organizations.models.Organization` (follow d'organisation)
  - agent-users : `organizations.models.OrganizationMembership`, `organizations.models.Invitation`
- **Zones de couplage critique** :
  - Organizations est le module le plus importé (44 imports) — tout changement de modèle a un impact large
  - Manuscrits ↔ Projets éditoriaux (Section 5.2)
  - Auth ↔ Organisations (Section 5.2)

## Exclusions explicites

- `apps/marketplace/` (listings vendeurs, commandes)
- `apps/orders/` (commandes, paiements)
- `apps/coupons/` (coupons — consomme Organization en lecture)
- `apps/social/` (réseau social — consomme Organization en lecture)
- `apps/services/` (ne modifie pas — l'interface manuscrit→projet passe par un endpoint services)
- `apps/library/` (ne modifie pas — la bibliothèque est une organisation mais library gère ses propres modèles)

## Protocole de travail

1. Avant de démarrer : lire `CHARTE_AGENTS.md` et la fiche de cet agent.
2. Vérifier que le chantier ne déborde pas du périmètre.
3. Si débordement potentiel : demander autorisation à agent-intégrateur.
4. Travailler sur une branche `agent/connect/<chantier>`.
5. Tests systématiques.
6. Récap final selon le format de la charte.
7. Soumission à agent-intégrateur.
8. Pas de commit autonome.

## Notes spécifiques

- **Attention critique** : `Organization` est le modèle le plus importé du projet (44 imports). Tout changement de schéma doit être validé par agent-intégrateur avec impact assessment sur tous les modules consommateurs.
- Le modèle `Manuscript` a un système de transitions validées (`ALLOWED_TRANSITIONS`) — ne pas bypasser.
- Le marché ouvert a une fenêtre de 15 jours avec verrouillage/déverrouillage — tester les edge cases temporels.
- Frollot Connect = annuaire pro + soumission manuscrits + inquiries. C'est le coeur de la proposition de valeur B2B.
- Les rôles d'organisation (PROPRIETAIRE, ADMINISTRATEUR, EDITEUR, COMMERCIAL, MEMBRE) contrôlent les permissions — tester chaque rôle.
- `AdminManuscripts.jsx` est une page admin rattachée à ce domaine mais l'infra admin appartient à agent-infra.
