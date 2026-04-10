import api from './api';

const quoteService = {
  // Templates
  getTemplates: (params) => api.get('/services/quotes/templates/', { params }),
  getTemplate: (id) => api.get(`/services/quotes/templates/${id}/`),

  // Quotes CRUD
  getQuotes: (params) => api.get('/services/quotes/', { params }),
  getQuote: (id) => api.get(`/services/quotes/${id}/`),
  createQuote: (data) => api.post('/services/quotes/create/', data),

  // Actions
  sendQuote: (id) => api.post(`/services/quotes/${id}/send/`),
  respondToQuote: (id, data) => api.post(`/services/quotes/${id}/respond/`, data),
};

export default quoteService;
