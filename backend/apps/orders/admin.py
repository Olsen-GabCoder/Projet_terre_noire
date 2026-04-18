import logging

from django.contrib import admin
from django.db import transaction

from .models import Order, OrderItem, Payment, Refund

logger = logging.getLogger(__name__)

NOTIFICATION_MAP = {
    'PAID': 'apps.core.tasks.send_order_paid_task',
    'SHIPPED': 'apps.core.tasks.send_order_shipped_task',
    'DELIVERED': 'apps.core.tasks.send_order_delivered_task',
    'CANCELLED': 'apps.core.tasks.send_order_cancelled_task',
}


class OrderItemInline(admin.TabularInline):
    model = OrderItem
    extra = 0
    readonly_fields = ['book', 'quantity', 'price']
    can_delete = True


class PaymentInline(admin.StackedInline):
    model = Payment
    extra = 0
    readonly_fields = ['transaction_id', 'provider', 'status', 'amount', 'created_at']
    can_delete = True


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = [
        'id',
        'user',
        'status',
        'subtotal',
        'shipping_cost',
        'discount_amount',
        'coupon_code',
        'total_amount',
        'shipping_city',
        'created_at',
    ]
    list_filter = ['status', 'created_at']
    search_fields = ['id', 'user__email', 'shipping_address', 'shipping_city', 'shipping_phone']
    readonly_fields = ['created_at', 'updated_at']
    list_editable = []
    inlines = [OrderItemInline, PaymentInline]
    date_hierarchy = 'created_at'

    def save_model(self, request, obj, form, change):
        if change and 'status' in form.changed_data:
            old_status = form.initial.get('status')
            new_status = obj.status
            super().save_model(request, obj, form, change)

            task_path = NOTIFICATION_MAP.get(new_status)
            if task_path and old_status != new_status:
                def dispatch():
                    try:
                        import importlib
                        module_path, task_name = task_path.rsplit('.', 1)
                        module = importlib.import_module(module_path)
                        task = getattr(module, task_name)
                        task.delay(obj.id)
                    except Exception:
                        logger.exception("Admin: erreur notification commande #%s → %s", obj.id, new_status)
                transaction.on_commit(dispatch)
        else:
            super().save_model(request, obj, form, change)


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = ['transaction_id', 'order', 'provider', 'status', 'amount', 'created_at']
    list_filter = ['provider', 'status']
    search_fields = ['transaction_id', 'order__id']
    readonly_fields = ['created_at']


@admin.register(Refund)
class RefundAdmin(admin.ModelAdmin):
    list_display = ['id', 'order', 'user', 'amount', 'reason', 'status', 'created_at', 'processed_at']
    list_filter = ['status', 'reason']
    search_fields = ['order__id', 'user__username', 'user__email']
    readonly_fields = ['created_at', 'processed_at']
    raw_id_fields = ['order', 'user']
