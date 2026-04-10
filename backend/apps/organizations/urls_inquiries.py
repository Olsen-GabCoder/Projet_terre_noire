from django.urls import path
from . import views

app_name = 'inquiries'

urlpatterns = [
    path('', views.InquiryListView.as_view(), name='inquiry-list'),
    path('create/', views.InquiryCreateView.as_view(), name='inquiry-create'),
    path('<int:pk>/', views.InquiryDetailView.as_view(), name='inquiry-detail'),
    path('<int:pk>/respond/', views.InquiryRespondView.as_view(), name='inquiry-respond'),
]
