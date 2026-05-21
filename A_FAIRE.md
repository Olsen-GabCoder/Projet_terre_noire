
# Plan d'action complet — Terre Noire Editions

> Derniere mise a jour : 20 mai 2026
> Statut : [ ] = a faire, [~] = en cours, [x] = termine

---

## PHASE 1 — SECURITE (Priorite critique) ---- TERMINEE

### 1.1 Securiser l'acces aux PDFs ebooks
- **Fichier** : `backend/apps/books/views.py` (`serve_book_pdf`)
- **Actions realisees** :
  - [x] Auth JWT (header ou cookie) requise via `JWTCookieAuthentication`
  - [x] Verification que l'utilisateur a une commande PAID contenant ce livre (`OrderItem` query)
  - [x] Exception pour les admins (`is_staff` = acces total)
  - [x] Retourne `401` si non authentifie, `403` si pas d'achat

### 1.2 Activer le rate limiting (throttling)
- **Fichiers** : `backend/apps/core/throttling.py`, `config/settings.py`, vues
- **Actions realisees** :
  - [x] Ajout des rates dans `settings.py` : login (5/min), register (3/h), password_reset (3/h), contact (5/h)
  - [x] Classes creees dans `core/throttling.py` : `LoginThrottle`, `RegisterThrottle`, `PasswordResetThrottle`, `ContactThrottle`
  - [x] `LoginThrottle` applique sur `CookieTokenObtainPairView` (`jwt_cookie_views.py`)
  - [x] `RegisterThrottle` applique sur `UserRegistrationView` (`users/views.py`)
  - [x] `PasswordResetThrottle` applique sur `ForgotPasswordView` (`users/views.py`)
  - [x] `ContactThrottle` applique sur `ContactSubmitView` (`contact/views.py`)

### 1.3 Corriger la race condition des coupons
- **Fichier** : `backend/apps/orders/serializers.py`
- **Actions realisees** :
  - [x] `select_for_update()` deja present (existant) — verrouillage OK
  - [x] Remplacement `coupon.usage_count += 1; coupon.save()` par `Coupon.objects.filter(pk=...).update(usage_count=F('usage_count') + 1)` (atomique)

### 1.4 Securiser le refresh token (anti-boucle infinie)
- **Fichier** : `frontend/src/services/api.js`
- **Actions realisees** :
  - [x] Ajout compteur `refreshAttempts` avec max 2 tentatives (`MAX_REFRESH_ATTEMPTS`)
  - [x] Tokens effaces et compteur reset apres echec ou depassement
  - [x] Suppression du fallback `_retryAnon` qui relancait des requetes sans fin
- **Note** : Le backend supporte deja les cookies HttpOnly (`JWTCookieAuthentication` + `_set_auth_cookies`). Le localStorage est un fallback cross-origin. Pas de migration necessaire.

---

## PHASE 2 — BACKEND : ROBUSTESSE (Priorite haute) ---- TERMINEE (sauf 2.5 RBAC reporte)

### ~~2.1 Creer les templates email manquants~~ — DEJA FAIT
- Les 8 templates existent dans `backend/templates/emails/` :
  `order_confirmation.html`, `order_paid.html`, `order_shipped.html`, `order_cancelled.html`,
  `registration_welcome.html`, `manuscript_ack.html`, `contact_ack.html`, `contact_admin.html`,
  `newsletter_welcome.html`

### 2.2 Valider le profil avant commande — FAIT
- [x] `validate()` dans `OrderCreateSerializer` verifie `user.has_complete_profile`
- [x] Retourne 400 avec liste des champs manquants (prenom, nom, telephone, adresse, ville)

### 2.3 Renforcer la validation du telephone — FAIT
- [x] Nouvelle regex : `^(\+[1-9]\d{7,14}|0\d{7,9})$`
- [x] Accepte : international (+241XXXXXXXX) ou local (0XXXXXXXX, 8-10 chiffres)
- [x] Rejette : sequences vagues, formats sans prefixe valide

### 2.4 Soft-delete manuscrits — FAIT
- [x] Champs `is_deleted` + `deleted_at` ajoutes au modele
- [x] Migration `0004_add_soft_delete_fields` creee
- [x] `destroy()` fait maintenant un soft-delete (is_deleted=True, deleted_at=now)
- [x] Querysets filtrent `is_deleted=False` (list, detail, status update)

### 2.5 RBAC basique — REPORTE
- Actuellement un seul admin gere tout, RBAC non prioritaire
- A implementer quand l'equipe s'agrandit

