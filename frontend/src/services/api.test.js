import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import axios from 'axios';
import { handleApiError } from './api';

// We test handleApiError directly (pure function, no mocking needed)
// and test the axios instance behavior via mocking

vi.mock('axios', async () => {
  const mockInstance = {
    get: vi.fn(() => Promise.resolve({ data: {} })),
    post: vi.fn(() => Promise.resolve({ data: {} })),
    put: vi.fn(() => Promise.resolve({ data: {} })),
    patch: vi.fn(() => Promise.resolve({ data: {} })),
    delete: vi.fn(() => Promise.resolve({ data: {} })),
    interceptors: {
      request: { use: vi.fn() },
      response: { use: vi.fn() },
    },
    defaults: { headers: { common: {} } },
  };

  return {
    default: {
      create: vi.fn(() => mockInstance),
      post: vi.fn(() => Promise.resolve({ data: {} })),
    },
    __esModule: true,
  };
});

describe('handleApiError', () => {
  it('returns detail string from response data', () => {
    const error = {
      response: { data: { detail: 'Not found' } },
    };
    expect(handleApiError(error)).toBe('Not found');
  });

  it('returns message string from response data', () => {
    const error = {
      response: { data: { message: 'Something went wrong' } },
    };
    expect(handleApiError(error)).toBe('Something went wrong');
  });

  it('returns formatted field errors from response data', () => {
    const error = {
      response: {
        data: {
          email: ['This email is already taken.'],
          username: ['Too short.'],
        },
      },
    };
    const result = handleApiError(error);
    expect(result).toContain('email: This email is already taken.');
    expect(result).toContain('username: Too short.');
  });

  it('returns string directly when data is a string', () => {
    const error = {
      response: { data: 'Server error' },
    };
    expect(handleApiError(error)).toBe('Server error');
  });

  it('handles network errors (no response)', () => {
    const error = {
      request: {},
      response: undefined,
    };
    const result = handleApiError(error);
    expect(result).toContain('Impossible de contacter le serveur');
  });

  it('handles unknown errors with error.message', () => {
    const error = {
      message: 'Something unexpected',
    };
    expect(handleApiError(error)).toBe('Something unexpected');
  });

  it('handles empty error objects', () => {
    const error = {
      response: { data: {} },
    };
    expect(handleApiError(error)).toBe('Erreur de validation');
  });

  it('serializes non-string detail', () => {
    const error = {
      response: { data: { detail: { code: 'invalid' } } },
    };
    const result = handleApiError(error);
    expect(result).toContain('invalid');
  });
});

describe('api module structure', () => {
  it('axios.create is called to create the api instance', () => {
    // The module was already imported, so axios.create should have been called
    expect(axios.create).toHaveBeenCalled();
  });

  it('api instance is created with withCredentials: true', () => {
    const createCall = axios.create.mock.calls[0][0];
    expect(createCall.withCredentials).toBe(true);
  });

  it('api instance has correct baseURL default', () => {
    const createCall = axios.create.mock.calls[0][0];
    expect(createCall.baseURL).toBeDefined();
  });

  it('api instance has correct timeout', () => {
    const createCall = axios.create.mock.calls[0][0];
    expect(createCall.timeout).toBe(30000);
  });

  it('api instance has JSON content type header', () => {
    const createCall = axios.create.mock.calls[0][0];
    expect(createCall.headers['Content-Type']).toBe('application/json');
  });
});

describe('request interceptor CSRF behavior', () => {
  let requestInterceptor;

  beforeEach(() => {
    // Get the request interceptor that was registered
    const mockApi = axios.create();
    const calls = mockApi.interceptors.request.use.mock.calls;
    if (calls.length > 0) {
      requestInterceptor = calls[0][0];
    }
  });

  it('request interceptor was registered', () => {
    const mockApi = axios.create();
    expect(mockApi.interceptors.request.use).toHaveBeenCalled();
  });

  it('response interceptor was registered', () => {
    const mockApi = axios.create();
    expect(mockApi.interceptors.response.use).toHaveBeenCalled();
  });
});

describe('tokenStorage (legacy)', () => {
  it('exports tokenStorage with noop functions', async () => {
    const { tokenStorage } = await import('./api');
    expect(tokenStorage.getAccessToken()).toBeNull();
    expect(tokenStorage.getRefreshToken()).toBeNull();
    // These should not throw
    tokenStorage.setTokens();
    tokenStorage.clearTokens();
  });
});
