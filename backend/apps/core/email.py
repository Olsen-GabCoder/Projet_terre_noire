"""
Service d'envoi d'emails pour Frollot.
Centralise l'envoi des notifications (commandes, newsletter, contact, etc.).
"""
import base64
import logging
import mimetypes

from django.conf import settings
from django.core.mail import send_mail, EmailMultiAlternatives
from django.template.loader import render_to_string
from django.utils.html import strip_tags

logger = logging.getLogger(__name__)


def _get_logo_base64():
    """
    Encode le logo en base64 pour affichage inline dans les emails.
    Limite la taille à 50 KB pour éviter le clipping Gmail (102 KB max).
    Si le fichier est trop gros, retourne None (on utilisera logo_url à la place).
    """
    MAX_LOGO_BYTES = 50_000  # 50 KB max (~67 KB en base64)
    logo_path = getattr(settings, 'LOGO_PATH', None)
    if logo_path and hasattr(logo_path, 'exists') and logo_path.exists():
        try:
            if logo_path.stat().st_size > MAX_LOGO_BYTES:
                return None
            data = logo_path.read_bytes()
            mime_type = mimetypes.guess_type(str(logo_path))[0] or 'image/png'
            return f"data:{mime_type};base64,{base64.b64encode(data).decode('ascii')}"
        except Exception:
            pass
    return None


def send_templated_email(subject, template_name, context, to_emails, attachments=None, fail_silently=True):
    """
    Envoie un email à partir d'un template HTML.
    Génère aussi une version texte pour les clients qui ne supportent pas le HTML.
    attachments: liste de tuples (filename, content, mimetype) ou (filename, content)
    """
    if not to_emails:
        return False
    if isinstance(to_emails, str):
        to_emails = [to_emails]

    try:
        logo_base64 = _get_logo_base64()
        ctx = {
            **context,
            'logo_base64': logo_base64,
            'logo_url': getattr(settings, 'LOGO_URL', None) or f"{settings.FRONTEND_URL}/images/logo_frollot.png",
        }
        html_content = render_to_string(f'emails/{template_name}.html', ctx)
        # Supprimer les balises <style> avant strip_tags (au cas ou)
        import re
        clean_html = re.sub(r'<style[^>]*>.*?</style>', '', html_content, flags=re.DOTALL)
        text_content = re.sub(r'\n{3,}', '\n\n', strip_tags(clean_html)).strip()
        msg = EmailMultiAlternatives(
            subject=subject,
            body=text_content,
            from_email=settings.DEFAULT_FROM_EMAIL,
            to=to_emails,
        )
        msg.attach_alternative(html_content, 'text/html')
        if attachments:
            for att in attachments:
                filename = att[0]
                content = att[1].getvalue() if hasattr(att[1], 'getvalue') else (att[1].read() if hasattr(att[1], 'read') else att[1])
                mimetype = att[2] if len(att) >= 3 else 'application/pdf'
                msg.attach(filename, content, mimetype)
        msg.send(fail_silently=fail_silently)
        logger.info(f"Email envoyé: {subject} -> {to_emails}")
        return True
    except Exception as e:
        logger.exception(f"Erreur envoi email {subject}: {e}")
        if not fail_silently:
            raise
        return False


def send_order_confirmation(order):
    """Email de confirmation de commande avec facture PDF en pièce jointe."""
    from apps.orders.models import Order
    from apps.core.invoice import generate_order_invoice_pdf

    order = Order.objects.prefetch_related('items__book').get(pk=order.pk)
    items = []
    for item in order.items.all():
        items.append({
            'title': item.book.title,
            'quantity': item.quantity,
            'price': float(item.price),
            'total': float(item.price * item.quantity),
        })
    context = {
        'order': order,
        'user': order.user,
        'items': items,
        'subtotal': float(order.subtotal),
        'shipping_cost': float(order.shipping_cost),
        'discount_amount': float(order.discount_amount or 0),
        'total_amount': float(order.total_amount),
        'frontend_url': settings.FRONTEND_URL,
        'invoice_url': f"{settings.FRONTEND_URL}/orders",
    }
    # Générer la facture PDF en pièce jointe
    attachments = []
    try:
        pdf_buffer = generate_order_invoice_pdf(order)
        attachments.append((
            f"facture-commande-{order.id:06d}.pdf",
            pdf_buffer,
            'application/pdf',
        ))
    except Exception as e:
        logger.warning(f"Impossible de générer la facture PDF pour commande #{order.id}: {e}")

    subject = f"Confirmation de commande #{order.id:06d} — Frollot"
    return send_templated_email(
        subject, 'order_confirmation', context, [order.user.email],
        attachments=attachments or None,
    )


