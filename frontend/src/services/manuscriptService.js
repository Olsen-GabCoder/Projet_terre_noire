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

  // Téléchargement du fichier manuscrit par l'auteur
  downloadManuscript: async (id, title) => {
    const response = await api.get(`/manuscripts/${id}/download/`, { responseType: 'blob' });
    const blob = new Blob([response.data]);
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const safeName = (title || `manuscrit-${id}`).replace(/[^a-zA-Z0-9À-ÿ _-]/g, '').trim().replace(/\s+/g, '-').substring(0, 60);
    link.download = `${safeName}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  },
};

export default manuscriptService;
