// frontend/src/context/AuthContext.jsx
// Mode cookies-only — les tokens JWT sont dans des cookies HttpOnly.
// Le frontend ne manipule jamais les tokens directement.
import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { authAPI, handleApiError } from '../services/api';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth doit être utilisé dans un AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);

  // Vérifier l'auth au chargement (le cookie est envoyé automatiquement)
  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        const response = await authAPI.checkAuth();
        const userData = response.data?.user || response.data;
        if (userData?.id) {
          setUser(userData);
        }
      } catch {
        setUser(null);
      } finally {
        setLoading(false);
        setAuthChecked(true);
      }
    };
    checkAuthStatus();
  }, []);

  // Écouter l'event de session expirée (dispatch par l'intercepteur 401)
  useEffect(() => {
    const handleSessionExpired = () => {
      setUser(null);
    };
    window.addEventListener('auth:session-expired', handleSessionExpired);
    return () => window.removeEventListener('auth:session-expired', handleSessionExpired);
  }, []);

  const login = useCallback(async (username, password, rememberMe = false) => {
    try {
      const response = await authAPI.login({
        username: username.trim(),
        password: password,
        remember_me: rememberMe,
      });

      // 2FA requis (status 202)
      if (response.status === 202 && response.data?.totp_required) {
        return {
          success: false,
          totpRequired: true,
          challengeToken: response.data.challenge_token,
        };
      }

      const userData = response.data?.user;
      if (userData) {
        setUser(userData);
        return { success: true, user: userData };
      }

      // Fallback : cookie posé, on vérifie l'auth
      try {
        const checkResponse = await authAPI.checkAuth();
        const fallbackUser = checkResponse.data?.user || checkResponse.data;
        setUser(fallbackUser);
        return { success: true, user: fallbackUser };
      } catch {
        return { success: false, error: 'Réponse serveur invalide.' };
      }
    } catch (error) {
      return {
        success: false,
        error: handleApiError(error),
      };
    }
  }, []);

  const verifyTotp = useCallback(async (challengeToken, code, rememberMe = false) => {
    try {
      const response = await authAPI.verifyTotp({
        challenge_token: challengeToken,
        code: code,
        remember_me: rememberMe,
      });
      const userData = response.data?.user;
      if (userData) {
        setUser(userData);
        return { success: true, user: userData };
      }
      return { success: false, error: 'Réponse serveur invalide.' };
    } catch (error) {
      return {
        success: false,
        error: handleApiError(error),
      };
    }
  }, []);

  const register = useCallback(async (userData) => {
    try {
      const response = await authAPI.register(userData);

      if (response.status === 201) {
        // Le compte est créé mais inactif — l'utilisateur doit vérifier son email
        return {
          success: true,
          needsVerification: true,
          message: response.data?.message || "Inscription réussie ! Vérifiez votre email pour activer votre compte.",
        };
      }

      return { success: false, error: "Erreur lors de l'inscription." };
    } catch (error) {
      return {
        success: false,
        error: handleApiError(error),
      };
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await authAPI.logout();
    } catch {
      // Ignorer les erreurs (ex: déjà déconnecté)
    }
    setUser(null);
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const response = await authAPI.checkAuth();
      const userData = response.data?.user || response.data;
      if (userData?.id) setUser(userData);
    } catch { /* */ }
  }, []);

  const updateProfile = useCallback(async (profileData) => {
    try {
      const response = await authAPI.updateProfile(profileData);
      const userDataFromApi = response.data?.user ?? response.data;
      const updatedUser = { ...user, ...userDataFromApi };
      setUser(updatedUser);
      return { success: true, user: updatedUser };
    } catch (error) {
      return {
        success: false,
        error: handleApiError(error),
      };
    }
  }, [user]);

  const changePassword = useCallback(async (passwordData) => {
    try {
      await authAPI.changePassword(passwordData);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: handleApiError(error),
      };
    }
  }, []);

  // OAuth : échanger un token temporaire contre les cookies JWT
  const loginWithOAuthToken = useCallback(async (oauthToken) => {
    try {
      const response = await authAPI.exchangeOAuthToken({ token: oauthToken });
      const userData = response.data?.user;
      if (userData) {
        setUser(userData);
        return { success: true, user: userData };
      }
      return { success: false, error: 'Réponse serveur invalide.' };
    } catch (error) {
      return { success: false, error: handleApiError(error) };
    }
  }, []);

  // Helpers pour le système multi-rôles Frollot
  const hasProfile = (profileType) =>
    user?.profile_types?.includes(profileType) || false;

  const hasOrgRole = (orgId, role) =>
    user?.organization_memberships?.some(
      (m) => m.organization_id === orgId && m.role === role
    ) || false;

  const value = useMemo(() => ({
    user,
    loading,
    authChecked,
    login,
    loginWithOAuthToken,
    verifyTotp,
    register,
    logout,
    updateProfile,
    refreshUser,
    changePassword,
    isAuthenticated: !!user,
    isAdmin: user?.is_platform_admin || user?.is_staff || user?.is_superuser || false,
    hasProfile,
    hasOrgRole,
    profiles: user?.profiles || [],
    profileTypes: user?.profile_types || [],
    organizationMemberships: user?.organization_memberships || [],
  }), [user, loading, authChecked, login, loginWithOAuthToken, verifyTotp, register, logout, updateProfile, refreshUser, changePassword]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthContext;