def send_order_paid(order):
    """Email de confirmation de paiement avec facture PDF en pièce jointe."""
    from apps.orders.models import Order
    from apps.core.invoice import generate_order_invoice_pdf

    order = Order.objects.prefetch_related('items__book').get(pk=order.pk)
    items = []
    for item in order.items.all():
        items.append({
            'title': item.book.title,
            'quantity': item.quantity,
            'total': float(item.price * item.quantity),
        })
    context = {
        'order': order,
        'user': order.user,
        'items': items,
        'total_amount': float(order.total_amount),
        'frontend_url': settings.FRONTEND_URL,
    }
    # Générer la facture PDF en pièce jointe
    attachments = []
    try:
        pdf_buffer = generate_order_invoice_pdf(order)
        attachments.append((
            f"facture-commande-{order.id:06d}.pdf",
            pdf_buffer,
            'application/pdf',
        ))
    except Exception as e:
        logger.warning(f"Impossible de générer la facture PDF pour commande #{order.id}: {e}")

    subject = f"Paiement recu — Commande #{order.id:06d} — Frollot"
    return send_templated_email(
        subject, 'order_paid', context, [order.user.email],
        attachments=attachments or None,
    )


def _get_vendor_recipients(vendor):
    """Retourne les emails des PROPRIETAIRE/ADMINISTRATEUR/COMMERCIAL d'une organisation vendeuse."""
    from apps.organizations.models import OrganizationMembership
    return list(
        OrganizationMembership.objects.filter(
            organization=vendor,
            is_active=True,
            role__in=['PROPRIETAIRE', 'ADMINISTRATEUR', 'COMMERCIAL'],
        ).select_related('user').values_list('user__email', flat=True)
    )


def send_vendor_new_order(sub_order):
    """Notifier le vendeur qu'une nouvelle sous-commande a été créée."""
    from apps.orders.models import OrderItem
    vendor = sub_order.vendor
    if not vendor:
        return False
    recipients = _get_vendor_recipients(vendor)
    if not recipients:
        return False
    order = sub_order.order
    items = [
        {
            'title': item.book.title,
            'quantity': item.quantity,
            'price': float(item.price),
            'total': float(item.price * item.quantity),
        }
        for item in OrderItem.objects.filter(sub_order=sub_order).select_related('book')
    ]
    context = {
        'vendor_name': vendor.name,
        'order_id': f"{order.id:06d}",
        'sub_order_id': sub_order.id,
        'customer_name': order.user.get_full_name() or order.user.username if order.user else 'Client',
        'shipping_city': order.shipping_city,
        'shipping_address': order.shipping_address,
        'shipping_phone': order.shipping_phone,
        'items': items,
        'subtotal': float(sub_order.subtotal),
        'event': 'new_order',
        'frontend_url': settings.FRONTEND_URL,
    }
    subject = f"Nouvelle commande #{order.id:06d} — Frollot"
    return send_templated_email(subject, 'vendor_new_order', context, recipients)


def send_vendor_payment_received(sub_order):
    """Notifier le vendeur qu'un paiement a été reçu sur une sous-commande."""
    from apps.orders.models import OrderItem
    vendor = sub_order.vendor
    if not vendor:
        return False
    recipients = _get_vendor_recipients(vendor)
    if not recipients:
        return False
    order = sub_order.order
    items = [
        {
            'title': item.book.title,
            'quantity': item.quantity,
            'price': float(item.price),
            'total': float(item.price * item.quantity),
        }
        for item in OrderItem.objects.filter(sub_order=sub_order).select_related('book')
    ]
    context = {
        'vendor_name': vendor.name,
        'order_id': f"{order.id:06d}",
        'sub_order_id': sub_order.id,
        'customer_name': order.user.get_full_name() or order.user.username if order.user else 'Client',
        'shipping_city': order.shipping_city,
        'shipping_address': order.shipping_address,
        'shipping_phone': order.shipping_phone,
        'items': items,
        'subtotal': float(sub_order.subtotal),
        'event': 'payment_received',
        'frontend_url': settings.FRONTEND_URL,
    }
    subject = f"Paiement recu — Commande #{order.id:06d} — Preparez la sous-commande — Frollot"
    return send_templated_email(subject, 'vendor_new_order', context, recipients)


