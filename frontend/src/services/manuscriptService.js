import api from './api';

const manuscriptService = {
  // Soumettre un manuscrit (multipart/form-data)
  submitManuscript: (formData) => api.post('/manuscripts/submit/', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 120000, // 2 min — upload fichier + emails async
  }),

  // Mes soumissions (auteur connecté)
  getMyManuscripts: () => api.get('/manuscripts/mine/'),
  getMyManuscript: (id) => api.get(`/manuscripts/mine/${id}/`),

  // Inbox organisation
  getOrgManuscripts: (orgId, params) => api.get(`/organizations/${orgId}/manuscripts/`, { params }),
  getOrgManuscript: (orgId, id) => api.get(`/organizations/${orgId}/manuscripts/${id}/`),

  // Mise à jour de statut (org member ou admin)
  updateStatus: (id, data) => api.patch(`/manuscripts/${id}/update-status/`, data),

  // Verrouillage marché ouvert (auteur)
  lockMarket: (id) => api.post(`/manuscripts/mine/${id}/lock-market/`),
  unlockMarket: (id) => api.post(`/manuscripts/mine/${id}/unlock-market/`),
};

export default manuscriptService;
