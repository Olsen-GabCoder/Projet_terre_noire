import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { AuthProvider, useAuth } from './AuthContext';

// Mock the API module
const mockCheckAuth = vi.fn();
const mockLogin = vi.fn();
const mockLogout = vi.fn();
const mockRegister = vi.fn();
const mockUpdateProfile = vi.fn();
const mockChangePassword = vi.fn();
const mockVerifyTotp = vi.fn();
const mockExchangeOAuthToken = vi.fn();

vi.mock('../services/api', () => ({
  authAPI: {
    checkAuth: (...args) => mockCheckAuth(...args),
    login: (...args) => mockLogin(...args),
    logout: (...args) => mockLogout(...args),
    register: (...args) => mockRegister(...args),
    updateProfile: (...args) => mockUpdateProfile(...args),
    changePassword: (...args) => mockChangePassword(...args),
    verifyTotp: (...args) => mockVerifyTotp(...args),
    exchangeOAuthToken: (...args) => mockExchangeOAuthToken(...args),
  },
  handleApiError: (error) => {
    if (error.response?.data?.detail) return error.response.data.detail;
    return error.message || 'Erreur inconnue';
  },
}));

const wrapper = ({ children }) => <AuthProvider>{children}</AuthProvider>;

describe('AuthContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: checkAuth fails (not authenticated)
    mockCheckAuth.mockRejectedValue(new Error('Not authenticated'));
  });

  it('has initial state with user null and not authenticated', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {
      expect(result.current.authChecked).toBe(true);
    });

    expect(result.current.user).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.isAdmin).toBe(false);
    expect(result.current.loading).toBe(false);
  });

  it('restores user from checkAuth on mount', async () => {
    const mockUser = { id: 1, username: 'testuser', is_staff: false };
    mockCheckAuth.mockResolvedValue({ data: { user: mockUser } });

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {
      expect(result.current.authChecked).toBe(true);
    });

    expect(result.current.user).toEqual(mockUser);
    expect(result.current.isAuthenticated).toBe(true);
  });

  it('login success updates user state', async () => {
    const mockUser = { id: 1, username: 'testuser' };
    mockLogin.mockResolvedValue({ status: 200, data: { user: mockUser } });

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => expect(result.current.authChecked).toBe(true));

    let loginResult;
    await act(async () => {
      loginResult = await result.current.login('testuser', 'password123');
    });

    expect(loginResult.success).toBe(true);
    expect(loginResult.user).toEqual(mockUser);
    expect(result.current.user).toEqual(mockUser);
    expect(result.current.isAuthenticated).toBe(true);
  });

  it('login failure returns error', async () => {
    mockLogin.mockRejectedValue({
      response: { data: { detail: 'Invalid credentials' } },
    });

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => expect(result.current.authChecked).toBe(true));

    let loginResult;
    await act(async () => {
      loginResult = await result.current.login('wrong', 'wrong');
    });

    expect(loginResult.success).toBe(false);
    expect(loginResult.error).toBe('Invalid credentials');
    expect(result.current.user).toBeNull();
  });

  it('login returns totpRequired when 2FA is needed', async () => {
    mockLogin.mockResolvedValue({
      status: 202,
      data: { totp_required: true, challenge_token: 'abc123' },
    });

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => expect(result.current.authChecked).toBe(true));

    let loginResult;
    await act(async () => {
      loginResult = await result.current.login('user', 'pass');
    });

    expect(loginResult.success).toBe(false);
    expect(loginResult.totpRequired).toBe(true);
    expect(loginResult.challengeToken).toBe('abc123');
  });

  it('logout clears user state', async () => {
    const mockUser = { id: 1, username: 'testuser' };
    mockCheckAuth.mockResolvedValue({ data: { user: mockUser } });
    mockLogout.mockResolvedValue({});

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {
      expect(result.current.user).toEqual(mockUser);
    });

    await act(async () => {
      await result.current.logout();
    });

    expect(result.current.user).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
  });

  it('logout clears user even if API call fails', async () => {
    const mockUser = { id: 1, username: 'testuser' };
    mockCheckAuth.mockResolvedValue({ data: { user: mockUser } });
    mockLogout.mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {
      expect(result.current.user).toEqual(mockUser);
    });

    await act(async () => {
      await result.current.logout();
    });

    expect(result.current.user).toBeNull();
  });

  it('updateProfile updates user state', async () => {
    const mockUser = { id: 1, username: 'testuser', first_name: 'Old' };
    mockCheckAuth.mockResolvedValue({ data: { user: mockUser } });
    mockUpdateProfile.mockResolvedValue({
      data: { user: { first_name: 'New' } },
    });

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {
      expect(result.current.user).toEqual(mockUser);
    });

    let updateResult;
    await act(async () => {
      updateResult = await result.current.updateProfile({ first_name: 'New' });
    });

    expect(updateResult.success).toBe(true);
    expect(result.current.user.first_name).toBe('New');
  });

  it('register returns success with needsVerification', async () => {
    mockRegister.mockResolvedValue({
      status: 201,
      data: { message: 'Check your email' },
    });

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => expect(result.current.authChecked).toBe(true));

    let registerResult;
    await act(async () => {
      registerResult = await result.current.register({
        username: 'newuser',
        email: 'new@example.com',
        password: 'password123',
      });
    });

    expect(registerResult.success).toBe(true);
    expect(registerResult.needsVerification).toBe(true);
  });

  it('isAdmin is true when user has admin flags', async () => {
    const adminUser = { id: 1, username: 'admin', is_staff: true };
    mockCheckAuth.mockResolvedValue({ data: { user: adminUser } });

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {
      expect(result.current.authChecked).toBe(true);
    });

    expect(result.current.isAdmin).toBe(true);
  });

  it('isAdmin is true for is_platform_admin', async () => {
    const adminUser = { id: 1, username: 'admin', is_platform_admin: true };
    mockCheckAuth.mockResolvedValue({ data: { user: adminUser } });

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => expect(result.current.authChecked).toBe(true));

    expect(result.current.isAdmin).toBe(true);
  });

  it('hasProfile returns true when user has matching profile_type', async () => {
    const mockUser = { id: 1, username: 'user', profile_types: ['AUTEUR', 'LECTEUR'] };
    mockCheckAuth.mockResolvedValue({ data: { user: mockUser } });

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => expect(result.current.user).toBeTruthy());

    expect(result.current.hasProfile('AUTEUR')).toBe(true);
    expect(result.current.hasProfile('EDITEUR')).toBe(false);
  });

  it('hasProfile returns false when user is null', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => expect(result.current.authChecked).toBe(true));

    expect(result.current.hasProfile('AUTEUR')).toBe(false);
  });

  it('throws error when useAuth is used outside AuthProvider', () => {
    // Suppress console.error for expected error
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => {
      renderHook(() => useAuth());
    }).toThrow('useAuth doit être utilisé dans un AuthProvider');

    consoleSpy.mockRestore();
  });
});