def send_vendor_reminder(sub_order):
    """B2 : rappeler le vendeur qu'une sous-commande payée attend depuis 48h+."""
    vendor = sub_order.vendor
    if not vendor:
        return False
    recipients = _get_vendor_recipients(vendor)
    if not recipients:
        return False
    order = sub_order.order
    context = {
        'vendor_name': vendor.name,
        'order_id': f"{order.id:06d}",
        'sub_order_id': sub_order.id,
        'customer_name': order.user.get_full_name() or order.user.username if order.user else 'Client',
        'shipping_city': order.shipping_city,
        'created_at': sub_order.created_at.strftime('%d/%m/%Y à %Hh%M') if sub_order.created_at else '—',
        'frontend_url': settings.FRONTEND_URL,
    }
    subject = f"Rappel — Commande #{order.id:06d} en attente depuis 48h — Frollot"
    return send_templated_email(subject, 'vendor_reminder', context, recipients)


def send_payment_failed(order):
    """B5 : notifier le client que son paiement a échoué."""
    if not order.user or not order.user.email:
        return False
    context = {
        'client_name': order.user.get_full_name() or order.user.username,
        'order_id': f"{order.id:06d}",
        'total_amount': float(order.total_amount),
        'frontend_url': settings.FRONTEND_URL,
    }
    subject = f"Paiement échoué — Commande #{order.id:06d} — Frollot"
    return send_templated_email(subject, 'payment_failed', context, [order.user.email])


def send_stale_shipment_alert(sub_order, to_emails):
    """B7 : alerter sur une livraison en retard (SHIPPED > 72h)."""
    order = sub_order.order
    from apps.orders.models import OrderItem
    items = [
        {'title': item.book.title, 'quantity': item.quantity}
        for item in OrderItem.objects.filter(sub_order=sub_order).select_related('book')
    ]
    agent_name = sub_order.delivery_agent.user.get_full_name() if sub_order.delivery_agent else '—'
    context = {
        'sub_order_id': sub_order.id,
        'order_id': f"{order.id:06d}",
        'vendor_name': sub_order.vendor.name if sub_order.vendor else '—',
        'agent_name': agent_name,
        'customer_name': order.user.get_full_name() if order.user else 'Client',
        'shipping_city': order.shipping_city,
        'items': items,
        'shipped_since': sub_order.updated_at.strftime('%d/%m/%Y à %Hh%M') if sub_order.updated_at else '—',
        'frontend_url': settings.FRONTEND_URL,
    }
    subject = f"Alerte livraison en retard — Commande #{order.id:06d} — Frollot"
    return send_templated_email(subject, 'stale_shipment_alert', context, to_emails)


def send_vendor_delivery_completed(sub_order):
    """Notifier le vendeur qu'une sous-commande a été livrée au client."""
    vendor = sub_order.vendor
    if not vendor:
        return False
    recipients = _get_vendor_recipients(vendor)
    if not recipients:
        return False
    order = sub_order.order
    agent_name = sub_order.delivery_agent.user.get_full_name() if sub_order.delivery_agent else None
    context = {
        'vendor_name': vendor.name,
        'order_id': f"{order.id:06d}",
        'sub_order_id': sub_order.id,
        'customer_name': order.user.get_full_name() or order.user.username if order.user else 'Client',
        'agent_name': agent_name,
        'delivered_at': sub_order.delivered_at.strftime('%d/%m/%Y à %Hh%M') if sub_order.delivered_at else '—',
        'subtotal': float(sub_order.subtotal),
        'frontend_url': settings.FRONTEND_URL,
    }
    subject = f"Livraison terminée — Commande #{order.id:06d} — Frollot"
    return send_templated_email(subject, 'vendor_delivery_completed', context, recipients)


