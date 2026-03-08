# Déploiement — Terre Noire Éditions

Guide pour mettre en production le backend Django.

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
python manage.py createsuperuser
```

---

## 4. Fichiers statiques

```bash
python manage.py collectstatic --noinput
```

---

## 5. Sécurité (automatique quand DEBUG=False)

- HTTPS forcé (`SECURE_SSL_REDIRECT`)
- HSTS activé
- Cookies sécurisés
- Protection XSS, clickjacking, etc.

---

## 6. Frontend

Configurer `VITE_API_URL` (ou équivalent) vers l'URL de l'API en production.
