import axios from 'axios';

// En dev, le proxy Vite redirige /api vers localhost:8000 (même origine = cookies OK)
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// --- MODE COOKIES-ONLY ---
// Les tokens JWT sont stockés dans des cookies HttpOnly par le backend.
// Le frontend n'a jamais accès aux tokens directement.
// withCredentials: true fait que le navigateur envoie les cookies automatiquement.

// Rétrocompatibilité : nettoyer les anciens tokens localStorage s'ils existent
if (localStorage.getItem('access_token')) {
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
}

// tokenStorage maintenu pour rétrocompatibilité des imports, mais ne fait rien
export const tokenStorage = {
  getAccessToken: () => null,
  getRefreshToken: () => null,
  setTokens: () => {},
  clearTokens: () => {},
};

// --- INTERCEPTEURS ---

let isRefreshing = false;
let failedQueue = [];

const processQueue = (error) => {
  failedQueue.forEach(prom => {
    if (error) prom.reject(error);
    else prom.resolve();
  });
  failedQueue = [];
};

// Lire le CSRF token depuis le cookie (posé par /api/csrf/)
function getCsrfToken() {
  const match = document.cookie.match(/csrftoken=([^;]+)/);
  return match ? match[1] : null;
}

// Initialiser le CSRF token au démarrage
api.get('/csrf/').catch(() => {});

// Request : ajouter CSRF + gérer FormData
api.interceptors.request.use(
  (config) => {
    // CSRF token pour les requêtes qui modifient des données
    if (['post', 'put', 'patch', 'delete'].includes(config.method)) {
      const csrfToken = getCsrfToken();
      if (csrfToken) {
        config.headers['X-CSRFToken'] = csrfToken;
      }
    }
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type'];
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response : gérer le refresh token sur 401
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Ne pas tenter de refresh pour les endpoints d'auth eux-mêmes
    if (error.response?.status !== 401 || originalRequest._retry) {
      return Promise.reject(error);
    }

    // Ne pas refresh pendant le flow OAuth ou les endpoints d'auth
    const skipRefreshUrls = ['/token/', '/users/oauth/', '/users/check-auth/', '/users/login'];
    if (skipRefreshUrls.some((u) => originalRequest.url?.includes(u))) {
      return Promise.reject(error);
    }

    // Si déjà en train de refresher, mettre en file d'attente
    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      }).then(() => api(originalRequest));
    }

    originalRequest._retry = true;
    isRefreshing = true;

    try {
      // Le cookie refresh est envoyé automatiquement via withCredentials
      await axios.post(`${API_BASE_URL}/token/refresh/`, {}, { withCredentials: true });
      processQueue(null);
      return api(originalRequest);
    } catch (refreshError) {
      processQueue(refreshError);
      // Refresh échoué — l'utilisateur doit se reconnecter
      // On dispatch un event pour que AuthContext puisse réagir
      window.dispatchEvent(new Event('auth:session-expired'));
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  }
);

// --- API NEWSLETTER ---
export const newsletterAPI = {
  subscribe: (email) => api.post('/newsletter/subscribe/', { email }),
};

// --- API CONTACT ---
export const contactAPI = {
  submit: (data) => api.post('/contact/submit/', data),
};

// --- API CONFIG ---
export const configAPI = {
  getDeliveryConfig: (params) => api.get('/config/delivery/', { params }),
  getDeliveryZones: () => api.get('/config/delivery/zones/'),
};

// --- API COUPONS ---
export const couponAPI = {
  validate: (code) => api.post('/coupons/validate/', { code }),
};

// --- API WISHLIST ---
export const wishlistAPI = {
  getList: () => api.get('/wishlist/'),
  add: (bookId) => api.post('/wishlist/add/', { book_id: bookId }),
  toggle: (bookId) => api.post('/wishlist/toggle/', { book_id: bookId }),
  remove: (bookId) => api.delete(`/wishlist/${bookId}/`),
};

