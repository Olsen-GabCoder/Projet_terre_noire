"""
Signaux de la boucle de retour Quote → Manuscript.

Quand le statut d'un devis DQE lié à un manuscrit change, ces signaux
propagent les conséquences vers le manuscrit et, si nécessaire, créent
le projet éditorial. Tout est enveloppé dans une transaction atomique
pour garantir la cohérence : si une étape échoue, tout est annulé.
"""
import logging

from django.db import transaction
from django.db.models.signals import pre_save
from django.dispatch import receiver

logger = logging.getLogger(__name__)


@receiver(pre_save, sender='services.Quote')
def on_quote_status_change(sender, instance, **kwargs):
    """
    Détecte un changement de statut sur un devis DQE lié à un manuscrit
    et déclenche la réaction appropriée.
    """
    # Ignorer les devis non liés à un manuscrit
    if not instance.manuscript_id:
        return

    # Ignorer les créations (pas encore en base)
    if instance.pk is None:
        return

    # Récupérer l'ancien statut depuis la base
    try:
        old = sender.objects.only('status').get(pk=instance.pk)
    except sender.DoesNotExist:
        return

    old_status = old.status
    new_status = instance.status

    if old_status == new_status:
        return

    # Utiliser transaction.on_commit pour exécuter APRÈS le save du Quote
    # afin que le nouveau statut soit bien persisté en base.
    manuscript_id = instance.manuscript_id
    quote_pk = instance.pk
    provider_org_id = instance.provider_organization_id

    if new_status == 'ACCEPTED':
        transaction.on_commit(
            lambda: _handle_quote_accepted(manuscript_id, quote_pk, provider_org_id)
        )
    elif new_status == 'REJECTED':
        transaction.on_commit(
            lambda: _handle_quote_rejected(manuscript_id)
        )
    elif new_status == 'EXPIRED':
        transaction.on_commit(
            lambda: _handle_quote_expired(manuscript_id)
        )
    elif new_status == 'REVISION_REQUESTED':
        transaction.on_commit(
            lambda: _handle_quote_revision_requested(manuscript_id)
        )


def _handle_quote_accepted(manuscript_id, accepted_quote_pk, provider_org_id):
    """
    Un devis a été accepté par l'auteur.
    Transaction atomique : passage du manuscrit en ACCEPTED + création du projet éditorial.
    En marché ouvert : annulation des devis concurrents + notification.
    """
    from apps.manuscripts.models import Manuscript
    from apps.services.models import Quote, EditorialProject

    from django.utils import timezone

    with transaction.atomic():
        manuscript = Manuscript.objects.select_for_update().get(pk=manuscript_id)
        accepted_quote = Quote.objects.get(pk=accepted_quote_pk)

        # 1. Passer le manuscrit en ACCEPTED
        manuscript.status = 'ACCEPTED'
        manuscript.reviewed_at = timezone.now()
        manuscript.save(update_fields=['status', 'reviewed_at'])

        # 2. Créer le projet éditorial
        if provider_org_id:
            project = EditorialProject.objects.create(
                manuscript=manuscript,
                organization_id=provider_org_id,
                title=manuscript.title,
                description=(
                    f"Projet éditorial créé automatiquement suite à l'acceptation "
                    f"du devis {accepted_quote.reference} "
                    f"(modèle : {accepted_quote.get_publishing_model_display()})."
                ),
                status='DRAFT',
            )
            logger.info(
                "Manuscrit %s accepté (devis %s). Projet éditorial créé : id=%s.",
                manuscript_id, accepted_quote_pk, project.id,
            )
        else:
            logger.warning(
                "Devis %s accepté sans provider_organization — "
                "projet éditorial NON créé. Le devis doit être réparé manuellement.",
                accepted_quote_pk,
            )

        # 3. Annuler les devis concurrents (marché ouvert)
        if manuscript.is_open_market:
            competing_quotes = Quote.objects.filter(
                manuscript=manuscript,
                status__in=['DRAFT', 'SENT', 'REVISION_REQUESTED'],
            ).exclude(pk=accepted_quote_pk)

            cancelled_org_ids = list(
                competing_quotes.exclude(
                    provider_organization__isnull=True
                ).values_list('provider_organization_id', flat=True).distinct()
            )

            competing_quotes.update(
                status='CANCELLED',
                rejection_reason="Un autre devis a été accepté par l'auteur.",
            )

            # 4. Notifier les maisons écartées (hors transaction pour ne pas bloquer)
            if cancelled_org_ids:
                transaction.on_commit(
                    lambda: _notify_cancelled_orgs(manuscript_id, cancelled_org_ids)
                )


