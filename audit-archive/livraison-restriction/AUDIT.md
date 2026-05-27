# AUDIT — Item 2.3 : Livraison (Phase 1 — Lecture seule)

**Date :** 2026-05-27
**Branche :** main (dernier commit : caddcdd)
**Statut :** Audit complet, en attente de validation Olsen

---

## 1. Saisie d'adresse

### Constat

Le formulaire Checkout (`frontend/src/pages/Checkout.jsx`, L19-23) collecte 3 champs :

```js
shipping_address: '',   // textarea, champ libre (L238-247)
shipping_phone: '',     // input tel (L268-278)
shipping_city: '',      // input text, champ libre (L254-263)
```

- **`shipping_city`** (L254-263) : champ texte libre avec placeholder "Ex: Port-Gentil". **Aucune validation** (pas de liste deroulante, pas de regex, pas de restriction).
- **`shipping_address`** (L238-247) : textarea libre, placeholder "Numero, Rue, Avenue, Quartier..."
- **`shipping_phone`** (L268-278) : input tel, placeholder "+241 XX XX XX XX"

### Pre-remplissage

- En mode normal (L82-92) : pre-rempli depuis `user.address`, `user.phone_number`, `user.city`
- En mode retry (L49-53) : pre-rempli depuis la commande existante

### Validation

- Frontend : uniquement l'attribut HTML `required` sur les 3 champs. Aucune validation JS supplementaire sur la ville.
- Backend (`backend/apps/orders/serializers.py`, L32-34) : `CharField(max_length=100)` pour `shipping_city`. Aucune validation de contenu (pas de whitelist de villes).

**Conclusion :** Le champ ville est totalement ouvert. C'est coherent avec la decision client (ne PAS restreindre l'achat). Il suffit d'ajouter un encart informatif.

---

## 2. Modele de donnees

### Order (`backend/apps/orders/models.py`, L7-34)

| Champ | Type | Description |
|-------|------|-------------|
| `shipping_address` | TextField (L23) | Adresse complete |
| `shipping_phone` | CharField(20) (L24) | Telephone |
| `shipping_city` | CharField(100) (L25) | Ville |
| `shipping_cost` | DecimalField (L18) | Frais de livraison |
| `subtotal` | DecimalField (L17) | Sous-total articles |
| `discount_amount` | DecimalField (L19) | Reduction coupon |
| `total_amount` | DecimalField (L21) | Total final |

### SiteConfig (`backend/apps/core/models.py`, L6-46)

| Champ | Type | Default | Description |
|-------|------|---------|-------------|
| `shipping_free_threshold` | DecimalField (L11-17) | 25000 | Seuil livraison gratuite |
| `shipping_cost` | DecimalField (L19-25) | 2000 | Frais si sous le seuil |

**Pas de notion de zone, de ville, ni de tarification differenciee** dans le modele actuel. Un seul `shipping_cost` global.

---

## 3. Calcul actuel des frais

### Frontend (affichage)

**Cart.jsx** (L34-41) :
```js
const shipping = subtotal === 0 ? 0 : subtotal >= shippingFreeThreshold ? 0 : shippingCost;
```

**Checkout.jsx** (L333-341) :
```js
const shipping = subtotal >= shippingFreeThreshold ? 0 : shippingCost;
```

Logique identique : si sous-total >= seuil -> gratuit, sinon -> `shippingCost` (valeur unique).

### Backend (autoritatif)

**OrderCreateSerializer.create()** (`backend/apps/orders/serializers.py`, L96-99) :
```python
config = SiteConfig.get_config()
shipping_free_threshold = config.shipping_free_threshold
shipping_cost_default = config.shipping_cost
shipping_cost = Decimal('0') if subtotal >= shipping_free_threshold else shipping_cost_default
```

**Meme logique** : un seul tarif, pas de distinction par ville.

### Source des valeurs

