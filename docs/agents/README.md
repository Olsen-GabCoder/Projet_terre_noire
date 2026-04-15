# Index des agents Frollot

11 agents opérationnels : 10 spécialisés + 1 intégrateur.
Charte commune : [docs/CHARTE_AGENTS.md](../CHARTE_AGENTS.md)
Cartographie complète : [docs/CARTOGRAPHIE.md](../CARTOGRAPHIE.md)

---

| Agent | Type | Rôle | Fiche |
|---|---|---|---|
| agent-catalogue | spécialisé | Catalogue de livres, auteurs, catégories, avis et wishlist | [agent-catalogue.md](agent-catalogue.md) |
| agent-marketplace | spécialisé | Marketplace multi-vendeurs, commandes, paiements, portefeuilles vendeurs | [agent-marketplace.md](agent-marketplace.md) |
| agent-livraison | spécialisé | Livraison par agents indépendants, portefeuille livreur, tarifs, assignation | [agent-livraison.md](agent-livraison.md) |
| agent-services | spécialisé | Services éditoriaux professionnels, devis, projets, factures | [agent-services.md](agent-services.md) |
| agent-connect | spécialisé | Organisations (maisons d'édition, librairies…), manuscrits, annuaire pro | [agent-connect.md](agent-connect.md) |
| agent-social | spécialisé | Réseau social du livre : posts, clubs, listes de lecture, newsletter, contact | [agent-social.md](agent-social.md) |
| agent-coupons | spécialisé | Système de coupons et promotions (templates, émission, validation, application) | [agent-coupons.md](agent-coupons.md) |
| agent-library | spécialisé | Bibliothèques institutionnelles, catalogue bibliothèque, prêts | [agent-library.md](agent-library.md) |
| agent-users | spécialisé | Authentification, profils multi-rôles, 2FA, OAuth, sessions, sécurité | [agent-users.md](agent-users.md) |
| agent-infra | spécialisé | Infrastructure transversale : email, tâches async, notifications, design system, routing, i18n | [agent-infra.md](agent-infra.md) |
| **agent-intégrateur** | **intégrateur** | **Supervision transversale : cohérence cross-agent, contrats API, migrations, qualité globale** | [agent-integrateur.md](agent-integrateur.md) |

---

## Partage de fichiers critique

Les fichiers `apps/marketplace/models.py`, `serializers.py`, `views.py`, `services.py` sont **partagés** entre agent-marketplace et agent-livraison.
Toute modification simultanée doit passer par agent-intégrateur. Voir Section 5 de CARTOGRAPHIE.md.

## Par où commencer

1. Lire [CHARTE_AGENTS.md](../CHARTE_AGENTS.md) — règles communes.
2. Lire la fiche de son agent (ce dossier).
3. Déclarer le chantier à agent-intégrateur si zones de couplage touchées (Section 5 de CARTOGRAPHIE.md).
4. Travailler sur branche `agent/<nom>/<chantier>`.
