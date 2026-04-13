from django.urls import path
from .views import (
    NotificationListView,
    UnreadCountView,
    MarkAsReadView,
    MarkAllAsReadView,
    DeleteNotificationView,
)

app_name = 'notifications'

urlpatterns = [
    path('', NotificationListView.as_view(), name='list'),
    path('unread_count/', UnreadCountView.as_view(), name='unread-count'),
    path('<int:pk>/mark_as_read/', MarkAsReadView.as_view(), name='mark-as-read'),
    path('mark_all_as_read/', MarkAllAsReadView.as_view(), name='mark-all-as-read'),
    path('<int:pk>/', DeleteNotificationView.as_view(), name='delete'),
]
