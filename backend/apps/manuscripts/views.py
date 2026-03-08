from rest_framework import generics, status, permissions
from rest_framework.permissions import AllowAny, IsAdminUser
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.views import APIView

from apps.core.throttling import PublicEndpointThrottle
from .models import Manuscript
from .serializers import ManuscriptSerializer

class ManuscriptCreateView(generics.CreateAPIView):
    queryset = Manuscript.objects.all()
    serializer_class = ManuscriptSerializer
    permission_classes = [AllowAny]
    throttle_classes = [PublicEndpointThrottle]
    parser_classes = [MultiPartParser, FormParser]
    
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        manuscript = serializer.instance
        try:
            from apps.core.email import send_manuscript_acknowledgment
            send_manuscript_acknowledgment(manuscript)
        except Exception:
            pass
        headers = self.get_success_headers(serializer.data)
        return Response(
            {
                'success': True,
                'message': 'Votre manuscrit a été soumis avec succès.',
                'data': serializer.data
            },
            status=status.HTTP_201_CREATED,
            headers=headers
        )

class ManuscriptListView(generics.ListAPIView):
    """
    Vue pour lister tous les manuscrits (Admin seulement)
    Endpoint: GET /api/manuscripts/
    """
    queryset = Manuscript.objects.all().order_by('-submitted_at')
    serializer_class = ManuscriptSerializer
    permission_classes = [IsAdminUser]

class ManuscriptDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    Vue pour voir, modifier ou supprimer un manuscrit spécifique (Admin seulement)
    Endpoint: GET/PUT/PATCH/DELETE /api/manuscripts/{id}/
    """
    queryset = Manuscript.objects.all()
    serializer_class = ManuscriptSerializer
    permission_classes = [IsAdminUser]
    parser_classes = [MultiPartParser, FormParser]
    
    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        
        return Response(
            {
                'success': True,
                'message': 'Manuscrit mis à jour avec succès.',
                'data': serializer.data
            }
        )
    
    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        self.perform_destroy(instance)
        return Response(
            {
                'success': True,
                'message': 'Manuscrit supprimé avec succès.'
            },
            status=status.HTTP_200_OK
        )

class ManuscriptStatusUpdateView(APIView):
    """
    Vue spécifique pour mettre à jour uniquement le statut d'un manuscrit
    Endpoint: PATCH /api/manuscripts/{id}/update-status/
    """
    permission_classes = [IsAdminUser]
    
    def patch(self, request, pk):
        try:
            manuscript = Manuscript.objects.get(pk=pk)
        except Manuscript.DoesNotExist:
            return Response(
                {'error': 'Manuscrit non trouvé.'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        status_value = request.data.get('status')
        if status_value not in [choice[0] for choice in Manuscript.STATUS_CHOICES]:
            return Response(
                {'error': f'Statut invalide. Choisissez parmi: {[choice[1] for choice in Manuscript.STATUS_CHOICES]}'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        manuscript.status = status_value
        manuscript.save()
        
        return Response(
            {
                'success': True,
                'message': f'Statut du manuscrit mis à jour à "{manuscript.get_status_display()}"',
                'data': ManuscriptSerializer(manuscript).data
            }
        )