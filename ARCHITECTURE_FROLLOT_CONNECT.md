# Architecture « Frollot Connect »

## De plateforme centralisée à écosystème social du livre

---

## Contexte

Frollot dispose d'un backend riche (56 modèles, 86 endpoints) couvrant multi-rôles, organisations, marketplace, services pro, workflow éditorial et features sociales. Cependant, **tout passe par l'administrateur** : les manuscrits arrivent dans une boîte admin, les organisations n'ont pas de vitrine publique, et aucun mécanisme ne permet la mise en relation directe entre acteurs du livre.

Cette architecture transforme Frollot en **marché biface** où chaque acteur peut se présenter, être découvert et interagir directement.

---

## Principe directeur

```
┌─────────────────────────────────────────────────────────────┐
│                         FROLLOT                             │
│                                                             │
│   OFFRE (qui propose)          DEMANDE (qui cherche)        │
│                                                             │
│   Maison d'édition ◄────────► Auteur cherche éditeur       │
│   Correcteur        ◄────────► Éditeur cherche correcteur  │
│   Illustrateur      ◄────────► Auteur cherche couverture   │
│   Imprimerie        ◄────────► Éditeur cherche impression  │
│   Librairie         ◄────────► Lecteur cherche livres      │
│   Traducteur        ◄────────► Éditeur cherche traduction  │
│                                                             │
│   Chacun a une VITRINE ←→ Chacun DÉCOUVRE et COMPARE       │
│                    RÉPUTATION (avis, notes, stats)          │
│                    CONNEXION DIRECTE (pas via admin)        │
└─────────────────────────────────────────────────────────────┘
```

---

## Les 6 modules

### Module 1 — Vitrines (Storefronts)

Chaque acteur a une **page publique riche**, comparable à une page LinkedIn entreprise ou un profil Fiverr.

#### Vitrine Organisation (`/organizations/{slug}`)

```
┌──────────────────────────────────────────────────────────┐
│  [Logo]  Éditions Frollot              ★ 4.7 (23 avis)  │
│  Maison d'édition · Port-Gentil       ✓ Vérifié         │
│  "Nous publions les voix d'Afrique centrale"             │
│  [Suivre]  [Contacter]  [Soumettre un manuscrit]         │
├──────────────────────────────────────────────────────────┤
│  À propos │ Catalogue │ Services │ Équipe │ Avis         │
├──────────────────────────────────────────────────────────┤
│  📊 Stats                                                │
│  42 livres publiés · 8 auteurs · Répond en ~3 jours     │
│                                                          │
│  📚 Genres acceptés                                      │
│  Roman · Poésie · Essai · Conte                          │
│                                                          │
│  📝 Guide de soumission                                  │
│  "Nous acceptons les manuscrits de 50 à 300 pages..."   │
└──────────────────────────────────────────────────────────┘
```

**Onglets :**
- **À propos** : description, mission, histoire, coordonnées
- **Catalogue** : livres publiés par cette organisation (lien vers BookDetail)
- **Services** : services proposés (correction, mise en page, impression, etc.)
- **Équipe** : membres de l'organisation avec leurs rôles
- **Avis** : notes et commentaires des utilisateurs ayant interagi

#### Vitrine Professionnel (`/professionals/{slug}`)

```
┌──────────────────────────────────────────────────────────┐
│  [Avatar]  Marie Nguema, Correctrice    ★ 4.9 (15 avis) │
│  Correctrice · Libreville              ✓ Vérifié         │
│  "10 ans d'expérience en correction littéraire"          │
│  [Contacter]  [Demander un devis]                        │
├──────────────────────────────────────────────────────────┤
│  Services │ Portfolio │ Avis │ Disponibilité             │
├──────────────────────────────────────────────────────────┤
│  📊 Stats                                                │
│  47 projets terminés · Délai moyen 5j · 98% satisfaction │
│                                                          │
│  💼 Services proposés                                    │
│  Correction littéraire · 3 000 FCFA/page · 5-10 jours  │
│  Relecture finale    · 1 500 FCFA/page · 3-5 jours     │
│                                                          │
│  🎨 Portfolio                                            │
│  [Échantillon 1] [Échantillon 2] [Témoignage client]    │
└──────────────────────────────────────────────────────────┘
```

