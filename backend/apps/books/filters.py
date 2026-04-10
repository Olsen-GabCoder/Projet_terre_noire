# backend/apps/books/filters.py

import django_filters
from django.db.models import Q
from .models import Book


class BookFilter(django_filters.FilterSet):
    """
    Filtre personnalisé pour les livres.
    Renomme 'format' en 'book_format' pour éviter le conflit avec DRF.
    """
    book_format = django_filters.ChoiceFilter(
        field_name='format',
        choices=Book.FORMAT_CHOICES,
        label='Format du livre',
    )
    publisher = django_filters.NumberFilter(
        field_name='publisher_organization',
        label="ID de l'organisation éditrice",
    )
    publisher_slug = django_filters.CharFilter(
        field_name='publisher_organization__slug',
        label="Slug de l'organisation éditrice",
    )
    has_listings = django_filters.BooleanFilter(
        method='filter_has_listings',
        label='Disponible en librairie',
    )
    vendor = django_filters.NumberFilter(
        method='filter_by_vendor',
        label="ID de l'organisation vendeuse",
    )
    vendor_slug = django_filters.CharFilter(
        method='filter_by_vendor_slug',
        label="Slug de l'organisation vendeuse",
    )
    in_library = django_filters.BooleanFilter(
        method='filter_in_library',
        label='Disponible en bibliothèque',
    )
    library = django_filters.NumberFilter(
        method='filter_by_library',
        label="ID de la bibliothèque",
    )
    library_slug = django_filters.CharFilter(
        method='filter_by_library_slug',
        label="Slug de la bibliothèque",
    )

    class Meta:
        model = Book
        fields = {
            'category': ['exact'],
            'author': ['exact'],
            'available': ['exact'],
            'price': ['gte', 'lte'],
        }

    def filter_has_listings(self, queryset, name, value):
        if value:
            return queryset.filter(
                listings__is_active=True,
            ).distinct()
        return queryset

    def filter_by_vendor(self, queryset, name, value):
        return queryset.filter(
            listings__vendor_id=value,
            listings__is_active=True,
        ).distinct()

    def filter_by_vendor_slug(self, queryset, name, value):
        return queryset.filter(
            listings__vendor__slug=value,
            listings__is_active=True,
        ).distinct()

    def filter_in_library(self, queryset, name, value):
        if value:
            return queryset.filter(
                library_catalog_items__is_active=True,
            ).distinct()
        return queryset

    def filter_by_library(self, queryset, name, value):
        return queryset.filter(
            library_catalog_items__library_id=value,
            library_catalog_items__is_active=True,
        ).distinct()

    def filter_by_library_slug(self, queryset, name, value):
        return queryset.filter(
            library_catalog_items__library__slug=value,
            library_catalog_items__is_active=True,
        ).distinct()