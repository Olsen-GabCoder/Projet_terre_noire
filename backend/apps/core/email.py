"""
Service d'envoi d'emails pour Frollot.
Centralise l'envoi des notifications (commandes, newsletter, contact, etc.).
"""
import base64
import logging

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
            return f"data:image/png;base64,{base64.b64encode(data).decode('ascii')}"
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


def send_service_order_status(service_order, recipient_role='client'):
    """
    Notifier un changement de statut sur une commande de service.
    recipient_role: 'client' ou 'provider'
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
        'message': '',
        'frontend_url': settings.FRONTEND_URL,
    }
    subject = f"Service SVC-{order.id:05d} : {order.get_status_display()} — Frollot"
    return send_templated_email(
        subject, 'service_request_status', context, [to_email]
    )