**Onglets :**
- **Services** : listings avec tarifs, délais, langues supportées
- **Portfolio** : échantillons de travaux passés
- **Avis** : notes et commentaires des clients
- **Disponibilité** : calendrier/statut (disponible, occupé, en vacances)

---

### Module 2 — Annuaire (Discovery)

Deux pages de découverte avec filtres puissants.

#### Annuaire Organisations (`/organizations`)

```
Filtres :
  - Type : Maison d'édition / Librairie / Imprimerie / Bibliothèque
  - Ville : Port-Gentil, Libreville, Franceville...
  - Genres acceptés : Roman, Poésie, Essai, Jeunesse...
  - Note minimum : ★3+ / ★4+ / ★4.5+
  - Statut : Vérifié uniquement / Accepte les manuscrits

Tri :
  - Mieux notés / Plus de publications / Plus récents / Plus de followers

Résultats : cartes cliquables → vitrine complète
```

#### Annuaire Professionnels (`/professionals`)

```
Filtres :
  - Métier : Correcteur / Illustrateur / Traducteur
  - Langue : Français, Anglais, Espagnol, Arabe...
  - Fourchette prix : 0-2000 / 2000-5000 / 5000+ FCFA
  - Note minimum : ★3+ / ★4+ / ★4.5+
  - Disponibilité : Disponible maintenant
  - Statut : Vérifié uniquement

Tri :
  - Mieux notés / Prix croissant / Délai le plus court / Plus de projets

Résultats : cartes cliquables → vitrine complète
```

---

### Module 3 — Soumission ciblée (Direct Connection)

Le flux actuel `Auteur → Admin → ???` devient `Auteur → Maison d'édition choisie`.

#### Nouveau flux de soumission

```
ÉTAPE 1 : L'auteur choisit sa cible
┌─────────────────────────────────────────────┐
│  Comment souhaitez-vous soumettre ?         │
│                                             │
│  [📋 À une maison d'édition spécifique]    │
│     → Choisir parmi l'annuaire             │
│                                             │
│  [🌐 Sur le marché ouvert]                 │
│     → Toutes les maisons d'édition         │
│     qui acceptent votre genre le verront   │
└─────────────────────────────────────────────┘

ÉTAPE 2 (si spécifique) : Sélection de la maison
┌─────────────────────────────────────────────┐
│  Maisons d'édition qui publient "Roman"     │
│                                             │
│  ☐ Éditions Frollot    ★4.7  Port-Gentil  │
│  ☐ Maison Étoile       ★4.2  Libreville   │
│  ☐ Presses du Golfe    ★3.9  Port-Gentil  │
│                                             │
│  [Soumettre à la sélection]                │
└─────────────────────────────────────────────┘

ÉTAPE 3 : Formulaire manuscrit (enrichi)
→ Le manuscrit arrive DIRECTEMENT chez la maison choisie
→ La maison reçoit une notification
→ La maison accepte/refuse ELLE-MÊME (plus d'admin intermédiaire)
```

#### Manuscrit sur le marché ouvert

Si l'auteur choisit "marché ouvert" :
- Le manuscrit est visible par toutes les maisons d'édition qui acceptent le genre correspondant
- Chaque maison d'édition peut exprimer son intérêt
- L'auteur choisit parmi les maisons intéressées
- C'est l'équivalent d'un "appel à projet" ouvert

---

### Module 4 — Réputation (Trust)

Le système de réputation est le moteur de confiance de la plateforme.

#### Avis Organisation (`OrganizationReview`)

Un utilisateur peut noter une organisation s'il a :
- Acheté un livre de cette organisation
- Soumis un manuscrit à cette organisation
- Utilisé un service de cette organisation
- Été membre de cette organisation

Champs : utilisateur, organisation, note (1-5), commentaire, date.