def _handle_quote_rejected(manuscript_id):
    """
    Un devis a été refusé. Si tous les devis liés sont terminaux,
    passer le manuscrit en QUOTE_REJECTED.
    """
    from apps.manuscripts.models import Manuscript

    try:
        manuscript = Manuscript.objects.get(pk=manuscript_id)

        if manuscript.status not in ('QUOTE_SENT', 'COUNTER_PROPOSAL'):
            return

        if manuscript._all_quotes_terminal():
            manuscript.status = 'QUOTE_REJECTED'
            manuscript.save(update_fields=['status'])
            logger.info("Manuscrit %s passé en QUOTE_REJECTED (tous devis refusés).", manuscript_id)

    except Exception:
        logger.exception("Erreur handle_quote_rejected pour manuscrit %s.", manuscript_id)


def _handle_quote_expired(manuscript_id):
    """
    Un devis a expiré. Si tous les devis liés sont terminaux,
    repasser le manuscrit en REVIEWING.
    """
    from apps.manuscripts.models import Manuscript

    try:
        manuscript = Manuscript.objects.get(pk=manuscript_id)

        if manuscript.status not in ('QUOTE_SENT', 'COUNTER_PROPOSAL'):
            return

        if manuscript._all_quotes_terminal():
            manuscript.status = 'REVIEWING'
            manuscript.save(update_fields=['status'])
            logger.info("Manuscrit %s repassé en REVIEWING (tous devis expirés).", manuscript_id)

    except Exception:
        logger.exception("Erreur handle_quote_expired pour manuscrit %s.", manuscript_id)


def _handle_quote_revision_requested(manuscript_id):
    """
    L'auteur demande une révision du devis.
    Passer le manuscrit en COUNTER_PROPOSAL s'il était en QUOTE_SENT.
    """
    from apps.manuscripts.models import Manuscript

    try:
        manuscript = Manuscript.objects.get(pk=manuscript_id)

        if manuscript.status == 'QUOTE_SENT':
            manuscript.status = 'COUNTER_PROPOSAL'
            manuscript.save(update_fields=['status'])
            logger.info("Manuscrit %s passé en COUNTER_PROPOSAL.", manuscript_id)

    except Exception:
        logger.exception("Erreur handle_quote_revision_requested pour manuscrit %s.", manuscript_id)


def _notify_cancelled_orgs(manuscript_id, org_ids):
    """
    Envoie une notification aux maisons d'édition dont le devis a été
    annulé parce que l'auteur a choisi une autre offre.
    """
    from apps.manuscripts.models import Manuscript
    from apps.organizations.models import Organization
    from apps.core.email import send_templated_email

    try:
        manuscript = Manuscript.objects.get(pk=manuscript_id)
        orgs = Organization.objects.filter(pk__in=org_ids, email__isnull=False).exclude(email='')

        for org in orgs:
            context = {
                'org_name': org.name,
                'author_name': manuscript.author_name,
                'title': manuscript.title,
                'reference': f"MS-{manuscript.id:05d}",
                'frontend_url': getattr(
                    __import__('django.conf', fromlist=['settings']).settings,
                    'FRONTEND_URL', ''
                ),
            }
            send_templated_email(
                subject=f"Devis non retenu pour « {manuscript.title} » — Frollot",
                template_name='manuscript_quote_cancelled',
                context=context,
                to_emails=[org.email],
            )

    except Exception:
        logger.exception("Erreur notification orgs annulées pour manuscrit %s.", manuscript_id)
