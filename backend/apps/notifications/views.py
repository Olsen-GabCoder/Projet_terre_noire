from django.utils import timezone
from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.pagination import PageNumberPagination

from .models import Notification
from .serializers import NotificationSerializer


class NotificationPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 50


class NotificationListView(generics.ListAPIView):
    """GET /api/notifications/ — liste paginée des notifications de l'utilisateur."""
    serializer_class = NotificationSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = NotificationPagination

    def get_queryset(self):
        qs = Notification.objects.filter(recipient=self.request.user)
        is_read = self.request.query_params.get('is_read')
        if is_read is not None:
            qs = qs.filter(is_read=is_read.lower() == 'true')
        return qs


class UnreadCountView(APIView):
    """GET /api/notifications/unread_count/ — nombre de notifications non lues."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        count = Notification.objects.filter(
            recipient=request.user, is_read=False,
        ).count()
        return Response({'count': count})


class MarkAsReadView(APIView):
    """PATCH /api/notifications/{id}/mark_as_read/ — marque une notification comme lue."""
    permission_classes = [IsAuthenticated]

    def patch(self, request, pk):
        try:
            notif = Notification.objects.get(pk=pk, recipient=request.user)
        except Notification.DoesNotExist:
            return Response({'detail': 'Notification introuvable.'}, status=status.HTTP_404_NOT_FOUND)

        if not notif.is_read:
            notif.is_read = True
            notif.read_at = timezone.now()
            notif.save(update_fields=['is_read', 'read_at'])

        return Response({'success': True})


class MarkAllAsReadView(APIView):
    """POST /api/notifications/mark_all_as_read/ — marque toutes comme lues."""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        updated = Notification.objects.filter(
            recipient=request.user, is_read=False,
        ).update(is_read=True, read_at=timezone.now())
        return Response({'updated': updated})


class DeleteNotificationView(APIView):
    """DELETE /api/notifications/{id}/ — supprime une notification."""
    permission_classes = [IsAuthenticated]

    def delete(self, request, pk):
        try:
            notif = Notification.objects.get(pk=pk, recipient=request.user)
        except Notification.DoesNotExist:
            return Response({'detail': 'Notification introuvable.'}, status=status.HTTP_404_NOT_FOUND)

        notif.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
