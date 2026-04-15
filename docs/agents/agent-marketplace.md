# agent-marketplace

## Identité

- **Nom** : agent-marketplace
- **Type** : spécialisé
- **Domaine métier** : Marketplace multi-vendeurs, commandes, paiements, portefeuilles vendeurs

## Périmètre backend

- Apps Django : `apps/marketplace/` (hors classes Delivery\*), `apps/orders/`
- Modèles gérés dans marketplace : BookListing, SubOrder (hors champs delivery\_agent/delivery\_fee/delivery\_status), CommissionConfig, VendorWallet, WalletTransaction, WithdrawalRequest (vendeur)
- Modèles gérés dans orders : Order, OrderItem, Payment, OrderEvent
- Restrictions intra-fichier : dans `apps/marketplace/models.py`, `serializers.py`, `views.py`, `services.py`, ne touche **pas** aux classes `DeliveryWallet`, `DeliveryRate`, `DeliveryWalletTransaction`, ni aux vues/serializers `Delivery*`. Voir section "Partage de fichiers".
- Admin Django : `apps/marketplace/admin.py` (parties vendeur), `apps/orders/admin.py`

## Périmètre frontend

- Pages :
  - `pages/Cart.jsx` → `/cart`
  - `pages/Checkout.jsx` → `/checkout`
  - `pages/OrderSuccess.jsx` → `/order-success`
  - `pages/Orders.jsx` → `/orders`
  - `pages/vendor/VendorDashboard.jsx` → `/vendor`
  - `pages/vendor/VendorListings.jsx` → `/vendor/listings`
  - `pages/vendor/VendorOrders.jsx` → `/vendor/orders`
  - `pages/vendor/VendorWallet.jsx` → `/vendor/wallet`
  - `pages/admin/AdminOrders.jsx` → `/admin-dashboard/orders`
- Composants :
  - `components/sidebar/content/ShopSidebar.jsx`
- Hooks : aucun propre
- Services API : appels directs orders/marketplace dans `services/api.js` (OrderViewSet, PaymentViewSet, marketplace listings, vendor endpoints, wallet endpoints)
- Styles CSS : `Cart.css`, `Checkout.css`, `Orders.css`, `OrderSuccess.css`
- Contexts : `context/CartContext.jsx`

## Périmètre i18n

- Sections de fr.json/en.json : `cart`, `vendor`

## Périmètre tests

- Backend : `backend/apps/marketplace/tests.py`, `backend/apps/orders/tests.py`
- Frontend : `frontend/src/context/CartContext.test.jsx`

## Interfaces avec les autres agents

- **Consomme depuis** :
  - agent-catalogue : `books.models.Book` (FK dans BookListing)
  - agent-coupons : `coupons.services` (calcul de réduction, application/restauration coupon)
  - agent-infra : `core.email` (notifications transactionnelles), `core.tasks` (tâches Celery), `notifications` (création de notifications)
  - agent-livraison : coordination sur SubOrder (assignation livreur)
- **Expose à** :
  - agent-coupons : `orders.models.Order`, `orders.models.OrderItem`, `marketplace.models.SubOrder` (pour calcul de réduction)
  - agent-livraison : `marketplace.models.SubOrder` (assignation livreur)
- **Zones de couplage critique** :
  - Coupons ↔ Commandes (Section 5.2)
  - Commandes ↔ Marketplace (Section 5.2)
  - Marketplace ↔ Livraison (Section 5.2)

## Partage de fichiers avec agent-livraison

Les fichiers `apps/marketplace/models.py`, `apps/marketplace/serializers.py`, `apps/marketplace/views.py`, `apps/marketplace/services.py` sont partagés avec agent-livraison.

- **agent-marketplace touche** : BookListing, SubOrder (hors champs delivery), CommissionConfig, VendorWallet, WalletTransaction, WithdrawalRequest (vendeur), vues/serializers correspondants.
- **agent-livraison touche** : DeliveryWallet, DeliveryRate, DeliveryWalletTransaction, WithdrawalRequest (livreur), assignation livreur sur SubOrder, vues/serializers `Delivery*`.

Toute modification simultanée doit être coordonnée via agent-intégrateur pour éviter les conflits de merge.

## Exclusions explicites

- Classes Delivery\* dans `apps/marketplace/` (→ agent-livraison)
- `apps/services/` (services pro, devis, projets éditoriaux)
- `apps/manuscripts/` (soumissions de manuscrits)
- `apps/social/` (réseau social)
- `apps/library/` (bibliothèque)
- `apps/coupons/` (modèles coupons — utilise uniquement l'interface `coupons.services`)
- Pages dashboard/Delivery\* (→ agent-livraison)

## Protocole de travail

1. Avant de démarrer : lire `CHARTE_AGENTS.md` et la fiche de cet agent.
2. Vérifier que le chantier ne déborde pas du périmètre.
3. Si débordement potentiel : demander autorisation à agent-intégrateur.
4. Travailler sur une branche `agent/marketplace/<chantier>`.
5. Tests systématiques.
6. Récap final selon le format de la charte.
7. Soumission à agent-intégrateur.
8. Pas de commit autonome.

## Notes spécifiques

- **Bloqueur connu** : `orders/payment_gateway.py` contient 6 TODO stubs pour l'intégration Mobicash/Airtel Money. Le flux de paiement n'est pas fonctionnel.
- Le modèle SubOrder orchestre le cycle de vie vendeur (PENDING → CONFIRMED → PREPARING → READY → SHIPPED → DELIVERED) et les transactions wallet.
- L'annulation de commande doit restaurer le stock ET le coupon utilisé — tester les deux.
- `AdminOrders.jsx` est une page admin rattachée à ce domaine mais l'infra admin appartient à agent-infra.
