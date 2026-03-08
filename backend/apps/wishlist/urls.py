from django.urls import path
from .views import WishlistListView, WishlistAddView, WishlistToggleView

app_name = 'wishlist'

urlpatterns = [
    path('', WishlistListView.as_view(), name='list'),
    path('add/', WishlistAddView.as_view(), name='add'),
    path('toggle/', WishlistToggleView.as_view(), name='toggle'),
    path('<int:book_id>/', WishlistToggleView.as_view(), name='remove'),
]
