import { describe, it, expect, vi } from 'vitest';
import notificationService from './notificationService';
import api from './api';

vi.mock('./api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('notificationService', () => {
  it('getAll calls /notifications/ with params', async () => {
    api.get.mockResolvedValue({ data: { results: [], count: 0 } });
    await notificationService.getAll({ page_size: 10 });
    expect(api.get).toHaveBeenCalledWith('/notifications/', { params: { page_size: 10 } });
  });

  it('getUnreadCount calls /notifications/unread_count/', async () => {
    api.get.mockResolvedValue({ data: { count: 3 } });
    const result = await notificationService.getUnreadCount();
    expect(api.get).toHaveBeenCalledWith('/notifications/unread_count/');
    expect(result.data.count).toBe(3);
  });

  it('markAsRead calls PATCH /notifications/{id}/mark_as_read/', async () => {
    api.patch.mockResolvedValue({ data: { success: true } });
    await notificationService.markAsRead(42);
    expect(api.patch).toHaveBeenCalledWith('/notifications/42/mark_as_read/');
  });

  it('markAllAsRead calls POST /notifications/mark_all_as_read/', async () => {
    api.post.mockResolvedValue({ data: { updated: 5 } });
    await notificationService.markAllAsRead();
    expect(api.post).toHaveBeenCalledWith('/notifications/mark_all_as_read/');
  });

  it('delete calls DELETE /notifications/{id}/', async () => {
    api.delete.mockResolvedValue({ status: 204 });
    await notificationService.delete(42);
    expect(api.delete).toHaveBeenCalledWith('/notifications/42/');
  });
});
