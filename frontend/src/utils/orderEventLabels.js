/**
 * Traduction des descriptions techniques d'événements de commande
 * en texte lisible pour l'utilisateur final.
 */

const TRANSITION_LABELS = {
  'PENDING → CONFIRMED': 'Le vendeur a confirmé la commande',
  'CONFIRMED → PREPARING': 'Le vendeur prépare la commande',
  'PREPARING → READY': 'La commande est prête, en attente du livreur',
  'READY → SHIPPED': 'Le livreur a pris en charge le colis',
  'SHIPPED → DELIVERED': 'Le colis a été remis au client',
  'SHIPPED → ATTEMPTED': 'Tentative de livraison échouée',
  'ATTEMPTED → SHIPPED': 'Nouvelle tentative de livraison en cours',
  'ATTEMPTED → DELIVERED': 'Le colis a été remis au client',
  'PENDING → CANCELLED': 'Commande annulée',
  'CONFIRMED → CANCELLED': 'Commande annulée par le vendeur',
  'PREPARING → CANCELLED': 'Commande annulée pendant la préparation',
  'READY → CANCELLED': "Commande annulée par l'administrateur",
  'ATTEMPTED → CANCELLED': 'Commande annulée après tentatives échouées',
};

const ACTOR_LABELS = {
  vendor: 'Vendeur',
  delivery: 'Livreur',
  admin: 'Administrateur',
  client: 'Client',
  system: 'Système',
};

export function humanizeDescription(evt) {
  // Si le backend a déjà envoyé un texte lisible, on le garde
  if (!evt.description.includes('→') && !evt.description.includes('SubOrder #')) {
    return evt.description;
  }
  // Traduire via from_status/to_status
  if (evt.from_status && evt.to_status) {
    const key = `${evt.from_status} → ${evt.to_status}`;
    if (TRANSITION_LABELS[key]) return TRANSITION_LABELS[key];
  }
  return evt.event_type_display || evt.description;
}

export function humanizeActorRole(role) {
  return ACTOR_LABELS[role] || role || 'Système';
}
