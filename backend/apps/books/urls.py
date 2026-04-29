# backend/apps/books/urls.py

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import BookViewSet, AuthorViewSet, CategoryViewSet, serve_book_pdf, ISBNLookupView, WikipediaAuthorView, UnsplashSearchView
from .author_views import (
    AuthorDashboardView,
    AuthorBookListCreateView,
    AuthorBookDetailView,
    AuthorSalesView,
    AuthorReviewsView,
)

# Instanciation du routeur DRF
router = DefaultRouter()

# Enregistrement des ViewSets avec leurs URLs respectives
router.register(r'books', BookViewSet, basename='book')
router.register(r'authors', AuthorViewSet, basename='author')
router.register(r'categories', CategoryViewSet, basename='category')

# Configuration des URLs
# IMPORTANT: les routes authors/me/* AVANT le routeur (sinon "me" est interprété comme un PK)
urlpatterns = [
    path('authors/me/dashboard/', AuthorDashboardView.as_view(), name='author-dashboard'),
    path('authors/me/books/', AuthorBookListCreateView.as_view(), name='author-books'),
    path('authors/me/books/<int:book_id>/', AuthorBookDetailView.as_view(), name='author-book-detail'),
    path('authors/me/sales/', AuthorSalesView.as_view(), name='author-sales'),
    path('authors/me/reviews/', AuthorReviewsView.as_view(), name='author-reviews'),
    path('authors/wikipedia-bio/<str:name>/', WikipediaAuthorView.as_view(), name='wikipedia-bio'),
    path('books/isbn-lookup/<str:isbn>/', ISBNLookupView.as_view(), name='isbn-lookup'),
    path('books/unsplash-search/', UnsplashSearchView.as_view(), name='unsplash-search'),
    path('books/<int:book_id>/read-pdf/', serve_book_pdf),
    path('', include(router.urls)),
]
