"""
Génération de factures PDF pour Frollot.
Inclut : vendeurs, condition, sous-totaux par vendeur, mentions légales.
"""
import io
from collections import defaultdict

from django.conf import settings
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image


CONDITION_LABELS = {
    'NEW': 'Neuf',
    'USED_GOOD': 'Occasion — Bon état',
    'USED_FAIR': 'Occasion — État correct',
}

# ── Couleurs ──
DARK = colors.HexColor('#1e293b')
PRIMARY = colors.HexColor('#4338ca')
LIGHT_BG = colors.HexColor('#f8fafc')
BORDER = colors.HexColor('#cbd5e1')
MUTED = colors.HexColor('#64748b')


def generate_order_invoice_pdf(order):
    """
    Génère une facture PDF pour une commande.
    Retourne un objet BytesIO contenant le PDF.
    """
    from apps.orders.models import Order

    order = Order.objects.prefetch_related(
        'items__book__author',
        'items__vendor',
        'items__listing',
        'sub_orders__vendor',
        'sub_orders__delivery_agent__user',
    ).select_related('user').get(pk=order.pk)

    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        rightMargin=18 * mm,
        leftMargin=18 * mm,
        topMargin=18 * mm,
        bottomMargin=18 * mm,
    )

    styles = getSampleStyleSheet()
    title_style = ParagraphStyle('InvTitle', parent=styles['Heading1'], fontSize=20, spaceAfter=2, textColor=DARK)
    h3_style = ParagraphStyle('InvH3', parent=styles['Heading3'], fontSize=10, spaceAfter=3, textColor=PRIMARY)
    normal = styles['Normal']
    small = ParagraphStyle('InvSmall', parent=normal, fontSize=9, spaceAfter=2, textColor=MUTED)
    footer_style = ParagraphStyle('InvFooter', parent=normal, fontSize=7, textColor=MUTED, spaceAfter=1)

    elements = []

    # ═══ EN-TÊTE ═══
    logo_path = getattr(settings, 'LOGO_PATH', None)
    if logo_path and logo_path.exists():
        try:
            img = Image(str(logo_path), width=16 * mm, height=16 * mm)
            img.hAlign = 'LEFT'
            elements.append(img)
            elements.append(Spacer(1, 2 * mm))
        except Exception:
            pass

    elements.append(Paragraph("FACTURE", title_style))
    elements.append(Spacer(1, 3 * mm))

    # ═══ INFOS FACTURE ═══
    info_data = [
        ['Facture n°', f"{order.id:06d}"],
        ['Date', order.created_at.strftime('%d/%m/%Y à %H:%M')],
        ['Statut', order.get_status_display()],
    ]
    if order.coupon_code:
        info_data.append(['Code promo', order.coupon_code])

    info_table = Table(info_data, colWidths=[35 * mm, 80 * mm])
    info_table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('TEXTCOLOR', (0, 0), (0, -1), DARK),
        ('TEXTCOLOR', (1, 0), (1, -1), MUTED),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
    ]))
    elements.append(info_table)
    elements.append(Spacer(1, 6 * mm))

    # ═══ CLIENT + LIVRAISON (2 colonnes) ═══
    user = order.user
    client_name = user.get_full_name() or user.username
    phone = getattr(user, 'phone_number', '') or ''

    client_text = f"<b>Client</b><br/>{client_name}<br/>{user.email}"
    if phone:
        client_text += f"<br/>Tél : {phone}"

    shipping_text = (
        f"<b>Adresse de livraison</b><br/>"
        f"{order.shipping_address.replace(chr(10), '<br/>')}<br/>"
        f"{order.shipping_city}<br/>"
        f"Tel : {order.shipping_phone}"
    )

    # Livreur (d'abord depuis Order, sinon depuis SubOrders)
    agent_name = order.delivery_agent_name or ''
    agent_phone = order.delivery_agent_phone or ''

    if not agent_name:
        for sub in order.sub_orders.all():
            if sub.delivery_agent:
                agent_name = sub.delivery_agent.user.get_full_name()
                agent_phone = getattr(sub.delivery_agent.user, 'phone_number', '') or ''
                break

    if agent_name:
        shipping_text += f"<br/><br/><b>Livreur</b><br/>{agent_name}"
        if agent_phone:
            shipping_text += f"<br/>Tel : {agent_phone}"

    addr_table = Table(
        [[Paragraph(client_text, small), Paragraph(shipping_text, small)]],
        colWidths=[85 * mm, 85 * mm],
    )
    addr_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('BACKGROUND', (0, 0), (-1, -1), LIGHT_BG),
        ('BOX', (0, 0), (-1, -1), 0.5, BORDER),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('RIGHTPADDING', (0, 0), (-1, -1), 8),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
    ]))
    elements.append(addr_table)
    elements.append(Spacer(1, 8 * mm))

    # ═══ ARTICLES GROUPÉS PAR VENDEUR ═══
    vendor_groups = defaultdict(list)
    for item in order.items.all():
        vendor_key = item.vendor.name if item.vendor else 'Frollot (catalogue)'
        vendor_groups[vendor_key].append(item)

    ORG_TYPE_LABELS = {
        'MAISON_EDITION': 'Maison d\'edition',
        'LIBRAIRIE': 'Librairie',
        'BIBLIOTHEQUE': 'Bibliotheque',
        'IMPRIMERIE': 'Imprimerie',
    }

    for vendor_name, items in vendor_groups.items():
        # En-tête vendeur avec type d'organisation
        vendor_obj = items[0].vendor if items[0].vendor else None
        vendor_label = f"<b>{vendor_name}</b>"
        if vendor_obj:
            org_type = ORG_TYPE_LABELS.get(getattr(vendor_obj, 'org_type', ''), '')
            parts = []
            if org_type:
                parts.append(org_type)
            if vendor_obj.city:
                parts.append(vendor_obj.city)
            if vendor_obj.email:
                parts.append(vendor_obj.email)
            if vendor_obj.phone_number:
                parts.append(vendor_obj.phone_number)
            if parts:
                vendor_label += f"<br/><font size=8 color='#64748b'>{' · '.join(parts)}</font>"

        elements.append(Paragraph(vendor_label, h3_style))

        # Tableau articles du vendeur
        data = [['Article', 'Condition', 'Qté', 'P.U. (FCFA)', 'Total (FCFA)']]
        vendor_subtotal = 0

        for item in items:
            total_line = float(item.price * item.quantity)
            vendor_subtotal += total_line

            condition = ''
            if item.listing and hasattr(item.listing, 'condition'):
                cond_raw = CONDITION_LABELS.get(item.listing.condition, item.listing.condition or '')
                if cond_raw:
                    condition = Paragraph(cond_raw, ParagraphStyle('cond', parent=normal, fontSize=8, leading=10, wordWrap='LTR'))

            title = item.book.title
            if len(title) > 45:
                title = title[:42] + '...'
            author = item.book.author.full_name if item.book.author else ''
            book_format = getattr(item.book, 'format', '')
            format_label = {'PAPER': 'Papier', 'EBOOK': 'Ebook', 'BOTH': 'Papier + Ebook'}.get(book_format, '')

            article_text = f"<b>{title}</b>"
            if author:
                article_text += f"<br/><font size=8 color='#333333'>par {author}</font>"
            if format_label:
                article_text += f"  <font size=7 color='#64748b'>({format_label})</font>"

            data.append([
                Paragraph(article_text, ParagraphStyle('cell', parent=normal, fontSize=9, leading=12)),
                condition,
                str(item.quantity),
                f"{float(item.price):,.0f}".replace(',', ' '),
                f"{total_line:,.0f}".replace(',', ' '),
            ])

        # Ligne sous-total vendeur
        data.append([
            '', '', '', Paragraph('<b>Sous-total</b>', ParagraphStyle('st', parent=normal, fontSize=9)),
            Paragraph(f"<b>{vendor_subtotal:,.0f}</b>".replace(',', ' ') + ' FCFA',
                       ParagraphStyle('stv', parent=normal, fontSize=9)),
        ])

        col_widths = [62 * mm, 38 * mm, 15 * mm, 28 * mm, 28 * mm]
        table = Table(data, colWidths=col_widths)
        table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), DARK),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 8),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 6),
            ('TOPPADDING', (0, 0), (-1, 0), 6),
            ('ALIGN', (2, 0), (-1, -1), 'CENTER'),
            ('ALIGN', (0, 0), (0, -1), 'LEFT'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('FONTSIZE', (0, 1), (-1, -1), 9),
            ('GRID', (0, 0), (-1, -2), 0.4, BORDER),
            ('ROWBACKGROUNDS', (0, 1), (-1, -2), [colors.white, LIGHT_BG]),
            # Sous-total row
            ('BACKGROUND', (0, -1), (-1, -1), LIGHT_BG),
            ('LINEABOVE', (0, -1), (-1, -1), 1, DARK),
        ]))
        elements.append(table)
        elements.append(Spacer(1, 5 * mm))

    # ═══ TOTAUX GÉNÉRAUX ═══
    elements.append(Spacer(1, 3 * mm))
    subtotal = float(order.subtotal)
    shipping = float(order.shipping_cost)
    discount = float(order.discount_amount or 0)
    total = float(order.total_amount)

    def fmt(v):
        return f"{v:,.0f}".replace(',', ' ') + ' FCFA'

    totals_data = [
        ['Sous-total', fmt(subtotal)],
        ['Frais de livraison', fmt(shipping) if shipping else 'Gratuit'],
    ]
    if discount > 0:
        totals_data.append(['Réduction', f"-{fmt(discount)}"])
    totals_data.append(['TOTAL TTC', fmt(total)])

    totals_table = Table(totals_data, colWidths=[110 * mm, 55 * mm])
    totals_table.setStyle(TableStyle([
        ('ALIGN', (0, 0), (-1, -1), 'RIGHT'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('TEXTCOLOR', (0, 0), (-1, -2), MUTED),
        ('FONTNAME', (0, -1), (-1, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, -1), (-1, -1), 12),
        ('TEXTCOLOR', (0, -1), (-1, -1), DARK),
        ('LINEABOVE', (0, -1), (-1, -1), 1.5, DARK),
        ('TOPPADDING', (0, -1), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
    ]))
    elements.append(totals_table)
    elements.append(Spacer(1, 12 * mm))

    # ═══ MENTIONS LÉGALES ═══
    elements.append(Paragraph(
        "<b>Mentions légales</b>",
        ParagraphStyle('LegalTitle', parent=normal, fontSize=8, textColor=DARK, spaceAfter=2),
    ))
    legal_lines = [
        "Frollot — Plateforme de distribution et services du livre",
        "Libreville, Gabon",
        "Les articles marketplace sont vendus et expédiés par les vendeurs tiers indiqués ci-dessus.",
        "Frollot agit en tant qu'intermédiaire de mise en relation.",
        "Conditions générales de vente disponibles sur frollot.com/cgv",
        f"Facture générée automatiquement le {order.created_at.strftime('%d/%m/%Y')}.",
    ]
    for line in legal_lines:
        elements.append(Paragraph(line, footer_style))

    elements.append(Spacer(1, 8 * mm))
    elements.append(Paragraph(
        "Merci pour votre confiance — Frollot",
        ParagraphStyle('Thanks', parent=normal, fontSize=9, textColor=PRIMARY, alignment=1),
    ))

    doc.build(elements)
    buffer.seek(0)
    return buffer


def generate_service_order_invoice_pdf(service_order):
    """
    Génère une facture PDF pour une commande de service.
    Retourne un objet BytesIO contenant le PDF.
    """
    from apps.services.models import ServiceOrder
    order = ServiceOrder.objects.select_related(
        'client', 'provider__user', 'request', 'quote',
    ).get(pk=service_order.pk)

    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, rightMargin=18*mm, leftMargin=18*mm, topMargin=18*mm, bottomMargin=18*mm)

    styles = getSampleStyleSheet()
    title_style = ParagraphStyle('InvTitle', parent=styles['Heading1'], fontSize=20, spaceAfter=2, textColor=DARK)
    normal = styles['Normal']
    small = ParagraphStyle('InvSmall', parent=normal, fontSize=9, spaceAfter=2, textColor=MUTED)
    footer_style = ParagraphStyle('InvFooter', parent=normal, fontSize=7, textColor=MUTED, spaceAfter=1)

    def fmt(v):
        return f"{float(v):,.0f}".replace(',', ' ') + ' FCFA'

    elements = []

    elements.append(Paragraph("FACTURE DE SERVICE", title_style))
    elements.append(Spacer(1, 3*mm))

    # Infos facture
    info_data = [
        ['Facture n°', f"SVC-{order.id:06d}"],
        ['Date', order.created_at.strftime('%d/%m/%Y à %H:%M')],
        ['Statut', order.get_status_display()],
    ]
    info_table = Table(info_data, colWidths=[35*mm, 80*mm])
    info_table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('TEXTCOLOR', (0, 0), (0, -1), DARK),
        ('TEXTCOLOR', (1, 0), (1, -1), MUTED),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
    ]))
    elements.append(info_table)
    elements.append(Spacer(1, 6*mm))

    # Client + Prestataire
    client = order.client
    provider = order.provider.user if order.provider else None
    client_text = f"<b>Client</b><br/>{client.get_full_name()}<br/>{client.email}"
    provider_text = f"<b>Prestataire</b><br/>{provider.get_full_name() if provider else '—'}<br/>{provider.email if provider else ''}"

    addr_table = Table(
        [[Paragraph(client_text, small), Paragraph(provider_text, small)]],
        colWidths=[85*mm, 85*mm],
    )
    addr_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('BACKGROUND', (0, 0), (-1, -1), LIGHT_BG),
        ('BOX', (0, 0), (-1, -1), 0.5, BORDER),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
    ]))
    elements.append(addr_table)
    elements.append(Spacer(1, 8*mm))

    # Détail service
    request_title = order.request.title if order.request else 'Service'
    data = [
        ['Service', 'Montant (FCFA)', 'Commission', 'Net prestataire'],
        [
            Paragraph(request_title, ParagraphStyle('cell', parent=normal, fontSize=9, leading=12)),
            fmt(order.amount),
            fmt(order.platform_fee),
            fmt(float(order.amount) - float(order.platform_fee)),
        ],
    ]
    table = Table(data, colWidths=[70*mm, 35*mm, 30*mm, 35*mm])
    table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), DARK),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('ALIGN', (1, 0), (-1, -1), 'CENTER'),
        ('GRID', (0, 0), (-1, -1), 0.4, BORDER),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white]),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
    ]))
    elements.append(table)
    elements.append(Spacer(1, 8*mm))

    # Total
    totals_data = [['TOTAL TTC', fmt(order.amount)]]
    totals_table = Table(totals_data, colWidths=[110*mm, 55*mm])
    totals_table.setStyle(TableStyle([
        ('ALIGN', (0, 0), (-1, -1), 'RIGHT'),
        ('FONTNAME', (0, 0), (-1, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 12),
        ('TEXTCOLOR', (0, 0), (-1, -1), DARK),
        ('LINEABOVE', (0, 0), (-1, -1), 1.5, DARK),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
    ]))
    elements.append(totals_table)
    elements.append(Spacer(1, 12*mm))

    # Mentions légales
    for line in [
        "Frollot — Plateforme de distribution et services du livre",
        "Libreville, Gabon",
        f"Facture de service générée le {order.created_at.strftime('%d/%m/%Y')}.",
    ]:
        elements.append(Paragraph(line, footer_style))

    elements.append(Spacer(1, 8*mm))
    elements.append(Paragraph("Merci pour votre confiance — Frollot", ParagraphStyle('Thanks', parent=normal, fontSize=9, textColor=PRIMARY, alignment=1)))

    doc.build(elements)
    buffer.seek(0)
    return buffer


def generate_print_request_quote_pdf(print_request):
    """
    Génère un devis PDF pour une demande d'impression.
    Retourne un objet BytesIO contenant le PDF.
    """
    from apps.services.models import PrintRequest
    pr = PrintRequest.objects.select_related(
        'book', 'requester', 'requester_org', 'printer',
    ).get(pk=print_request.pk)

    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, rightMargin=18*mm, leftMargin=18*mm, topMargin=18*mm, bottomMargin=18*mm)

    styles = getSampleStyleSheet()
    title_style = ParagraphStyle('InvTitle', parent=styles['Heading1'], fontSize=20, spaceAfter=2, textColor=DARK)
    normal = styles['Normal']
    small = ParagraphStyle('InvSmall', parent=normal, fontSize=9, spaceAfter=2, textColor=MUTED)
    footer_style = ParagraphStyle('InvFooter', parent=normal, fontSize=7, textColor=MUTED, spaceAfter=1)
    def fmt(v):
        return f"{float(v):,.0f}".replace(',', ' ') + ' FCFA' if v else '—'

    elements = []

    elements.append(Paragraph("DEVIS D'IMPRESSION", title_style))
    elements.append(Spacer(1, 3*mm))

    # Infos
    info_data = [
        ['Devis n°', f"PRT-{pr.id:06d}"],
        ['Date', pr.created_at.strftime('%d/%m/%Y')],
        ['Statut', pr.get_status_display()],
    ]
    info_table = Table(info_data, colWidths=[35*mm, 80*mm])
    info_table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('TEXTCOLOR', (0, 0), (0, -1), DARK),
        ('TEXTCOLOR', (1, 0), (1, -1), MUTED),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
    ]))
    elements.append(info_table)
    elements.append(Spacer(1, 6*mm))

    # Demandeur + Imprimerie
    requester_name = pr.requester.get_full_name() if pr.requester else '—'
    requester_org_name = pr.requester_org.name if pr.requester_org else ''
    printer_name = pr.printer.name if pr.printer else '—'
    printer_city = pr.printer.city if pr.printer else ''

    left_text = f"<b>Demandeur</b><br/>{requester_name}"
    if requester_org_name:
        left_text += f"<br/>{requester_org_name}"

    right_text = f"<b>Imprimerie</b><br/>{printer_name}"
    if printer_city:
        right_text += f"<br/>{printer_city}"

    addr_table = Table(
        [[Paragraph(left_text, small), Paragraph(right_text, small)]],
        colWidths=[85*mm, 85*mm],
    )
    addr_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('BACKGROUND', (0, 0), (-1, -1), LIGHT_BG),
        ('BOX', (0, 0), (-1, -1), 0.5, BORDER),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
    ]))
    elements.append(addr_table)
    elements.append(Spacer(1, 8*mm))

    # Détail impression
    data = [
        ['Livre', 'Quantité', 'Prix unitaire', 'Total'],
        [
            Paragraph(pr.book.title if pr.book else '—', ParagraphStyle('cell', parent=normal, fontSize=9, leading=12)),
            str(pr.quantity),
            fmt(pr.unit_price),
            fmt(pr.total_price),
        ],
    ]
    if pr.delivery_address:
        data.append(['Livraison', Paragraph(pr.delivery_address, small), '', ''])

    table = Table(data, colWidths=[70*mm, 30*mm, 35*mm, 35*mm])
    table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), DARK),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('ALIGN', (1, 0), (-1, -1), 'CENTER'),
        ('GRID', (0, 0), (-1, -1), 0.4, BORDER),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, LIGHT_BG]),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
    ]))
    elements.append(table)
    elements.append(Spacer(1, 8*mm))

    # Total
    if pr.total_price:
        totals_data = [['TOTAL', fmt(pr.total_price)]]
        totals_table = Table(totals_data, colWidths=[110*mm, 55*mm])
        totals_table.setStyle(TableStyle([
            ('ALIGN', (0, 0), (-1, -1), 'RIGHT'),
            ('FONTNAME', (0, 0), (-1, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 12),
            ('TEXTCOLOR', (0, 0), (-1, -1), DARK),
            ('LINEABOVE', (0, 0), (-1, -1), 1.5, DARK),
            ('TOPPADDING', (0, 0), (-1, -1), 6),
        ]))
        elements.append(totals_table)
        elements.append(Spacer(1, 12*mm))

    # Mentions
    for line in [
        "Frollot — Plateforme de distribution et services du livre",
        "Libreville, Gabon",
        "Ce devis est valable 30 jours à compter de sa date d'émission.",
        f"Devis généré le {pr.created_at.strftime('%d/%m/%Y')}.",
    ]:
        elements.append(Paragraph(line, footer_style))

    elements.append(Spacer(1, 8*mm))
    elements.append(Paragraph("Merci pour votre confiance — Frollot", ParagraphStyle('Thanks', parent=normal, fontSize=9, textColor=PRIMARY, alignment=1)))

    doc.build(elements)
    buffer.seek(0)
    return buffer


def generate_service_quote_pdf(quote):
    """
    Génère un devis PDF professionnel pour un ServiceQuote.
    Retourne un objet BytesIO contenant le PDF.
    """
    PAYMENT_LABELS = {
        '100_UPFRONT': '100% à la commande',
        '50_50': '50% à la commande, 50% à la livraison',
        '30_70': '30% à la commande, 70% à la livraison',
        'ON_DELIVERY': '100% à la livraison',
    }
    REPORTING_LABELS = {
        'EACH_MILESTONE': 'À chaque jalon',
        'WEEKLY': 'Hebdomadaire',
        'BIWEEKLY': 'Toutes les deux semaines',
        'ON_COMPLETION': 'À la livraison uniquement',
    }

    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4,
        rightMargin=18*mm, leftMargin=18*mm, topMargin=18*mm, bottomMargin=18*mm)

    styles = getSampleStyleSheet()
    n = styles['Normal']
    title_s = ParagraphStyle('QT', parent=styles['Heading1'], fontSize=18, spaceAfter=2, textColor=DARK)
    h2 = ParagraphStyle('QH2', parent=n, fontSize=11, fontName='Helvetica-Bold', spaceAfter=4, textColor=PRIMARY, spaceBefore=2)
    sm = ParagraphStyle('QSm', parent=n, fontSize=8, textColor=MUTED, leading=11)
    bd = ParagraphStyle('QBd', parent=n, fontSize=9, textColor=DARK, leading=13)
    ft = ParagraphStyle('QFt', parent=n, fontSize=7, textColor=MUTED)

    def fmt(v):
        return f"{float(v):,.0f}".replace(',', ' ')

    def p(txt, s=bd):
        return Paragraph(str(txt).replace('\n', '<br/>'), s)
    W = 174 * mm  # usable width

    # Shared table style helper
    def header_style():
        return [
            ('BACKGROUND', (0, 0), (-1, 0), DARK),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 8),
            ('FONTSIZE', (0, 1), (-1, -1), 9),
            ('GRID', (0, 0), (-1, -1), 0.4, BORDER),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, LIGHT_BG]),
            ('TOPPADDING', (0, 0), (-1, -1), 5),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
            ('LEFTPADDING', (0, 0), (-1, -1), 6),
            ('RIGHTPADDING', (0, 0), (-1, -1), 6),
        ]

    els = []
    req = quote.request
    client = req.client
    prov = req.provider_profile.user if req.provider_profile else None

    # ═══ EN-TÊTE ═══
    logo_path = getattr(settings, 'LOGO_PATH_PDF', None) or getattr(settings, 'LOGO_PATH', None)
    header_left = []
    if logo_path and logo_path.exists():
        try:
            header_left.append(Image(str(logo_path), width=14*mm, height=14*mm))
        except Exception:
            pass
    header_right = [
        Paragraph(f"<b>DEVIS N° SVC-{quote.id:06d}</b>", ParagraphStyle('QRef', parent=n, fontSize=10, textColor=DARK, alignment=2)),
        Paragraph(f"Date : {quote.created_at.strftime('%d/%m/%Y')}", ParagraphStyle('QDate', parent=n, fontSize=8, textColor=MUTED, alignment=2)),
    ]
    if quote.valid_until:
        header_right.append(Paragraph(f"Valide jusqu'au : {quote.valid_until.strftime('%d/%m/%Y')}", ParagraphStyle('QVal', parent=n, fontSize=8, textColor=MUTED, alignment=2)))

    h_table = Table([[header_left, header_right]], colWidths=[W*0.4, W*0.6])
    h_table.setStyle(TableStyle([('VALIGN', (0,0), (-1,-1), 'TOP')]))
    els.append(h_table)
    els.append(Spacer(1, 2*mm))
    els.append(Paragraph("DEVIS DE SERVICE", title_s))
    els.append(Spacer(1, 5*mm))

    # ═══ PARTIES (2 colonnes) ═══
    c_name = client.get_full_name() or client.username
    c_phone = getattr(client, 'phone_number', '') or ''
    p_name = prov.get_full_name() if prov else '—'
    p_phone = getattr(prov, 'phone_number', '') or '' if prov else ''
    ct = f"<b>CLIENT</b><br/>{c_name}<br/>{client.email}"
    if c_phone:
        ct += f"<br/>{c_phone}"
    pt = f"<b>PRESTATAIRE</b><br/>{p_name}"
    if prov:
        pt += f"<br/>{prov.email}"
    if p_phone:
        pt += f"<br/>{p_phone}"

    parties = Table([[p(ct, sm), p(pt, sm)]], colWidths=[W/2, W/2])
    parties.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('BACKGROUND', (0,0), (-1,-1), LIGHT_BG),
        ('BOX', (0,0), (-1,-1), 0.5, BORDER),
        ('LINEAFTER', (0,0), (0,-1), 0.5, BORDER),
        ('TOPPADDING', (0,0), (-1,-1), 7), ('BOTTOMPADDING', (0,0), (-1,-1), 7),
        ('LEFTPADDING', (0,0), (-1,-1), 8), ('RIGHTPADDING', (0,0), (-1,-1), 8),
    ]))
    els.append(parties)
    els.append(Spacer(1, 6*mm))

    # ═══ TABLEAU RÉCAPITULATIF ═══
    els.append(Paragraph("Récapitulatif du projet", h2))
    desc = (req.description or '')[:300]
    if len(req.description or '') > 300:
        desc += '...'
    recap = [
        ['Projet', p(f"<b>{req.title}</b>")],
    ]
    if desc:
        recap.append(['Description', p(desc)])
    if req.page_count:
        recap.append(['Pages', str(req.page_count)])
    if req.word_count:
        recap.append(['Mots', f"{req.word_count:,}".replace(',', ' ')])
    recap.append(['Délai proposé', f"{quote.turnaround_days} jours"])
    recap.append(['Révisions incluses', str(quote.revision_rounds or 1)])
    if quote.reporting_frequency:
        recap.append(['Reporting', REPORTING_LABELS.get(quote.reporting_frequency, quote.reporting_frequency)])

    recap_t = Table(recap, colWidths=[40*mm, W-40*mm])
    recap_t.setStyle(TableStyle([
        ('FONTNAME', (0,0), (0,-1), 'Helvetica-Bold'),
        ('FONTSIZE', (0,0), (-1,-1), 9),
        ('TEXTCOLOR', (0,0), (0,-1), MUTED),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('GRID', (0,0), (-1,-1), 0.3, BORDER),
        ('ROWBACKGROUNDS', (0,0), (-1,-1), [colors.white, LIGHT_BG]),
        ('TOPPADDING', (0,0), (-1,-1), 4), ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ('LEFTPADDING', (0,0), (-1,-1), 6),
    ]))
    els.append(recap_t)
    els.append(Spacer(1, 6*mm))

    # ═══ PÉRIMÈTRE + EXCLUSIONS (tableau) ═══
    if quote.scope_of_work or quote.exclusions:
        els.append(Paragraph("Périmètre de la prestation", h2))
        scope_rows = []
        if quote.scope_of_work:
            scope_rows.append(['Inclus', p(quote.scope_of_work)])
        if quote.exclusions:
            scope_rows.append(['Non inclus', p(quote.exclusions)])
        if scope_rows:
            sc_t = Table(scope_rows, colWidths=[30*mm, W-30*mm])
            sc_t.setStyle(TableStyle([
                ('FONTNAME', (0,0), (0,-1), 'Helvetica-Bold'),
                ('FONTSIZE', (0,0), (-1,-1), 9),
                ('TEXTCOLOR', (0,0), (0,-1), MUTED),
                ('VALIGN', (0,0), (-1,-1), 'TOP'),
                ('GRID', (0,0), (-1,-1), 0.3, BORDER),
                ('BACKGROUND', (0,0), (0,-1), LIGHT_BG),
                ('TOPPADDING', (0,0), (-1,-1), 5), ('BOTTOMPADDING', (0,0), (-1,-1), 5),
                ('LEFTPADDING', (0,0), (-1,-1), 6),
            ]))
            els.append(sc_t)
        els.append(Spacer(1, 6*mm))

    # ═══ MÉTHODOLOGIE ═══
    if quote.methodology:
        els.append(Paragraph("Méthodologie de travail", h2))
        els.append(p(quote.methodology))
        els.append(Spacer(1, 6*mm))

    # ═══ JALONS ═══
    milestones = quote.milestones or []
    if milestones:
        els.append(Paragraph("Planning / Jalons", h2))
        ms_data = [['#', 'Jalon', 'Durée', 'Livrable']]
        total_days = 0
        for idx, ms in enumerate(milestones, 1):
            d = int(ms.get('days', 0) or 0)
            total_days += d
            ms_data.append([
                str(idx),
                p(ms.get('title', '—')),
                f"{d}j",
                p(ms.get('deliverable', '—')),
            ])
        ms_data.append(['', Paragraph('<b>Total</b>', bd), f"<b>{total_days}j</b>", ''])
        ms_t = Table(ms_data, colWidths=[12*mm, 60*mm, 20*mm, W-92*mm])
        ms_t.setStyle(TableStyle(header_style() + [
            ('ALIGN', (0,0), (0,-1), 'CENTER'),
            ('ALIGN', (2,0), (2,-1), 'CENTER'),
            ('FONTNAME', (0,-1), (-1,-1), 'Helvetica-Bold'),
            ('BACKGROUND', (0,-1), (-1,-1), LIGHT_BG),
        ]))
        els.append(ms_t)
        els.append(Spacer(1, 6*mm))

    # ═══ TARIFICATION ═══
    els.append(Paragraph("Tarification", h2))
    price_data = [
        ['Désignation', 'Détails', 'Montant (FCFA)'],
        [p(f"<b>{req.title}</b>"), f"{quote.turnaround_days} jours · {quote.revision_rounds} rév.", fmt(quote.price)],
    ]
    # Si jalons, montrer la ventilation estimée
    if milestones and len(milestones) > 1:
        per_ms = float(quote.price) / len(milestones)
        for idx, ms in enumerate(milestones, 1):
            price_data.append([f"   Jalon {idx} : {ms.get('title', '')}", f"{ms.get('days', 0)}j", fmt(per_ms)])

    price_data.append([Paragraph('<b>TOTAL TTC</b>', ParagraphStyle('Tb', parent=n, fontSize=10, fontName='Helvetica-Bold')), '', Paragraph(f"<b>{fmt(quote.price)} FCFA</b>", ParagraphStyle('Tp', parent=n, fontSize=11, fontName='Helvetica-Bold', alignment=2))])

    price_t = Table(price_data, colWidths=[W*0.5, W*0.25, W*0.25])
    price_t.setStyle(TableStyle(header_style() + [
        ('ALIGN', (2,0), (2,-1), 'RIGHT'),
        ('FONTNAME', (0,-1), (-1,-1), 'Helvetica-Bold'),
        ('FONTSIZE', (0,-1), (-1,-1), 10),
        ('BACKGROUND', (0,-1), (-1,-1), LIGHT_BG),
        ('LINEABOVE', (0,-1), (-1,-1), 1.5, DARK),
    ]))
    els.append(price_t)
    els.append(Spacer(1, 5*mm))

    # ═══ CONDITIONS — tableau compact ═══
    els.append(Paragraph("Conditions", h2))
    payment_label = PAYMENT_LABELS.get(quote.payment_terms, quote.payment_terms or '—')
    cond_rows = [
        ['Paiement', payment_label],
        ['Validité', f"Jusqu'au {quote.valid_until.strftime('%d/%m/%Y')}" if quote.valid_until else '—'],
        ['Révisions', f"{quote.revision_rounds} tour(s) inclus"],
    ]
    if quote.reporting_frequency:
        cond_rows.append(['Reporting', REPORTING_LABELS.get(quote.reporting_frequency, quote.reporting_frequency)])
    if quote.message:
        cond_rows.append(['Notes', p(quote.message)])

    cond_t = Table(cond_rows, colWidths=[35*mm, W-35*mm])
    cond_t.setStyle(TableStyle([
        ('FONTNAME', (0,0), (0,-1), 'Helvetica-Bold'),
        ('FONTSIZE', (0,0), (-1,-1), 9),
        ('TEXTCOLOR', (0,0), (0,-1), MUTED),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('GRID', (0,0), (-1,-1), 0.3, BORDER),
        ('ROWBACKGROUNDS', (0,0), (-1,-1), [colors.white, LIGHT_BG]),
        ('TOPPADDING', (0,0), (-1,-1), 4), ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ('LEFTPADDING', (0,0), (-1,-1), 6),
    ]))
    els.append(cond_t)

    # ═══ PIED DE PAGE ═══
    els.append(Spacer(1, 10*mm))
    els.append(Paragraph("Frollot — Plateforme sociale du livre · contact@frollot.com · Port-Gentil, Gabon", ft))
    els.append(Paragraph(f"Document généré le {quote.created_at.strftime('%d/%m/%Y à %H:%M')}", ft))

    doc.build(els)
    buffer.seek(0)
    return buffer


