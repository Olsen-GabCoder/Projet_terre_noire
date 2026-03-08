# Pourquoi la création de livres échoue en prod (400) alors qu’elle marche en local

## Contexte

- **Local** : POST `/api/books/` avec formulaire (FormData) → 201, livre créé.
- **Production** (Render) : même requête → **400** (corps de réponse ~75 octets).

L’API est sur `maison-edition-api.onrender.com`, le front sur `maison-edition.onrender.com` (cross-origin).

---

## 1. Chaîne complète (frontend → API)

### Frontend (AdminBooks.jsx)

1. Soumission du formulaire → `FormData` construit avec :  
   `title`, `author`, `category`, `description`, `price`, `reference`, `format`, `available`, `is_bestseller`, etc.  
   Champs vides ou `null` ne sont **pas** ajoutés (d’où risque de champs manquants si une valeur est vide).
2. Envoi : `api.post('/books/', data)` avec l’instance axios qui a `baseURL = VITE_API_URL` et `withCredentials: true`.
3. Dans `api.js`, l’intercepteur enlève `Content-Type` quand `data` est un `FormData` pour laisser le navigateur envoyer `multipart/form-data` avec la **boundary**. C’est nécessaire pour que le serveur parse le corps.

### Backend (books/views.py + serializers.py)

1. **Permissions** : `IsAuthenticatedOrReadOnly` → il faut être **authentifié** pour créer un livre (pas forcément staff).
2. **Auth** : `JWTCookieAuthentication` accepte le token soit dans le header `Authorization: Bearer ...`, soit dans le cookie `access_token`. Le front envoie le Bearer depuis le localStorage, donc l’auth peut marcher même en cross-origin (les cookies ne sont pas obligatoires pour ce cas).
3. **Parsing** : DRF utilise par défaut `MultiPartParser` et `FormParser`, donc un corps `multipart/form-data` bien formé est parsé dans `request.data` (et `request.FILES` pour les fichiers).
4. **Validation** : `BookCreateUpdateSerializer` exige notamment `category`, `author`, `title`, `reference`, `description`, `price`. `cover_image` est optionnel. Les erreurs de validation renvoient un **400** avec un JSON du type `{"champ": ["message"]}`.

---

## 2. Causes possibles du 400 en prod

### A. Corps de la requête non parsé (données vides)

- **Symptôme** : `request.data` et `request.FILES` vides → la vue renvoie déjà un 400 avec le message « Aucune donnée reçue... » (plus long que 75 octets).
- **Causes possibles** :
  - `Content-Type` envoyé sans **boundary** (ex. `multipart/form-data` seul). L’intercepteur front est censé éviter ça en supprimant `Content-Type` pour les `FormData`.
  - Problème côté proxy / Render (corps tronqué, timeout, etc.) → peu probable si d’autres POST marchent.

Si en prod tu voyais « Aucune donnée reçue » dans la réponse, ce serait ce cas. Sinon, le corps est bien reçu.

### B. Erreur de validation (champ manquant ou invalide)

- **Symptôme** : 400 avec un JSON court, par ex. `{"category":["This field is required."]}` ou `{"reference":["book with this reference already exists."]}` (~50–75 octets).
- **Causes plausibles** :
  1. **`category` ou `author` non envoyés**  
     En prod, si la liste des catégories/auteurs se charge en retard ou différemment, le select peut rester à `value=""`. La logique actuelle **n’ajoute pas** les champs vides au `FormData`, donc le backend reçoit ni `category` ni `author` → validation échoue.
  2. **Référence du livre déjà existante** en base (ex. même ISBN qu’un livre déjà créé) → contrainte d’unicité.
  3. **`category` / `author` envoyés comme chaînes**  
     DRF attend des PK entiers (ou chaînes numériques). Si par erreur une valeur non numérique est envoyée, erreur de type « Invalid pk » ou équivalent.

### C. Authentification

- Si la requête était **401**, on parlerait d’auth. Un **400** indique plutôt **données invalides** (ou corps non parsé), pas un rejet d’auth.

---

## 3. Ce qui a été ajouté pour diagnostiquer

Dans `books/views.py`, dans la vue `create` :

- Si le body est vide : log **"POST /api/books/ : body vide (multipart non parsé ?)"** et réponse 400 explicite.
- Si le sérialiseur est invalide : log **"POST /api/books/ validation error: keys=... errors=..."** avec la liste des clés reçues et `serializer.errors`.

Après déploiement, en reproduisant le cas en prod et en regardant les **logs du service backend sur Render**, tu verras soit :
- body vide, soit  
- les **clés** effectivement reçues et les **erreurs** de validation exactes (champ requis, référence en double, etc.).

---

## 4. Recommandations

1. **Vérifier les logs Render** après un POST qui renvoie 400 : le message de log indiquera soit « body vide », soit les erreurs de validation. C’est la source de vérité pour la prod.
2. **Frontend** : s’assurer que `category` et `author` sont bien renseignés avant envoi (ne pas permettre la soumission si les listes ne sont pas encore chargées, ou afficher un message clair).
3. **Optionnel** : envoyer quand même les champs requis avec une valeur par défaut ou une chaîne vide pour que le backend renvoie une erreur explicite du type « Un livre doit appartenir à une catégorie » plutôt qu’un 400 générique.
4. **Référence** : en prod, éviter de réutiliser une référence (ISBN/code) déjà prise ; si besoin, vérifier côté front ou backend (ex. message « Cette référence existe déjà »).

Une fois le log Render lu (body vide vs `keys` + `errors`), on peut cibler soit le parsing multipart, soit un champ précis (category, author, reference, etc.) et appliquer le correctif correspondant.
