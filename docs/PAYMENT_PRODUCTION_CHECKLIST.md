# Checklist mise en production — Paiement Frollot

## Prérequis
- [ ] Compte marchand Mobicash activé auprès de Gabon Telecom
- [ ] Compte marchand Airtel Money activé
- [ ] Documents KYC validés par les deux opérateurs
- [ ] URLs de callback whitelistées chez Mobicash et Airtel
- [ ] Certificat SSL valide sur le domaine de production

## Variables d'environnement à configurer

```env
# Mobicash (Gabon Telecom)
MOBICASH_MERCHANT_ID=votre_merchant_id
MOBICASH_API_KEY=votre_api_key
MOBICASH_API_SECRET=votre_api_secret
MOBICASH_API_URL=https://api.mobicash.ga/v1    # vide = simulation
MOBICASH_WEBHOOK_SECRET=secret_fourni_par_mobicash

# Airtel Money
AIRTEL_CLIENT_ID=votre_client_id
AIRTEL_CLIENT_SECRET=votre_client_secret
AIRTEL_API_URL=https://openapi.airtel.africa   # vide = simulation
AIRTEL_WEBHOOK_SECRET=secret_fourni_par_airtel

# Fallback (si les secrets spécifiques ne sont pas définis)
PAYMENT_WEBHOOK_SECRET=secret_partagé

# Backend URL (pour les callbacks webhook)
BACKEND_URL=https://api.frollot.com
```

## Étapes de mise en production

1. **Configurer les variables** dans `.env` production
2. **Vérifier BACKEND_URL** pointe vers le domaine HTTPS public
3. **Tester avec un petit montant** (100 FCFA) :
   ```bash
   curl -X POST https://api.frollot.com/api/orders/payment/initiate/ \
     -H "Authorization: Bearer <jwt_token>" \
     -H "Content-Type: application/json" \
     -d '{"order_id": 1, "provider": "MOBICASH", "phone_number": "074XXXXXX"}'
   ```
4. **Confirmer le paiement** sur le téléphone (USSD push)
5. **Vérifier la réception du webhook** dans les logs Django :
   ```bash
   grep "webhook" /var/log/frollot/django.log | tail -10
   ```
6. **Vérifier le split_payment** : wallet vendeur crédité
7. **Tester le décaissement** : retrait wallet → Mobicash/Airtel
8. **Répéter** pour Airtel Money avec le même flow

## Architecture paiement

```
Frontend                    Backend                         Provider
   │                          │                                │
   │ POST /payment/initiate/  │                                │
   │────────────────────────> │ ── requests.post ──────────── │
   │                          │ <── transaction_id + PENDING ─ │
   │ <── payment_id + PENDING │                                │
   │                          │                                │
   │    [User confirms USSD]  │                                │
   │                          │                                │
   │                          │ <── POST /webhook/{provider}/ ─│
   │                          │    validate HMAC signature      │
   │                          │    update Payment → SUCCESS     │
   │                          │    _process_successful_payment  │
   │                          │      → order.status = PAID      │
   │                          │      → split_payment (wallets)  │
   │                          │      → update_sales_after_payment│
   │                          │      → send_order_paid email    │
   │                          │ ── 200 OK ─────────────────── │
```

### Fichiers clés
- `backend/apps/orders/payment_gateway.py` — 2 providers (Mobicash + Airtel) + CashProvider
- `backend/apps/orders/views.py` — PaymentInitiateView, PaymentWebhookView, _process_successful_payment()
- `backend/apps/marketplace/views.py` — WithdrawView (décaissement wallet → Mobile Money)

### Sécurité
- **Webhook HMAC-SHA256** : rejet par défaut si aucun secret configuré (safe-by-default)
- **Wallet atomique** : `select_for_update()` empêche les doubles retraits concurrents
- **Retry paiement** : les paiements FAILED sont supprimés avant retry (pas de doublons)
- **Extension blocklist** : fichiers .exe/.bat/.sh bloqués sur les uploads livrables

### Mode simulation
Quand `MOBICASH_API_URL` ou `AIRTEL_API_URL` est vide :
- `initiate()` retourne un faux `transaction_id` avec `[SIMULATION]`
- `verify()` retourne toujours `SUCCESS`
- `disburse()` retourne un faux succès
- Aucun appel réseau n'est fait

## Contacts
- Mobicash support technique : [à remplir lors de l'activation]
- Airtel Money API support : [à remplir lors de l'activation]
- Responsable intégration Frollot : [à remplir]
