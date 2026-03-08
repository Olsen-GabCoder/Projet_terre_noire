# Mise en place de Cloudinary (images)

Cloudinary stocke les images uploadées (couvertures de livres, photos d'auteurs, avatars) au lieu du disque du serveur. Utile en production sur Render (pas de stockage persistant).

---

## 1. Créer un compte

1. Aller sur [cloudinary.com](https://cloudinary.com) et créer un compte (offre gratuite suffisante).
2. Une fois connecté, ouvrir le **Dashboard** (tableau de bord).

---

## 2. Récupérer les clés

Dans le Dashboard, tu verras :

- **Cloud name** (ex. `dxxxxxx`)
- **API Key** (ex. `123456789012345`)
- **API Secret** (cliquer sur « Reveal » pour l’afficher)

Ne partage pas l’API Secret et ne la mets jamais dans le dépôt Git.

---

## 3. Configurer en local

Dans ton fichier **`backend/.env`** (qui n’est pas versionné), ajoute :

```env
CLOUDINARY_CLOUD_NAME=ton_cloud_name
CLOUDINARY_API_KEY=ta_api_key
CLOUDINARY_API_SECRET=ton_api_secret
```

Redémarre le serveur Django. Les nouveaux uploads (livres, auteurs, utilisateurs) iront sur Cloudinary. Les anciens fichiers restent en local dans `backend/media/` tant que tu ne les re-upload pas.

---

## 4. Configurer en production (Render)

1. Dashboard Render → ton service **backend** → **Environment**.
2. Ajouter trois variables (en **Secret** pour l’API Secret si Render le propose) :
   - **CLOUDINARY_CLOUD_NAME** = ton Cloud name
   - **CLOUDINARY_API_KEY** = ton API Key
   - **CLOUDINARY_API_SECRET** = ton API Secret
3. Redéployer.

Une fois ces variables définies, l’application utilise automatiquement Cloudinary pour tous les champs **ImageField** (modèles Book, Author, User, etc.). Les URLs des images renvoyées par l’API pointent vers Cloudinary.

---

## 5. Vérifier

- En local : uploader une image (ex. couverture d’un livre) puis vérifier dans le Dashboard Cloudinary (onglet **Media**) que le fichier apparaît.
- En production : après déploiement, faire un upload et contrôler que l’image s’affiche correctement sur le site (l’URL doit contenir `res.cloudinary.com`).