def send_cancellation_notice(sub_order, recipient_type):
    """
    Notifier un acteur (vendeur ou livreur) de l'annulation d'une sous-commande.
    recipient_type: 'vendor' ou 'delivery'
    """
    order = sub_order.order
    if recipient_type == 'vendor':
        vendor = sub_order.vendor
        if not vendor:
            return False
        recipients = _get_vendor_recipients(vendor)
        recipient_name = vendor.name
    elif recipient_type == 'delivery':
        agent = sub_order.delivery_agent
        if not agent or not agent.user.email:
            return False
        recipients = [agent.user.email]
        recipient_name = agent.user.get_full_name() or agent.user.username
    else:
        return False

    if not recipients:
        return False

    from apps.orders.models import OrderItem
    items = [
        {'title': item.book.title, 'quantity': item.quantity}
        for item in OrderItem.objects.filter(sub_order=sub_order).select_related('book')
    ]
    context = {
        'recipient_name': recipient_name,
        'recipient_type': recipient_type,
        'order_id': f"{order.id:06d}",
        'sub_order_id': sub_order.id,
        'items': items,
        'frontend_url': settings.FRONTEND_URL,
    }
    subject = f"Commande #{order.id:06d} annulée — Frollot"
    return send_templated_email(subject, 'cancellation_notice', context, recipients)


def send_newsletter_welcome(email):
    """Email de bienvenue après inscription à la newsletter."""
    context = {'email': email, 'frontend_url': settings.FRONTEND_URL}
    subject = "Bienvenue dans la newsletter — Frollot"
    return send_templated_email(
        subject, 'newsletter_welcome', context, [email]
    )


def send_contact_notification(contact_message):
    """Notification admin + accusé de réception client."""
    context = {
        'name': contact_message.name,
        'email': contact_message.email,
        'subject': contact_message.get_subject_display(),
        'message': contact_message.message,
    }
    # Email à l'admin
    admin_subject = f"[Contact] {contact_message.subject} — {contact_message.name}"
    send_templated_email(
        admin_subject, 'contact_admin', context, [settings.ADMIN_EMAIL]
    )
    # Accusé de réception au client
    client_subject = "Nous avons bien reçu votre message — Frollot"
    return send_templated_email(
        client_subject, 'contact_ack', context, [contact_message.email]
    )


def send_manuscript_acknowledgment(manuscript):
    """Accusé de réception après soumission de manuscrit."""
    context = {
        'author_name': manuscript.author_name,
        'title': manuscript.title,
        'reference': f"MS-{manuscript.id:05d}",
        'target_org_name': manuscript.target_organization.name if manuscript.target_organization else None,
        'is_open_market': manuscript.is_open_market,
        'frontend_url': settings.FRONTEND_URL,
    }
    subject = "Manuscrit reçu — Frollot"
    return send_templated_email(
        subject, 'manuscript_ack', context, [manuscript.email]
    )


def send_manuscript_org_notification(manuscript, org_override=None):
    """Notifier une organisation qu'elle a reçu un manuscrit (ciblé ou marché ouvert)."""
    org = org_override or manuscript.target_organization
    if not org or not org.email:
        return False
    context = {
        'org_name': org.name,
        'author_name': manuscript.author_name,
        'title': manuscript.title,
        'genre': manuscript.get_genre_display(),
        'language': manuscript.get_language_display(),
        'page_count': manuscript.page_count,
        'reference': f"MS-{manuscript.id:05d}",
        'frontend_url': settings.FRONTEND_URL,
    }
    subject = f"Nouveau manuscrit reçu : « {manuscript.title} » — Frollot"
    return send_templated_email(
        subject, 'manuscript_org_notification', context, [org.email]
    )


def send_manuscript_status_update(manuscript):
    """Notifier l'auteur d'un changement de statut de son manuscrit."""
    context = {
        'author_name': manuscript.author_name,
        'title': manuscript.title,
        'reference': f"MS-{manuscript.id:05d}",
        'status': manuscript.get_status_display(),
        'status_code': manuscript.status,
        'rejection_reason': manuscript.rejection_reason,
        'org_name': manuscript.target_organization.name if manuscript.target_organization else None,
        'frontend_url': settings.FRONTEND_URL,
    }
    subject = f"Mise à jour de votre manuscrit « {manuscript.title} » — Frollot"
    return send_templated_email(
        subject, 'manuscript_status_update', context, [manuscript.email]
    )


