# agent-livraison

## Identité

- **Nom** : agent-livraison
- **Type** : spécialisé
- **Domaine métier** : Livraison par agents indépendants, portefeuille livreur, tarifs, assignation et suivi

## Périmètre backend

- Apps Django : `apps/marketplace/` (classes Delivery\* uniquement)
- Modèles gérés : DeliveryWallet, DeliveryRate, DeliveryWalletTransaction, WithdrawalRequest (livreur uniquement)
- Restrictions intra-fichier :
  - `apps/marketplace/models.py` : classes `DeliveryWallet`, `DeliveryRate`, `DeliveryWalletTransaction`. Champs `delivery_agent`, `delivery_fee`, `delivery_status`, `delivery_attempt_count`, `last_delivery_attempt_reason` sur `SubOrder`.
  - `apps/marketplace/serializers.py` : serializers `Delivery*`
  - `apps/marketplace/views.py` : vues `DeliveryAgentListView`, `MyDeliveryAssignmentsView`, `DeliveryStatusUpdateView`, `DeliveryWalletView`, `DeliveryWalletTransactionListView`, `MyDeliveryRatesView`, `DeliveryRateDetailView`, `SearchDeliveryRatesView`, `DeliveryReferenceDataView`, `AssignDeliveryView`
  - `apps/marketplace/services.py` : fonctions liées à la livraison
  - `apps/marketplace/urls.py` : routes `delivery/*`
- Admin Django : parties livraison dans `apps/marketplace/admin.py`

## Périmètre frontend

- Pages :
  - `pages/dashboard/DeliveryDashboard.jsx` → `/dashboard/delivery`
  - `pages/dashboard/DeliveryAssignments.jsx` → `/dashboard/delivery/assignments`
  - `pages/dashboard/DeliveryWallet.jsx` → `/dashboard/delivery/wallet`
  - `pages/dashboard/DeliveryProfile.jsx` → `/dashboard/delivery/profile`
  - `pages/dashboard/DeliveryRates.jsx` → `/dashboard/delivery/rates`
  - `pages/Delivery.jsx` → `/delivery` (page info publique zones/tarifs)
- Composants : aucun propre actuellement
- Hooks : aucun propre
- Services API : endpoints `marketplace/delivery/*` dans `services/api.js`
- Styles CSS : `Delivery.css`
- Contexts : `context/DeliveryConfigContext.jsx` (configuration zones/tarifs — partagé avec agent-infra pour la partie SiteConfig)

## Périmètre i18n

- Sections de fr.json/en.json : sous-clés `dashboard.delivery` (si existantes)

## Périmètre tests

- Backend : tests liés à la livraison dans `backend/apps/marketplace/tests.py` (si existants)
- Frontend : aucun actuellement — priorité à créer

## Interfaces avec les autres agents

- **Consomme depuis** :
  - agent-marketplace : `marketplace.models.SubOrder` (assignation livreur à une sous-commande)
  - agent-infra : `core.tasks` (tâches Celery), `notifications` (création de notifications livraison)
  - agent-users : `users.models.UserProfile` (profil livreur, rôle LIVREUR)
- **Expose à** :
  - agent-marketplace : statut de livraison sur SubOrder, informations DeliveryRate
- **Zones de couplage critique** :
  - Marketplace ↔ Livraison (Section 5.2) : l'assignation d'un livreur modifie SubOrder

## Partage de fichiers avec agent-marketplace

Les fichiers `apps/marketplace/models.py`, `apps/marketplace/serializers.py`, `apps/marketplace/views.py`, `apps/marketplace/services.py` sont partagés avec agent-marketplace.

- **agent-marketplace touche** : BookListing, SubOrder (hors champs delivery), CommissionConfig, VendorWallet, WalletTransaction, WithdrawalRequest (vendeur).
- **agent-livraison touche** : DeliveryWallet, DeliveryRate, DeliveryWalletTransaction, WithdrawalRequest (livreur), assignation livreur sur SubOrder.

Toute modification simultanée doit être coordonnée via agent-intégrateur pour éviter les conflits de merge.

## Exclusions explicites

- Tout ce qui n'est pas Delivery\* dans `apps/marketplace/` (→ agent-marketplace)
- `apps/orders/` (commandes, paiements → agent-marketplace)
- `apps/services/` (services pro)
- `apps/books/` (catalogue)
- Tout autre app Django

## Protocole de travail

1. Avant de démarrer : lire `CHARTE_AGENTS.md` et la fiche de cet agent.
2. Vérifier que le chantier ne déborde pas du périmètre.
3. Si débordement potentiel : demander autorisation à agent-intégrateur.
4. Travailler sur une branche `agent/livraison/<chantier>`.
5. Tests systématiques.
6. Récap final selon le format de la charte.
7. Soumission à agent-intégrateur.
8. Pas de commit autonome.

## Notes spécifiques

- Les modèles Delivery\* sont actuellement dans `apps/marketplace/models.py` — pas dans une app séparée. À terme, une extraction vers `apps/delivery/` pourrait être envisagée mais ce n'est pas prévu maintenant.
- Le modèle `DeliveryWalletTransaction` a des types spécifiques : CREDIT_DELIVERY, DEBIT_WITHDRAWAL, CREDIT_BONUS.
- SubOrder a un champ `delivery_attempt_count` et `last_delivery_attempt_reason` pour le suivi des tentatives.
- La page `Delivery.jsx` est une page info publique (zones, tarifs) — distincte du dashboard livreur.
