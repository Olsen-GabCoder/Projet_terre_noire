from django.urls import path
from . import views

app_name = 'professionals'

urlpatterns = [
    path('', views.ProfessionalDirectoryView.as_view(), name='professional-directory'),
    path('<slug:slug>/', views.ProfessionalStorefrontView.as_view(), name='professional-storefront'),
    path('<slug:slug>/reviews/', views.ProfessionalReviewListCreateView.as_view(), name='professional-reviews'),
]