#### Avis Prestataire (`ServiceProviderReview`)

Un client peut noter un professionnel après la complétion d'un `ServiceOrder`.

Champs : utilisateur, prestataire (UserProfile), commande de service (FK), note (1-5), commentaire, date.

#### Statistiques calculées

Chaque vitrine affiche des métriques de confiance :

```
Organisation :
├── Note moyenne (★ 4.7/5)
├── Nombre d'avis (23 avis)
├── Livres publiés (42)
├── Temps de réponse moyen (3 jours)
└── Taux d'acceptation manuscrits (12%)

Professionnel :
├── Note moyenne (★ 4.9/5)
├── Nombre d'avis (15 avis)
├── Projets terminés (47)
├── Temps de réponse moyen (2 jours)
└── Taux de complétion (98%)
```

---

### Module 5 — Demandes de renseignement (Inquiry)

Avant de s'engager, un utilisateur peut poser une question structurée.

#### Exemples d'utilisation

```
Auteur → Maison d'édition :
  "Acceptez-vous les manuscrits bilingues français/anglais ?"

Éditeur → Correcteur :
  "Quel serait votre tarif pour un roman de 280 pages en français ?"

Lecteur → Librairie :
  "Avez-vous ce livre en stock dans votre magasin de Port-Gentil ?"
```

#### Fonctionnement

Ce n'est **pas un système de chat** (trop lourd à implémenter et modérer). C'est un formulaire structuré :

- L'expéditeur choisit une cible (organisation ou professionnel)
- Il rédige un sujet + message + pièce jointe optionnelle
- La cible reçoit une notification et peut répondre
- Statuts : `PENDING` → `ANSWERED` → `CLOSED`
- Historique consultable par les deux parties dans `/inquiries`

---

### Module 6 — Recommandation intelligente (Smart Matching)

La plateforme suggère les meilleurs correspondants en fonction du contexte.

#### Lors de la soumission d'un manuscrit

Quand un auteur indique genre "Roman" en français :

```
💡 Maisons d'édition recommandées pour votre manuscrit :

1. Éditions Frollot — ★4.7 — Spécialisée en romans africains
   42 livres publiés · Répond en 3 jours · Accepte les manuscrits

2. Maison Étoile — ★4.2 — Romans et nouvelles
   18 livres publiés · Répond en 7 jours · Accepte les manuscrits
```

#### Lors de la recherche de services

Quand un éditeur cherche un correcteur pour un roman en français :

```
💡 Correcteurs recommandés pour votre projet :

1. Marie Nguema — ★4.9 — Spécialiste romans
   3 000 FCFA/page · Délai 5 jours · 47 projets terminés

2. Paul Ondo — ★4.6 — Correction + relecture
   2 500 FCFA/page · Délai 7 jours · 23 projets terminés
```

#### Critères de matching

