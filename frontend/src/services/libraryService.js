import api from './api';

const libraryService = {
  // ── Catalogue ──
  catalog: {
    list: (orgId, params) => api.get(`/library/${orgId}/catalog/`, { params }),
    create: (orgId, data) => api.post(`/library/${orgId}/catalog/create/`, data),
    get: (orgId, id) => api.get(`/library/${orgId}/catalog/${id}/`),
    update: (orgId, id, data) => api.patch(`/library/${orgId}/catalog/${id}/`, data),
    delete: (orgId, id) => api.delete(`/library/${orgId}/catalog/${id}/`),
  },

  // ── Membres ──
  members: {
    list: (orgId) => api.get(`/library/${orgId}/members/`),
    register: (orgId, data) => api.post(`/library/${orgId}/members/register/`, data),
    update: (orgId, id, data) => api.patch(`/library/${orgId}/members/${id}/`, data),
    myMemberships: () => api.get('/library/my-memberships/'),
  },

  // ── Prêts ──
  loans: {
    create: (orgId, data) => api.post(`/library/${orgId}/loans/create/`, data),
    list: (orgId, params) => api.get(`/library/${orgId}/loans/`, { params }),
    approve: (id) => api.patch(`/library/loans/${id}/approve/`),
    returnLoan: (id) => api.patch(`/library/loans/${id}/return/`),
    myLoans: () => api.get('/library/my-loans/'),
    extend: (id, data) => api.post(`/library/loans/${id}/extend/`, data),
  },

  // ── Réservations ──
  reservations: {
    create: (orgId, data) => api.post(`/library/${orgId}/reservations/`, data),
    myReservations: () => api.get('/library/my-reservations/'),
    cancel: (id) => api.delete(`/library/reservations/${id}/`),
  },

  // ── Dashboard ──
  dashboard: {
    get: (orgId) => api.get(`/library/${orgId}/dashboard/`),
  },
};

export default libraryService;