Les valeurs viennent du `DeliveryConfigContext` (`frontend/src/context/DeliveryConfigContext.jsx`, L14) qui appelle `GET /api/config/delivery/` (`backend/apps/core/views.py`, L26-36). Valeurs par defaut hardcodees dans le contexte : `{ shipping_free_threshold: 25000, shipping_cost: 2000 }`.

---

## 4. Configuration admin

### AdminConfig.jsx (L1-102)

Gere **2 parametres** uniquement :
- `shipping_cost` (frais de livraison)
- `shipping_free_threshold` (seuil gratuite)

Appelle `PATCH /api/config/delivery/` pour sauvegarder.

### Backend (`DeliveryConfigView`, `backend/apps/core/views.py`, L14-48)

- GET : public (cache 600s)
- PATCH : admin only

**Pas de parametres de zone** dans l'admin actuel. La tarification differenciee (Port-Gentil vs hors Port-Gentil) n'est pas geree.

---

## 5. Email de confirmation

### order_confirmation.html (L1-39)

Contient :
- Recapitulatif articles (tableau)
- Sous-total, frais de livraison, reduction, total TTC
- **Adresse de livraison** (L28-29) : `{{ order.shipping_address }}`, `{{ order.shipping_city }}`, telephone
- Prochaines etapes (L34)

**Aucune mention** des villes desservies ni de la politique de retrait. C'est l'endroit ideal pour ajouter un bandeau d'information.

### order_paid.html (L1-31)

Plus court. Mentionne l'expedition sous 5-10 jours. **Aucune mention** des zones de livraison.

### Autres templates pertinents

- `order_shipped.html` : notification d'expedition, pourrait aussi inclure l'info.

---

## 6. Distinction Papier / Ebook

### Modele Book (`backend/apps/books/models.py`, L144-147)

```python
FORMAT_CHOICES = [
    ('EBOOK', 'Ebook'),
    ('PAPIER', 'Papier'),
]
```

Champ `format` (L187-191), default `'PAPIER'`. Propriete `is_ebook` (L398-401).

### Utilisation dans le panier

**Cart.jsx** (L194-198) : affiche le format (`'Ebook'` ou `'Papier'`).

**Checkout / Backend** : Le calcul des frais de livraison ne distingue PAS papier/ebook. Les frais sont calcules sur le sous-total global, quel que soit le format. Un panier 100% ebook paiera quand meme des frais si sous le seuil.

### Page Delivery.jsx (L83-86)

Mentionne textuellement : "Les ebooks (contenus numeriques) ne sont pas soumis a des frais de livraison" — mais ce n'est **pas implemente** dans le calcul reel.

**Note :** Ce point est hors scope de l'item 2.3 (qui concerne l'info livraison, pas le calcul ebook). A signaler comme dette technique.

---

## 7. CGV — Article Livraison

### Article 7 (`frontend/src/pages/CGV.jsx`, L158-187)

**Texte actuel :**

**7.1 Zones et delais :**
- Port-Gentil : 24-72h ouvrees
- Libreville et grandes villes : 3-7 jours ouvres
- Autres localites : 5-10 jours ouvres

**7.2 Frais de livraison :**
- "Calcules en fonction de la destination et du montant de la commande"
- Seuil de gratuite mentionne
- Ebooks exempts

**7.3 Transfert des risques** : remise du colis

### Analyse

- L'article mentionne deja les zones de livraison (Port-Gentil, Libreville, autres)
- **Ne mentionne PAS** la restriction aux 3 villes (Libreville, Port-Gentil, Lambarene)
- **Ne mentionne PAS** l'obligation de retrait pour les clients hors de ces 3 villes
- A mettre a jour pour refleter la nouvelle politique

---

## 8. Synthese — Points d'intervention

### 8.1 Fichiers a modifier (Phase 2)

