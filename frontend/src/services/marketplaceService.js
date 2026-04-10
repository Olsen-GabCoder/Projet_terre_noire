import api from './api';

const marketplaceService = {
  // Listings (offres vendeurs)
  getBookListings: (bookId) => api.get(`/books/${bookId}/listings/`),
  getAllListings: (params) => api.get('/marketplace/listings/', { params }),
  getVendorListings: (slug) => api.get(`/marketplace/vendors/${slug}/listings/`),
  getMyListings: () => api.get('/marketplace/listings/mine/'),
  createListing: (data) => api.post('/marketplace/listings/create/', data),
  updateListing: (id, data) => api.patch(`/marketplace/listings/${id}/`, data),
  deleteListing: (id) => api.delete(`/marketplace/listings/${id}/`),

  // Sous-commandes vendeur
  getVendorOrders: (params) => api.get('/marketplace/vendor/orders/', { params }),
  updateSubOrderStatus: (id, data) => api.patch(`/marketplace/sub-orders/${id}/status/`, data),

  // Livraison
  getDeliveryAgents: (params) => api.get('/marketplace/delivery/agents/', { params }),
  assignDelivery: (subOrderId, data) => api.post(`/marketplace/sub-orders/${subOrderId}/assign-delivery/`, data),
  getMyDeliveries: () => api.get('/marketplace/delivery/my-assignments/'),
  updateDeliveryStatus: (subOrderId, data) => api.patch(`/marketplace/delivery/sub-orders/${subOrderId}/status/`, data),

  // Wallet vendeur
  getWallet: () => api.get('/marketplace/vendor/wallet/'),
  getWalletTransactions: (params) => api.get('/marketplace/vendor/wallet/transactions/', { params }),

  // Wallet livreur
  getDeliveryWallet: () => api.get('/marketplace/delivery/wallet/'),
  getDeliveryWalletTransactions: () => api.get('/marketplace/delivery/wallet/transactions/'),

  // Tarifs de livraison (livreur)
  getMyDeliveryRates: () => api.get('/marketplace/delivery/rates/'),
  createDeliveryRate: (data) => api.post('/marketplace/delivery/rates/', data),
  updateDeliveryRate: (id, data) => api.patch(`/marketplace/delivery/rates/${id}/`, data),
  deleteDeliveryRate: (id) => api.delete(`/marketplace/delivery/rates/${id}/`),

  // Recherche livreurs (public)
  searchDeliveryRates: (params) => api.get('/marketplace/delivery/search/', { params }),
  getDeliveryReferenceData: () => api.get('/marketplace/delivery/reference/'),

  // Retrait wallet → Mobile Money
  requestWithdrawal: (data) => api.post('/marketplace/wallet/withdraw/', data),
  getWithdrawals: () => api.get('/marketplace/wallet/withdrawals/'),
};

export default marketplaceService;
