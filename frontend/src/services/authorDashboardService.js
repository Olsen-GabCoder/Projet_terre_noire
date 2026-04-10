import api from './api';

const authorDashboardService = {
  // Dashboard — stats agrégées
  getDashboard: () => api.get('/authors/me/dashboard/'),

  // Mes livres — CRUD
  getMyBooks: (params) => api.get('/authors/me/books/', { params }),
  createBook: (formData) => api.post('/authors/me/books/', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  getBook: (bookId) => api.get(`/authors/me/books/${bookId}/`),
  updateBook: (bookId, formData) => api.patch(`/authors/me/books/${bookId}/`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  deleteBook: (bookId) => api.delete(`/authors/me/books/${bookId}/`),

  // Ventes
  getSales: (params) => api.get('/authors/me/sales/', { params }),

  // Avis lecteurs
  getReviews: (params) => api.get('/authors/me/reviews/', { params }),
};

export default authorDashboardService;
