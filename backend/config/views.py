"""
Vues principales de l'API pour la racine et les tests.
"""
import io
from datetime import datetime, timedelta
from django.utils import timezone
from django.core.management import call_command
from django.http import HttpResponse
from django.contrib.admin.views.decorators import staff_member_required
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAdminUser
from django.db.models import Count, Sum, Avg, Q, F
from django.db.models.functions import TruncMonth, TruncDate

@api_view(['GET'])
@permission_classes([AllowAny])
def csrf_token_view(request):
    """
    Endpoint pour récupérer le CSRF token dans un cookie.
    Le frontend appelle cet endpoint au démarrage pour que le navigateur
    reçoive le cookie csrftoken (non-HttpOnly, lisible par JS).
    """
    from django.middleware.csrf import get_token
    token = get_token(request)
    return Response({'csrfToken': token})


@api_view(['GET'])
@permission_classes([AllowAny])
def api_root(request):
    """
    Endpoint racine de l'API qui liste tous les endpoints disponibles.
    """
    base_url = request.build_absolute_uri('/api/')
    
    return Response({
        'message': 'API Maison d\'Édition - Bienvenue !',
        'version': '1.0.0',
        'endpoints': {
            'authentication': {
                'login': base_url + 'token/',
                'refresh': base_url + 'token/refresh/',
                'register': base_url + 'users/register/',
                'profile': base_url + 'users/me/',
            },
            'users': {
                'list': base_url + 'users/',
                'detail': base_url + 'users/{id}/',
            },
            'books': {
                'list': base_url + 'books/',
                'featured': base_url + 'books/featured/',
                'new_releases': base_url + 'books/new-releases/',
            },
        },
        'documentation': {
            'schema': base_url + 'schema/',
            'swagger': base_url + 'docs/',
            'redoc': base_url + 'redoc/',
        },
        'status': 'operational'
    })


@api_view(['GET'])
@permission_classes([AllowAny])
def health_check(request):
    """
    Endpoint de vérification de santé de l'API.
    """
    from django.db import connection
    from django.db.utils import OperationalError
    
    # Vérifier la connexion à la base de données
    db_connected = True
    try:
        connection.ensure_connection()
    except OperationalError:
        db_connected = False
    
    return Response({
        'status': 'healthy',
        'database': 'connected' if db_connected else 'disconnected',
        'timestamp': timezone.now().isoformat(),
    })


@api_view(['GET'])
@permission_classes([IsAdminUser])
def admin_dashboard_stats(request):
    """
    GET /api/admin/dashboard/
    Statistiques centralisées pour le dashboard admin React.
    """
    from apps.books.models import Book, Category
    from apps.orders.models import Order, OrderItem
    from apps.users.models import User
    from apps.manuscripts.models import Manuscript
    from apps.newsletter.models import NewsletterSubscriber
    from apps.contact.models import ContactMessage

    now = timezone.now()
    thirty_days_ago = now - timedelta(days=30)
    seven_days_ago = now - timedelta(days=7)

    # ── KPIs globaux ──
    total_users = User.objects.count()
    new_users_30d = User.objects.filter(created_at__gte=thirty_days_ago).count()
    total_books = Book.objects.count()
    total_orders = Order.objects.count()
    orders_paid = Order.objects.filter(status='PAID')
    total_revenue = orders_paid.aggregate(total=Sum('total_amount'))['total'] or 0

    # ── Commandes par statut ──
    orders_by_status = dict(
        Order.objects.values_list('status').annotate(c=Count('id')).values_list('status', 'c')
    )

    # ── Revenus des 30 derniers jours ──
    revenue_30d = (
        orders_paid.filter(created_at__gte=thirty_days_ago)
        .aggregate(total=Sum('total_amount'))['total'] or 0
    )

    # ── Évolution revenus par mois (6 derniers mois) ──
    six_months_ago = now - timedelta(days=180)
    revenue_by_month = list(
        orders_paid.filter(created_at__gte=six_months_ago)
        .annotate(month=TruncMonth('created_at'))
        .values('month')
        .annotate(revenue=Sum('total_amount'), count=Count('id'))
        .order_by('month')
    )
    for entry in revenue_by_month:
        entry['month'] = entry['month'].strftime('%Y-%m')
        entry['revenue'] = float(entry['revenue'])

    # ── Commandes récentes (7 derniers jours, par jour) ──
    recent_orders_by_day = list(
        Order.objects.filter(created_at__gte=seven_days_ago)
        .annotate(day=TruncDate('created_at'))
        .values('day')
        .annotate(count=Count('id'))
        .order_by('day')
    )
    for entry in recent_orders_by_day:
        entry['day'] = entry['day'].strftime('%Y-%m-%d')

    # ── Top 5 livres les plus vendus ──
    top_books = list(
        OrderItem.objects.filter(order__status='PAID')
        .values('book__id', 'book__title')
        .annotate(sold=Sum('quantity'), revenue=Sum(F('price') * F('quantity')))
        .order_by('-sold')[:5]
    )
    for b in top_books:
        b['revenue'] = float(b['revenue'])

    # ── Manuscrits ──
    manuscripts_total = Manuscript.objects.count()
    manuscripts_by_status = dict(
        Manuscript.objects.values_list('status').annotate(c=Count('id')).values_list('status', 'c')
    )
    manuscripts_pending = manuscripts_by_status.get('PENDING', 0)

    # ── Newsletter & Contact ──
    newsletter_count = NewsletterSubscriber.objects.filter(is_active=True).count()
    unread_messages = ContactMessage.objects.filter(is_read=False).count()

    # ── Livres par format ──
    books_by_format = dict(
        Book.objects.values_list('format').annotate(c=Count('id')).values_list('format', 'c')
    )

    # ── Catégories avec le plus de livres ──
    top_categories = list(
        Category.objects.annotate(book_count=Count('books'))
        .filter(book_count__gt=0)
        .order_by('-book_count')
        .values('name', 'book_count')[:5]
    )

    return Response({
        'kpis': {
            'total_users': total_users,
            'new_users_30d': new_users_30d,
            'total_books': total_books,
            'total_orders': total_orders,
            'total_revenue': float(total_revenue),
            'revenue_30d': float(revenue_30d),
            'manuscripts_pending': manuscripts_pending,
            'unread_messages': unread_messages,
            'newsletter_subscribers': newsletter_count,
        },
        'orders_by_status': orders_by_status,
        'revenue_by_month': revenue_by_month,
        'recent_orders_by_day': recent_orders_by_day,
        'top_books': top_books,
        'manuscripts_by_status': manuscripts_by_status,
        'manuscripts_total': manuscripts_total,
        'books_by_format': books_by_format,
        'top_categories': top_categories,
    })


@staff_member_required
def admin_backup(request):
    """
    Génère une sauvegarde JSON de la base de données (dumpdata).
    Accessible uniquement aux utilisateurs staff.
    """
    buffer = io.StringIO()
    try:
        call_command('dumpdata', '--natural-foreign', '--natural-primary', stdout=buffer)
        buffer.seek(0)
        content = buffer.getvalue()
    except Exception as e:
        return HttpResponse(
            f"Erreur lors de la sauvegarde : {str(e)}",
            status=500,
            content_type='text/plain; charset=utf-8'
        )
    filename = f"backup_frollot_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
    response = HttpResponse(content, content_type='application/json')
    response['Content-Disposition'] = f'attachment; filename="{filename}"'
    return response