// --- API AUTHENTIFICATION ---
export const authAPI = {
  login: (credentials) => api.post('/token/', credentials),
  verifyTotp: (data) => api.post('/users/totp/verify/', data),
  register: (userData) => api.post('/users/register/', userData),
  checkAuth: () => api.get('/users/check-auth/'),
  logout: () => api.post('/users/logout/'),
  updateProfile: (data) => api.patch('/users/me/', data),
  changePassword: (data) => api.put('/users/me/change-password/', data),
  forgotPassword: (email) => api.post('/users/forgot-password/', { email }),
  resetPassword: (data) => api.post('/users/reset-password/', data),
  exchangeOAuthToken: (data) => api.post('/users/oauth/exchange/', data),
  // Sessions & Security
  getSessions: () => api.get('/users/sessions/'),
  revokeSession: (key) => api.delete(`/users/sessions/${key}/`),
  revokeAllSessions: () => api.post('/users/sessions/revoke-all/'),
  getLoginHistory: () => api.get('/users/me/login-history/'),
  deleteAccount: (data) => api.post('/users/me/delete/', data),
};

// --- HELPER D'ERREUR ---
export const handleApiError = (error) => {
  if (error.response) {
    const data = error.response.data;
    if (typeof data === 'string') return data;
    if (data.detail) return typeof data.detail === 'string' ? data.detail : JSON.stringify(data.detail);
    if (data.message) return data.message;
    if (typeof data === 'object') {
      const parts = [];
      for (const [key, val] of Object.entries(data)) {
        const msg = Array.isArray(val) ? val.join(' ') : String(val);
        parts.push(`${key}: ${msg}`);
      }
      return parts.length ? parts.join(' • ') : 'Erreur de validation';
    }
    return 'Erreur inconnue';
  } else if (error.request) {
    return "Impossible de contacter le serveur. Vérifiez votre connexion.";
  } else {
    return error.message || 'Erreur inconnue';
  }
};

// --- API PROFILS UTILISATEUR ---
export const profileAPI = {
  list: () => api.get('/users/me/profiles/'),
  create: (data) => api.post('/users/me/profiles/', data),
  get: (id) => api.get(`/users/me/profiles/${id}/`),
  update: (id, data) => api.patch(`/users/me/profiles/${id}/`, data),
  deactivate: (id) => api.delete(`/users/me/profiles/${id}/`),
};

// --- API ORGANISATIONS ---
export const organizationAPI = {
  list: () => api.get('/organizations/'),
  create: (data) => api.post('/organizations/', data, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  get: (id) => api.get(`/organizations/${id}/`),
  update: (id, data) => api.patch(`/organizations/${id}/`, data),
  delete: (id) => api.delete(`/organizations/${id}/`),
  // Membres
  listMembers: (orgId) => api.get(`/organizations/${orgId}/members/`),
  addMember: (orgId, data) => api.post(`/organizations/${orgId}/members/add/`, data),
  updateMember: (orgId, memberId, data) => api.patch(`/organizations/${orgId}/members/${memberId}/`, data),
  removeMember: (orgId, memberId) => api.delete(`/organizations/${orgId}/members/${memberId}/`),
  // Invitations
  invite: (orgId, data) => api.post(`/organizations/${orgId}/invitations/`, data),
  // Dashboard
  dashboard: (orgId) => api.get(`/organizations/${orgId}/dashboard/`),
  // Livres (MAISON_EDITION)
  listBooks: (orgId) => api.get(`/organizations/${orgId}/books/`),
  createBook: (orgId, formData) => api.post(`/organizations/${orgId}/books/`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  getBook: (orgId, bookId) => api.get(`/organizations/${orgId}/books/${bookId}/`),
  updateBook: (orgId, bookId, formData) => api.patch(`/organizations/${orgId}/books/${bookId}/`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  deleteBook: (orgId, bookId) => api.delete(`/organizations/${orgId}/books/${bookId}/`),
};

// --- API INVITATIONS ---
export const invitationAPI = {
  mine: () => api.get('/organizations/invitations/mine/'),
  respond: (data) => api.post('/organizations/invitations/respond/', data),
};

export default api;