### 2.6 Validation MIME fichiers manuscrits — FAIT
- [x] Whitelist MIME : PDF, Word (.doc, .docx) dans `validate_file()`
- [x] Limite taille deja existante (10 Mo)
- [x] Double protection : extension (modele) + MIME type (serializer)

---

## PHASE 3 — FRONTEND : CORRECTIONS (Priorite haute) ---- TERMINEE

### 3.1 Refresh token — FAIT en Phase 1
- [x] Compteur `refreshAttempts` + max 2 tentatives dans `api.js`

### 3.2 BottomNav desktop — DEJA CORRECT
- [x] CSS deja en `display: none` par defaut, flex uniquement sous 768px
- [x] Body padding-bottom conditionnel dans la media query

### 3.3 TODO Register.jsx — N'EXISTE PAS
- [x] Aucun TODO trouve dans le fichier — code propre et complet

### 3.4 Accessibilite — DEJA BIEN + AMELIORE
- Deja present : skip-link, `role="main"`, `aria-label` sur tous boutons icones (Header, Register, BottomNav), `aria-expanded` sur menus, `role="alert"` sur toasts
- [x] Ajout `aria-live="polite"` sur le conteneur de toasts (`ToastProvider.jsx`)
- [x] Ajout `aria-label="Fermer la notification"` sur le bouton close des toasts

### 3.5 Gestion d'erreurs admin — AMELIOREE
- Deja present : `AdminLoading/AdminError/AdminEmpty` + `toast.error()` + `Promise.allSettled`
- [x] `AdminBooks.jsx` : ajout state `error` + affichage `AdminError` avec retry (manquait)
- [x] `AdminOrders.jsx` : ajout state `error` + affichage `AdminError` avec retry (manquait)

---

## PHASE 4 — TESTS (Priorite haute) ---- TERMINEE (backend enrichi, 25/25 OK)

### 4.1 Tests backend — enrichis et valides
- **users/tests.py** (8 tests) :
  - [x] Inscription succes + champs manquants
  - [x] Login par username + par email + mauvais mot de passe
  - [x] Profil authentifie + non authentifie
  - [x] `has_complete_profile` (incomplet puis complet)
  - [x] Validation telephone : international, local, invalide
- **orders/tests.py** (6 tests) :
  - [x] Commande authentifiee + non authentifiee
  - [x] Commande avec profil incomplet (rejete 400)
  - [x] Coupon valide (reduction appliquee)
  - [x] Coupon expire (pas de reduction)
  - [x] Coupon max_uses atteint (pas de reduction)
- **manuscripts/tests.py** (7 tests) :
  - [x] Soumission sans fichier (400)
  - [x] Soumission valide PDF (201)
  - [x] MIME type invalide (.exe renomme, rejete)
  - [x] Description trop courte (rejete)
  - [x] Soft-delete (is_deleted=True, deleted_at rempli)
  - [x] Manuscrit supprime masque de la liste
- **coupons/tests.py** (2 tests) : validation succes + code invalide
- **books/tests.py** (26 tests existants) : deja complets

### 4.2 Tests frontend — REPORTE
- Le frontend utilise deja `AdminLoading/AdminError/AdminEmpty` partout
- Tests unitaires React a ajouter quand le redesign sera stabilise

---

## PHASE 5 — CONFIGURATION & DEVOPS (Priorite moyenne) ---- DEJA FAIT

