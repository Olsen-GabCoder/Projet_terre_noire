# Déploiement — Terre Noire Éditions

Guide pour mettre en production le backend Django.

---

## 0. Déploiement sur Render

- **Root Directory** : définir `backend` pour que le build et le start s’exécutent depuis le dossier backend.
- **Version Python** : le fichier `backend/.python-version` (contenu : `3.12.7`) est utilisé par Render. Sinon, définir la variable d’environnement `PYTHON_VERSION=3.12.7` dans le service.
- **Build** : `pip install -r requirements.txt && python manage.py collectstatic --noinput`
- **Start** : `gunicorn config.wsgi:application`
- **Base de données** : utiliser PostgreSQL et définir `DATABASE_URL` (Render le fournit si une base PostgreSQL est liée au service). Ne pas utiliser `requirements-render.txt` si vous utilisez déjà `requirements.txt` avec `psycopg2-binary` et `dj-database-url`.

---

## 1. Variables d'environnement (.env)

Copiez `.env.example` vers `.env` et adaptez pour la production :

| Variable | Production | Description |
|----------|------------|-------------|
| `DEBUG` | `False` | **Obligatoire** en production |
| `SECRET_KEY` | Clé longue et aléatoire | Générer avec `python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"` |
| `ALLOWED_HOSTS` | `votredomaine.com,www.votredomaine.com` | Domaines autorisés |
| `CORS_ALLOWED_ORIGINS` | `https://votredomaine.com,https://www.votredomaine.com` | **Obligatoire** quand DEBUG=False |
| `FRONTEND_URL` | `https://votredomaine.com` | URL du frontend (emails, liens) |
| `LOGO_URL` | `https://votredomaine.com/images/logo_terre_noire.png` | URL du logo (optionnel) |
| `DB_*` | Credentials MySQL production | Base de données |
| `CACHE_URL` | `redis://localhost:6379/1` | Redis (recommandé) |
| `CLOUDINARY_*` | Credentials Cloudinary | Images (couvertures, auteurs) |

---

## 2. Cloudinary (images)

1. Créer un compte sur [cloudinary.com](https://cloudinary.com)
2. Récupérer : Cloud Name, API Key, API Secret (Dashboard)
3. Ajouter dans `.env` :
   ```
   CLOUDINARY_CLOUD_NAME=votre_cloud
   CLOUDINARY_API_KEY=123456789
   CLOUDINARY_API_SECRET=votre_secret
   ```
4. Les images uploadées (livres, auteurs, avatars) seront stockées sur Cloudinary

---

## 3. Base de données

```bash
python manage.py migrate
```

### Créer un admin sans shell (Render, CI, mode gratuit)

Aucun email ni mot de passe ne doit être dans le code (dépôt public). Tout passe par des variables d'environnement ou l'option `--email`. Guide détaillé : **backend/docs/CREATE_ADMIN.md**.

En résumé :
- **Email** : variable `CREATE_ADMIN_EMAIL` ou option `--email votre@email.com`
- **Mot de passe** : variable `CREATE_ADMIN_PASSWORD` uniquement (jamais en dur)
- Sur Render : définir ces variables dans l'environnement du service, puis exécuter `python manage.py create_admin_user` (one-off job ou dans la commande de build).

---

## 4. Fichiers statiques

```bash
python manage.py collectstatic --noinput
```

Sur Render, si « 0 static files copied » s’affiche, vérifier que le **Root Directory** du service est bien `backend` et que le dossier `backend/static` est bien versionné. Le répertoire `staticfiles` est créé automatiquement au démarrage s’il est vide (évite le warning WhiteNoise).

---

## 5. Sécurité (automatique quand DEBUG=False)

- HTTPS forcé (`SECURE_SSL_REDIRECT`)
- HSTS activé
- Cookies sécurisés
- Protection XSS, clickjacking, etc.

---

## 6. Frontend

Configurer `VITE_API_URL` (ou équivalent) vers l'URL de l'API en production.
