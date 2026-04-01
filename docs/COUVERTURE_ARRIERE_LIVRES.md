# Mise en place de la couverture arrière pour chaque livre

## État actuel

- **Modèle `Book`** : un seul champ image, `cover_image` (couverture avant), stockée dans `books/covers/`.
- **Affichage** : la couverture avant est utilisée sur la fiche livre (BookDetail), dans le catalogue (BookCard), dans l’admin et dans la sidebar du lecteur PDF.
- Il n’existe **aucun champ** pour la couverture arrière (4e de couverture).

---

## 1. Backend (Django)

### 1.1 Modèle

Ajouter un champ **optionnel** sur `Book`, sur le même principe que `cover_image` :

**Fichier : `backend/apps/books/models.py`**

- Nouveau champ après `cover_image` :
  - Nom proposé : `back_cover_image`
  - Type : `ImageField`
  - `upload_to='books/back_covers/'` (ou `'books/covers/'` si tu veux tout dans le même dossier avec des noms différents)
  - `verbose_name="Image de couverture arrière (4e de couverture)"`
  - `blank=True`, `null=True`

### 1.2 Migration

- Créer une migration après modification du modèle :  
  `python manage.py makemigrations books`  
  puis appliquer :  
  `python manage.py migrate`

### 1.3 Sérialiseurs

**Fichier : `backend/apps/books/serializers.py`**

- **BookListSerializer** : ajouter `'back_cover_image'` dans `fields` (pour la liste / cartes si besoin plus tard).
- **BookDetailSerializer** : ajouter `'back_cover_image'` dans `fields` (nécessaire pour la fiche livre).
- **BookCreateUpdateSerializer** :
  - ajouter `back_cover_image = serializers.ImageField(required=False, allow_null=True)` ;
  - ajouter `'back_cover_image'` dans `fields` ;
  - dans la logique d’envoi du formulaire (côté front), envoyer le fichier comme pour `cover_image` (ne pas inclure la clé si pas de fichier pour ne pas écraser l’existant).

### 1.4 Admin Django

**Fichier : `backend/apps/books/admin.py`**

- Dans la section **« Image et notation »** (ou une section dédiée « Couvertures »), ajouter le champ :
  - `'back_cover_image'` à côté de `'cover_image'`,  
  ou
  - Créer un bloc **« Couverture arrière »** avec uniquement `'back_cover_image'` et une courte description.

---

## 2. Frontend

### 2.1 Page détail livre (BookDetail)

**Fichier : `frontend/src/pages/BookDetail.jsx`**

- Utiliser `book.back_cover_image` (fourni par l’API détail).
- **Où afficher la couverture arrière** (au choix) :

| Option | Description | Avantage / Inconvénient |
|--------|-------------|--------------------------|
| **A. Sous la couverture avant** | Une deuxième image sous l’image principale, avec un titre du type « 4e de couverture ». | Simple, toujours visible si présente. |
| **B. Onglets « Couverture » / « 4e de couverture »** | Un seul bloc image avec deux onglets ; clic pour basculer entre avant et arrière. | Gain de place, un seul bloc. |
| **C. Côte à côte (desktop)** | Deux images côte à côte sur grand écran, empilées sur mobile. | Très lisible, rappelle un livre ouvert. |
| **D. Lien « Voir la 4e de couverture »** | Image avant par défaut ; un lien ou bouton ouvre la couverture arrière en modal ou l’affiche en dessous. | Page plus légère si peu de livres ont une 4e. |

Recommandation : **A** ou **C** pour que la 4e de couverture soit visible sans clic ; n’afficher le bloc que si `book.back_cover_image` est présent.

**Fichier : `frontend/src/styles/BookDetail.css`**

- Styles pour le bloc « couverture arrière » (titre, image, responsive), en cohérence avec `.bd-image-wrapper` (bordures, ombre, max-width, etc.).

### 2.2 Admin des livres (AdminBooks)

**Fichier : `frontend/src/pages/admin/AdminBooks.jsx`**

- **State / formulaire** : ajouter une clé `back_cover_image: null` dans l’état initial et dans `setFormData` (création et édition).
- **Envoi** : comme pour `cover_image`, n’envoyer `back_cover_image` dans le `FormData` que si un fichier a été choisi (pour l’édition, « laisser vide = garder l’actuelle »).
- **Champ fichier** :
  - Label : « Couverture arrière (4e de couverture) »
  - `accept="image/*"`
  - Hint : « Optionnel. Laisser vide pour conserver l’actuelle. » en édition ; « Optionnel. » en création.
  - En édition, si `editingBook.back_cover_image` existe : afficher un court message du type « Couverture arrière actuellement jointe » (comme pour le PDF).
- **Réinitialisation** : dans `resetForm` et quand on prépare l’édition, remettre `back_cover_image: null`.

Aucun changement nécessaire dans la liste des livres (tableau / cartes) sauf si tu veux afficher une petite icône « a une 4e » pour info.

### 2.3 Autres endroits (optionnel)

- **BookCard / Catalogue** : garder uniquement la couverture avant ; la 4e de couverture n’est pas nécessaire dans la liste.
- **Lecteur PDF (sidebar gauche)** : garder la couverture avant pour les miniatures de livres ; pas besoin de couverture arrière ici.

---

## 3. Récapitulatif des fichiers à modifier

| Fichier | Modification |
|---------|--------------|
| `backend/apps/books/models.py` | Ajout du champ `back_cover_image`. |
| `backend/apps/books/` | Nouvelle migration (création + application). |
| `backend/apps/books/serializers.py` | `back_cover_image` dans les 3 sérialiseurs (list, detail, create/update). |
| `backend/apps/books/admin.py` | Affichage de `back_cover_image` dans une section appropriée. |
| `frontend/src/pages/BookDetail.jsx` | Affichage de `book.back_cover_image` (bloc dédié ou onglets, selon l’option choisie). |
| `frontend/src/styles/BookDetail.css` | Styles du bloc couverture arrière. |
| `frontend/src/pages/admin/AdminBooks.jsx` | Champ fichier + state + envoi pour `back_cover_image`. |

---

## 4. Ordre de mise en œuvre recommandé

1. Backend : modèle + migration + sérialiseurs + admin.
2. Tester en admin Django : upload d’une couverture arrière pour un livre, vérifier qu’elle est bien enregistrée et listée.
3. Frontend admin : formulaire AdminBooks (upload + édition sans écraser l’actuelle).
4. Frontend BookDetail : affichage de la 4e de couverture (option A, C ou autre) + styles.

Une fois ce plan appliqué, chaque livre pourra avoir une couverture arrière optionnelle, gérée côté backend et affichée sur la fiche livre et dans l’admin.
