# backend/apps/books/urls.py

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import BookViewSet, AuthorViewSet, CategoryViewSet, serve_book_pdf

# Instanciation du routeur DRF
router = DefaultRouter()

# Enregistrement des ViewSets avec leurs URLs respectives
router.register(r'books', BookViewSet, basename='book')
router.register(r'authors', AuthorViewSet, basename='author')
router.register(r'categories', CategoryViewSet, basename='category')

# Configuration des URLs (route PDF avant le routeur pour priorité)
urlpatterns = [
    path('books/<int:book_id>/read-pdf/', serve_book_pdf),
    path('', include(router.urls)),
]
