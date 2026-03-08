// frontend/src/services/manuscriptService.js
import api from './api';

const manuscriptService = {
  // Soumettre un manuscrit
  submitManuscript: async (formData) => {
    try {
      const response = await api.post('/manuscripts/submit/', formData);
      return response.data;
    } catch (error) {
      console.error('Erreur lors de la soumission du manuscrit:', error);
      throw error;
    }
  },
};

export default manuscriptService;