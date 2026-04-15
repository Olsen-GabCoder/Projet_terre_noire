# agent-coupons

## Identité

- **Nom** : agent-coupons
- **Type** : spécialisé
- **Domaine métier** : Système de coupons et promotions (templates, émission, validation, application sur commandes et services)

## Périmètre backend

- Apps Django : `apps/coupons/`
- Modèles gérés : CouponTemplate, Coupon
- Fichiers spécifiques : `models.py`, `views.py`, `serializers.py`, `services.py`, `tasks.py`, `permissions.py`, `throttles.py`, `admin.py`, `urls.py`
- Migrations : `0002` à `0010` (refonte v2 complète)
- Admin Django : `apps/coupons/admin.py`

## Périmètre frontend

- Pages :
  - `pages/MyCoupons.jsx` → `/dashboard/coupons`
  - `pages/dashboard/CouponTemplates.jsx` → `/dashboard/coupons/templates`
  - `pages/dashboard/CouponSend.jsx` → `/dashboard/coupons/send`
  - `pages/dashboard/CouponIssued.jsx` → `/dashboard/coupons/issued`
  - `pages/admin/AdminCoupons.jsx` → `/admin-dashboard/coupons`
- Composants :
  - `components/CouponWidget.jsx`
  - `components/coupons/EmitterSelector.jsx`
- Hooks :
  - `hooks/useEmitterContext.js`
- Services API : `couponService` dans `services/api.js` (templates, send, validate, applicable, revoke, admin, emitter-context, vendor-customers, service-customers)
- Styles CSS : `CouponWidget.css`, `CouponTemplates.css`, `CouponSend.css`, `CouponIssued.css`, `MyCoupons.css`, `AdminCoupons.css`

## Périmètre i18n

- Sections de fr.json/en.json : `coupons`

## Périmètre tests

- Backend : `backend/apps/coupons/tests/` (14 fichiers) — test_models.py, test_admin_api.py, test_send_api.py, test_revoke_api.py, test_templates_api.py, test_multi_org.py, test_order_integration.py, test_service_integration.py, test_tasks.py, test_applicable_api.py, test_templates_enriched.py, test_validate_api.py, test_vendor_customers.py, test_service_customers.py
- Frontend : `frontend/src/components/CouponWidget.test.jsx`, `frontend/src/components/coupons/EmitterSelector.test.jsx`, `frontend/src/hooks/useEmitterContext.test.js`, `frontend/src/pages/dashboard/CouponTemplates.test.jsx`, `frontend/src/services/couponService.test.js`

## Interfaces avec les autres agents

- **Consomme depuis** :
  - agent-connect : `organizations.models.Organization` (émetteur de coupon type organisation)
  - agent-users : `users.models.User`, `users.models.UserProfile` (émetteur type prestataire, destinataire)
  - agent-infra : `core.email` (email envoi/révocation coupon), `core.tasks` (tâches Celery), `notifications` (notification coupon reçu/révoqué)
  - agent-catalogue : `books.models.Book` (filtrage de coupons par produit — lecture seule)
- **Expose à** :
  - agent-marketplace : `coupons.services` (calcul réduction commande, restauration coupon à l'annulation)
  - agent-services : `coupons.services` (réduction sur ServiceOrder/ServiceQuote)
- **Zones de couplage critique** :
  - Coupons ↔ Commandes (Section 5.2)
  - Coupons ↔ Services (Section 5.2)

## Exclusions explicites

- `apps/orders/` (ne modifie jamais les modèles — expose uniquement `coupons.services`)
- `apps/marketplace/` (ne modifie jamais les modèles — expose uniquement `coupons.services`)
- `apps/services/` (ne modifie jamais les modèles — expose uniquement `coupons.services`)
- `apps/organizations/` (ne modifie pas — consomme en lecture)
- `apps/social/`, `apps/library/`, `apps/manuscripts/`, `apps/books/`

## Protocole de travail

1. Avant de démarrer : lire `CHARTE_AGENTS.md` et la fiche de cet agent.
2. Vérifier que le chantier ne déborde pas du périmètre.
3. Si débordement potentiel : demander autorisation à agent-intégrateur.
4. Travailler sur une branche `agent/coupons/<chantier>`.
5. Tests systématiques.
6. Récap final selon le format de la charte.
7. Soumission à agent-intégrateur.
8. Pas de commit autonome.

## Notes spécifiques

- **Chantier massif en cours** : ~50 fichiers nouveaux + 25 modifiés, non commités. Le prochain chantier de cet agent sera probablement la finalisation et le commit de ce travail.
- Le pattern émetteur XOR (Organization XOR ProviderProfile, ou plateforme si les deux sont null) est le coeur de l'architecture. La contrainte est vérifiée par migration `0006_verify_emitter_xor` — vérifier aussi la validation runtime dans les vues.
- Templates système (`0010_seed_system_templates`) : BIENVENUE, FIDELITE, SAISONNIER, REACTIVATION, ANNIVERSAIRE, FLASH, PARRAINAGE, PROMO_PRODUIT, DESTOCKAGE, AUTRE.
- Types de réduction : PERCENT, FIXED, FREE_SHIPPING.
- Cycle de vie coupon : PENDING → SENT → USED/EXPIRED/REVOKED/FAILED.
- `CouponWidget.jsx` est un composant utilisé dans Cart et potentiellement dans d'autres contextes de checkout — interface critique avec agent-marketplace.
- Le module est le mieux testé du projet (14 fichiers backend + 5 frontend) — maintenir ce niveau.
- Templates emails : `backend/templates/emails/coupon_received.html`, `coupon_revoked.html` (propriété agent-infra, mais contenu métier dicté par agent-coupons).
