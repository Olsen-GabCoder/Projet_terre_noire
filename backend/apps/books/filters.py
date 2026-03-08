# backend/apps/books/filters.py

import django_filters
from .models import Book


class BookFilter(django_filters.FilterSet):
    """
    Filtre personnalisé pour les livres
    Renomme 'format' en 'book_format' pour éviter le conflit avec DRF
    """
    book_format = django_filters.ChoiceFilter(
        field_name='format',
        choices=Book.FORMAT_CHOICES,
        label='Format du livre'
    )
    
    class Meta:
        model = Book
        fields = {
            'category': ['exact'],
            'author': ['exact'],
            'available': ['exact'],
            'price': ['gte', 'lte'],
        }