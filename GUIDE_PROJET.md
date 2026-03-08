# Guide du projet Maison d'Édition

Guide rapide pour retrouver vos repères et consulter toute la base de données.

---

## 1. Démarrer le projet

### Environnement Python (venv)
```bash
# À la racine du projet
venv\Scripts\activate           # Windows
# ou : source venv/bin/activate  # Linux/Mac

pip install -r backend/requirements.txt   # Si les deps ne sont pas installées
```

### Backend (Django)
```bash
cd backend
python manage.py migrate          # Appliquer les migrations
python manage.py runserver       # Démarrer sur http://127.0.0.1:8000
```

### Frontend (React + Vite)
```bash
cd frontend
npm install
npm run dev                      # Démarrer sur http://localhost:5173
```

### Base de données (MySQL)
Le projet utilise **MySQL**. Assurez-vous que :
- MySQL est installé et démarré
- Le fichier `backend/.env` contient : `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_HOST`, `DB_PORT`

---

## 2. Se connecter à l'application

### Option A : Connexion via le frontend (page Login)

1. Ouvrir **http://localhost:5173/login**
2. Se connecter avec **email** ou **username** et mot de passe
3. Si aucun compte n'existe : créer un compte via `/register`

### Option B : Django Admin (interface d’administration)

1. **Créer un superutilisateur** (une seule fois) :
   ```bash
   cd backend
   python manage.py createsuperuser
   ```
   - Indiquer : username, email, mot de passe

2. **Accéder à l’admin** : **http://127.0.0.1:8000/admin/**
   - Connexion avec le username et mot de passe du superutilisateur

---

## 3. Structure de la base de données

### Modèle **User** (app `users`)
| Champ | Description |
|-------|-------------|
| username | Nom d'utilisateur |
| email | Adresse email |
| password | Mot de passe (hashé) |
| first_name, last_name | Prénom, nom |
| phone_number | Téléphone (optionnel) |
| address, city, country | Adresse (défaut pays : Gabon) |
| receive_newsletter | Recevoir la newsletter |
| is_staff, is_superuser | Droits admin |

### Modèle **Category** (app `books`)
| Champ | Description |
|-------|-------------|
| name | Nom de la catégorie |
| slug | URL slug (ex: roman, poesie) |

### Modèle **Author** (app `books`)
| Champ | Description |
|-------|-------------|
| full_name | Nom complet |
| biography | Biographie |
| photo | Photo (image) |
| slug | URL slug |

### Modèle **Book** (app `books`)
| Champ | Description |
|-------|-------------|
| title | Titre |
| slug | URL slug |
| reference | Référence (ex: LIV-001) |
| description | Description |
| price | Prix (FCFA) |
| original_price | Prix avant promo |
| format | EBOOK ou PAPIER |
| cover_image | Couverture |
| available | Disponible oui/non |
| is_bestseller | Best-seller |
| rating, rating_count | Note et nombre d’avis |
| category | FK vers Category |
| author | FK vers Author |

### Modèle **Order** (app `orders`)
| Champ | Description |
|-------|-------------|
| user | FK vers User |
| status | PENDING, PAID, SHIPPED, CANCELLED |
| total_amount | Montant total |
| shipping_address, shipping_phone, shipping_city | Livraison |

### Modèle **OrderItem** (app `orders`)
| Champ | Description |
|-------|-------------|
| order | FK vers Order |
| book | FK vers Book |
| quantity | Quantité |
| price | Prix unitaire |

### Modèle **Payment** (app `orders`)
| Champ | Description |
|-------|-------------|
| order | OneToOne vers Order |
| transaction_id | ID transaction |
| provider | MOBICASH, AIRTEL, CASH (espèces), VISA |
| status, amount | Statut et montant |

### Modèle **Coupon** (app `coupons`)
| Champ | Description |
|-------|-------------|
| code | Code unique (ex: MAISON10) |
| discount_percent | Réduction en % (ou discount_amount en FCFA) |
| valid_from, valid_until | Période de validité |
| is_active | Actif ou non |
| max_uses, usage_count | Limite d'utilisation |

### Modèle **SiteConfig** (app `core`)
| Champ | Description |
|-------|-------------|
| shipping_free_threshold | Seuil livraison gratuite (FCFA) — modifiable par l'admin |
| shipping_cost | Frais de livraison si sous le seuil (FCFA) |

