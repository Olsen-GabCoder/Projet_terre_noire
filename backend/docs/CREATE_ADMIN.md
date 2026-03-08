# Créer un utilisateur admin (étape par étape)

Ce guide explique comment créer un compte admin **sans rien mettre de secret dans le dépôt Git**.

---

## Ce qui est sûr dans le dépôt public

- Le **script** `create_admin_user` : il ne contient **aucun** email ni mot de passe.
- Il lit tout au **moment où vous lancez la commande** (variables d’environnement ou options).

Donc : même en dépôt public, personne ne peut deviner votre email ou mot de passe à partir du code.

---

## Ce qui ne doit jamais aller dans Git

- Votre **email** d’admin
- Votre **mot de passe**
- Le fichier **`.env`** (normalement déjà dans `.gitignore`)

Vous les donnez uniquement quand vous exécutez la commande (sur votre machine ou sur Render), pas dans le code.

---

## Étape 1 : Choisir où lancer la commande

Vous avez le choix :

- **Sur votre PC** (recommandé la première fois) : avec la base en local ou en pointant vers la base de production.
- **Sur Render** : via une variable d’environnement + une commande (one-off ou après déploiement), **sans** ouvrir de shell.

On détaille les deux.

---

## Étape 2 : Créer l’admin sur votre PC

1. Ouvrir un terminal dans le dossier **`backend`** du projet.
2. Activer l’environnement Python (venv) si vous en avez un.
3. Vérifier que la base de données est accessible (migrations faites : `python manage.py migrate`).
4. Lancer **une** des commandes suivantes (remplacez par votre vrai email et mot de passe) :

**Option A — Tout en variables d’environnement (rien à l’écran)**

- Windows (PowerShell) :
  ```powershell
  $env:CREATE_ADMIN_EMAIL="votre-email@exemple.com"
  $env:CREATE_ADMIN_PASSWORD="VotreMotDePasseSecurise"
  python manage.py create_admin_user
  ```
- Linux / Mac :
  ```bash
  export CREATE_ADMIN_EMAIL="votre-email@exemple.com"
  export CREATE_ADMIN_PASSWORD="VotreMotDePasseSecurise"
  python manage.py create_admin_user
  ```

**Option B — Email en option, mot de passe en variable**

- Windows (PowerShell) :
  ```powershell
  $env:CREATE_ADMIN_PASSWORD="VotreMotDePasseSecurise"
  python manage.py create_admin_user --email votre-email@exemple.com
  ```
- Linux / Mac :
  ```bash
  export CREATE_ADMIN_PASSWORD="VotreMotDePasseSecurise"
  python manage.py create_admin_user --email votre-email@exemple.com
  ```

5. Vous devez voir un message du type : **Superuser créé : votre-email@exemple.com**.
6. Vous pouvez ensuite vous connecter à l’admin Django (ou au front) avec cet email et ce mot de passe.

Important : **ne commitez jamais** votre mot de passe. Il n’existe que dans le terminal (ou dans le `.env` local, qui ne doit pas être versionné).

---

## Étape 3 : Créer l’admin sur Render (sans shell)

Sur le plan gratuit, il n’y a pas de shell. Il faut donc que la commande soit exécutée **automatiquement** avec les infos stockées en **variables d’environnement** sur Render.

1. **Dashboard Render** → votre service **backend** → **Environment**.
2. Ajouter deux variables (elles sont **secrètes** et ne sont pas dans Git) :
   - **`CREATE_ADMIN_EMAIL`** = votre email admin (ex. `moi@exemple.com`).
   - **`CREATE_ADMIN_PASSWORD`** = le mot de passe que vous voulez pour ce compte.
3. Déclencher la création de l’admin au **premier déploiement** :
   - Dans **Build Command**, vous pouvez mettre par exemple :
     ```bash
     pip install -r requirements.txt && python manage.py collectstatic --noinput && python manage.py migrate && python manage.py create_admin_user
     ```
   - Ainsi, à chaque déploiement, si l’admin n’existe pas il sera créé ; s’il existe déjà, la commande peut mettre à jour le mot de passe (sauf si vous ajoutez l’option `--no-update` dans une commande personnalisée).

**Alternative** : si Render propose des **one-off jobs** (tâches ponctuelles), vous pouvez lancer une fois :

- Command : `python manage.py create_admin_user`
- Les variables `CREATE_ADMIN_EMAIL` et `CREATE_ADMIN_PASSWORD` doivent être définies dans l’environnement du service.

Comme ça, **aucun** email ni mot de passe n’est dans le dépôt : tout reste dans la config Render.

---

## Résumé

| Où c’est stocké              | Sûr pour un dépôt public ? |
|-----------------------------|-----------------------------|
| Code du script (Git)        | Oui — aucun secret dedans   |
| Variables d’environnement  | Oui — pas dans Git          |
| Option `--email` en ligne  | Oui — pas dans Git          |
| Fichier `.env` (local)     | Non — ne pas commiter       |

En suivant ces étapes, vous pouvez utiliser un dépôt Git public sans y exposer votre email admin ni votre mot de passe.
