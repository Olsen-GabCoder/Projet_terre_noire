# Terre Noire Éditions

Site vitrine et e-commerce pour la maison d'édition Terre Noire Éditions (Port-Gentil, Gabon).

- **Backend** : Django 5 + Django REST Framework (API), MySQL en dev / PostgreSQL en prod
- **Frontend** : React 19 + Vite 7

## Démarrer en local

Voir le **[GUIDE_PROJET.md](GUIDE_PROJET.md)** pour les instructions détaillées (environnement, migrations, lancer backend et frontend).

En résumé :

```bash
# Backend
cd backend && pip install -r requirements.txt && python manage.py migrate && python manage.py runserver

# Frontend (autre terminal)
cd frontend && npm install && npm run dev
```

Configurer `backend/.env` (copier depuis `backend/.env.example`) avec la base MySQL et, si besoin, SMTP et Cloudinary.

## Structure

| Dossier   | Rôle |
|----------|------|
| `backend/` | API Django (livres, commandes, utilisateurs, manuscrits, etc.) |
| `frontend/` | Application React (catalogue, panier, compte, admin) |

- Déploiement backend : **backend/DEPLOYMENT.md**
- Déploiement frontend : **frontend/DEPLOYMENT.md**
- Création admin sans shell : **backend/docs/CREATE_ADMIN.md**
- Cloudinary (images) : **backend/docs/CLOUDINARY.md**
