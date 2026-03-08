from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from apps.books.models import Book
from .models import WishlistItem
from .serializers import WishlistItemSerializer, WishlistAddSerializer


class WishlistListView(APIView):
    """Liste des livres dans la liste d'envie de l'utilisateur connecté."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        items = WishlistItem.objects.filter(user=request.user).select_related('book', 'book__author', 'book__category')
        serializer = WishlistItemSerializer(items, many=True)
        books = [item['book'] for item in serializer.data]
        return Response({'results': books})


class WishlistAddView(APIView):
    """Ajouter un livre à la liste d'envie (sans retirer si déjà présent)."""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = WishlistAddSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        book_id = serializer.validated_data['book_id']
        try:
            book = Book.objects.get(id=book_id)
        except Book.DoesNotExist:
            return Response({'detail': 'Livre introuvable.'}, status=status.HTTP_404_NOT_FOUND)
        WishlistItem.objects.get_or_create(user=request.user, book=book)
        return Response({'message': 'Ajouté à la liste d\'envie.'}, status=status.HTTP_201_CREATED)


class WishlistToggleView(APIView):
    """Ajouter ou retirer un livre de la liste d'envie."""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = WishlistAddSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        book_id = serializer.validated_data['book_id']
        try:
            book = Book.objects.get(id=book_id)
        except Book.DoesNotExist:
            return Response({'detail': 'Livre introuvable.'}, status=status.HTTP_404_NOT_FOUND)
        item, created = WishlistItem.objects.get_or_create(user=request.user, book=book)
        if not created:
            item.delete()
            return Response({'added': False, 'message': 'Retiré de la liste d\'envie.'})
        return Response({'added': True, 'message': 'Ajouté à la liste d\'envie.'})

    def delete(self, request, book_id=None):
        if book_id is None:
            return Response({'detail': 'book_id requis.'}, status=status.HTTP_400_BAD_REQUEST)
        deleted, _ = WishlistItem.objects.filter(user=request.user, book_id=book_id).delete()
        if not deleted:
            return Response({'detail': 'Non trouvé dans la liste.'}, status=status.HTTP_404_NOT_FOUND)
        return Response({'message': 'Retiré de la liste d\'envie.'})