- Genre littéraire (manuscrit ↔ spécialités de l'organisation)
- Langue (manuscrit ↔ langues du prestataire)
- Budget (fourchette client ↔ tarifs du prestataire)
- Note moyenne (meilleurs d'abord)
- Disponibilité (préférer ceux qui acceptent activement)
- Proximité géographique (même ville en priorité)

---

## Parcours utilisateurs clés

### Parcours 1 : Auteur veut publier un livre

```
1. L'auteur parcourt l'annuaire des maisons d'édition
   → Filtre par genre "Roman", ville "Port-Gentil"
2. Il voit 3 maisons : profils, spécialités, catalogues, avis
3. Il compare : l'une a d'excellents avis pour les romans, l'autre pour la poésie
4. Il sélectionne "Éditions Frollot" → clique "Soumettre un manuscrit"
5. Il remplit le formulaire avec la maison pré-sélectionnée
6. La maison reçoit une notification → examine le manuscrit → accepte
7. Un EditorialProject est créé automatiquement
8. La maison engage des correcteurs/illustrateurs via la marketplace de services
```

### Parcours 2 : Maison d'édition cherche un correcteur

```
1. L'éditeur a un manuscrit accepté, il a besoin de correction
2. Il va dans l'annuaire des professionnels → filtre "Correcteur", "Français"
3. Il voit les prestataires : portfolios, tarifs, avis, disponibilité
4. Il sélectionne Marie Nguema → envoie une demande de devis
5. Marie répond avec un devis → l'éditeur accepte
6. Le travail commence, livrable uploadé, paiement via wallet
```

### Parcours 3 : Lecteur découvre une maison d'édition

```
1. Le lecteur trouve un livre qu'il aime sur Frollot
2. Il clique sur le nom de l'éditeur → découvre la vitrine
3. Il voit tout le catalogue, la mission, les autres auteurs
4. Il suit la maison d'édition → reçoit des notifications
5. Il laisse un avis sur l'organisation
```

### Parcours 4 : Correctrice freelance attire des clients

```
1. Marie crée un profil professionnel (Correctrice)
2. Elle crée ses listings de services (Correction, Relecture)
3. Elle ajoute des échantillons de travail à son portfolio
4. Son profil apparaît dans l'annuaire des professionnels
5. Elle est trouvée par des éditeurs et auteurs
6. Elle reçoit des demandes → envoie des devis → construit sa réputation
```

---

## Changements techniques

### Backend — Modèles à modifier

| Modèle | Changement | Raison |
|--------|-----------|--------|
| `Organization` | + `accepted_genres` (JSONField, liste de genres acceptés) | Filtrage par spécialité |
| `Organization` | + `submission_guidelines` (TextField) | Guide de soumission affiché sur la vitrine |
| `Organization` | + `is_accepting_manuscripts` (BooleanField, default=False) | Toggle pour accepter/refuser les soumissions |
| `Organization` | + `specialties` (JSONField) | Domaines d'expertise |
| `Organization` | + `avg_rating` (DecimalField, default=0) | Note moyenne (dénormalisée) |
| `Organization` | + `review_count` (IntegerField, default=0) | Nombre d'avis (dénormalisé) |
| `Organization` | + `avg_response_days` (IntegerField, null=True) | Temps de réponse moyen (calculé) |
| `Manuscript` | + `target_organization` (FK Organization, nullable, blank) | Soumission ciblée à une maison d'édition |
| `Manuscript` | + `is_open_market` (BooleanField, default=False) | Soumission ouverte à toutes les maisons |
| `UserProfile` | + `avg_rating` (DecimalField, default=0) | Note moyenne prestataire |
| `UserProfile` | + `review_count` (IntegerField, default=0) | Nombre d'avis prestataire |
| `UserProfile` | + `completed_projects` (IntegerField, default=0) | Compteur projets terminés |
| `UserProfile` | + `avg_response_days` (IntegerField, null=True) | Temps de réponse moyen |
| `ServiceListing` | + `organization` (FK Organization, nullable, blank) | Permettre aux organisations de proposer des services |

### Backend — Nouveaux modèles

#### `OrganizationReview`

```python
class OrganizationReview(models.Model):
    user          = ForeignKey(User, on_delete=CASCADE, related_name='org_reviews')
    organization  = ForeignKey(Organization, on_delete=CASCADE, related_name='reviews')
    rating        = IntegerField(validators=[MinValue(1), MaxValue(5)])
    comment       = TextField(blank=True)
    created_at    = DateTimeField(auto_now_add=True)
    updated_at    = DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('user', 'organization')  # Un avis par utilisateur par org
```

#### `ServiceProviderReview`

```python
class ServiceProviderReview(models.Model):
    user           = ForeignKey(User, on_delete=CASCADE, related_name='provider_reviews')
    provider       = ForeignKey(UserProfile, on_delete=CASCADE, related_name='reviews')
    service_order  = ForeignKey(ServiceOrder, on_delete=SET_NULL, null=True, blank=True)
    rating         = IntegerField(validators=[MinValue(1), MaxValue(5)])
    comment        = TextField(blank=True)
    created_at     = DateTimeField(auto_now_add=True)
    updated_at     = DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('user', 'provider')  # Un avis par utilisateur par prestataire
```

#### `Inquiry`

```python
class Inquiry(models.Model):
    STATUS_CHOICES = [
        ('PENDING', 'En attente'),
        ('ANSWERED', 'Répondu'),
        ('CLOSED', 'Fermé'),
    ]

    sender          = ForeignKey(User, on_delete=CASCADE, related_name='sent_inquiries')
    target_org      = ForeignKey(Organization, on_delete=CASCADE, null=True, blank=True, related_name='received_inquiries')
    target_profile  = ForeignKey(UserProfile, on_delete=CASCADE, null=True, blank=True, related_name='received_inquiries')
    subject         = CharField(max_length=300)
    message         = TextField()
    attachment      = FileField(upload_to='inquiries/', null=True, blank=True)
    response        = TextField(blank=True)
    responded_by    = ForeignKey(User, on_delete=SET_NULL, null=True, blank=True, related_name='inquiry_responses')
    status          = CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING')
    created_at      = DateTimeField(auto_now_add=True)
    responded_at    = DateTimeField(null=True, blank=True)
```

### Backend — Nouveaux endpoints API

```
# Annuaire Organisations
GET  /api/organizations/directory/              — Liste filtrable (type, ville, genre, note, accepte_manuscrits)
GET  /api/organizations/{slug}/storefront/      — Vitrine publique complète (about, stats, genres, guidelines)
GET  /api/organizations/{slug}/catalog/         — Livres publiés par cette organisation
GET  /api/organizations/{slug}/team/            — Membres publics de l'organisation
GET  /api/organizations/{slug}/reviews/         — Avis sur cette organisation
POST /api/organizations/{slug}/reviews/         — Laisser un avis (authentifié)

# Annuaire Professionnels
GET  /api/professionals/                        — Liste filtrable (métier, langue, prix, note, dispo)
GET  /api/professionals/{slug}/                 — Vitrine pro complète (services, portfolio, stats)
GET  /api/professionals/{slug}/reviews/         — Avis sur ce prestataire
POST /api/professionals/{slug}/reviews/         — Laisser un avis (authentifié, après ServiceOrder)

# Demandes de renseignement
POST /api/inquiries/                            — Envoyer une demande
GET  /api/inquiries/                            — Mes demandes (envoyées + reçues)
GET  /api/inquiries/{id}/                       — Détail d'une demande
PATCH /api/inquiries/{id}/respond/              — Répondre à une demande

# Soumission manuscrit enrichie
GET  /api/manuscripts/recommendations/          — Maisons recommandées selon le genre du manuscrit
POST /api/manuscripts/submit/                   — Soumission (enrichie avec target_organization)

# Smart matching
GET  /api/services/recommendations/             — Prestataires recommandés selon le besoin
```

### Frontend — Nouvelles pages

| Page | Route | Description |
|------|-------|-------------|
| Annuaire Organisations | `/organizations` | Grille filtrée de toutes les organisations |
| Vitrine Organisation | `/organizations/{slug}` | Page publique avec 5 onglets (About, Catalogue, Services, Équipe, Avis) |
| Annuaire Professionnels | `/professionals` | Grille filtrée de tous les prestataires |
| Vitrine Professionnel | `/professionals/{slug}` | Page publique avec 4 onglets (Services, Portfolio, Avis, Disponibilité) |
| Soumission ciblée | `/submit-manuscript` (enrichie) | Étape de sélection de maison d'édition avant le formulaire |
| Mes demandes | `/inquiries` | Liste des demandes envoyées et reçues |
| Détail demande | `/inquiries/{id}` | Conversation structurée (demande + réponse) |

### Frontend — Pages existantes à modifier

| Page | Modification |
|------|-------------|
| Home (`/`) | Section "Maisons d'édition" → lien vers l'annuaire au lieu de `/about` |
| BookDetail (`/books/{id}`) | Lien vers la vitrine de l'organisation éditrice |
| Services (`/services`) | Intégration avec l'annuaire des professionnels |
| Dashboard Org | Formulaire de gestion de la vitrine (guidelines, genres, toggle manuscrits) |
| Dashboard Pro | Formulaire de gestion du portfolio et de la disponibilité |

---

## Ordre d'implémentation

| Phase | Contenu | Livrable | Valeur immédiate |
|-------|---------|----------|-----------------|
| **Phase A** | Modèles backend (Organization enrichi, OrganizationReview, ServiceProviderReview, Inquiry, Manuscript.target_org) + migrations | Fondation | Base de données prête |
| **Phase B** | Endpoints API (directory, storefront, reviews, inquiries, recommendations) + serializers | API complète | API testable via Postman |
| **Phase C** | Pages frontend — Annuaire organisations + Vitrine organisation (5 onglets) | Vitrines orgs | Les maisons d'édition sont découvrables |
| **Phase D** | Pages frontend — Annuaire professionnels + Vitrine professionnel (4 onglets) | Vitrines pros | Les prestataires sont découvrables |
| **Phase E** | Soumission ciblée — Refonte du formulaire manuscrit avec sélection d'éditeur | Connexion directe | Les auteurs choisissent leur éditeur |
| **Phase F** | Réputation — Avis orgs + pros, stats vitrine, smart matching | Confiance | Comparaison et confiance |

**Chaque phase est déployable indépendamment** — la Phase C seule apporte déjà une valeur énorme.

---

## Relations entre les modèles (vue d'ensemble)

```
User (AbstractUser)
├── profiles → UserProfile[] (LECTEUR, AUTEUR, CORRECTEUR, ILLUSTRATEUR, TRADUCTEUR, LIVREUR)
│   ├── service_listings → ServiceListing[] (offres de services)
│   ├── reviews → ServiceProviderReview[] (avis reçus)
│   └── received_inquiries → Inquiry[] (demandes reçues)
├── owned_organizations → Organization[] (organisations possédées)
├── organization_memberships → OrganizationMembership[] (appartenances)
├── submitted_manuscripts → Manuscript[] (manuscrits soumis)
├── sent_inquiries → Inquiry[] (demandes envoyées)
└── org_reviews → OrganizationReview[] (avis laissés sur des orgs)

Organization
├── memberships → OrganizationMembership[] (équipe)
├── invitations → Invitation[] (invitations envoyées)
├── editorial_projects → EditorialProject[] (projets éditoriaux)
├── reviews → OrganizationReview[] (avis reçus)
├── received_inquiries → Inquiry[] (demandes reçues)
├── received_manuscripts → Manuscript[] (manuscrits ciblés)  ← NOUVEAU
└── service_listings → ServiceListing[] (services proposés)  ← NOUVEAU

Manuscript
├── submitter → User (auteur)
├── target_organization → Organization (nullable)  ← NOUVEAU
└── editorial_projects → EditorialProject[]

ServiceListing
├── provider → UserProfile (prestataire individuel)
├── organization → Organization (nullable)  ← NOUVEAU
└── requests → ServiceRequest[]

Inquiry  ← NOUVEAU
├── sender → User
├── target_org → Organization (nullable)
└── target_profile → UserProfile (nullable)

OrganizationReview  ← NOUVEAU
├── user → User
└── organization → Organization

ServiceProviderReview  ← NOUVEAU
├── user → User
├── provider → UserProfile
└── service_order → ServiceOrder (nullable)
```

---

## Résumé

Cette architecture transforme Frollot d'un **intermédiaire centralisé** en une **plateforme de mise en relation** où :

1. **Chaque acteur a une vitrine** pour présenter ses offres et attirer des clients
2. **La découverte est facile** grâce aux annuaires filtrables et au smart matching
3. **La connexion est directe** : auteur → éditeur, éditeur → correcteur, sans passer par l'admin
4. **La confiance est mesurable** via les avis, notes et statistiques de réputation
5. **La communication est structurée** via les demandes de renseignement

Le tout en **6 phases déployables indépendamment**, chacune apportant de la valeur immédiate.
