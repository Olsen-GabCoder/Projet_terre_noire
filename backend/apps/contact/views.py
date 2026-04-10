from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.core.throttling import PublicEndpointThrottle
from .models import ContactMessage
from .serializers import ContactMessageSerializer


class ContactSubmitView(APIView):
    """Envoi d'un message via le formulaire de contact. Accessible à tous."""
    permission_classes = [AllowAny]
    throttle_classes = [PublicEndpointThrottle]

    def post(self, request):
        serializer = ContactMessageSerializer(data=request.data)
        if serializer.is_valid():
            contact = serializer.save()
            from apps.core.tasks import send_contact_notification_task
            send_contact_notification_task.delay(contact.id)
            return Response(
                {'success': True, 'message': 'Message envoyé ! Nous vous répondrons très bientôt.'},
                status=status.HTTP_201_CREATED
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
