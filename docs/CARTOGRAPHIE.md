# Cartographie exhaustive du projet Frollot

> Document de référence pour le découpage en agents spécialisés.
> Généré le 2026-04-15. Lecture seule — aucun code modifié.

---

## Section 1 — Vision et objectif de la plateforme

**Frollot** (nom de code interne, marque publique « Terre Noire Éditions ») est une plateforme web e-commerce et sociale dédiée au livre, basée à Port-Gentil (Gabon), ciblant la francophonie africaine.

- **Audiences** : lecteurs, auteurs indépendants, maisons d'édition, librairies, bibliothèques, imprimeries, prestataires éditoriaux (correcteurs, illustrateurs, traducteurs, maquettistes), livreurs.
- **Périmètre géographique / linguistique** : Afrique francophone. Devise : FCFA. i18n français + anglais.
- **Piliers fonctionnels** : marketplace multi-vendeurs du livre (neuf/occasion, ebook/papier), services éditoriaux professionnels (devis, commandes, projets éditoriaux), soumission de manuscrits (Frollot Connect), gestion de bibliothèques, réseau social du livre (clubs, posts, listes de lecture), système de coupons, livraison avec agents indépendants, portefeuilles vendeurs/livreurs/prestataires.

---

## Section 2 — Inventaire des modules backend Django

### 2.1 — books

| Champ | Détail |
|---|---|
| **Rôle** | Catalogue de livres, auteurs, catégories, avis et notes |
| **Modèles** | Category, Author, Book, BookReview, ReviewLike |
| **Endpoints clés** | `GET /api/books/`, `GET /api/books/{id}/`, `GET /api/authors/`, `GET /api/authors/me/dashboard/`, `GET /api/books/{id}/read-pdf/` |
| **Dépendances entrantes** | orders, marketplace, coupons, services, library, social, organizations, wishlist |
| **Dépendances sortantes** | orders (signals), users |
| **Maturité** | Stable |
| **Tests** | 1 fichier (tests.py) |

### 2.2 — users

| Champ | Détail |
|---|---|
| **Rôle** | Authentification, profils multi-rôles, 2FA TOTP, OAuth, sessions |
| **Modèles** | User, FailedLoginAttempt, EmailVerificationToken, LoginHistory, ActiveSession, TOTPBackupCode, TOTPChallenge, SocialAccount, UserProfile |
| **Endpoints clés** | `POST /api/users/register/`, `GET /api/users/me/`, `POST /api/token/`, `POST /api/users/totp/setup/`, `GET /api/users/oauth/google/` |
| **Dépendances entrantes** | Presque toutes les apps (FK User) |
| **Dépendances sortantes** | organizations, services |
| **Maturité** | Stable |
| **Tests** | 1 fichier (tests.py) — 3 TODO dans le code |

### 2.3 — orders

| Champ | Détail |
|---|---|
| **Rôle** | Commandes, articles, paiements (Mobicash, Airtel, Visa, Cash), journal d'événements |
| **Modèles** | Order, OrderItem, Payment, OrderEvent |
| **Endpoints clés** | `POST /api/orders/`, `GET /api/orders/{id}/`, `POST /api/payments/initiate/`, `POST /api/payments/webhook/{provider}/`, `GET /api/orders/access-check/{book_id}/` |
| **Dépendances entrantes** | marketplace, coupons, services, books |
| **Dépendances sortantes** | core (tasks, email), marketplace, books (signals), coupons |
| **Maturité** | Stable sauf passerelle de paiement (6 TODO stubs Mobicash/Airtel) |
| **Tests** | 1 fichier (tests.py) |

### 2.4 — marketplace

| Champ | Détail |
|---|---|
| **Rôle** | Listings multi-vendeurs, sous-commandes, commission, portefeuilles vendeurs et livreurs, livraison |
| **Modèles** | BookListing, SubOrder, CommissionConfig, VendorWallet, WalletTransaction, DeliveryWallet, DeliveryWalletTransaction, DeliveryRate, WithdrawalRequest |
| **Endpoints clés** | `GET /api/marketplace/listings/`, `PUT /api/marketplace/sub-orders/{pk}/status/`, `POST /api/marketplace/sub-orders/{pk}/assign-delivery/`, `GET /api/marketplace/vendor/wallet/`, `GET /api/marketplace/delivery/my-assignments/` |
| **Dépendances entrantes** | orders, coupons, organizations |
| **Dépendances sortantes** | core (tasks), notifications, orders, books |
| **Maturité** | Stable |
| **Tests** | 1 fichier (tests.py) |

### 2.5 — organizations

