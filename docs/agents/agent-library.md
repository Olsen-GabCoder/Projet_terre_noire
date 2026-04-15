# agent-library

## Identité

- **Nom** : agent-library
- **Type** : spécialisé
- **Domaine métier** : Gestion de bibliothèques (catalogue, adhésions, prêts, prolongations, réservations)

## Périmètre backend

- Apps Django : `apps/library/`
- Modèles gérés : LibraryCatalogItem, LibraryMembership, BookLoan, LoanExtension, BookReservation
- Admin Django : `apps/library/admin.py`

## Périmètre frontend

- Pages :
  - `pages/LibraryPage.jsx` → `/library/:slug`
  - `pages/dashboard/MyLoans.jsx` → `/dashboard/my-loans`
- Composants : aucun propre actuellement
- Hooks : aucun propre
- Services API : endpoints `library/*` dans `services/api.js`
- Styles CSS : aucun fichier dédié actuellement

## Périmètre i18n

- Sections de fr.json/en.json : sous-clés `pages` (library, si existantes)

## Périmètre tests

- Backend : `backend/apps/library/tests.py`
- Frontend : aucun actuellement — priorité à créer

## Interfaces avec les autres agents

- **Consomme depuis** :
  - agent-connect : `organizations.models.Organization` (une bibliothèque est une organisation de type BIBLIOTHEQUE)
  - agent-catalogue : `books.models.Book` (catalogue de livres prêtables)
  - agent-users : `users.models.User` (membres, emprunteurs)
  - agent-infra : `notifications` (si implémenté — rappels de retard)
- **Expose à** :
  - agent-connect : données bibliothèque accessibles via le dashboard organisation
- **Zones de couplage critique** :
  - Organisations ↔ Bibliothèque (Section 5.2) : couplage modéré, bien délimité

## Exclusions explicites

- `apps/marketplace/` (marketplace, commandes)
- `apps/orders/` (commandes, paiements)
- `apps/services/` (services pro)
- `apps/coupons/` (coupons)
- `apps/social/` (réseau social)
- `apps/organizations/` (ne modifie pas — consomme en lecture)
- `apps/books/` (ne modifie pas — consomme en lecture)

## Protocole de travail

1. Avant de démarrer : lire `CHARTE_AGENTS.md` et la fiche de cet agent.
2. Vérifier que le chantier ne déborde pas du périmètre.
3. Si débordement potentiel : demander autorisation à agent-intégrateur.
4. Travailler sur une branche `agent/library/<chantier>`.
5. Tests systématiques.
6. Récap final selon le format de la charte.
7. Soumission à agent-intégrateur.
8. Pas de commit autonome.

## Notes spécifiques

- Module relativement autonome avec peu de couplage — bon candidat pour des chantiers indépendants.
- Adhésion : types STANDARD, PREMIUM, STUDENT avec numéro auto-généré.
- Prêts : types PHYSICAL et DIGITAL, statuts REQUESTED → APPROVED → ACTIVE → OVERDUE → RETURNED/CANCELLED.
- Réservations : file d'attente FIFO, libération automatique quand le livre est retourné.
- Détection de retard (`is_overdue`) et compteur de rappels (`reminder_count`) — possibilité de tâche Celery pour les rappels automatiques.
- Le dashboard bibliothèque (`LibraryDashboardView`) est accessible depuis le dashboard organisation via agent-connect.
