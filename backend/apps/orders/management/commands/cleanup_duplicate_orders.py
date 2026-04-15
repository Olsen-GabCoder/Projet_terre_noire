"""
Management command : détecte et supprime les commandes en doublon.

Critères de doublon :
  - même utilisateur
  - créées dans les N secondes l'une de l'autre (défaut : 60)
  - exactement le même panier (mêmes book_id + listing_id + quantity)

Utilisation :
  python manage.py cleanup_duplicate_orders              # dry-run (aucune suppression)
  python manage.py cleanup_duplicate_orders --apply      # suppression effective
  python manage.py cleanup_duplicate_orders --window 120 # fenêtre de 2 minutes
"""
from collections import defaultdict

from django.core.management.base import BaseCommand

from apps.orders.models import Order


class Command(BaseCommand):
    help = (
        "Détecte les commandes en doublon (même user, même panier, créées dans "
        "un intervalle de temps court). Par défaut : dry-run. "
        "Utilisez --apply pour supprimer les doublons détectés."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            '--apply',
            action='store_true',
            default=False,
            help='Effectuer la suppression (sans ce flag : simulation seule).',
        )
        parser.add_argument(
            '--window',
            type=int,
            default=60,
            help='Fenêtre de détection en secondes (défaut : 60).',
        )

    def handle(self, *args, **options):
        apply = options['apply']
        window = options['window']

        if not apply:
            self.stdout.write(self.style.WARNING(
                f"[DRY-RUN] Simulation — aucune suppression.\n"
                f"Relancez avec --apply pour supprimer réellement.\n"
            ))

        # Charger les commandes non livrées triées par user et date de création
        orders = (
            Order.objects
            .filter(status__in=['PENDING', 'PAID', 'CANCELLED'])
            .prefetch_related('items')
            .order_by('user_id', 'created_at')
        )

        by_user = defaultdict(list)
        for order in orders:
            by_user[order.user_id].append(order)

        total_groups = 0
        ids_to_delete = []

        for user_id, user_orders in by_user.items():
            for i, order_a in enumerate(user_orders):
                if order_a.id in ids_to_delete:
                    # order_a est déjà marqué comme doublon, on le saute
                    continue

                for order_b in user_orders[i + 1:]:
                    delta = (order_b.created_at - order_a.created_at).total_seconds()
                    if delta > window:
                        # Les commandes suivantes sont encore plus loin — arrêt
                        break

                    if order_b.id in ids_to_delete:
                        continue

                    cart_a = self._cart_fingerprint(order_a)
                    cart_b = self._cart_fingerprint(order_b)

                    if cart_a is None or cart_a != cart_b:
                        continue

                    # Doublon confirmé : garder order_a (la plus ancienne)
                    total_groups += 1
                    ids_to_delete.append(order_b.id)

                    self.stdout.write(
                        f"\n[DOUBLON #{total_groups}] User ID={user_id}\n"
                        f"  Garder   : Commande #{order_a.id} "
                        f"— {order_a.created_at.strftime('%Y-%m-%d %H:%M:%S')} "
                        f"(statut : {order_a.status})\n"
                        f"  Supprimer: Commande #{order_b.id} "
                        f"— {order_b.created_at.strftime('%Y-%m-%d %H:%M:%S')} "
                        f"(statut : {order_b.status})\n"
                        f"  Panier   : {cart_a}"
                    )

        if total_groups == 0:
            self.stdout.write(self.style.SUCCESS("\nAucun doublon détecté."))
            return

        self.stdout.write(
            f"\n{'='*60}\n"
            f"{total_groups} doublon(s) détecté(s), "
            f"{len(ids_to_delete)} commande(s) à supprimer.\n"
        )

        if not apply:
            self.stdout.write(self.style.WARNING(
                "[DRY-RUN] Aucune suppression effectuée.\n"
                "Relancez avec --apply pour supprimer les doublons."
            ))
        else:
            deleted_count, _ = Order.objects.filter(id__in=ids_to_delete).delete()
            self.stdout.write(self.style.SUCCESS(
                f"[APPLY] {deleted_count} commande(s) supprimée(s) avec succès."
            ))

    def _cart_fingerprint(self, order):
        """
        Empreinte du panier : tuple trié de (book_id, listing_id, quantity).
        Retourne None si le panier est vide (commande orpheline).
        """
        items = list(
            order.items.values('book_id', 'listing_id', 'quantity')
            .order_by('book_id', 'listing_id')
        )
        if not items:
            return None
        return tuple(
            (i['book_id'], i['listing_id'], i['quantity']) for i in items
        )
