// frontend/src/services/bookService.js
import api from './api';

const bookService = {
  // ============ BOOKS ============
  
  // Récupérer la liste des livres avec filtres et pagination
  getBooks: async (params = {}) => {
    try {
      const response = await api.get('/books/', { params });
      return response.data;
    } catch (error) {
      console.error('Erreur lors de la récupération des livres:', error);
      throw error;
    }
  },

  // Récupérer un livre par ID
  getBookById: async (id) => {
    try {
      const response = await api.get(`/books/${id}/`);
      return response.data;
    } catch (error) {
      console.error(`Erreur lors de la récupération du livre ${id}:`, error);
      throw error;
    }
  },

  // Récupérer les livres similaires
  getRelatedBooks: async (id) => {
    try {
      const response = await api.get(`/books/${id}/related/`);
      return response.data;
    } catch (error) {
      console.error(`Erreur lors de la récupération des livres similaires:`, error);
      return [];
    }
  },

  // Récupérer les livres mis en avant (featured)
  getFeaturedBooks: async () => {
    try {
      const response = await api.get('/books/featured/');
      return response.data;
    } catch (error) {
      console.error('Erreur lors de la récupération des livres featured:', error);
      throw error;
    }
  },

  // Récupérer les nouveautés
  getNewReleases: async () => {
    try {
      const response = await api.get('/books/new-releases/');
      return response.data;
    } catch (error) {
      console.error('Erreur lors de la récupération des nouveautés:', error);
      throw error;
    }
  },

  // Récupérer les livres par format (PAPIER ou EBOOK)
  getBooksByFormat: async (format) => {
    try {
      const response = await api.get(`/books/by-format/${format}/`);
      return response.data;
    } catch (error) {
      console.error(`Erreur lors de la récupération des livres ${format}:`, error);
      throw error;
    }
  },

  // Récupérer les avis d'un livre (paginé: { count, next, previous, results })
  getBookReviews: async (bookId, params = {}) => {
    try {
      const response = await api.get(`/books/${bookId}/reviews/`, { params });
      return response.data;
    } catch (error) {
      console.error('Erreur lors de la récupération des avis:', error);
      return { count: 0, next: null, previous: null, results: [] };
    }
  },

  // Créer ou modifier un avis
  submitReview: async (bookId, data) => {
    const response = await api.post(`/books/${bookId}/reviews/`, data);
    return response.data;
  },

  // Supprimer son avis
  deleteReview: async (bookId) => {
    await api.delete(`/books/${bookId}/reviews/`);
  },

  // Répondre à un avis
  replyToReview: async (bookId, reviewId, comment) => {
    const response = await api.post(`/books/${bookId}/reviews/${reviewId}/reply/`, {
      comment: comment.trim(),
    });
    return response.data;
  },

  // Liker / unliker un avis
  likeReview: async (bookId, reviewId) => {
    const response = await api.post(`/books/${bookId}/reviews/${reviewId}/like/`);
    return response.data;
  },
  unlikeReview: async (bookId, reviewId) => {
    const response = await api.delete(`/books/${bookId}/reviews/${reviewId}/like/`);
    return response.data;
  },

  // Supprimer un avis ou une réponse (les siens uniquement)
  deleteReviewById: async (bookId, reviewId) => {
    await api.delete(`/books/${bookId}/reviews/${reviewId}/delete/`);
  },

  // Récupérer mon avis sur un livre (pour savoir si formulaire à afficher)
  getMyReview: async (bookId) => {
    try {
      const response = await api.get(`/books/${bookId}/reviews/me/`);
      return response.data;
    } catch {
      return null;
    }
  },

  // Récupérer les statistiques
  getStatistics: async () => {
    try {
      const response = await api.get('/books/statistics/');
      return response.data;
    } catch (error) {
      console.error('Erreur lors de la récupération des statistiques:', error);
      throw error;
    }
  },

  // ============ CATEGORIES ============
  
  // Récupérer toutes les catégories
  getCategories: async () => {
    try {
      const response = await api.get('/categories/');
      return response.data;
    } catch (error) {
      console.error('Erreur lors de la récupération des catégories:', error);
      throw error;
    }
  },

  // Récupérer une catégorie par ID
  getCategoryById: async (id) => {
    try {
      const response = await api.get(`/categories/${id}/`);
      return response.data;
    } catch (error) {
      console.error(`Erreur lors de la récupération de la catégorie ${id}:`, error);
      throw error;
    }
  },

  // Récupérer les livres d'une catégorie
  getCategoryBooks: async (categoryId, params = {}) => {
    try {
      const response = await api.get(`/categories/${categoryId}/books/`, { params });
      return response.data;
    } catch (error) {
      console.error(`Erreur lors de la récupération des livres de la catégorie ${categoryId}:`, error);
      throw error;
    }
  },

  // ============ AUTHORS ============
  
  // Récupérer tous les auteurs
  getAuthors: async () => {
    try {
      const response = await api.get('/authors/');
      return response.data;
    } catch (error) {
      console.error('Erreur lors de la récupération des auteurs:', error);
      throw error;
    }
  },

  // Récupérer un auteur par ID
  getAuthorById: async (id) => {
    try {
      const response = await api.get(`/authors/${id}/`);
      return response.data;
    } catch (error) {
      console.error(`Erreur lors de la récupération de l'auteur ${id}:`, error);
      throw error;
    }
  },

  // Récupérer les livres d'un auteur
  getAuthorBooks: async (authorId, params = {}) => {
    try {
      const response = await api.get(`/authors/${authorId}/books/`, { params });
      return response.data;
    } catch (error) {
      console.error(`Erreur lors de la récupération des livres de l'auteur ${authorId}:`, error);
      throw error;
    }
  },

  // ============ SEARCH ============
  
  // Recherche globale
  searchBooks: async (query, params = {}) => {
    try {
      const response = await api.get('/books/', {
        params: { search: query, ...params }
      });
      return response.data;
    } catch (error) {
      console.error('Erreur lors de la recherche:', error);
      throw error;
    }
  },
};

export default bookService;