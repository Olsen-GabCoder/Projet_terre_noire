import api from './api';

const notificationService = {
  getAll:         (params) => api.get('/notifications/', { params }),
  getUnreadCount: ()       => api.get('/notifications/unread_count/'),
  markAsRead:     (id)     => api.patch(`/notifications/${id}/mark_as_read/`),
  markAllAsRead:  ()       => api.post('/notifications/mark_all_as_read/'),
  delete:         (id)     => api.delete(`/notifications/${id}/`),
};

export default notificationService;
