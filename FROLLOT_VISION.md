# FROLLOT — Plateforme Sociale du Livre

## 1. Identité du projet

**Nom** : ROLLOT — Plateforme Sociale du Livre
**Nature** : Réseau social livresque et place de marché de l'édition
**Positionnement** : Frollot est la plateforme qui connecte tous les acteurs du livre — de l'auteur qui écrit au lecteur qui lit, en passant par l'éditeur qui publie, le libraire qui vend, le bibliothécaire qui prête et le livreur qui achemine. Chaque utilisateur gère son propre espace professionnel ou personnel, et tous interagissent autour d'un objet central : **le livre**.

**Analogie** : LinkedIn + Amazon + Wattpad, mais exclusivement centré sur le livre et l'écosystème de l'édition.

---

## 2. État actuel du projet (base existante)

Le projet repose sur une base fonctionnelle déjà développée :

### Stack technique
- **Backend** : Django 5 + Django REST Framework, Python 3.12
- **Frontend** : React 19 + Vite 7 + Tailwind CSS 3
- **Base de données** : MySQL (dev) / PostgreSQL (prod via Render)
- **Authentification** : JWT avec cookies HttpOnly + Bearer token, refresh automatique
- **Médias** : Local (dev) / Cloudinary (prod)
- **Emails** : 10 templates HTML transactionnels (SMTP Gmail)
- **Documentation API** : OpenAPI/Swagger (drf-spectacular)
- **Déploiement** : Render (backend web service + frontend static site)

### Fonctionnalités existantes (à conserver et étendre)
- **Catalogue de livres** : CRUD complet, filtres (catégorie, auteur, format, prix, disponibilité), recherche, tri, pagination (12/page), livres mis en avant, bestsellers, nouveautés
- **Fiche livre** : Détail complet, couvertures avant/arrière affichées en "livre ouvert" 3D, badges (promo, format, disponibilité), livres associés
- **Système de reviews** : Avis avec note 1-5, réponses imbriquées, likes, contrainte unicité (1 avis principal par utilisateur par livre)
- **Lecteur PDF** : Lecteur intégré pdfjs-dist avec watermark, protection copie/impression, accès restreint aux acheteurs (commande PAID) et admins
- **Panier & Commandes** : Panier localStorage, checkout avec adresse livraison, coupons de réduction, calcul frais de port (seuil gratuit configurable), factures PDF (reportlab), annulation commandes en attente
- **Paiement** : Modèle Payment avec providers (Mobicash, Airtel Money, Espèces, Visa) — **non intégré à un vrai provider** (à faire)
- **Wishlist** : Liste d'envie par utilisateur, synchronisée API (auth) ou localStorage (anonyme)
- **Soumission de manuscrits** : Formulaire public avec upload PDF/DOCX, suivi de statut (PENDING → REVIEWING → ACCEPTED/REJECTED)
- **Newsletter** : Inscription email avec welcome mail
- **Contact** : Formulaire avec notification admin + accusé réception
- **Dashboard admin** : KPIs (revenus, commandes, utilisateurs, manuscrits), graphiques (revenus/mois, commandes/jour, pie charts), top livres vendus, raccourcis
- **Gestion admin** : CRUD livres, auteurs, catégories, commandes (mise à jour statut), manuscrits, utilisateurs
- **Pages légales** : À propos, CGV, politique de confidentialité, cookies, FAQ, support, livraison
- **Sécurité** : Rate limiting login (5/min), throttling endpoints publics, .env protégé (jamais commité), HSTS/SSL/CSRF en prod, accès PDF vérifié par achat
- **Tests** : 47 tests unitaires/intégration (modèles, API, sécurité PDF, commandes, auth, wishlist, contact, newsletter, coupons, manuscrits)
- **Responsive** : Mobile-first, header adaptatif, filtres drawer mobile, lecteur PDF plein écran

### Architecture actuelle (9 apps Django)
```
apps/
├── books/        → Livres, auteurs, catégories, reviews, likes
├── users/        → Modèle User custom, auth JWT, profils
├── orders/       → Commandes, items, paiements
├── manuscripts/  → Soumissions de manuscrits
├── newsletter/   → Abonnés newsletter
├── contact/      → Messages de contact
├── wishlist/     → Liste d'envie
├── coupons/      → Codes promotionnels
└── core/         → Config site (livraison), emails, factures PDF
```

