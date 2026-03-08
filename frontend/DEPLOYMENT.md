# Déploiement du frontend (Render Static Site)

## Variable d'environnement obligatoire

En production, le frontend doit appeler l’API backend. L’URL est figée **au moment du build** (Vite remplace `import.meta.env.VITE_API_URL` dans le bundle).

Dans le **dashboard Render**, pour le service **frontend** (Static Site) :

1. Onglet **Environment**
2. Ajouter une variable :
   - **Key** : `VITE_API_URL`
   - **Value** : `https://maison-edition-api.onrender.com/api`  
     (remplacer par l’URL réelle de votre API si différente, **sans** slash final)

Sans cette variable, le build utilisera `http://localhost:8000/api` et les appels API échoueront en production (la page d’accueil affichera « Impossible de charger les données » dans la section livres, le hero restant visible).

## Commandes Render

- **Build** : `npm install && npm run build`
- **Publish directory** : `dist`

## Redirections SPA (optionnel)

Si vous utilisez le routage React (ex. `/catalog`, `/books/1`), configurez une règle de redirection pour servir `index.html` sur toutes les routes (onglet **Redirects/Rewrites** sur Render) :

- **Type** : Rewrite
- **Source** : `/*`
- **Destination** : `/index.html`

Cela évite un 404 quand on accède directement à une URL comme `/catalog` ou qu’on rafraîchit la page.
