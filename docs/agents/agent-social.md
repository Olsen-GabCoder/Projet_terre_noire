# agent-social

## Identité

- **Nom** : agent-social
- **Type** : spécialisé
- **Domaine métier** : Réseau social du livre (follows, posts, listes de lecture, clubs de lecture, messagerie club), newsletter, contact

## Périmètre backend

- Apps Django : `apps/social/`, `apps/newsletter/`, `apps/contact/`
- Modèles gérés dans social : UserFollow, AuthorFollow, OrganizationFollow, ReadingList, ReadingListItem, Post, PostLike, PostComment, BookClub, BookClubMembership, BookClubMessage
- Modèles gérés dans newsletter : NewsletterSubscriber
- Modèles gérés dans contact : ContactMessage
- Admin Django : `apps/social/admin.py`, `apps/newsletter/admin.py`, `apps/contact/admin.py`

## Périmètre frontend

- Pages :
  - `pages/Feed.jsx` → `/feed`
  - `pages/ReadingLists.jsx` → `/lists`
  - `pages/ReadingListDetail.jsx` → `/lists/:slug`
  - `pages/BookClubs.jsx` → `/clubs`
  - `pages/BookClubCreate.jsx` → `/clubs/create`
  - `pages/BookClubDetail.jsx` → `/clubs/:slug`
  - `pages/About.jsx` → `/about`
  - `pages/Contact.jsx` → `/contact`
  - `pages/FAQ.jsx` → `/faq`
  - `pages/Support.jsx` → `/support`
- Composants :
  - `components/social/PostCard.jsx`
  - `components/social/PostComposer.jsx`
  - `components/social/FollowButton.jsx`
  - `components/sidebar/content/SocialSidebar.jsx`
- Hooks : aucun propre
- Services API : `newsletterService`, `contactService` dans `services/api.js`, endpoints `social/*`
- Styles CSS : `Feed.css`, `Social.css`, `BookClubs.css`, `ClubChat.css`, `About.css`, `Contact.css`, `FAQ.css`, `Support.css`, `ShareButtons.css`

## Périmètre i18n

- Sections de fr.json/en.json : `footer`, `share`, sous-clés `pages` (about, contact, faq, support)

## Périmètre tests

- Backend : aucun actuellement — **priorité absolue à créer** (0 test pour 11 modèles)
- Frontend : aucun actuellement — priorité à créer

## Interfaces avec les autres agents

- **Consomme depuis** :
  - agent-users : `users.models.User` (follows, posts, clubs)
  - agent-catalogue : `books.models.Book`, `books.models.Author` (listes de lecture, follows auteur)
  - agent-connect : `organizations.models.Organization` (follow organisation)
  - agent-infra : `core.email` (contact form)
- **Expose à** :
  - Aucun module ne dépend de social — module terminal
- **Zones de couplage critique** : faible — module autonome consommateur

## Exclusions explicites

- `apps/marketplace/` (marketplace, commandes)
- `apps/orders/` (commandes, paiements)
- `apps/services/` (services pro)
- `apps/coupons/` (coupons)
- `apps/library/` (bibliothèque)
- `apps/manuscripts/` (manuscrits)
- `apps/organizations/` (ne modifie pas — consomme en lecture)
- Pages admin (aucune page admin social actuellement)

## Protocole de travail

1. Avant de démarrer : lire `CHARTE_AGENTS.md` et la fiche de cet agent.
2. Vérifier que le chantier ne déborde pas du périmètre.
3. Si débordement potentiel : demander autorisation à agent-intégrateur.
4. Travailler sur une branche `agent/social/<chantier>`.
5. Tests systématiques.
6. Récap final selon le format de la charte.
7. Soumission à agent-intégrateur.
8. Pas de commit autonome.

## Notes spécifiques

- **Dette critique** : 0 test pour 11 modèles. Le premier chantier de cet agent devrait être la création d'une suite de tests.
- `BookClubMessage` supporte les messages vocaux (durée stockée) et les fichiers — tester les uploads.
- `Post` a 5 types (TEXT, REVIEW, RECOMMENDATION, NEWS, PLATFORM_REVIEW) — chacun a potentiellement un rendu différent.
- Les avis plateforme en vitrine (`FeaturedPlatformReviewsView`) sont utilisés sur la Home — interface visuelle avec agent-infra.
- Le formulaire de contact (`apps/contact/`) est un micro-module — peu de risque, peu de maintenance.
- Newsletter (`apps/newsletter/`) est un micro-module — un seul endpoint subscribe.