| Champ | Détail |
|---|---|
| **Rôle** | Organisations (maisons d'édition, librairies, bibliothèques, imprimeries), membres, invitations, vitrine, avis, annuaire professionnel |
| **Modèles** | Organization, OrganizationMembership, Invitation, OrganizationReview, Inquiry |
| **Endpoints clés** | `GET /api/organizations/directory/`, `GET /api/organizations/{slug}/storefront/`, `POST /api/organizations/{org_id}/invitations/`, `GET /api/organizations/{org_id}/dashboard/`, `GET /api/organizations/{org_id}/manuscripts/` |
| **Dépendances entrantes** | coupons, marketplace, services, manuscripts, library, books, users, social |
| **Dépendances sortantes** | marketplace, services, library, users |
| **Maturité** | Stable |
| **Tests** | 1 fichier (tests.py) |

### 2.6 — services

| Champ | Détail |
|---|---|
| **Rôle** | Services éditoriaux pro (correction, illustration, traduction, maquette), devis, commandes de service, projets éditoriaux, impression, portefeuille pro |
| **Modèles** | ServiceListing, ServiceRequest, ServiceQuote, ServiceOrder, EditorialProject, ProjectTask, PrintRequest, ProfessionalWallet, ProfessionalWalletTransaction, QuoteTemplate, Quote, ServiceProviderReview |
| **Endpoints clés** | `GET /api/services/listings/`, `POST /api/services/requests/create/`, `POST /api/services/service-quotes/create/`, `GET /api/services/projects/`, `POST /api/services/print-requests/create/` |
| **Dépendances entrantes** | coupons, orders, organizations, users |
| **Dépendances sortantes** | core (invoice, tasks, email), organizations, coupons |
| **Maturité** | Stable — 3 TODO dans le code |
| **Tests** | 1 fichier (tests.py) |

### 2.7 — coupons

| Champ | Détail |
|---|---|
| **Rôle** | Système de coupons : templates réutilisables (bibliothèque système), émission par organisation ou prestataire, validation, application sur commandes et services |
| **Modèles** | CouponTemplate, Coupon |
| **Endpoints clés** | `GET /api/coupons/templates/system/`, `POST /api/coupons/send/`, `POST /api/coupons/validate/`, `GET /api/coupons/applicable/`, `GET /api/coupons/admin/overview/` |
| **Dépendances entrantes** | orders, marketplace, services |
| **Dépendances sortantes** | organizations, users, core (email, tasks), notifications, books, services, orders, marketplace |
| **Maturité** | En cours d'intégration (chantier non commité) — couverture de tests très élevée |
| **Tests** | 14 fichiers (tests/) — le module le mieux testé du projet |

### 2.8 — manuscripts

| Champ | Détail |
|---|---|
| **Rôle** | Soumission de manuscrits aux maisons d'édition (Frollot Connect), workflow de validation, marché ouvert 15 jours |
| **Modèles** | Manuscript |
| **Endpoints clés** | `POST /api/manuscripts/submit/`, `GET /api/manuscripts/mine/`, `GET /api/manuscripts/recommendations/`, `PUT /api/manuscripts/{pk}/update-status/`, `GET /api/manuscripts/{pk}/download/` |
| **Dépendances entrantes** | organizations, services (projets éditoriaux) |
| **Dépendances sortantes** | organizations, core (email), users |
| **Maturité** | Stable |
| **Tests** | 1 fichier (tests.py) |

### 2.9 — social

| Champ | Détail |
|---|---|
| **Rôle** | Réseau social : suivi utilisateurs/auteurs/organisations, listes de lecture, posts, clubs de lecture avec messagerie |
| **Modèles** | UserFollow, AuthorFollow, OrganizationFollow, ReadingList, ReadingListItem, Post, PostLike, PostComment, BookClub, BookClubMembership, BookClubMessage |
| **Endpoints clés** | `POST /api/social/follow/user/`, `GET /api/social/lists/`, `GET /api/social/posts/`, `GET /api/social/clubs/`, `GET /api/social/recommendations/` |
| **Dépendances entrantes** | — |
| **Dépendances sortantes** | users, books, organizations |
| **Maturité** | MVP — aucun test |
| **Tests** | 0 |

### 2.10 — library

| Champ | Détail |
|---|---|
| **Rôle** | Gestion de bibliothèques : catalogue, adhésions, prêts physiques/numériques, prolongations, réservations |
| **Modèles** | LibraryCatalogItem, LibraryMembership, BookLoan, LoanExtension, BookReservation |
| **Endpoints clés** | `GET /api/library/{org_id}/catalog/`, `POST /api/library/{org_id}/loans/create/`, `POST /api/library/loans/{pk}/approve/`, `GET /api/library/my-loans/`, `GET /api/library/{org_id}/dashboard/` |
| **Dépendances entrantes** | organizations |
| **Dépendances sortantes** | organizations, books, users |
| **Maturité** | Stable |
| **Tests** | 1 fichier (tests.py) |

### 2.11 — notifications

| Champ | Détail |
|---|---|
| **Rôle** | Notifications in-app (commandes, paiements, livraisons, invitations, manuscrits, coupons) |
| **Modèles** | Notification |
| **Endpoints clés** | `GET /api/notifications/`, `GET /api/notifications/unread_count/`, `POST /api/notifications/{pk}/mark_as_read/`, `POST /api/notifications/mark_all_as_read/` |
| **Dépendances entrantes** | orders, marketplace, coupons, services, manuscripts, organizations |
| **Dépendances sortantes** | users |
| **Maturité** | Stable (récemment livré : P3.3) |
| **Tests** | 1 fichier (tests.py) |

### 2.12 — core

| Champ | Détail |
|---|---|
| **Rôle** | Infrastructure transversale : email templating, tâches Celery, génération de factures PDF, configuration livraison, zones de livraison |
| **Modèles** | SiteConfig, DeliveryZone |
| **Endpoints clés** | `GET /api/config/delivery/`, `GET /api/config/delivery/zones/` |
| **Dépendances entrantes** | Toutes les apps métier (81 imports — hub central) |
| **Dépendances sortantes** | users (pour email context) |
| **Maturité** | Stable — infrastructure critique |
| **Tests** | 1 fichier (tests.py) |

### 2.13 — wishlist

| Champ | Détail |
|---|---|
| **Rôle** | Liste de souhaits utilisateur |
| **Modèles** | WishlistItem |
| **Endpoints clés** | `GET /api/wishlist/`, `POST /api/wishlist/toggle/` |
| **Dépendances entrantes** | — |
| **Dépendances sortantes** | users, books |
| **Maturité** | Stable |
| **Tests** | 1 fichier (tests.py) |

### 2.14 — newsletter

| Champ | Détail |
|---|---|
| **Rôle** | Abonnement newsletter |
| **Modèles** | NewsletterSubscriber |
| **Endpoints clés** | `POST /api/newsletter/subscribe/` |
| **Dépendances entrantes** | — |
| **Dépendances sortantes** | — |
| **Maturité** | Stable (micro-module) |
| **Tests** | 1 fichier (tests.py) |

### 2.15 — contact

| Champ | Détail |
|---|---|
| **Rôle** | Formulaire de contact |
| **Modèles** | ContactMessage |
| **Endpoints clés** | `POST /api/contact/submit/` |
| **Dépendances entrantes** | — |
| **Dépendances sortantes** | core (email) |
| **Maturité** | Stable (micro-module) |
| **Tests** | 1 fichier (tests.py) |

---

## Section 3 — Inventaire des modules frontend React

### 3.1 — Pages publiques (racine de pages/)

| Page | Route | Domaine |
|---|---|---|
| Home.jsx | `/` | Vitrine |
| Catalog.jsx | `/catalog` | Catalogue |
| BookDetail.jsx | `/books/:id` | Catalogue |
| BookReader.jsx | `/books/:id/read` | Catalogue |
| Search.jsx | `/search` | Recherche |
| Authors.jsx | `/authors` | Auteurs |
| AuthorDetail.jsx | `/authors/:id` | Auteurs |
| Cart.jsx | `/cart` | Commandes |
| Checkout.jsx | `/checkout` | Commandes |
| OrderSuccess.jsx | `/order-success` | Commandes |
| Orders.jsx | `/orders` | Commandes |
| Wishlist.jsx | `/wishlist` | Wishlist |
| Notifications.jsx | `/notifications` | Notifications |
| MyCoupons.jsx | `/dashboard/coupons` | Coupons |
| Services.jsx | `/services` | Services pro |
| ServiceDetail.jsx | `/services/:slug` | Services pro |
| ServiceRequest.jsx | `/services/request/:listingId` | Services pro |
| Organizations.jsx | `/organizations` | Connect |
| OrganizationDetail.jsx | `/organizations/:slug` | Connect |
| Professionals.jsx | `/professionals` | Connect |
| ProfessionalDetail.jsx | `/professionals/:slug` | Connect |
| Inquiries.jsx, InquiryDetail.jsx, InquiryNew.jsx | `/inquiries/*` | Connect |
| LibraryPage.jsx | `/library/:slug` | Bibliothèque |
| Feed.jsx | `/feed` | Social |
| ReadingLists.jsx, ReadingListDetail.jsx | `/lists/*` | Social |
| BookClubs.jsx, BookClubCreate.jsx, BookClubDetail.jsx | `/clubs/*` | Social |
| SubmitManuscript.jsx | `/submit-manuscript` | Manuscrits |
| Login.jsx, Register.jsx, ForgotPassword.jsx, ResetPassword.jsx, VerifyEmail.jsx | `/login`, `/register`, etc. | Auth |
| About.jsx, Contact.jsx, FAQ.jsx, Support.jsx, Privacy.jsx, CGV.jsx, Terms.jsx, Cookies.jsx, Delivery.jsx | Pages info | Légal/info |

### 3.2 — Pages admin (pages/admin/)

| Page | Route |
|---|---|
| AdminDashboard.jsx | `/admin-dashboard` |
| AdminBooks.jsx | `/admin-dashboard/books` |
| AdminOrders.jsx | `/admin-dashboard/orders` |
| AdminManuscripts.jsx | `/admin-dashboard/manuscripts` |
| AdminAuthors.jsx | `/admin-dashboard/authors` |
| AdminUsers.jsx | `/admin-dashboard/users` |
| AdminCoupons.jsx | `/admin-dashboard/coupons` |

**APIs consommées** : books, orders, manuscripts, users, coupons (admin endpoints).
**Composants liés** : AdminLayout, AdminProtectedRoute.

### 3.3 — Pages dashboard (pages/dashboard/) — 43 pages

**Espace personnel** : DashboardOverview, SettingsPage, SecuritySettings, MyInvitations, MyManuscripts, MyServiceRequests, Quotes, QuoteCreate, QuoteDetail, MyLoans, MyCoupons.

**Espace organisation** : OrgDashboard, OrgManuscripts, OrgBooks, OrgPrintRequests, OrgSettings.

**Espace auteur** : AuthorDashboard, AuthorBooks, AuthorSales, AuthorReviews, AuthorManuscripts, AuthorProfile.

**Espace pro (services)** : ProDashboard, ProRequests, ProOrders, ProListings, ProWallet.

**Espace livraison** : DeliveryDashboard, DeliveryAssignments, DeliveryWallet, DeliveryProfile, DeliveryRates.

**Espace coupons** : CouponTemplates, CouponSend, CouponIssued.

**Espace projets** : EditorialProjects, EditorialProjectDetail.

**Composants liés** : DashboardLayout, AppSidebar, Breadcrumbs, composants settings/.

### 3.4 — Pages vendeur (pages/vendor/)

| Page | Route |
|---|---|
| VendorDashboard.jsx | `/vendor` |
| VendorListings.jsx | `/vendor/listings` |
| VendorOrders.jsx | `/vendor/orders` |
| VendorWallet.jsx | `/vendor/wallet` |

### 3.5 — Composants réutilisables clés

| Composant | Domaine |
|---|---|
| Header, Footer, AppSidebar, DashboardLayout | Layout |
| BookCard, OptimizedImage, ShareButtons | Catalogue |
| CouponWidget, coupons/EmitterSelector | Coupons |
| NotificationCenter | Notifications |
| ProtectedRoute, AdminProtectedRoute | Auth |
| PostCard, PostComposer, FollowButton | Social |
| Sidebar (SideBlock, SideBookCard, etc.) + 9 variantes contextuelles | Navigation contextuelle |
| Settings (SectionProfile, SectionRoles, etc.) | Paramètres |
| OnboardingModal, CosmosBackground, PageHero, SEO, Breadcrumbs | UX transversal |

### 3.6 — Services API (frontend/src/services/api.js)

Namespaces : `authService`, `profileService`, `organizationService`, `invitationService`, `bookService`, `newsletterService`, `contactService`, `configService`, `couponService`, `wishlistService`, plus appels directs (orders, marketplace, manuscripts, services, social, library, notifications).

### 3.7 — i18n

Clés de premier niveau (22, identiques FR/EN) : `errorBoundary`, `common`, `nav`, `header`, `home`, `footer`, `bookCard`, `catalog`, `bookDetail`, `login`, `register`, `cart`, `search`, `share`, `onboarding`, `pages`, `dashboard`, `vendor`, `sidebar`, `notifications`, `coupons`, `services`.

---

## Section 4 — Liste exhaustive des fonctionnalités utilisateur

### Domaine 1 : Catalogue et découverte de livres
1. Catalogue avec recherche textuelle et filtres (catégorie, format, prix)
2. Page détail livre (description, auteur, avis, listings vendeurs)
3. Lecteur PDF intégré pour ebooks achetés
4. Consultation des catégories
5. Fiches auteurs avec bibliographie
6. Avis et notes sur les livres (avec réponses imbriquées)
7. Likes sur les avis
8. Recommandations de livres
9. Bestsellers et livres en promotion

### Domaine 2 : Marketplace multi-vendeurs
10. Listings multi-vendeurs par livre (neuf, occasion bon état, occasion acceptable)
11. Création et gestion de listings vendeur
12. Vitrine vendeur (page publique par slug)
13. Panier multi-vendeurs
14. Checkout avec choix mode de paiement (Mobicash, Airtel Money, Visa, Cash)
15. Sous-commandes par vendeur (suivi indépendant)
16. Suivi de commande côté acheteur
17. Gestion des commandes côté vendeur (confirmation → préparation → expédition)
18. Commission plateforme configurable
19. Portefeuille vendeur avec historique des transactions
20. Demandes de retrait vendeur
21. Annulation de commande avec restauration de stock et coupon

### Domaine 3 : Livraison
22. Agents de livraison indépendants
23. Affectation d'un livreur à une sous-commande
24. Suivi des livraisons côté livreur (mes missions)
25. Mise à jour de statut de livraison (tentative, livré)
26. Gestion des tentatives échouées (motif)
27. Portefeuille livreur avec transactions
28. Tarifs de livraison par livreur
29. Zones de livraison configurables (villes, coûts, délais)
30. Seuil de livraison gratuite

### Domaine 4 : Services éditoriaux professionnels
31. Annuaire de prestataires (correction, illustration, traduction, couverture, maquette, relecture)
32. Page détail prestataire
33. Demande de devis client
34. Réponse prestataire avec devis détaillé (méthodologie, jalons, révisions, conditions)
35. Acceptation/refus du devis par le client
36. Commande de service (suivi en cours, review, révision, complet)
37. Livraison de fichier et auto-complétion à 14 jours
38. Demande de révision avec motif
39. Portefeuille professionnel (transactions, retraits)
40. Avis sur les prestataires
41. Génération de devis PDF
42. Génération de facture PDF
43. Templates de devis réutilisables
44. Recommandations de prestataires

### Domaine 5 : Projets éditoriaux et impression
45. Création de projet éditorial (depuis un manuscrit ou de zéro)
46. Gestion des tâches de projet
47. Publication d'un projet comme livre
48. Liste des imprimeries
49. Demande d'impression
50. Suivi des demandes d'impression (statut, devis PDF)

### Domaine 6 : Manuscrits (Frollot Connect)
51. Soumission de manuscrit à une organisation ciblée
52. Soumission en marché ouvert (fenêtre de comparaison 15 jours)
53. Suivi de mes manuscrits (statut, historique)
54. Inbox manuscrits côté organisation
55. Workflow de validation (en revue → devis → accepté/refusé/contre-proposition)
56. Verrouillage/déverrouillage du marché ouvert
57. Téléchargement du manuscrit (PDF/DOCX)
58. Recommandations d'organisations pour un manuscrit
59. Sujets acceptés, langues, consignes de soumission par organisation

### Domaine 7 : Organisations et annuaire professionnel
60. Annuaire des organisations (maisons d'édition, librairies, bibliothèques, imprimeries)
61. Vitrine organisation (storefront public)
62. Catalogue de livres par organisation
63. Dashboard organisation (stats)
64. Gestion des membres et rôles (propriétaire, admin, éditeur, commercial, membre)
65. Invitations par email (acceptation/refus/expiration)
66. Mes invitations reçues
67. Avis et notes sur les organisations
68. Fiches professionnels (prestataires individuels)
69. Système d'inquiries (questions/réponses structurées)
70. Métadonnées étendues (WhatsApp, réseaux sociaux, horaires, moyens de paiement)

### Domaine 8 : Bibliothèque
71. Catalogue d'une bibliothèque (par organisation)
72. Adhésion (standard, premium, étudiant) avec numéro généré
73. Prêts physiques et numériques
74. Approbation / retour de prêt par le bibliothécaire
75. Prolongation de prêt
76. Réservation de livre (file d'attente FIFO)
77. Dashboard bibliothèque (stats)
78. Suivi des retards et rappels

### Domaine 9 : Social
79. Follow / unfollow utilisateurs, auteurs, organisations
80. Fil d'actualité (feed)
81. Posts (texte, avis, recommandation, news, avis plateforme)
82. Likes et commentaires sur les posts
83. Listes de lecture (publiques/privées, ordonnées)
84. Clubs de lecture (création, adhésion, catégories, règles, fréquence)
85. Messagerie de club (texte, vocal, image, fichier)
86. Recommandations sociales
87. Avis plateforme en vitrine (featured)

### Domaine 10 : Coupons et promotions
88. Bibliothèque de templates système (BIENVENUE, FIDÉLITÉ, SAISONNIER, etc.)
89. Clonage de templates système
90. Création de templates personnalisés (par organisation ou prestataire)
91. Émission de coupons à des clients spécifiques
92. Application de coupon au panier (livres)
93. Application de coupon à un devis de service
94. Validation de code coupon
95. Coupons applicables automatiquement listés
96. Révocation de coupon
97. Historique des coupons émis
98. Mes coupons reçus
99. Admin : vue d'ensemble et liste complète des coupons
100. Notifications email d'envoi et de révocation de coupon

### Domaine 11 : Comptes et sécurité
101. Inscription avec vérification email
102. Connexion classique (email + mot de passe)
103. Authentification 2FA TOTP (setup, vérification, codes de secours, désactivation)
104. OAuth (Google, Facebook, GitHub)
105. Réinitialisation de mot de passe
106. Changement de mot de passe
107. Gestion des sessions actives (liste, révocation unitaire, révocation totale)
108. Historique de connexions
109. Profils multi-rôles (lecteur, auteur, éditeur, correcteur, illustrateur, traducteur, livreur)
110. Suppression de compte
111. Détection de lockout (tentatives échouées)
112. Présence publique

### Domaine 12 : Notifications et communication
113. Notifications in-app temps réel (centre de notifications)
114. Notification par type (commande, paiement, livraison, invitation, manuscrit, coupon)
115. Marquer lu / tout marquer lu
116. Emails transactionnels (coupon reçu/révoqué, commande, inscription, etc.)
117. Newsletter (abonnement)
118. Formulaire de contact

### Domaine 13 : Wishlist
119. Ajouter/retirer un livre de la wishlist (toggle)
120. Consultation de la wishlist

### Domaine 14 : Administration plateforme
121. Dashboard admin (stats globales)
122. Gestion des livres (CRUD)
123. Gestion des commandes
124. Gestion des manuscrits
125. Gestion des auteurs
126. Gestion des utilisateurs
127. Gestion des coupons (vue admin)

### Domaine 15 : Transversal UX
128. Recherche globale
129. i18n français/anglais
130. Thème dark/light/auto
131. Onboarding modal
132. Sidebars contextuelles (9 variantes selon la page)
133. Breadcrumbs dynamiques
134. SEO (react-helmet)
135. Code splitting (lazy loading de toutes les pages sauf Home)
136. Timeout de session avec avertissement

---

## Section 5 — Cartographie des couplages critiques

### 5.1 — Modules transversaux (hubs)

| Module central | Consommateurs | Nature du couplage |
|---|---|---|
| **core (email)** | orders, services, coupons, manuscripts, organizations, marketplace, contact, users, notifications | Envoi d'emails transactionnels — 40 imports |
| **core (tasks)** | orders, services, coupons, marketplace | Tâches Celery asynchrones — 24 imports |
| **core (invoice)** | services | Génération de factures/devis PDF |
| **organizations** | coupons, marketplace, services, manuscripts, library, books, social, users | Entité multi-tenant — 44 imports |
| **users** | Toutes les apps | FK User omniprésent — 22 imports |
| **notifications** | orders, marketplace, coupons, services, manuscripts, organizations | Création de notifications — appelé par tous les flows métier |

### 5.2 — Couplages inter-domaines critiques

| Zone de couplage | Modules impliqués | Risque |
|---|---|---|
| **Coupons ↔ Commandes** | coupons.services → orders.models, marketplace.models | Calcul de réduction à l'application et restauration à l'annulation |
| **Coupons ↔ Services** | coupons.services → services.models (ServiceOrder, ServiceQuote) | Réduction sur devis et commandes de service |
| **Commandes ↔ Marketplace** | orders ↔ marketplace (SubOrder, stock, wallets) | Cycle de vie commande déclenche sous-commandes, commission, wallet |
| **Manuscrits ↔ Projets éditoriaux** | manuscripts → services (CreateProjectFromManuscript) | Conversion manuscrit accepté en projet éditorial |
| **Organisations ↔ Bibliothèque** | organizations ↔ library | Bibliothèque rattachée à une organisation de type BIBLIOTHEQUE |
| **Core email ↔ Tous** | core.email est importé tardivement (lazy imports) | Risque de circularité ; bottleneck de maintenance |
| **Marketplace ↔ Livraison** | marketplace (SubOrder, DeliveryWallet) interne | Couplage fort intra-module mais interfaces exposées à orders et notifications |
| **Auth ↔ Organisations** | users.UserProfile → organizations.OrganizationMembership | Rôle profil détermine accès ; membership détermine périmètre |

---

## Section 6 — Chantiers en cours et dettes techniques

### 6.1 — Chantier en cours non commité

| Chantier | Modules touchés | État | Fichiers |
|---|---|---|---|
| **Système de coupons v2** | coupons (modèles, vues, services, tasks, tests, templates, permissions, throttles), marketplace (SubOrder.coupon_discount), services (ServiceOrder.coupon_discount), orders (serializers/views), notifications (types coupon), core (email coupon), frontend (CouponWidget, CouponTemplates, CouponSend, CouponIssued, MyCoupons, AdminCoupons, hooks, styles) | En cours — 25 fichiers modifiés, ~50 fichiers nouveaux, 2262 insertions | Voir git status |

### 6.2 — Dettes techniques

#### TODO / FIXME / HACK par module

| Module | Compte | Détail notable |
|---|---|---|
| orders (backend) | 6 | Stubs passerelle de paiement Mobicash/Airtel Money — **bloqueur fonctionnel** |
| services (backend) | 3 | — |
| users (backend) | 3 | — |
| coupons (backend) | 1 | — |
| pages (frontend) | 5 | — |

#### Tests manquants ou faibles

| Module | Situation |
|---|---|
| **social** | 0 test — MVP sans aucune couverture |
| books, contact, core, library, manuscripts, marketplace, newsletter, notifications, orders, organizations, services, users, wishlist | 1 fichier tests.py chacun — couverture minimale |
| **coupons** | 14 fichiers de tests — exception notable, très bien couvert |

#### Tests frontend

18 fichiers de tests : App, BookCard, EmitterSelector, CouponWidget, Header, OptimizedImage, ProtectedRoute, ShareButtons, AuthContext, CartContext, useEmitterContext, CouponTemplates, Login, Register, api, bookService, couponService, notificationService.

#### Migrations suggérant une refonte récente

- `coupons/0002` à `0010` : refonte complète du modèle de coupons (template + coupon v2, migration de données, seed système)
- `marketplace/0010_suborder_coupon_discount` : ajout support coupon dans marketplace
- `services/0012_serviceorder_coupon_discount` : ajout support coupon dans services
- `orders/0009_coupon_template_and_coupon_v2` : synchronisation orders avec nouveau modèle coupons
- `notifications/0002_coupon_notification_types` : nouveaux types de notification

#### Aucun test skippé détecté (@skip / pytest.skip absents).

---

## Section 7 — Stack technique et infrastructure

### Backend

| Composant | Version / Détail |
|---|---|
| Python | 3.x (non spécifié dans requirements, compatible Django 5.1) |
| Django | 5.1.5 |
| Django REST Framework | 3.15.2 |
| JWT | djangorestframework-simplejwt 5.4.0 (cookies HttpOnly) |
| Filtres | django-filter 24.3 |
| Documentation API | drf-spectacular 0.28.0 (Swagger + ReDoc) |
| Base de données dev | MySQL (mysqlclient 2.2.7) |
| Base de données prod | PostgreSQL (psycopg2-binary 2.9.10, dj-database-url 2.3.0) |
| Tâches async | Celery 5.4.0 + Redis 5.2.1 |
| Images/CDN | Cloudinary 1.42.1 + django-cloudinary-storage 0.3.0 |
| PDF | ReportLab 4.2.5 (factures, devis) |
| Images | Pillow 11.1.0 |
| 2FA | pyotp 2.9.0 (TOTP) |
| Serveur prod | Gunicorn 23.0.0 |
| Static files prod | WhiteNoise 6.8.2 |
| CORS | django-cors-headers 4.6.0 |
| Dev tools | django-extensions 3.2.3 |
| Linting | ruff (configuré, nettoyages récents) |

### Frontend

| Composant | Version / Détail |
|---|---|
| React | 19.2.0 |
| Vite | 7.2.4 |
| Routing | react-router-dom 7.9.6 |
| HTTP | axios 1.13.2 |
| State serveur | @tanstack/react-query 5.96.2 |
| i18n | react-i18next 17.0.2 + i18next 26.0.3 |
| Charts | recharts 3.7.0 |
| PDF viewer | pdfjs-dist 5.5.207 |
| Icônes | lucide-react 0.555.0, @fortawesome/fontawesome-free 7.2.0 |
| SEO | react-helmet-async 3.0.0 |
| Toasts | react-hot-toast 2.6.0 |
| Tests | vitest 4.1.2 + @testing-library/react 16.3.2, jsdom 28.1.0 |
| CSS | PostCSS + Autoprefixer, fichiers CSS modulaires (75 fichiers) |
| Types | prop-types 15.8.1 |

### Infrastructure

| Service | Usage |
|---|---|
| Hébergement backend | Render (production) |
| Hébergement frontend | Non spécifié dans le repo (probablement Render ou Vercel) |
| CDN images | Cloudinary |
| SMTP | Configuré via variables d'environnement (provider non spécifié) |
| Paiement | Mobicash, Airtel Money, Visa, Cash — **stubs uniquement, non intégré** |
| File de messages | Redis (broker Celery) |
| Base de données | MySQL (dev), PostgreSQL (prod/Render) |

### Outils dev

| Outil | Usage |
|---|---|
| Tests backend | pytest (via Django TestCase) |
| Tests frontend | vitest + testing-library |
| Linting backend | ruff |
| Linting frontend | eslint 9.39.1 |
| Build frontend | vite build |
| CI | GitHub Actions (workflow récent) |
| API docs | Swagger UI + ReDoc (drf-spectacular) |

---

## Section 8 — Découpage validé en agents (10 + 1 intégrateur)

> Découpage validé le 2026-04-15. Fiches détaillées dans `docs/agents/`. Charte dans `docs/CHARTE_AGENTS.md`.

### Vue d'ensemble

| # | Agent | Apps backend | Pages frontend clés | Couplage externe principal |
|---|---|---|---|---|
| 1 | agent-catalogue | books, wishlist | Catalog, BookDetail, BookReader, Search, Authors, Wishlist | organizations (FK éditeur) |
| 2 | agent-marketplace | marketplace (hors Delivery\*), orders | Cart, Checkout, OrderSuccess, Orders, vendor/\* | core, books, coupons.services |
| 3 | agent-livraison | marketplace (classes Delivery\* uniquement) | dashboard/Delivery\* | marketplace (SubOrder), core |
| 4 | agent-services | services | Services, ServiceDetail, ServiceRequest, dashboard/Pro\*, Editorial\*, Quotes\* | core (invoice), organizations, coupons.services |
| 5 | agent-connect | organizations, manuscripts | Organizations, Professionals, Inquiries, SubmitManuscript, dashboard/Org\* | services, library, users |
| 6 | agent-social | social, newsletter, contact | Feed, ReadingLists, BookClubs, About, Contact, FAQ | users, books, organizations |
| 7 | agent-coupons | coupons | MyCoupons, CouponTemplates, CouponSend, CouponIssued, AdminCoupons, CouponWidget | organizations, users, core, notifications |
| 8 | agent-library | library | LibraryPage, dashboard/MyLoans | organizations, books |
| 9 | agent-users | users | Login, Register, auth/\*, dashboard/Settings\*, SecuritySettings, DashboardOverview | organizations, core (email) |
| 10 | agent-infra | core, notifications, config | App.jsx, api.js, layouts, i18n structure, design tokens, admin infra | Tous (fournisseur transversal) |
| **I** | **agent-intégrateur** | **Tous (lecture seule)** | **Tous (lecture seule)** | **Supervision transversale** |

### Note sur le partage de fichiers marketplace / livraison

Les fichiers `apps/marketplace/models.py`, `serializers.py`, `views.py`, `services.py` sont **partagés** entre agent-marketplace et agent-livraison :

- **agent-marketplace** touche : `BookListing`, `SubOrder` (hors champ `delivery_agent`/`delivery_fee`), `CommissionConfig`, `VendorWallet`, `WalletTransaction`, `WithdrawalRequest` (vendeur).
- **agent-livraison** touche : `DeliveryWallet`, `DeliveryRate`, `DeliveryWalletTransaction`, `WithdrawalRequest` (livreur), assignation livreur sur `SubOrder` (`delivery_agent`, `delivery_fee`, `delivery_status`).

Toute modification simultanée doit être coordonnée via agent-intégrateur.

### Note sur les pages admin

Les pages `pages/admin/*` sont réparties par domaine métier (chaque agent gère ses pages admin). Les briques transversales admin (`AdminLayout.jsx`, `AdminProtectedRoute.jsx`, routing `/admin-dashboard/*` dans `App.jsx`) appartiennent à **agent-infra**.

### Fiches détaillées par agent

Voir `docs/agents/agent-*.md` pour les fiches complètes avec périmètres exhaustifs, interfaces, exclusions et protocoles.

### Agent-intégrateur — Protocole d'intervention

#### Phase 1 — Avant le chantier d'un agent spécialisé
- L'agent déclare son chantier (objectif, fichiers prévus).
- Agent-intégrateur consulte cette cartographie, identifie les zones de couplage (Section 5).
- Autorise, demande des précisions, ou bloque.

#### Phase 2 — Pendant le chantier
- Aucune intervention. L'agent travaille seul sur sa branche.

#### Phase 3 — Validation (avant commit)
1. `git status` + `git diff --stat` → fichiers dans le périmètre déclaré.
2. `python manage.py test apps/ --verbosity=1 --keepdb` → tous verts.
3. `npx vitest run` → tous verts.
4. `npm run build` → zéro erreur.
5. `python manage.py showmigrations` + `migrate --check` → aucun conflit.
6. Diff `fr.json` vs `en.json` → clés synchronisées.
7. Grep imports cross-app → nombre d'imports avant/après comparé, nouveau couplage documenté.
8. Si serializer modifié → vérifier `api.js`.

#### Phase 4 — Validation OK
- Commit groupé autorisé.
- Mise à jour de `CARTOGRAPHIE.md` et `CHARTE_AGENTS.md` si nécessaire.
- Merge `agent/*` → `master`.

#### Phase 5 — Validation KO
- Retour à l'agent avec rapport précis.
- L'agent corrige et resoumet.
- Agent-intégrateur ne corrige jamais lui-même.

---

## Zones d'ombre identifiées

1. **Passerelle de paiement** : Les 6 TODO dans `orders/payment_gateway.py` indiquent que l'intégration Mobicash et Airtel Money n'est pas fonctionnelle. Le flux de paiement semble être un stub. C'est le bloqueur fonctionnel principal.

2. **Module social sans tests** : L'app `social` (11 modèles, posts, clubs, messagerie) n'a aucun test. Risque élevé de régressions silencieuses.

3. **Lazy imports dans core.email** : Le pattern d'import tardif (import à l'intérieur des fonctions) dans `core/email.py` suggère des problèmes de circularité d'imports ou de performance au chargement. À investiguer.

4. **Couverture de tests backend très faible** : Hors coupons (14 fichiers), chaque app a un seul fichier `tests.py`. La couverture réelle est probablement < 20% sur la plupart des modules.

5. **Hébergement frontend non documenté** : Le README et DEPLOYMENT.md ne précisent pas où le frontend est déployé en production.

6. **Version Python non spécifiée** : `requirements.txt` ne spécifie pas la version Python requise. Django 5.1 nécessite Python 3.10+.

7. **Pages légales (CGV, Privacy, Terms, Cookies)** : Le contenu est dans les composants JSX — pas de CMS ni de fichiers Markdown. Modification nécessite un déploiement frontend.

8. **Chantier coupons massif non commité** : ~50 fichiers nouveaux + 25 modifiés, 2262 insertions. Risque de conflit si d'autres chantiers démarrent en parallèle sur les mêmes modules (orders, services, marketplace).

9. **Admin Django vs Admin frontend** : L'admin Django (`/admin/`) coexiste avec le dashboard admin React (`/admin-dashboard/`). La répartition des responsabilités entre les deux n'est pas documentée.

10. **Contexte d'émission de coupons (Organization XOR ProviderProfile)** : Le pattern XOR est implémenté avec une contrainte de migration (`0006_verify_emitter_xor`) mais la vérification runtime dans les vues n'est pas claire. À vérifier.
