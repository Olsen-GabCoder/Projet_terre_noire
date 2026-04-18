// frontend/src/services/orderService.js
import api from './api';

const orderService = {
  // ============ ORDERS ============
  
  // Créer une commande depuis le panier
  createOrder: async (orderData) => {
    try {
      const response = await api.post('/orders/', orderData);
      return response.data;
    } catch (error) {

      throw error;
    }
  },

  // Récupérer l'historique des commandes de l'utilisateur
  getOrders: async (params = {}) => {
    try {
      const response = await api.get('/orders/', { params });
      return response.data;
    } catch (error) {

      throw error;
    }
  },

  // Récupérer une commande par ID
  getOrderById: async (id) => {
    try {
      const response = await api.get(`/orders/${id}/`);
      return response.data;
    } catch (error) {

      throw error;
    }
  },

  // Annuler une commande
  cancelOrder: async (id) => {
    try {
      const response = await api.post(`/orders/${id}/cancel/`);
      return response.data;
    } catch (error) {

      throw error;
    }
  },

  // Télécharger la facture PDF
  downloadInvoice: async (orderId) => {
    const response = await api.get(`/orders/${orderId}/invoice/`, {
      responseType: 'blob',
    });
    const blob = new Blob([response.data], { type: 'application/pdf' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `facture-commande-${String(orderId).padStart(6, '0')}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  },

  // ============ PAYMENTS ============
  
  // Créer un paiement pour une commande
  createPayment: async (paymentData) => {
    try {
      const response = await api.post('/payments/', paymentData);
      return response.data;
    } catch (error) {

      throw error;
    }
  },

  // Initier un paiement Mobile Money
  initiatePayment: async ({ orderId, provider, phoneNumber }) => {
    const response = await api.post('/payments/initiate/', {
      order_id: orderId,
      provider,
      phone_number: phoneNumber,
    });
    return response.data;
  },

  // Récupérer un paiement par ID
  getPaymentById: async (id) => {
    try {
      const response = await api.get(`/payments/${id}/`);
      return response.data;
    } catch (error) {

      throw error;
    }
  },
};

export default orderService;