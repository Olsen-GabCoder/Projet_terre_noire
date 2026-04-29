import api from './api';

const organizationService = {
  // Géocodage & carte
  geocode: (query) => api.get('/organizations/geocode/', { params: { q: query } }).then(r => r.data),
  nearby: (lat, lon, type = '') => api.get('/organizations/nearby/', { params: { lat, lon, type } }).then(r => r.data),

  // Annuaire — liste filtrable
  getDirectory: (params) => api.get('/organizations/directory/', { params }),

  // Vitrine publique
  getStorefront: (slug) => api.get(`/organizations/${slug}/storefront/`),
  getCatalog: (slug) => api.get(`/organizations/${slug}/catalog/`),
  getTeam: (slug) => api.get(`/organizations/${slug}/team/`),
  getReviews: (slug) => api.get(`/organizations/${slug}/reviews/`),
  createReview: (slug, data) => api.post(`/organizations/${slug}/reviews/`, data),

  // Gestion organisation (admin/propriétaire, multipart pour logo/cover)
  updateOrganization: (id, formData) => api.patch(`/organizations/${id}/`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),

  // Recommandations manuscrit
  getRecommendations: (params) => api.get('/manuscripts/recommendations/', { params }),

  // Annuaire Professionnels
  getProfessionals: (params) => api.get('/professionals/', { params }),
  getProfessional: (slug) => api.get(`/professionals/${slug}/`),
  getProfessionalReviews: (slug) => api.get(`/professionals/${slug}/reviews/`),
  createProfessionalReview: (slug, data) => api.post(`/professionals/${slug}/reviews/`, data),

  // Demandes de renseignement
  getInquiries: (params) => api.get('/inquiries/', { params }),
  getInquiry: (id) => api.get(`/inquiries/${id}/`),
  createInquiry: (data) => api.post('/inquiries/create/', data),
  respondToInquiry: (id, data) => api.patch(`/inquiries/${id}/respond/`, data),

  // Recommandations services
  getServiceRecommendations: (params) => api.get('/services/recommendations/', { params }),
};

export default organizationService;
