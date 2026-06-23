# backend/apps/books/filters.py

import django_filters
from .models import Book


class BookFilter(django_filters.FilterSet):
    """
    Filtre personnalise pour les livres.
    """
    has_ebook = django_filters.BooleanFilter(
        field_name='has_ebook',
        label='Disponible en ebook',
    )

    class Meta:
        model = Book
        fields = {
            'category': ['exact'],
            'author': ['exact'],
            'available': ['exact'],
            'price': ['gte', 'lte'],
        }