# agent-catalogue

## Identité

- **Nom** : agent-catalogue
- **Type** : spécialisé
- **Domaine métier** : Catalogue de livres, auteurs, catégories, avis et wishlist

## Périmètre backend

- Apps Django : `apps/books/`, `apps/wishlist/`
- Modèles gérés : Category, Author, Book, BookReview, ReviewLike, WishlistItem
- Admin Django : `apps/books/admin.py`, `apps/wishlist/admin.py`

## Périmètre frontend

- Pages :
  - `pages/Catalog.jsx` → `/catalog`
  - `pages/BookDetail.jsx` → `/books/:id`
  - `pages/BookReader.jsx` → `/books/:id/read`
  - `pages/Search.jsx` → `/search`
  - `pages/Authors.jsx` → `/authors`
  - `pages/AuthorDetail.jsx` → `/authors/:id`
  - `pages/Wishlist.jsx` → `/wishlist`
  - `pages/dashboard/AuthorDashboard.jsx` → `/dashboard/author`
  - `pages/dashboard/AuthorBooks.jsx` → `/dashboard/author/books`
  - `pages/dashboard/AuthorSales.jsx` → `/dashboard/author/sales`
  - `pages/dashboard/AuthorReviews.jsx` → `/dashboard/author/reviews`
  - `pages/dashboard/AuthorManuscripts.jsx` → `/dashboard/author/manuscripts`
  - `pages/dashboard/AuthorProfile.jsx` → `/dashboard/author/profile`
  - `pages/admin/AdminBooks.jsx` → `/admin-dashboard/books`
  - `pages/admin/AdminAuthors.jsx` → `/admin-dashboard/authors`
- Composants :
  - `components/BookCard.jsx`
  - `components/OptimizedImage.jsx`
  - `components/ShareButtons.jsx`
  - `components/sidebar/content/CatalogSidebar.jsx`
  - `components/sidebar/content/BookDetailSidebar.jsx`
  - `components/sidebar/content/AuthorsSidebar.jsx`
- Hooks : aucun propre
- Services API : `bookService` (dans `services/api.js`), `wishlistService`
- Styles CSS : `Catalog.css`, `BookDetail.css`, `BookCard.css`, `BookReader.css`, `Search.css`, `Wishlist.css`, `AuthorSpace.css`, `AuthorDetail.css`, `AdminBooks.css`, `OptimizedImage.css`, `ShareButtons.css`
- Contexts : `context/WishlistContext.jsx`

## Périmètre i18n

- Sections de fr.json/en.json : `bookCard`, `catalog`, `bookDetail`, `search`

## Périmètre tests

- Backend : `backend/apps/books/tests.py`, `backend/apps/wishlist/tests.py`
- Frontend : `frontend/src/components/BookCard.test.jsx`, `frontend/src/components/OptimizedImage.test.jsx`, `frontend/src/components/ShareButtons.test.jsx`, `frontend/src/services/bookService.test.js`

## Interfaces avec les autres agents

- **Consomme depuis** :
  - agent-connect : `organizations.models.Organization` (éditeur d'un livre)
  - agent-users : `users.models.User` (auteur), `users.models.UserProfile`
- **Expose à** :
  - agent-marketplace : `books.models.Book` (FK dans BookListing)
  - agent-social : `books.models.Book` (dans ReadingList, Post)
  - agent-library : `books.models.Book` (dans LibraryCatalogItem)
  - agent-coupons : `books.models.Book` (pour filtrage de coupons)
- **Zones de couplage critique** : faible — module principalement consommé, peu de dépendances sortantes

## Exclusions explicites

- Listings vendeurs et prix marketplace (`apps/marketplace/`)
- Panier et commandes (`apps/orders/`)
- Coupons et réductions (`apps/coupons/`)
- Social (posts, follows) (`apps/social/`)
- Tout fichier dans `apps/services/`, `apps/library/`, `apps/organizations/`, `apps/manuscripts/`

## Protocole de travail

1. Avant de démarrer : lire `CHARTE_AGENTS.md` et la fiche de cet agent.
2. Vérifier que le chantier ne déborde pas du périmètre.
3. Si débordement potentiel : demander autorisation à agent-intégrateur.
4. Travailler sur une branche `agent/catalogue/<chantier>`.
5. Tests systématiques.
6. Récap final selon le format de la charte.
7. Soumission à agent-intégrateur.
8. Pas de commit autonome.

## Notes spécifiques

- Le modèle `Author` synchronise certains champs avec `User` via signals — attention aux effets de bord.
- `BookReview` supporte les réponses imbriquées (parent-child) — tester les cas de profondeur.
- La page `BookReader.jsx` utilise `pdfjs-dist` pour le rendu PDF — dépendance lourde, attention aux mises à jour.
- `AdminBooks.jsx` et `AdminAuthors.jsx` sont des pages admin rattachées à ce domaine mais l'infra admin (layout, routing, protection) appartient à agent-infra.