### Modèle **BookReview** (app `books`)
| Champ | Description |
|-------|-------------|
| user | FK vers User |
| book | FK vers Book |
| rating | Note 1-5 |
| comment | Commentaire (optionnel) |
| created_at, updated_at | Dates |

### Modèle **Manuscript** (app `manuscripts`)
| Champ | Description |
|-------|-------------|
| title | Titre |
| author_name | Nom de l'auteur |
| email, phone_number | Contact |
| file | Fichier PDF/DOC |
| description | Description |
| status | PENDING, REVIEWING, ACCEPTED, REJECTED |
| submitted_at | Date de soumission |

---

## 4. Consulter les données

### 4.1 Via l’admin Django
- **http://127.0.0.1:8000/admin/**
- Modèles disponibles : **Users**, **Category**, **Author**, **Book**, **BookReview** (avis), **Coupon**, **SiteConfig** (prix livraison), etc.

### 4.2 Via l’API REST

| URL | Description |
|-----|-------------|
| `GET /api/books/` | Liste des livres |
| `GET /api/books/{id}/` | Détail d'un livre |
| `GET /api/authors/` | Liste des auteurs |
| `GET /api/categories/` | Liste des catégories |
| `GET /api/books/stats/` | Statistiques du catalogue |
| `POST /api/token/` | Connexion (JWT) |
| `GET /api/users/me/` | Profil utilisateur (authentifié) |
| `POST /api/users/forgot-password/` | Demande de réinitialisation (body: `{ "email": "..." }`) |
| `POST /api/users/reset-password/` | Réinitialisation avec token (body: `{ "uid", "token", "new_password" }`) |
| `POST /api/coupons/validate/` | Valider un code promo (body: `{ "code": "MAISON10" }`) |
| `GET /api/config/delivery/` | Config livraison (seuil gratuit, frais) — modifiable par l'admin |
| `GET /api/schema/` | Schéma OpenAPI (JSON) |
| `GET /api/docs/` | Documentation Swagger UI interactive |
| `GET /api/redoc/` | Documentation ReDoc |
| `GET /api/books/{id}/reviews/` | Liste des avis d'un livre |
| `POST /api/books/{id}/reviews/` | Créer/modifier son avis (auth) |
| `DELETE /api/books/{id}/reviews/` | Supprimer son avis (auth) |

**Exemple connexion API :**
```json
POST http://127.0.0.1:8000/api/token/
{ "username": "votre_email@exemple.com", "password": "votre_mot_de_passe" }
```
→ Réponse : `access` et `refresh` (tokens JWT)

### 4.3 Via le shell Django
```bash
cd backend
python manage.py shell
```

```python
from apps.books.models import Book, Author, Category
from apps.users.models import User
from apps.orders.models import Order
from apps.manuscripts.models import Manuscript

# Exemples
Book.objects.count()
Author.objects.all()
User.objects.filter(is_staff=True)
Order.objects.all()
```

---

## 5. Variables d'environnement

### `backend/.env`
| Variable | Description |
|----------|-------------|
| SECRET_KEY | Clé secrète Django (obligatoire en production) |
| DEBUG | True / False |
| ALLOWED_HOSTS | localhost,127.0.0.1 |
| CORS_ALLOWED_ORIGINS | En production : https://votredomaine.com,https://www.votredomaine.com |
| DB_NAME | Nom de la base MySQL |
| DB_USER | Utilisateur MySQL |
| DB_PASSWORD | Mot de passe MySQL |
| DB_HOST | localhost |
| DB_PORT | 3306 |
| CACHE_URL | redis://localhost:6379/1 (optionnel, pour cache Redis en production) |

### `frontend/.env`
| Variable | Description |
|----------|-------------|
| VITE_API_URL | http://127.0.0.1:8000/api |

---

## 6. Parcours rapide pour consulter la base

1. **Vérifier MySQL** : base créée, identifiants corrects dans `backend/.env`
2. **Migrations** : `python manage.py migrate`
3. **Superutilisateur** : `python manage.py createsuperuser` (si besoin)
4. **Démarrer** : backend + frontend
5. **Admin** : http://127.0.0.1:8000/admin/ → consulter Users, Books, Authors, Categories
6. **Frontend** : http://localhost:5173/login → se connecter avec le compte créé
