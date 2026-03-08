"""
Génération de factures PDF pour Terre Noire Éditions.
"""
import io

from django.conf import settings
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image


def generate_order_invoice_pdf(order):
    """
    Génère une facture PDF pour une commande.
    Retourne un objet BytesIO contenant le PDF.
    """
    from apps.orders.models import Order

    order = Order.objects.prefetch_related('items__book').get(pk=order.pk)
    buffer = io.BytesIO()

    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        rightMargin=20 * mm,
        leftMargin=20 * mm,
        topMargin=20 * mm,
        bottomMargin=20 * mm,
    )

    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        'Title',
        parent=styles['Heading1'],
        fontSize=18,
        spaceAfter=6,
    )
    normal_style = styles['Normal']
    small_style = ParagraphStyle(
        'Small',
        parent=styles['Normal'],
        fontSize=9,
        spaceAfter=3,
    )

    elements = []

    # En-tête avec logo (taille réduite pour meilleure lisibilité)
    logo_path = getattr(settings, 'LOGO_PATH', None)
    if logo_path and logo_path.exists():
        try:
            img = Image(str(logo_path), width=18 * mm, height=18 * mm)
            img.hAlign = 'LEFT'
            elements.append(img)
            elements.append(Spacer(1, 2 * mm))
        except Exception:
            pass
    elements.append(Paragraph("Terre Noire Éditions", title_style))
    elements.append(Paragraph("Facture", styles['Heading2']))
    elements.append(Spacer(1, 10 * mm))

    # Infos commande
    elements.append(Paragraph(f"<b>Facture n°</b> {order.id:06d}", normal_style))
    elements.append(Paragraph(f"<b>Date :</b> {order.created_at.strftime('%d/%m/%Y à %H:%M')}", normal_style))
    elements.append(Spacer(1, 5 * mm))

    # Client
    user = order.user
    client_name = user.get_full_name() or user.username
    elements.append(Paragraph("<b>Client</b>", normal_style))
    elements.append(Paragraph(client_name, small_style))
    elements.append(Paragraph(user.email or '', small_style))
    elements.append(Spacer(1, 5 * mm))

    # Adresse de livraison
    elements.append(Paragraph("<b>Adresse de livraison</b>", normal_style))
    elements.append(Paragraph(order.shipping_address.replace('\n', '<br/>'), small_style))
    elements.append(Paragraph(f"{order.shipping_city} — Tél : {order.shipping_phone}", small_style))
    elements.append(Spacer(1, 10 * mm))

    # Tableau des articles
    data = [
        ['Article', 'Qté', 'Prix unit. (FCFA)', 'Total (FCFA)'],
    ]
    for item in order.items.all():
        total = float(item.price * item.quantity)
        data.append([
            item.book.title[:50] + ('...' if len(item.book.title) > 50 else ''),
            str(item.quantity),
            f"{float(item.price):,.0f}".replace(',', ' '),
            f"{total:,.0f}".replace(',', ' '),
        ])

    table = Table(data, colWidths=[220 * mm / 4, 40 * mm / 4, 60 * mm / 4, 60 * mm / 4])
    table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#2c3e50')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('ALIGN', (0, 0), (0, -1), 'LEFT'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 10),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 8),
        ('TOPPADDING', (0, 0), (-1, 0), 8),
        ('BACKGROUND', (0, 1), (-1, -1), colors.white),
        ('TEXTCOLOR', (0, 1), (-1, -1), colors.black),
        ('FONTSIZE', (0, 1), (-1, -1), 9),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f8f9fa')]),
    ]))
    elements.append(table)
    elements.append(Spacer(1, 8 * mm))

    # Totaux
    subtotal = float(order.subtotal)
    shipping = float(order.shipping_cost)
    discount = float(order.discount_amount or 0)
    total = float(order.total_amount)

    totals_data = [
        ['Sous-total', f"{subtotal:,.0f}".replace(',', ' ') + ' FCFA'],
        ['Frais de livraison', f"{shipping:,.0f}".replace(',', ' ') + ' FCFA' if shipping else 'Gratuit'],
    ]
    if discount > 0:
        totals_data.append(['Réduction', f"-{discount:,.0f}".replace(',', ' ') + ' FCFA'])
    totals_data.append(['Total TTC', f"{total:,.0f}".replace(',', ' ') + ' FCFA'])

    totals_table = Table(totals_data, colWidths=[120 * mm, 60 * mm])
    totals_table.setStyle(TableStyle([
        ('ALIGN', (0, 0), (0, -1), 'RIGHT'),
        ('ALIGN', (1, 0), (1, -1), 'RIGHT'),
        ('FONTNAME', (-1, -1), (-1, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (-1, -1), (-1, -1), 11),
    ]))
    elements.append(totals_table)
    elements.append(Spacer(1, 15 * mm))

    # Pied de page
    elements.append(Paragraph(
        "Merci pour votre confiance. Terre Noire Éditions.",
        ParagraphStyle('Footer', parent=styles['Normal'], fontSize=8, textColor=colors.grey),
    ))

    doc.build(elements)
    buffer.seek(0)
    return buffer
