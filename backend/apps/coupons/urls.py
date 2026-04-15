from django.urls import path

from .views import (
    CloneTemplateView,
    CouponAdminListView,
    CouponAdminOverviewView,
    CouponApplicableListView,
    CouponIssuedListView,
    CouponReceivedListView,
    CouponRetryView,
    CouponRevokeView,
    CouponSendView,
    CouponTemplateDetailView,
    CouponTemplateListCreateView,
    CouponValidateView,
    EmitterContextView,
    ServiceCustomerListView,
    SystemTemplateListView,
    VendorCustomerListView,
)

app_name = 'coupons'

urlpatterns = [
    # Bibliothèque système (AVANT templates/<int:pk>/)
    path('templates/system/', SystemTemplateListView.as_view(), name='system-templates'),
    path('templates/clone/', CloneTemplateView.as_view(), name='clone-template'),
    # Templates CRUD (personnels)
    path('templates/', CouponTemplateListCreateView.as_view(), name='template-list'),
    path('templates/<int:pk>/', CouponTemplateDetailView.as_view(), name='template-detail'),
    # Envoi
    path('send/', CouponSendView.as_view(), name='send'),
    # Historiques
    path('my-issued/', CouponIssuedListView.as_view(), name='my-issued'),
    path('my-received/', CouponReceivedListView.as_view(), name='my-received'),
    # Applicable au panier
    path('applicable/', CouponApplicableListView.as_view(), name='applicable'),
    # Validation
    path('validate/', CouponValidateView.as_view(), name='validate'),
    # Révocation
    path('<int:pk>/revoke/', CouponRevokeView.as_view(), name='revoke'),
    # Retry (FAILED → PENDING)
    path('<int:pk>/retry/', CouponRetryView.as_view(), name='retry'),
    # Contexte émetteur
    path('emitter-context/', EmitterContextView.as_view(), name='coupon-emitter-context'),
    # Clients
    path('vendor-customers/', VendorCustomerListView.as_view(), name='vendor-customers'),
    path('service-customers/', ServiceCustomerListView.as_view(), name='service-customers'),
    # Admin plateforme
    path('admin/overview/', CouponAdminOverviewView.as_view(), name='admin-overview'),
    path('admin/list/', CouponAdminListView.as_view(), name='admin-list'),
]
