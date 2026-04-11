import api from './api';

const servicesService = {
  // Service Listings
  getListings: (params) => api.get('/services/listings/', { params }),
  createListing: (data) => api.post('/services/listings/create/', data),
  getMyListings: () => api.get('/services/listings/mine/'),
  getListing: (id) => api.get(`/services/listings/${id}/`),
  updateListing: (id, data) => api.patch(`/services/listings/${id}/manage/`, data),
  deleteListing: (id) => api.delete(`/services/listings/${id}/manage/`),

  // Service Requests
  getRequests: (params) => api.get('/services/requests/', { params }),
  createRequest: (data) => api.post('/services/requests/create/', data, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  getRequest: (id) => api.get(`/services/requests/${id}/`),
  updateRequest: (id, data) => api.patch(`/services/requests/${id}/`, data),

  // Quotes
  createQuote: (requestId, data) => api.post('/services/service-quotes/create/', data),
  respondToQuote: (quoteId, data) => api.patch(`/services/service-quotes/${quoteId}/respond/`, data),
  downloadQuotePDF: async (quoteId) => {
    const response = await api.get(`/services/service-quotes/${quoteId}/pdf/`, { responseType: 'blob' });
    const blob = new Blob([response.data], { type: 'application/pdf' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `devis-service-${String(quoteId).padStart(6, '0')}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  },

  // Service Orders
  getOrders: (params) => api.get('/services/orders/', { params }),
  getOrder: (id) => api.get(`/services/orders/${id}/`),
  updateOrderStatus: (id, data) => api.patch(`/services/orders/${id}/status/`, data),
  deliverOrder: (id, data) => api.post(`/services/orders/${id}/deliver/`, data),
  requestRevision: (id, data) => api.post(`/services/orders/${id}/request-revision/`, data),
  downloadDeliverable: async (orderId, filename) => {
    const response = await api.get(`/services/orders/${orderId}/deliverable/`, { responseType: 'blob' });
    const blob = new Blob([response.data]);
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename || `livrable-${String(orderId).padStart(6, '0')}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  },

  // Editorial Projects
  getProjects: (params) => api.get('/services/projects/', { params }),
  createProject: (data) => api.post('/services/projects/create/', data),
  getProject: (id) => api.get(`/services/projects/${id}/`),
  updateProject: (id, data) => api.patch(`/services/projects/${id}/`, data),
  createTask: (data) => api.post('/services/tasks/create/', data),
  updateTaskStatus: (taskId, data) => api.patch(`/services/tasks/${taskId}/status/`, data),
  createProjectFromManuscript: (manuscriptId) => api.post(`/services/projects/from-manuscript/${manuscriptId}/`),
  publishProject: (projectId, formData) => api.post(`/services/projects/${projectId}/publish/`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),

  // Print on Demand
  getPrinters: () => api.get('/services/printers/'),
  getPrintRequests: (params) => api.get('/services/print-requests/', { params }),
  createPrintRequest: (data) => api.post('/services/print-requests/create/', data),
  getPrintRequest: (id) => api.get(`/services/print-requests/${id}/`),
  updatePrintRequestStatus: (id, data) => api.patch(`/services/print-requests/${id}/status/`, data),

  // Professional Wallet
  getWallet: () => api.get('/services/wallet/'),
  getWalletTransactions: (params) => api.get('/services/wallet/transactions/', { params }),

  // Avis prestataires
  getProviderReviews: (params) => api.get('/services/reviews/', { params }),
  createProviderReview: (data) => api.post('/services/reviews/create/', data),

  // Factures PDF
  downloadServiceOrderInvoice: async (orderId) => {
    const response = await api.get(`/services/orders/${orderId}/invoice/`, { responseType: 'blob' });
    const blob = new Blob([response.data], { type: 'application/pdf' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `facture-service-${String(orderId).padStart(6, '0')}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  },
  downloadPrintRequestQuote: async (requestId) => {
    const response = await api.get(`/services/print-requests/${requestId}/quote-pdf/`, { responseType: 'blob' });
    const blob = new Blob([response.data], { type: 'application/pdf' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `devis-impression-${String(requestId).padStart(6, '0')}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  },
};

export default servicesService;
