import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock api module
vi.mock('./api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    delete: vi.fn(),
  },
}));

import bookService from './bookService';
import api from './api';

describe('bookService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getBooks', () => {
    it('calls /books/ with params', async () => {
      api.get.mockResolvedValue({ data: { results: [], count: 0 } });
      const result = await bookService.getBooks({ page: 1, page_size: 12 });
      expect(api.get).toHaveBeenCalledWith('/books/', { params: { page: 1, page_size: 12 } });
      expect(result).toEqual({ results: [], count: 0 });
    });
  });

  describe('getBookById', () => {
    it('calls /books/{id}/', async () => {
      const mockBook = { id: 1, title: 'Test' };
      api.get.mockResolvedValue({ data: mockBook });
      const result = await bookService.getBookById(1);
      expect(api.get).toHaveBeenCalledWith('/books/1/');
      expect(result).toEqual(mockBook);
    });
  });

  describe('autocomplete', () => {
    it('calls /books/autocomplete/ with query', async () => {
      const mockData = { books: [{ id: 1, title: 'Test' }], authors: [] };
      api.get.mockResolvedValue({ data: mockData });
      const result = await bookService.autocomplete('test');
      expect(api.get).toHaveBeenCalledWith('/books/autocomplete/', { params: { q: 'test' } });
      expect(result).toEqual(mockData);
    });

    it('returns empty on error', async () => {
      api.get.mockRejectedValue(new Error('Network error'));
      const result = await bookService.autocomplete('test');
      expect(result).toEqual({ books: [], authors: [] });
    });
  });

  describe('searchBooks', () => {
    it('calls /books/ with search param', async () => {
      api.get.mockResolvedValue({ data: { results: [], count: 0 } });
      await bookService.searchBooks('roman', { page_size: 5 });
      expect(api.get).toHaveBeenCalledWith('/books/', { params: { search: 'roman', page_size: 5 } });
    });
  });

  describe('getCategories', () => {
    it('calls /categories/', async () => {
      api.get.mockResolvedValue({ data: [{ id: 1, name: 'Roman' }] });
      const result = await bookService.getCategories();
      expect(api.get).toHaveBeenCalledWith('/categories/');
      expect(result).toEqual([{ id: 1, name: 'Roman' }]);
    });
  });

  describe('getAuthors', () => {
    it('calls /authors/', async () => {
      api.get.mockResolvedValue({ data: [{ id: 1, full_name: 'Victor Hugo' }] });
      const result = await bookService.getAuthors();
      expect(api.get).toHaveBeenCalledWith('/authors/');
    });
  });

  describe('getStatistics', () => {
    it('calls /books/statistics/', async () => {
      const stats = { total_books: 50, total_authors: 10 };
      api.get.mockResolvedValue({ data: stats });
      const result = await bookService.getStatistics();
      expect(api.get).toHaveBeenCalledWith('/books/statistics/');
      expect(result).toEqual(stats);
    });
  });
});