PUBLISHING_MODEL_EXPLANATIONS = {
    'COMPTE_EDITEUR': (
        "La maison d'édition prend en charge l'intégralité des frais de production. "
        "Vous ne payez rien. En échange, vous percevez des droits d'auteur sur chaque "
        "exemplaire vendu, dès le premier."
    ),
    'COEDITION': (
        "La maison d'édition assume le travail éditorial (correction, mise en page, "
        "couverture, distribution). Vous contribuez aux frais d'impression. Vos droits "
        "d'auteur sont majorés pour refléter votre prise de risque partagée."
    ),
    'COMPTE_AUTEUR': (
        "Vous financez la production de votre livre. La maison d'édition met son "
        "savoir-faire éditorial et son réseau de distribution à votre service. "
        "Chaque prestation est détaillée et chiffrée dans le devis ci-joint."
    ),
    'AUTO_EDITION': (
        "Vous gardez le contrôle total de votre projet. Vous choisissez les prestations "
        "dont vous avez besoin, une par une, et vous restez propriétaire de 100% de vos droits."
    ),
    'NUMERIQUE_PUR': (
        "Votre livre est publié exclusivement en format numérique. Pas d'impression, "
        "pas de stock : votre texte est accessible partout où il y a un écran, "
        "à un coût de production minimal."
    ),
    'REEDITION': (
        "Votre livre a déjà existé et mérite une nouvelle vie. Couverture actualisée, "
        "mise en page modernisée, nouvelle distribution sur Frollot et au-delà."
    ),
}


def send_editorial_quote(quote):
    """
    Envoie un devis éditorial par email avec le PDF en pièce jointe.
    """
    from apps.core.invoice import generate_dqe_quote_pdf

    # Destinataire
    to_email = quote.client.email if quote.client else quote.client_email
    if not to_email:
        return False

    # Générer le PDF
    pdf_buffer = generate_dqe_quote_pdf(quote)

    # Construire le résumé des droits d'auteur
    royalty_summary = ''
    if quote.royalty_terms:
        parts = []
        for tier in quote.royalty_terms:
            rate = tier.get('rate', 0)
            if 'up_to' in tier:
                parts.append(f"{rate}% jusqu'à {tier['up_to']} ex.")
            elif 'above' in tier:
                parts.append(f"{rate}% au-delà de {tier['above']} ex.")
        royalty_summary = ', '.join(parts)

    # Nom et explication du modèle éditorial
    model_display = quote.get_publishing_model_display() if quote.publishing_model else 'Non précisé'
    model_explanation = PUBLISHING_MODEL_EXPLANATIONS.get(quote.publishing_model, '')

    # Auteur / manuscrit
    ms = quote.manuscript
    author_name = ms.author_name if ms else (quote.client.get_full_name() if quote.client else quote.client_name)
    ms_title = ms.title if ms else quote.title
    ms_reference = f"MS-{ms.id:05d}" if ms else '—'

    is_revision = bool(quote.parent_quote_id)
    parent_quote_reference = None
    if is_revision and quote.parent_quote:
        parent_quote_reference = quote.parent_quote.reference

    context = {
        'author_name': author_name,
        'org_name': quote.provider_organization.name if quote.provider_organization else '—',
        'manuscript_title': ms_title,
        'manuscript_reference': ms_reference,
        'quote_reference': quote.reference,
        'publishing_model_display': model_display,
        'publishing_model_explanation': model_explanation,
        'total_ttc': f"{float(quote.total_ttc):,.0f}".replace(',', ' '),
        'delivery_days': quote.delivery_days,
        'validity_days': quote.validity_days,
        'valid_until': quote.valid_until.strftime('%d/%m/%Y') if quote.valid_until else '—',
        'royalty_summary': royalty_summary,
        'is_revision': is_revision,
        'parent_quote_reference': parent_quote_reference,
        'frontend_url': settings.FRONTEND_URL,
    }

    subject = f"Devis éditorial pour « {ms_title} » — {model_display} — Frollot"

    attachments = [(
        f"devis-editorial-{quote.reference}.pdf",
        pdf_buffer,
        'application/pdf',
    )]

    return send_templated_email(
        subject, 'quote_editorial', context, [to_email],
        attachments=attachments,
    )


