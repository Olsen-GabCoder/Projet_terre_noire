"""
Service d'envoi d'emails pour Terre Noire Éditions.
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
    """Encode le logo en base64 pour affichage inline dans les emails."""
    logo_path = getattr(settings, 'LOGO_PATH', None)
    if logo_path and hasattr(logo_path, 'exists') and logo_path.exists():
        try:
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
            'logo_url': getattr(settings, 'LOGO_URL', None) or f"{settings.FRONTEND_URL}/images/logo_terre_noire.png",
        }
        html_content = render_to_string(f'emails/{template_name}.html', ctx)
        text_content = strip_tags(html_content)
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
    """Email de confirmation de commande (commande créée) avec facture PDF."""
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
    }
    subject = f"Confirmation de commande #{order.id:06d} — Terre Noire Éditions"
    pdf_buffer = generate_order_invoice_pdf(order)
    attachments = [(f"facture-{order.id:06d}.pdf", pdf_buffer, 'application/pdf')]
    return send_templated_email(
        subject, 'order_confirmation', context, [order.user.email],
        attachments=attachments,
    )


def send_order_paid(order):
    """Email de confirmation de paiement avec facture PDF."""
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
    subject = f"Paiement reçu — Commande #{order.id:06d} — Terre Noire Éditions"
    pdf_buffer = generate_order_invoice_pdf(order)
    attachments = [(f"facture-{order.id:06d}.pdf", pdf_buffer, 'application/pdf')]
    return send_templated_email(
        subject, 'order_paid', context, [order.user.email],
        attachments=attachments,
    )


def send_newsletter_welcome(email):
    """Email de bienvenue après inscription à la newsletter."""
    context = {'email': email, 'frontend_url': settings.FRONTEND_URL}
    subject = "Bienvenue dans la newsletter — Terre Noire Éditions"
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
    client_subject = "Nous avons bien reçu votre message — Terre Noire Éditions"
    return send_templated_email(
        client_subject, 'contact_ack', context, [contact_message.email]
    )


def send_manuscript_acknowledgment(manuscript):
    """Accusé de réception après soumission de manuscrit."""
    context = {
        'author_name': manuscript.author_name,
        'title': manuscript.title,
        'frontend_url': settings.FRONTEND_URL,
    }
    subject = "Manuscrit reçu — Terre Noire Éditions"
    return send_templated_email(
        subject, 'manuscript_ack', context, [manuscript.email]
    )


def send_welcome_registration(user):
    """Email de bienvenue après création de compte (inscription)."""
    if not user or not getattr(user, 'email', None):
        return False
    context = {
        'user': user,
        'frontend_url': settings.FRONTEND_URL,
    }
    subject = "Bienvenue — Terre Noire Éditions"
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
    subject = f"Commande #{order.id:06d} annulée — Terre Noire Éditions"
    return send_templated_email(
        subject, 'order_cancelled', context, [order.user.email]
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
    subject = f"Votre commande #{order.id:06d} a été expédiée — Terre Noire Éditions"
    return send_templated_email(
        subject, 'order_shipped', context, [order.user.email]
    )
