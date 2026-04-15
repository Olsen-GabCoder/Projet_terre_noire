# Charte des agents Frollot

Règles communes à tous les agents spécialisés. Lisez ce document avant chaque chantier.

## Règles de périmètre

- Aucun agent ne touche à un fichier hors de son périmètre déclaré dans CARTOGRAPHIE.md, même pour une « petite correction ».
- En cas de besoin de modifier un fichier hors périmètre : arrêt immédiat et demande explicite à l'humain via agent-intégrateur.
- Toute modification d'un modèle Django ou d'un serializer DRF est notifiée à agent-intégrateur (impact contrat API).
- Les fichiers partagés entre agent-marketplace et agent-livraison (`apps/marketplace/models.py`, `serializers.py`, `views.py`, `services.py`) ne sont modifiés qu'après coordination via agent-intégrateur.

## Règles de travail

- Pas de commit pendant l'implémentation. Seul agent-intégrateur commite, après validation humaine.
- Si ambiguïté : arrêt immédiat et demande explicite. Jamais deviner.
- Toute nouvelle fonctionnalité est accompagnée de tests. Aucun test désactivé ni skippé.
- Toute nouvelle clé i18n est ajoutée simultanément en `fr.json` et `en.json`.
- Toute migration suit la convention de nommage existante et ne crée pas de conflit de numéros.
- En cas de découverte d'une dette technique hors périmètre : mention dans le récap final, pas de correction.

## Convention de branches

- Chaque chantier travaille sur une branche `agent/<nom-agent>/<chantier-court>` (ex : `agent/coupons/fix-validation-logic`).
- agent-intégrateur merge vers `master` après validation.
- Aucun push direct sur `master`.

## Format du récap de fin de chantier

Chaque agent spécialisé livre à la fin de son chantier un récap structuré :

- Liste des fichiers créés / modifiés / supprimés.
- Nombre de tests ajoutés et résultat (`X passés / Y échoués`).
- Résultat de `npm run build` côté frontend si concerné.
- Confirmation : aucune régression sur les tests existants.
- Mention des dettes techniques découvertes hors périmètre (le cas échéant).
- Mention des couplages cross-agent touchés (le cas échéant) avec la zone exacte.

## Communication avec agent-intégrateur

- Avant de démarrer un chantier susceptible de toucher une zone de couplage critique (Section 5 de `CARTOGRAPHIE.md`), demander une autorisation à agent-intégrateur.
- À la fin du chantier, soumettre le récap à agent-intégrateur pour vérification avant tout commit.
- En cas de refus de agent-intégrateur : appliquer les corrections demandées et resoumettre.

## Évolution de la charte

- Si un incident révèle une règle manquante, agent-intégrateur peut amender cette charte.
- Toute modification de la charte est validée par l'humain.