def send_quote_response_notification(quote, action, reason=''):
    """
    Notifie l'éditeur quand l'auteur répond à un devis (accept/reject/revision).
    Destinataires : created_by + email org (dédupliqués).
    """
    # Destinataires
    recipients = set()
    if quote.created_by and quote.created_by.email:
        recipients.add(quote.created_by.email)
    if quote.provider_organization and quote.provider_organization.email:
        recipients.add(quote.provider_organization.email)
    if not recipients:
        return False

    # Identité de l'éditeur
    editor_name = 'Éditeur'
    if quote.created_by:
        editor_name = quote.created_by.get_full_name() or quote.created_by.username

    # Identité de l'auteur et manuscrit
    ms = quote.manuscript
    author_name = ms.author_name if ms else (quote.client.get_full_name() if quote.client else quote.client_name)
    ms_title = ms.title if ms else quote.title
    model_display = quote.get_publishing_model_display() if quote.publishing_model else 'Non précisé'

    context = {
        'editor_name': editor_name,
        'author_name': author_name or 'Auteur',
        'manuscript_title': ms_title,
        'quote_reference': quote.reference,
        'quote_id': quote.id,
        'publishing_model_display': model_display,
        'total_ttc': f"{float(quote.total_ttc):,.0f}".replace(',', ' ') if quote.total_ttc else '—',
        'frontend_url': settings.FRONTEND_URL,
        'rejection_reason': reason,
        'revision_reason': reason,
        'author_message': reason,
    }

    templates = {
        'accept': ('quote_accepted', f"Devis accepté pour « {ms_title} » — Frollot"),
        'reject': ('quote_rejected', f"Devis décliné pour « {ms_title} » — Frollot"),
        'revision': ('quote_revision_requested', f"Demande de révision — Devis « {ms_title} » — Frollot"),
    }

    template_name, subject = templates.get(action, templates['reject'])
    return send_templated_email(subject, template_name, context, list(recipients))


def send_welcome_registration(user):
    """Email de bienvenue après création de compte (inscription)."""
    if not user or not getattr(user, 'email', None):
        return False
    context = {
        'user': user,
        'frontend_url': settings.FRONTEND_URL,
    }
    subject = "Bienvenue — Frollot"
    return send_templated_email(
        subject, 'registration_welcome', context, [user.email]
    )


def send_order_cancelled(order):
    """Email de confirmation d'annulation de commande."""
    from apps.orders.models import Order
    order = Order.objects.prefetch_related('items__book').get(pk=order.pk)
    items = [{'title': item.book.title, 'quantity': item.quantity} for item in order.items.all()]
    context = {
        'order': order,
        'user': order.user,
        'items': items,
        'frontend_url': settings.FRONTEND_URL,
    }
    subject = f"Commande #{order.id:06d} annulée — Frollot"
    return send_templated_email(
        subject, 'order_cancelled', context, [order.user.email]
    )


def send_organization_invitation(invitation):
    """Email d'invitation à rejoindre une organisation."""
    org = invitation.organization
    from apps.organizations.models import OrganizationMembership
    role_display = dict(OrganizationMembership.ROLE_CHOICES).get(invitation.role, invitation.role)
    context = {
        'org_name': org.name,
        'role': role_display,
        'email': invitation.email,
        'invited_by_name': invitation.invited_by.get_full_name() or invitation.invited_by.username,
        'message': invitation.message,
        'expires_at': invitation.expires_at,
        'token': str(invitation.token),
        'frontend_url': settings.FRONTEND_URL,
    }
    subject = f"Invitation à rejoindre {org.name} — Frollot"
    return send_templated_email(
        subject, 'organization_invitation', context, [invitation.email]
    )


