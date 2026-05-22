# Scripts de validation visuelle

Ces scripts Playwright servent a valider visuellement les migrations
du frontend : captures before/after, tests d'accessibilite clavier,
verification des animations en mode reduced-motion.

## Usage

Prerequis : Playwright installe localement.

    npm install -D @playwright/test
    npx playwright install chromium

Lancer un script :

    node scripts/snapshot.mjs before
    node scripts/test-focus.mjs

## Note sur l'authentification

Les scripts qui requierent une authentification (snapshot-states-auth,
snapshot-a6) lisent les credentials depuis `../backend/.env` au
runtime. Aucun credential n'est jamais hardcode.