### 5.1 Creer le fichier .env.example — DEJA PRESENT
- **Fichiers** : `backend/.env.example`, `frontend/.env.example`
- **Actions** :
  - [ ] Backend `.env.example` :
    ```env
    # Django
    SECRET_KEY=change-me-in-production
    DEBUG=True
    ALLOWED_HOSTS=localhost,127.0.0.1

    # Database (MySQL)
    DB_NAME=terrenoire
    DB_USER=root
    DB_PASSWORD=
    DB_HOST=localhost
    DB_PORT=3306

    # CORS
    CORS_ALLOWED_ORIGINS=http://localhost:5173
    FRONTEND_URL=http://localhost:5173

    # Email (dev: console, prod: SMTP)
    EMAIL_HOST=smtp.gmail.com
    EMAIL_PORT=587
    EMAIL_USE_TLS=True
    EMAIL_HOST_USER=
    EMAIL_HOST_PASSWORD=
    DEFAULT_FROM_EMAIL=noreply@terrenoireeditions.com

    # Cloudinary (optionnel en dev)
    CLOUDINARY_CLOUD_NAME=
    CLOUDINARY_API_KEY=
    CLOUDINARY_API_SECRET=

    # Cache (optionnel, defaut: LocMem)
    CACHE_URL=
    ```
  - [ ] Frontend `.env.example` :
    ```env
    VITE_API_URL=http://127.0.0.1:8000/api
    ```
  - [ ] Ajouter `.env` au `.gitignore` (verifier que c'est deja le cas)

### 5.2 Verifier le .gitignore — DEJA COMPLET
- [x] `.env` bloque partout (`**/.env`), `.env.example` exclu
- [x] `__pycache__/`, `*.pyc`, `venv/`, `node_modules/`, `dist/`, `db.sqlite3`, `media/`, `.DS_Store` — tous couverts

---

## PHASE 6 — REDESIGN ADMIN (Priorite moyenne) ---- DEJA FAIT

Le redesign complet est deja implemente :
- [x] `Admin.css` : design tokens (orange terracotta, noir, creme, serif/mono), fond `#F4F1EA`
- [x] `AdminLayout.jsx` : sidebar noire + motif africain, nav indexee 01-06, topbar breadcrumb mono + titre serif
- [x] `AdminPrimitives.jsx` (551 lignes) : AdminStat (barre 2px orange), AdminTable (header creme), AdminFilterPills (orange actif), AdminModal (header noir + motif), GenrePill, StatusBadge, StatusBtn, AdminAvatar, AdminEmpty/Loading/Error
- [x] Les 6 pages admin utilisent les nouveaux composants (Dashboard, Books, Orders, Manuscripts, Authors, Users)
- [x] Responsive mobile : drawer admin, topbar mobile

---

## PHASE 7 — AMELIORATIONS FUTURES (Priorite basse)

### 7.1 Webhooks de paiement
- [ ] Implementer des endpoints webhook pour Mobicash/Airtel
- [ ] Mettre a jour automatiquement le statut de commande sur callback
- [ ] Ajouter une verification de signature pour securiser les callbacks

### 7.2 Notifications temps reel
- [ ] Ajouter Django Channels (WebSocket) pour notifications admin
- [ ] Notifier en temps reel : nouvelle commande, nouveau manuscrit, nouveau message contact

### 7.3 Recherche globale avec suggestions — FAIT
- [x] Endpoint `/api/config/search/?q=...` dans `core/views.py` (GlobalSearchView)
  - Cherche dans : livres (titre, description, reference, auteur, categorie), auteurs (nom, bio), categories (nom)
  - Retourne max 5 resultats par type, groupes
  - Public, sans auth requise
- [x] Service frontend : `configAPI.globalSearch(query)` dans `api.js`
- [x] Dropdown temps reel dans le Header (`Header.jsx`)
  - Debounce 300ms, minimum 2 caracteres
  - Resultats groupes : Livres (avec couverture, auteur, prix), Auteurs (avec photo, nb livres), Categories (avec nb livres)
  - Clic sur un resultat → navigation directe (livre, auteur, categorie)
  - Lien "Voir tous les resultats" → catalogue filtre
  - Etat vide : "Aucun resultat pour..."
  - Fermeture au clic exterieur
- [x] CSS : `Header.css` — dropdown anime, design coherent avec le systeme

### 7.4 Analytics et reporting
- [ ] Dashboard de ventes (graphiques par periode)
- [ ] Export CSV des commandes
- [ ] Rapports automatiques par email (hebdomadaire/mensuel)

### 7.5 PWA et mode offline
- [ ] Ajouter un Service Worker
- [ ] Permettre la consultation du catalogue hors ligne
- [ ] Notifications push pour les commandes

### 7.6 Internationalisation (i18n)
- [ ] Ajouter le support multi-langue (FR/EN minimum)
- [ ] Traduire l'interface frontend (react-i18next)
- [ ] Traduire les emails

---

## Resume des priorites

| Phase | Titre | Priorite | Effort estime |
|-------|-------|----------|---------------|
| 1 | Securite | CRITIQUE | 2-3 jours |
| 2 | Backend robustesse | HAUTE | 2-3 jours |
| 3 | Frontend corrections | HAUTE | 1-2 jours |
| 4 | Tests | HAUTE | 3-4 jours |
| 5 | Config & DevOps | MOYENNE | 0.5 jour |
| 6 | Redesign admin | MOYENNE | 5-7 jours |
| 7 | Ameliorations futures | BASSE | A planifier |

**Ordre d'execution recommande** : Phase 1 → Phase 2 → Phase 3 → Phase 5 → Phase 4 → Phase 6 → Phase 7