def send_order_shipped(order):
    """Email de notification d'expédition."""
    from apps.orders.models import Order
    order = Order.objects.prefetch_related('items__book').get(pk=order.pk)
    items = [{'title': item.book.title, 'quantity': item.quantity} for item in order.items.all()]
    context = {
        'order': order,
        'user': order.user,
        'items': items,
        'frontend_url': settings.FRONTEND_URL,
    }
    subject = f"Votre commande #{order.id:06d} a été expédiée — Frollot"
    return send_templated_email(
        subject, 'order_shipped', context, [order.user.email]
    )


def send_order_delivered(order, agent_name=None):
    """Email de confirmation de livraison au client."""
    from apps.orders.models import Order
    order = Order.objects.prefetch_related('items__book').get(pk=order.pk)
    items = [{'title': item.book.title, 'quantity': item.quantity} for item in order.items.all()]
    context = {
        'order': order,
        'user': order.user,
        'items': items,
        'agent_name': agent_name,
        'frontend_url': settings.FRONTEND_URL,
    }
    subject = f"Commande #{order.id:06d} livree — Frollot"
    return send_templated_email(
        subject, 'order_delivered', context, [order.user.email]
    )


def send_delivery_assignment(sub_order):
    """Notifier le livreur qu'une livraison lui a ete assignee."""
    agent = sub_order.delivery_agent
    if not agent or not agent.user.email:
        return False
    order = sub_order.order
    context = {
        'agent_name': agent.user.get_full_name() or agent.user.username,
        'order_id': f"{order.id:06d}",
        'vendor_name': sub_order.vendor.name if sub_order.vendor else 'Frollot',
        'customer_name': order.user.get_full_name() or order.user.username,
        'shipping_city': order.shipping_city,
        'shipping_address': order.shipping_address,
        'shipping_phone': order.shipping_phone,
        'delivery_fee': float(sub_order.delivery_fee) if sub_order.delivery_fee else None,
        'frontend_url': settings.FRONTEND_URL,
    }
    subject = f"Nouvelle livraison assignee — Commande #{order.id:06d} — Frollot"
    return send_templated_email(
        subject, 'delivery_assignment', context, [agent.user.email]
    )


def send_service_order_status(service_order, recipient_role='client', message=''):
    """
    Notifier un changement de statut sur une commande de service.
    recipient_role: 'client' ou 'provider'
    message: texte optionnel affiché dans l'email (ex: motif de révision)
    """
    STATUS_COLORS = {
        'PENDING': '#3b82f6',
        'IN_PROGRESS': '#f59e0b',
        'REVIEW': '#6366f1',
        'REVISION': '#f97316',
        'COMPLETED': '#10b981',
        'CANCELLED': '#ef4444',
    }
    order = service_order
    if recipient_role == 'client':
        recipient = order.client
        recipient_name = recipient.get_full_name() or recipient.username
        to_email = recipient.email
    else:
        recipient = order.provider.user
        recipient_name = recipient.get_full_name() or recipient.username
        to_email = recipient.email

    listing = order.request.listing if hasattr(order, 'request') and hasattr(order.request, 'listing') else None
    context = {
        'recipient_name': recipient_name,
        'role': recipient_role,
        'service_title': listing.title if listing else 'Service',
        'client_name': order.client.get_full_name() if recipient_role == 'provider' else None,
        'status_display': order.get_status_display(),
        'status_color': STATUS_COLORS.get(order.status, '#64748b'),
        'service_type': listing.get_service_type_display() if listing else '',
        'request_id': order.id,
        'price': float(order.amount) if order.amount else None,
        'message': message,
        'frontend_url': settings.FRONTEND_URL,
    }
    subject = f"Service SVC-{order.id:05d} : {order.get_status_display()} — Frollot"
    return send_templated_email(
        subject, 'service_request_status', context, [to_email]
    )


def send_auto_complete_warning(service_order, days_remaining):
    """
    Envoie un préavis d'auto-complétion au client (J-7 ou J-1).
    """
    from datetime import timedelta

    order = service_order
    client = order.client
    provider = order.provider.user

    auto_complete_date = order.delivered_at + timedelta(days=14)

    context = {
        'client_name': client.get_full_name() or client.username,
        'provider_name': provider.get_full_name() or provider.username,
        'service_title': order.request.title if hasattr(order, 'request') else f'SVC-{order.id:05d}',
        'days_remaining': days_remaining,
        'order_id': order.id,
        'amount': float(order.amount) if order.amount else 0,
        'auto_complete_date': auto_complete_date.strftime('%d/%m/%Y'),
        'frontend_url': settings.FRONTEND_URL,
    }

    if days_remaining == 1:
        subject = f"⚠ Commande SVC-{order.id:05d} : validation automatique demain — Frollot"
    else:
        subject = f"Commande SVC-{order.id:05d} : validation automatique dans {days_remaining} jours — Frollot"

    return send_templated_email(
        subject, 'service_order_auto_complete_warning', context, [client.email]
    )


