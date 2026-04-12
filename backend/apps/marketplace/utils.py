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
    'DELIVERED': 'livrée',
    'CANCELLED': 'annulée',
}

# Étape suivante attendue par statut (pour les messages d'aide)
NEXT_STEP_HINT = {
    'PENDING': 'Vous devez d\'abord confirmer la commande.',
    'CONFIRMED': 'Passez la commande en préparation.',
    'PREPARING': 'Marquez la commande comme prête quand le colis est emballé.',
    'READY': 'Le livreur doit récupérer le colis et marquer l\'expédition.',
    'SHIPPED': 'Le livreur doit confirmer la remise au client.',
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