### Modèles de données existants (17 modèles)
- **User** : AbstractUser + phone, address, city, country, profile_image, receive_newsletter
- **Book** : title, slug, reference, description, price, original_price, format (EBOOK/PAPIER), cover_image, back_cover_image, pdf_file, available, is_bestseller, rating, rating_count → FK Category, FK Author
- **Author** : full_name, biography, photo, slug
- **Category** : name, slug (14 catégories seed : Roman, Essai, Poésie, SF, Polar, Jeunesse, Théâtre, etc.)
- **BookReview** : user, book, parent (self FK pour réponses), rating (1-5), comment
- **ReviewLike** : user, review
- **Order** : user, status (PENDING/PAID/SHIPPED/CANCELLED), subtotal, shipping_cost, discount_amount, coupon_code, total_amount, shipping_address/phone/city
- **OrderItem** : order, book, quantity, price (figé au moment de l'achat)
- **Payment** : order (OneToOne), transaction_id, provider, status, amount
- **WishlistItem** : user, book (unique ensemble)
- **Manuscript** : title, author_name, pen_name, email, phone, country, genre, language, page_count, file, description, terms_accepted, status
- **NewsletterSubscriber** : email, is_active
- **ContactMessage** : name, email, subject, message, is_read
- **Coupon** : code, discount_percent/amount, valid_from/until, is_active, max_uses, usage_count
- **SiteConfig** : shipping_free_threshold, shipping_cost (singleton)

### Rôles actuels (seulement 2 + admin)
| Rôle | Accès |
|------|-------|
| **Anonyme** | Catalogue, fiche livre, reviews (lecture), soumettre manuscrit, newsletter, contact |
| **Utilisateur authentifié** | Tout ci-dessus + panier, commandes, wishlist, reviews (écriture), lecteur PDF (si achat), profil |
| **Admin** (is_staff/is_superuser) | Tout ci-dessus + CRUD livres/auteurs/catégories, gestion commandes/manuscrits/utilisateurs, dashboard stats |

---

## 3. Vision cible : Frollot

### 3.1 Concept

Frollot transforme le projet actuel (site e-commerce d'une seule maison d'édition) en une **plateforme multi-acteurs** où chaque intervenant de la chaîne du livre possède son propre espace de gestion, sa vitrine publique et ses outils métier.

Le livre est au centre. Chaque livre sur Frollot peut être :
- **Écrit** par un auteur (qui a son profil et sa page)
- **Édité** par une maison d'édition (qui a son espace avec son équipe)
- **Vendu** par un ou plusieurs libraires (qui ont chacun leur boutique)
- **Disponible** dans une ou plusieurs bibliothèques (qui gèrent le prêt)
- **Livré** par un livreur indépendant ou par le vendeur lui-même
- **Lu, noté, commenté, recommandé** par les lecteurs (réseau social)

### 3.2 Les rôles utilisateur

Chaque utilisateur s'inscrit avec un **compte personnel** puis peut activer un ou plusieurs **profils professionnels**. Un même utilisateur peut être lecteur ET auteur ET gérer une librairie.

#### Comptes individuels

| Rôle | Description | Fonctionnalités propres |
|------|-------------|------------------------|
| **Lecteur** | Utilisateur de base. Lit, achète, note, commente, recommande des livres. | Bibliothèque personnelle (livres achetés/lus), wishlist, historique de lecture, reviews/notes, listes de lecture, fil d'actualité social, suivi d'auteurs/éditeurs favoris |
| **Auteur** | Écrit et publie des livres (en auto-édition ou via une maison d'édition). | Page auteur publique, portfolio d'oeuvres, soumission de manuscrits, statistiques de vente/lecture, blog/actualités, interaction avec les lecteurs, gestion de ses droits |
| **Correcteur / Relecteur** | Professionnel de la correction et relecture de manuscrits. | Profil de compétences (langues, genres), portfolio, disponibilité, tarifs, réception de demandes de correction |
| **Illustrateur / Graphiste** | Crée des couvertures, illustrations intérieures, mises en page. | Portfolio visuel, spécialités (couverture, BD, jeunesse...), tarifs, commandes en cours |
| **Traducteur** | Traduit des oeuvres d'une langue à une autre. | Paires de langues, genres maîtrisés, portfolio de traductions, disponibilité |
| **Livreur indépendant** | Assure la livraison de commandes physiques dans une zone géographique. | Zone de couverture (villes/quartiers), disponibilité, historique de livraisons, évaluations clients, tarifs |

#### Comptes organisation (multi-utilisateurs)

| Rôle | Description | Fonctionnalités propres |
|------|-------------|------------------------|
| **Maison d'édition** | Éditeur professionnel. Publie, vend, gère un catalogue et une équipe. | Vitrine publique (page éditeur), catalogue de livres publiés, gestion d'équipe (inviter des collaborateurs avec rôles internes : directeur éditorial, correcteur, graphiste, commercial...), réception et gestion de manuscrits, contrats auteurs, statistiques de vente, gestion financière |
| **Librairie** | Point de vente physique ou en ligne de livres. | Vitrine/boutique en ligne, gestion de stock, commandes clients, choix du livreur (interne ou indépendant sur la plateforme), promotions, statistiques de vente |
| **Bibliothèque** | Espace de prêt de livres (physique ou numérique). | Catalogue disponible, système de prêt/retour, abonnements, gestion des adhérents, historique de prêts, recommandations |
| **Imprimerie** | Imprime des livres physiques à la demande ou en série. | Catalogue de services (formats, finitions, délais), devis en ligne, suivi de commandes d'impression, portfolio |

#### Rôles internes aux organisations

Quand une organisation (maison d'édition, librairie, bibliothèque, imprimerie) invite un utilisateur dans son espace, elle lui attribue un **rôle interne** :

| Rôle interne | Droits |
|---|---|
| **Propriétaire** | Accès total, gestion de l'équipe, facturation, paramètres |
| **Administrateur** | Gestion du catalogue, des commandes, des membres (sauf facturation) |
| **Éditeur** (dans une maison d'édition) | Gestion des manuscrits, livres, auteurs |
| **Commercial** | Gestion des commandes, promotions, clients |
| **Membre** | Accès en lecture, actions limitées selon les permissions attribuées |

#### Administration de la plateforme

| Rôle | Description |
|---|---|
| **Super Admin Frollot** | Gestion globale de la plateforme : modération, validation des comptes organisation, statistiques globales, configuration, gestion des litiges |

### 3.3 Flux clés de la plateforme

#### Flux 1 — De l'écriture à la publication
```
Auteur écrit un manuscrit
  → Soumet sur Frollot (vers une maison d'édition OU en auto-édition)
  → La maison d'édition reçoit, évalue, accepte/refuse
  → Si accepté : l'éditeur assigne un correcteur, un illustrateur (depuis la plateforme)
  → Correction, illustration, mise en page réalisées sur la plateforme
  → Le livre est publié sur le catalogue de la maison d'édition
  → Le livre apparaît sur Frollot, disponible à la vente
```

#### Flux 2 — Achat et livraison
```
Lecteur parcourt le catalogue Frollot
  → Trouve un livre (chez un éditeur ou un libraire)
  → Ajoute au panier, passe commande
  → Choisit le mode de livraison :
      a) Retrait en librairie
      b) Livraison par le vendeur
      c) Livraison par un livreur indépendant (marketplace de livreurs)
  → Paiement (Mobile Money, carte, espèces)
  → Le vendeur prépare la commande
  → Le livreur (si choisi) récupère et livre
  → Le lecteur confirme la réception
  → Le livre apparaît dans sa bibliothèque personnelle
```

#### Flux 3 — Dimension sociale
```
Lecteur lit un livre
  → Poste un avis / une note
  → Crée une liste de lecture ("Mes romans africains préférés")
  → Suit l'auteur pour recevoir ses actualités
  → Recommande le livre à d'autres lecteurs
  → Participe à des discussions / clubs de lecture
  → Voit le fil d'actualité de ses abonnements
```

#### Flux 4 — Prêt en bibliothèque
```
Bibliothèque ajoute des livres à son catalogue
  → Un adhérent cherche un livre, le trouve disponible
  → Demande de prêt (physique ou numérique)
  → La bibliothèque valide
  → Suivi de la durée de prêt, rappels, retour
```

### 3.4 Le livre comme objet central

Chaque livre sur Frollot a une **fiche universelle** enrichie par tous les acteurs :

```
Fiche Livre
├── Informations de base : titre, auteur(s), description, ISBN, genre, langue, nb pages
├── Médias : couverture avant/arrière (livre ouvert 3D), extraits, PDF (ebook)
├── Édition : maison d'édition, date de publication, collection, édition (1re, 2e...)
├── Disponibilité : 
│   ├── Vente : quels vendeurs (éditeurs, libraires) le proposent, à quel prix, en stock ?
│   ├── Ebook : disponible en lecture numérique ?
│   ├── Prêt : dans quelles bibliothèques est-il disponible ?
│   └── Impression : imprimable à la demande ?
├── Social :
│   ├── Note moyenne et nombre d'avis
│   ├── Reviews et discussions
│   ├── Listes de lecture qui le contiennent
│   └── Recommandations
├── Statistiques : ventes totales, lectures, emprunts
└── Historique : versions, traductions, rééditions
```

### 3.5 Chaque espace est autonome

Chaque organisation ou professionnel gère **son propre espace** comme un mini-site au sein de Frollot :

- **Maison d'édition** → `frollot.com/editeur/terre-noire-editions` — vitrine, catalogue, équipe, manuscrits
- **Librairie** → `frollot.com/librairie/librairie-du-port` — boutique, stock, promotions
- **Bibliothèque** → `frollot.com/bibliotheque/biblio-municipale-pg` — catalogue, prêts, adhérents
- **Auteur** → `frollot.com/auteur/victor-ogoula` — bio, oeuvres, actualités
- **Livreur** → profil avec zone de couverture, évaluations, disponibilité (pas de vitrine publique)

---

## 4. Contraintes techniques et principes

### Architecture
- **Multi-tenant par rôle** : chaque organisation a son espace isolé, ses données, ses membres
- **Système d'invitation** : un propriétaire d'organisation peut inviter des utilisateurs par email et leur attribuer un rôle interne
- **Permissions granulaires** : chaque action est contrôlée par le rôle de l'utilisateur dans le contexte (plateforme, organisation, livre)
- **API-first** : tout passe par l'API REST — le frontend React consomme l'API, mais d'autres clients (mobile, partenaires) pourront s'y connecter

### Base de données
- Conserver MySQL en dev, PostgreSQL en prod
- Le modèle User existant sera étendu (pas remplacé) avec un système de profils/rôles
- Les modèles existants (Book, Order, Review...) seront étendus pour supporter le multi-vendeur

### Monnaie et localisation
- Monnaie principale : **FCFA (XOF)** — marché cible Afrique centrale/occidentale francophone
- Langues de l'interface : français (priorité), anglais (futur)
- Pays par défaut : Gabon, avec extension progressive aux pays CEMAC/UEMOA

### Paiement (à intégrer)
- **Mobile Money** : Airtel Money, Moov Money (via agrégateur type CinetPay ou PayDunya)
- **Cartes** : Visa/Mastercard (via le même agrégateur)
- **Espèces** : paiement à la livraison (confirmation manuelle)
- Chaque vendeur (éditeur, libraire) reçoit ses paiements via un système de split payment ou de wallet interne

### Performance et scalabilité
- Cache Redis (prod)
- Celery pour les tâches async (emails, génération PDF, notifications)
- CDN pour les images (Cloudinary déjà configuré)
- Pagination sur toutes les listes

---

## 5. Priorités de développement (roadmap suggérée)

### Phase 1 — Fondations multi-rôles (priorité absolue)
1. Renommer le projet "Terre Noire Éditions" → "Frollot" (branding, titre, meta, textes)
2. Refactorer le modèle User : système de profils multiples (lecteur, auteur, etc.)
3. Créer le modèle Organization (maison d'édition, librairie, bibliothèque, imprimerie)
4. Système d'invitation et rôles internes aux organisations
5. Permissions granulaires (qui peut faire quoi, dans quel contexte)
6. Espace personnel de chaque rôle (dashboard adapté)

### Phase 2 — Multi-vendeur et marketplace
7. Un livre peut être vendu par plusieurs vendeurs (éditeur, libraire) à des prix différents
8. Gestion de stock par vendeur
9. Commandes multi-vendeurs (panier avec articles de vendeurs différents)
10. Livreurs indépendants : inscription, zone de couverture, attribution aux commandes
11. Split payment (chaque vendeur/livreur reçoit sa part)

### Phase 3 — Dimension sociale
12. Fil d'actualité (posts des auteurs, éditeurs, libraires suivis)
13. Listes de lecture publiques/privées
14. Système de suivi (follow auteurs, éditeurs, lecteurs)
15. Recommandations personnalisées
16. Clubs de lecture / groupes de discussion

### Phase 4 — Services professionnels
17. Marketplace de correcteurs, illustrateurs, traducteurs
18. Système de devis et commandes de services
19. Gestion de projets éditoriaux (pipeline manuscrit → livre publié)
20. Impression à la demande (connexion imprimeries)

### Phase 5 — Bibliothèques
21. Système de prêt (physique et numérique)
22. Gestion des adhérents
23. Catalogue de bibliothèque avec disponibilité en temps réel

### Phase 6 — Corrections techniques (en parallèle)
- Error Boundary React + page 500
- SEO (meta tags, OG, robots.txt, sitemap, Schema.org)
- Logging structuré + Sentry
- Celery + Redis (emails async)
- CI/CD (GitHub Actions)
- Docker / docker-compose
- Intégration paiement réel
- Images responsive (srcset, WebP)
- Tests end-to-end

---

## 6. Ce document est la référence

Ce document décrit la vision complète de Frollot. Tout agent IA ou développeur qui travaille sur ce projet doit :

1. **Lire ce document en premier** pour comprendre la vision globale
2. **Consulter la section 2** pour connaître l'existant (ce qui est déjà codé et fonctionnel)
3. **Respecter le stack technique** existant (Django + React) sauf décision explicite de migration
4. **Suivre la roadmap** de la section 5 dans l'ordre des phases
5. **Ne pas casser l'existant** : chaque nouvelle fonctionnalité doit être rétrocompatible avec ce qui fonctionne déjà

Le projet est hébergé sur GitHub : `https://github.com/Olsen-GabCoder/Projet_terre_noire.git` (branche `master`).