def send_loan_reminder(loan, days_remaining):
    """
    Envoie un rappel d'échéance de prêt à l'emprunteur.
    days_remaining: 3 pour J-3, 0 pour jour J (ou négatif si rattrapage).
    """
    borrower = loan.borrower
    if not borrower or not borrower.email:
        return False

    book_title = loan.catalog_item.book.title if loan.catalog_item and loan.catalog_item.book else f'Prêt #{loan.id}'
    library_name = loan.catalog_item.library.name if loan.catalog_item and loan.catalog_item.library else 'votre bibliothèque'

    context = {
        'borrower_name': borrower.get_full_name() or borrower.username,
        'book_title': book_title,
        'library_name': library_name,
        'due_date': loan.due_date.strftime('%d/%m/%Y') if loan.due_date else '—',
        'days_remaining': days_remaining,
        'is_today': days_remaining <= 0,
        'frontend_url': settings.FRONTEND_URL,
    }

    if days_remaining <= 0:
        subject = f"Votre prêt arrive à échéance aujourd'hui — Frollot"
    else:
        subject = f"Rappel : votre prêt arrive à échéance dans {days_remaining} jours — Frollot"

    return send_templated_email(subject, 'book_loan_reminder', context, [borrower.email])


def send_suborder_update(sub_order, new_status):
    """
    Notifie le client d'un changement de statut sur une sous-commande.
    new_status: 'CONFIRMED' ou 'SHIPPED'.
    """
    order = sub_order.order
    client = order.user
    if not client or not client.email:
        return False

    items = sub_order.items.select_related('book')
    items_list = [{'title': it.book.title, 'quantity': it.quantity} for it in items]
    vendor_name = sub_order.vendor.name if sub_order.vendor else '—'

    STATUS_LABELS = {
        'CONFIRMED': 'confirmée par le vendeur',
        'PREPARING': 'en cours de préparation',
        'READY': 'prête, le livreur va la récupérer',
        'SHIPPED': 'expédiée',
        'CANCELLED': 'annulée par le vendeur',
    }
    status_label = STATUS_LABELS.get(new_status, sub_order.get_status_display())

    context = {
        'client_name': client.get_full_name() or client.username,
        'order_id': order.id,
        'vendor_name': vendor_name,
        'status_label': status_label,
        'new_status': new_status,
        'items': items_list,
        'shipping_city': order.shipping_city,
        'frontend_url': settings.FRONTEND_URL,
    }

    subject = f"Commande #{order.id:06d} — une partie a été {status_label} — Frollot"
    return send_templated_email(subject, 'order_suborder_update', context, [client.email])


def send_unassigned_suborder_alert(sub_order, to_emails):
    """
    Alerte opérationnelle : sous-commande READY sans livreur depuis plus de 24h.
    Envoyée aux responsables du vendeur + admin plateforme.
    """
    order = sub_order.order
    items = sub_order.items.select_related('book')
    items_list = [{'title': it.book.title, 'quantity': it.quantity} for it in items]
    vendor_name = sub_order.vendor.name if sub_order.vendor else '—'

    context = {
        'sub_order_id': sub_order.id,
        'order_id': order.id,
        'vendor_name': vendor_name,
        'items': items_list,
        'shipping_city': order.shipping_city,
        'ready_at': sub_order.ready_at.strftime('%d/%m/%Y à %Hh%M') if sub_order.ready_at else '—',
        'vendor_id': sub_order.vendor_id,
        'frontend_url': settings.FRONTEND_URL,
    }

    subject = f"Sous-commande #SO-{sub_order.id:05d} en attente de livreur depuis plus de 24h — Frollot"
    return send_templated_email(subject, 'unassigned_delivery_alert', context, to_emails)