def generate_dqe_quote_pdf(quote):
    """
    Génère un devis éditorial PDF (DQE) pour un manuscrit.
    Retourne un objet BytesIO contenant le PDF.
    """
    from apps.services.models import Quote

    quote = Quote.objects.select_related(
        'provider_organization', 'client', 'manuscript', 'template',
    ).prefetch_related('lots__items').get(pk=quote.pk)

    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer, pagesize=A4,
        rightMargin=18 * mm, leftMargin=18 * mm,
        topMargin=18 * mm, bottomMargin=18 * mm,
    )

    styles = getSampleStyleSheet()
    title_style = ParagraphStyle('DQTitle', parent=styles['Heading1'], fontSize=18, spaceAfter=2, textColor=DARK)
    h2 = ParagraphStyle('DQH2', parent=styles['Heading2'], fontSize=11, spaceAfter=4, textColor=DARK)
    h3 = ParagraphStyle('DQH3', parent=styles['Heading3'], fontSize=10, spaceAfter=3, textColor=PRIMARY)
    normal = styles['Normal']
    small = ParagraphStyle('DQSmall', parent=normal, fontSize=9, spaceAfter=2, textColor=MUTED)
    footer_style = ParagraphStyle('DQFooter', parent=normal, fontSize=7, textColor=MUTED, spaceAfter=1)

    def fmt(v):
        return f"{float(v):,.0f}".replace(',', ' ') + ' FCFA'

    elements = []

    # ═══ EN-TÊTE ═══
    logo_path = getattr(settings, 'LOGO_PATH', None)
    if logo_path and logo_path.exists():
        try:
            img = Image(str(logo_path), width=16 * mm, height=16 * mm)
            img.hAlign = 'LEFT'
            elements.append(img)
            elements.append(Spacer(1, 2 * mm))
        except Exception:
            pass

    elements.append(Paragraph("DEVIS ÉDITORIAL", title_style))
    elements.append(Spacer(1, 3 * mm))

    # ═══ INFOS DEVIS ═══
    model_display = quote.get_publishing_model_display() if quote.publishing_model else '—'
    info_data = [
        ['Référence', quote.reference],
        ['Date', quote.created_at.strftime('%d/%m/%Y')],
        ['Modèle éditorial', model_display],
        ['Validité', f"{quote.validity_days} jours (jusqu'au {quote.valid_until.strftime('%d/%m/%Y') if quote.valid_until else '—'})"],
        ['Délai de réalisation', f"{quote.delivery_days} jours ouvrés"],
    ]
    info_table = Table(info_data, colWidths=[45 * mm, 120 * mm])
    info_table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('TEXTCOLOR', (0, 0), (0, -1), DARK),
        ('TEXTCOLOR', (1, 0), (1, -1), MUTED),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
    ]))
    elements.append(info_table)
    elements.append(Spacer(1, 6 * mm))

    # ═══ CLIENT + ÉDITEUR (2 colonnes) ═══
    client_name = quote.client.get_full_name() if quote.client else quote.client_name or '—'
    client_email = quote.client.email if quote.client else quote.client_email or ''
    org = quote.provider_organization
    org_name = org.name if org else '—'
    org_email = org.email if org else ''
    org_city = getattr(org, 'city', '') or ''

    client_text = f"<b>Auteur / Destinataire</b><br/>{client_name}"
    if client_email:
        client_text += f"<br/>{client_email}"

    editor_text = f"<b>Maison d'édition</b><br/>{org_name}"
    if org_city:
        editor_text += f"<br/>{org_city}"
    if org_email:
        editor_text += f"<br/>{org_email}"

    addr_table = Table(
        [[Paragraph(client_text, small), Paragraph(editor_text, small)]],
        colWidths=[85 * mm, 85 * mm],
    )
    addr_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('BACKGROUND', (0, 0), (-1, -1), LIGHT_BG),
        ('BOX', (0, 0), (-1, -1), 0.5, BORDER),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('RIGHTPADDING', (0, 0), (-1, -1), 8),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
    ]))
    elements.append(addr_table)
    elements.append(Spacer(1, 6 * mm))

    # ═══ MANUSCRIT ═══
    ms = quote.manuscript
    if ms:
        elements.append(Paragraph("Manuscrit concerné", h2))
        ms_data = [
            ['Titre', ms.title],
            ['Auteur', ms.author_name],
            ['Genre', ms.get_genre_display()],
            ['Référence', f"MS-{ms.id:05d}"],
        ]
        if ms.page_count:
            ms_data.append(['Pages', str(ms.page_count)])
        ms_table = Table(ms_data, colWidths=[35 * mm, 130 * mm])
        ms_table.setStyle(TableStyle([
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('TEXTCOLOR', (0, 0), (0, -1), DARK),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
        ]))
        elements.append(ms_table)
        elements.append(Spacer(1, 6 * mm))

    # ═══ DÉTAIL DES PRESTATIONS (lots + lignes) ═══
    elements.append(Paragraph("Détail des prestations", h2))
    elements.append(Spacer(1, 2 * mm))

    for lot in quote.lots.all().order_by('order'):
        elements.append(Paragraph(f"<b>{lot.name}</b>", h3))

        data = [['Désignation', 'Unité', 'Qté', 'P.U. (FCFA)', 'Total (FCFA)']]
        for item in lot.items.all().order_by('order'):
            designation = item.designation
            if item.description:
                designation += f"<br/><font size=7 color='#64748b'>{item.description[:120]}</font>"
            data.append([
                Paragraph(designation, ParagraphStyle('cell', parent=normal, fontSize=9, leading=12)),
                item.get_unit_display(),
                f"{float(item.quantity):g}",
                f"{float(item.unit_price):,.0f}".replace(',', ' '),
                f"{float(item.total):,.0f}".replace(',', ' '),
            ])

        # Sous-total du lot
        data.append([
            '', '', '', Paragraph('<b>Sous-total</b>', ParagraphStyle('st', parent=normal, fontSize=9)),
            Paragraph(f"<b>{fmt(lot.subtotal)}</b>", ParagraphStyle('stv', parent=normal, fontSize=9)),
        ])

        col_widths = [68 * mm, 22 * mm, 15 * mm, 28 * mm, 32 * mm]
        table = Table(data, colWidths=col_widths)
        table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), DARK),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('ALIGN', (2, 0), (-1, -1), 'CENTER'),
            ('ALIGN', (0, 0), (0, -1), 'LEFT'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('GRID', (0, 0), (-1, -2), 0.4, BORDER),
            ('ROWBACKGROUNDS', (0, 1), (-1, -2), [colors.white, LIGHT_BG]),
            ('BACKGROUND', (0, -1), (-1, -1), LIGHT_BG),
            ('LINEABOVE', (0, -1), (-1, -1), 1, DARK),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
            ('TOPPADDING', (0, 0), (-1, -1), 5),
        ]))
        elements.append(table)
        elements.append(Spacer(1, 4 * mm))

    # ═══ TOTAUX ═══
    elements.append(Spacer(1, 3 * mm))
    totals_data = [['Sous-total HT', fmt(quote.subtotal)]]
    if quote.discount_amount and float(quote.discount_amount) > 0:
        if quote.discount_type == 'PERCENT':
            totals_data.append([f'Remise ({float(quote.discount_value)}%)', f"-{fmt(quote.discount_amount)}"])
        else:
            totals_data.append(['Remise', f"-{fmt(quote.discount_amount)}"])
    if float(quote.tax_rate) > 0:
        totals_data.append([f'TVA ({float(quote.tax_rate)}%)', fmt(quote.tax_amount)])
    else:
        totals_data.append(['TVA', 'Exonéré'])
    totals_data.append(['TOTAL TTC', fmt(quote.total_ttc)])

    totals_table = Table(totals_data, colWidths=[110 * mm, 55 * mm])
    totals_table.setStyle(TableStyle([
        ('ALIGN', (0, 0), (-1, -1), 'RIGHT'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('TEXTCOLOR', (0, 0), (-1, -2), MUTED),
        ('FONTNAME', (0, -1), (-1, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, -1), (-1, -1), 12),
        ('TEXTCOLOR', (0, -1), (-1, -1), DARK),
        ('LINEABOVE', (0, -1), (-1, -1), 1.5, DARK),
        ('TOPPADDING', (0, -1), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
    ]))
    elements.append(totals_table)
    elements.append(Spacer(1, 8 * mm))

    # ═══ DROITS D'AUTEUR ═══
    if quote.royalty_terms:
        elements.append(Paragraph("Droits d'auteur", h2))
        royalty_data = [['Tranche', 'Taux']]
        for tier in quote.royalty_terms:
            if 'up_to' in tier:
                label = f"Jusqu'à {tier['up_to']:,} exemplaires".replace(',', ' ')
            elif 'above' in tier:
                label = f"Au-delà de {tier['above']:,} exemplaires".replace(',', ' ')
            else:
                label = '—'
            royalty_data.append([label, f"{tier.get('rate', 0)} %"])

        r_table = Table(royalty_data, colWidths=[110 * mm, 55 * mm])
        r_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), DARK),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('ALIGN', (1, 0), (1, -1), 'CENTER'),
            ('GRID', (0, 0), (-1, -1), 0.4, BORDER),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, LIGHT_BG]),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
            ('TOPPADDING', (0, 0), (-1, -1), 5),
        ]))
        elements.append(r_table)
        elements.append(Spacer(1, 6 * mm))

    # ═══ ÉCHÉANCIER DE PAIEMENT ═══
    if quote.payment_schedule:
        elements.append(Paragraph("Échéancier de paiement", h2))
        sched_data = [['Jalon', 'Part', 'Montant']]
        for milestone in quote.payment_schedule:
            sched_data.append([
                milestone.get('label', '—'),
                f"{milestone.get('percent', 0)} %",
                fmt(milestone.get('amount', 0)),
            ])
        s_table = Table(sched_data, colWidths=[85 * mm, 30 * mm, 50 * mm])
        s_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), DARK),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('ALIGN', (1, 0), (-1, -1), 'CENTER'),
            ('GRID', (0, 0), (-1, -1), 0.4, BORDER),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, LIGHT_BG]),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
            ('TOPPADDING', (0, 0), (-1, -1), 5),
        ]))
        elements.append(s_table)
        elements.append(Spacer(1, 6 * mm))

    # ═══ CONDITIONS ═══
    if quote.notes:
        elements.append(Paragraph("Conditions particulières", h2))
        elements.append(Paragraph(quote.notes.replace('\n', '<br/>'), small))
        elements.append(Spacer(1, 4 * mm))

    cond_data = [
        ['Révisions incluses', str(quote.revision_rounds)],
    ]
    if quote.print_run:
        cond_data.append(['Tirage prévu', f"{quote.print_run:,} exemplaires".replace(',', ' ')])
    if quote.retail_price:
        cond_data.append(['Prix de vente prévu', fmt(quote.retail_price)])

    if cond_data:
        c_table = Table(cond_data, colWidths=[55 * mm, 110 * mm])
        c_table.setStyle(TableStyle([
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('TEXTCOLOR', (0, 0), (0, -1), DARK),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
        ]))
        elements.append(c_table)
        elements.append(Spacer(1, 8 * mm))

    # ═══ MENTIONS LÉGALES ═══
    legal_lines = [
        "Frollot — Plateforme sociale du livre francophone",
        "Libreville, Gabon",
        f"Devis {quote.reference} — Modèle : {model_display}",
        "Ce devis est valable pour la durée indiquée ci-dessus.",
        "L'acceptation de ce devis vaut engagement contractuel entre les parties.",
        f"Document généré le {quote.created_at.strftime('%d/%m/%Y')}.",
    ]
    for line in legal_lines:
        elements.append(Paragraph(line, footer_style))

    elements.append(Spacer(1, 8 * mm))
    elements.append(Paragraph(
        "Frollot — Là où vivent les livres francophones",
        ParagraphStyle('Thanks', parent=normal, fontSize=9, textColor=PRIMARY, alignment=1),
    ))

    doc.build(elements)
    buffer.seek(0)
    return buffer
