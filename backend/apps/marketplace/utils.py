"""Utilitaires métier de la marketplace."""


# Transitions autorisées par type d'acteur : (current_status, new_status) → set of actor_types
# actor_type: 'vendor', 'delivery', 'admin'
ALLOWED_TRANSITIONS = {
    ('PENDING', 'CONFIRMED'):   {'vendor', 'admin'},
    ('PENDING', 'CANCELLED'):   {'vendor', 'admin'},
    ('CONFIRMED', 'PREPARING'): {'vendor', 'admin'},
    ('CONFIRMED', 'CANCELLED'): {'vendor', 'admin'},
    ('PREPARING', 'READY'):     {'vendor', 'admin'},
    ('PREPARING', 'CANCELLED'): {'vendor', 'admin'},
    ('READY', 'SHIPPED'):       {'delivery', 'admin'},
    ('READY', 'CANCELLED'):     {'admin'},
    ('SHIPPED', 'DELIVERED'):   {'delivery', 'admin'},
    ('SHIPPED', 'ATTEMPTED'):   {'delivery', 'admin'},
    ('ATTEMPTED', 'SHIPPED'):   {'delivery', 'admin'},
    ('ATTEMPTED', 'DELIVERED'): {'delivery', 'admin'},
    ('ATTEMPTED', 'CANCELLED'): {'admin'},
}

# Statuts terminaux — aucune transition sortante
TERMINAL_STATUSES = {'DELIVERED', 'CANCELLED'}

# Labels lisibles pour les messages utilisateur
STATUS_LABELS = {
    'PENDING': 'en attente',
    'CONFIRMED': 'confirmée',
    'PREPARING': 'en préparation',
    'READY': 'prête pour livraison',
    'SHIPPED': 'expédiée',
    'ATTEMPTED': 'tentative de livraison échouée',
    'DELIVERED': 'livrée',
    'CANCELLED': 'annulée',
}

NEXT_STEP_HINT = {
    'PENDING': 'Vous devez d\'abord confirmer la commande.',
    'CONFIRMED': 'Passez la commande en préparation.',
    'PREPARING': 'Marquez la commande comme prête quand le colis est emballé.',
    'READY': 'Le livreur doit récupérer le colis et marquer l\'expédition.',
    'SHIPPED': 'Le livreur doit confirmer la remise au client.',
    'ATTEMPTED': 'Le livreur peut réessayer (SHIPPED) ou confirmer la remise (DELIVERED).',
}


def validate_suborder_transition(current_status, new_status, actor_type):
    """
    Valide une transition de statut SubOrder.

    Returns:
        (True, None) si la transition est valide
        (False, error_message) sinon — message lisible pour l'utilisateur final
    """
    current_label = STATUS_LABELS.get(current_status, current_status)
    new_label = STATUS_LABELS.get(new_status, new_status)

    if current_status == new_status:
        return False, f"Cette sous-commande est déjà « {current_label} »."

    if current_status in TERMINAL_STATUSES:
        return False, (
            f"Cette sous-commande est « {current_label} » et ne peut plus être modifiée."
        )

    key = (current_status, new_status)
    allowed_actors = ALLOWED_TRANSITIONS.get(key)

    if allowed_actors is None:
        hint = NEXT_STEP_HINT.get(current_status, '')
        return False, (
            f"Impossible de passer directement de « {current_label} » à « {new_label} ». "
            f"{hint}"
        )

    # B4 : le système peut forcer DELIVERED depuis tout statut non-terminal (ebooks auto-delivered)
    if actor_type == 'system' and new_status == 'DELIVERED':
        return True, None

    if actor_type not in allowed_actors:
        actor_labels = {
            'vendor': 'le vendeur',
            'delivery': 'le livreur',
            'admin': 'un administrateur',
        }
        allowed_labels = ' ou '.join(actor_labels.get(a, a) for a in sorted(allowed_actors))
        return False, (
            f"Seul {allowed_labels} peut effectuer cette action."
        )

    return True, None


# Descriptions lisibles pour le journal d'activité (C3)
TRANSITION_DESCRIPTIONS = {
    ('PENDING', 'CONFIRMED'): 'Le vendeur a confirmé la commande',
    ('CONFIRMED', 'PREPARING'): 'Le vendeur prépare la commande',
    ('PREPARING', 'READY'): 'La commande est prête, en attente du livreur',
    ('READY', 'SHIPPED'): 'Le livreur a pris en charge le colis',
    ('SHIPPED', 'DELIVERED'): 'Le colis a été remis au client',
    ('SHIPPED', 'ATTEMPTED'): 'Tentative de livraison échouée',
    ('ATTEMPTED', 'SHIPPED'): 'Nouvelle tentative de livraison en cours',
    ('ATTEMPTED', 'DELIVERED'): 'Le colis a été remis au client après tentative(s)',
    ('PENDING', 'CANCELLED'): 'Commande annulée',
    ('CONFIRMED', 'CANCELLED'): 'Commande annulée par le vendeur',
    ('PREPARING', 'CANCELLED'): 'Commande annulée pendant la préparation',
    ('READY', 'CANCELLED'): "Commande annulée par l'administrateur",
    ('ATTEMPTED', 'CANCELLED'): 'Commande annulée après tentatives échouées',
}


def get_transition_description(from_status, to_status, actor_type='system'):
    """Retourne une description lisible pour le journal d'activité."""
    desc = TRANSITION_DESCRIPTIONS.get((from_status, to_status))
    if desc:
        return desc
    from_label = STATUS_LABELS.get(from_status, from_status)
    to_label = STATUS_LABELS.get(to_status, to_status)
    actor_labels = {
        'vendor': 'le vendeur', 'delivery': 'le livreur',
        'admin': "l'administrateur", 'client': 'le client', 'system': 'le système',
    }
    return f"Statut passé de « {from_label} » à « {to_label} » par {actor_labels.get(actor_type, actor_type)}"
