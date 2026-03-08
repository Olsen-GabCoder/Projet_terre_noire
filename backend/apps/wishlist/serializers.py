from rest_framework import serializers
from apps.books.serializers import BookListSerializer
from .models import WishlistItem


class WishlistItemSerializer(serializers.ModelSerializer):
    book = BookListSerializer(read_only=True)

    class Meta:
        model = WishlistItem
        fields = ['id', 'book', 'added_at']


class WishlistAddSerializer(serializers.Serializer):
    book_id = serializers.IntegerField()
