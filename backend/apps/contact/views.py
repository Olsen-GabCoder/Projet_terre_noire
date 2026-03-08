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
            try:
                from apps.core.email import send_contact_notification
                send_contact_notification(contact)
            except Exception:
                pass
            return Response(
                {'success': True, 'message': 'Message envoyé ! Nous vous répondrons très bientôt.'},
                status=status.HTTP_201_CREATED
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