| # | Fichier | Action | Effort |
|---|---------|--------|--------|
| 1 | `frontend/src/pages/BookDetail.jsx` | Ajouter encart info livraison pour les livres PAPIER (sous le bouton "Ajouter au panier") | Faible |
| 2 | `frontend/src/pages/Cart.jsx` | Ajouter bandeau info livraison au-dessus du recapitulatif | Faible |
| 3 | `frontend/src/pages/Checkout.jsx` | Ajouter encart info livraison visible dans la section "Informations de livraison" | Faible |
| 4 | `frontend/src/pages/OrderSuccess.jsx` | Ajouter rappel info livraison dans les "prochaines etapes" | Faible |
| 5 | `frontend/src/pages/Delivery.jsx` | Ajouter une section dediee "Zones desservies" avec les 3 villes et la politique de retrait | Faible |
| 6 | `frontend/src/pages/CGV.jsx` | Mettre a jour l'article 7 : mentionner les 3 villes, la politique de retrait, et la tarification | Faible |
| 7 | `backend/templates/emails/order_confirmation.html` | Ajouter bandeau info zone de livraison | Faible |
| 8 | `backend/templates/emails/order_paid.html` | Ajouter bandeau info zone de livraison | Faible |

### 8.2 Fichiers a NE PAS modifier

- **Modeles backend** : pas de changement (pas de restriction technique)
- **Serializers/Views** : pas de changement (pas de validation de ville)
- **CartContext** : pas de changement
- **DeliveryConfigContext** : pas de changement
- **AdminConfig** : pas de changement (la tarification differenciee Port-Gentil/hors PG est un sujet futur, pas dans cet item)
- **SiteConfig** : pas de changement

### 8.3 Evaluation de l'effort

**Effort global : FAIBLE** — Il s'agit uniquement d'ajouter des encarts informatifs (HTML/JSX) a des pages existantes. Aucune modification de logique metier, de modele de donnees, ni d'API.

Estimation : ~8 blocs de texte/JSX a inserer, aucune migration, aucun endpoint nouveau.

### 8.4 Risques identifies

| Risque | Probabilite | Impact | Mitigation |
|--------|-------------|--------|------------|
| Regression visuelle (CSS) | Faible | Faible | Utiliser les classes existantes du design system (TnAlert ou style coherent) |
| Oubli d'un point d'insertion | Faible | Faible | Cette checklist couvre tous les touchpoints du parcours |
| Incoherence du message entre pages | Moyen | Moyen | Definir le texte exact UNE FOIS et le reutiliser partout |

### 8.5 Questions ouvertes pour Olsen

1. **Texte exact du message** — Le client a donne la formulation generale. Faut-il l'adapter legerement selon le contexte (BookDetail vs Checkout vs email) ou garder un texte strictement identique partout ?

2. **Tarification differenciee** — La spec mentionne :
   - Port-Gentil : 0 FCFA expedition + 1000 FCFA livraison
   - Hors Port-Gentil : 2000 FCFA expedition + 1000 FCFA livraison

   Actuellement le systeme a un seul tarif (2000 FCFA) configurable via admin. Faut-il implementer la tarification differenciee dans cet item, ou est-ce un item futur ? (L'item 2.3 demande seulement l'affichage d'information, pas le changement de calcul.)

3. **Ebooks exempts** — L'encart livraison ne devrait s'afficher que pour les livres PAPIER sur BookDetail. Mais au panier/checkout, si le panier contient un mix papier+ebook, on affiche quand meme l'info ? (Proposition : oui, des qu'il y a au moins 1 livre papier.)

4. **Style de l'encart** — Utiliser `TnAlert` variante `info` (deja dans le design system) ou creer un composant dedie ? (Proposition : TnAlert info, coherent avec le design system V2.5.)

5. **Page Delivery.jsx** — Cette page liste deja les zones (Port-Gentil, Libreville/Franceville/Lambarene, autres). Faut-il la restructurer pour mettre en avant les 3 villes desservies, ou simplement ajouter un encart en haut ?

---

## Conclusion

L'item 2.3 est un item **purement informatif** : aucune restriction technique, aucun changement de logique metier. Il s'agit d'inserer un message clair aux 8 touchpoints du parcours d'achat. L'effort est faible et le risque de regression minimal.

**En attente de validation Olsen pour passer a la Phase 2 (implementation).**
