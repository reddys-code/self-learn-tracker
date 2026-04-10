import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { apiClient, getStoredToken, setStoredToken } from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [needsSetup, setNeedsSetup] = useState(false);
  const [authError, setAuthError] = useState('');

  const refreshSetupStatus = useCallback(async () => {
    const { data } = await apiClient.get('/auth/setup-status');
    setNeedsSetup(Boolean(data.needsSetup));
    return data;
  }, []);

  const loadSession = useCallback(async () => {
    setLoading(true);
    try {
      await refreshSetupStatus();
      const token = getStoredToken();
      if (!token) {
        setUser(null);
        return;
      }
      const { data } = await apiClient.get('/auth/me');
      setUser(data.user);
    } catch (error) {
      setStoredToken('');
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, [refreshSetupStatus]);

  useEffect(() => {
    void loadSession();
  }, [loadSession]);

  const login = useCallback(async ({ email, password }) => {
    setAuthError('');
    const { data } = await apiClient.post('/auth/login', { email, password });
    setStoredToken(data.token);
    setUser(data.user);
    setNeedsSetup(false);
    return data.user;
  }, []);

  const bootstrapAdmin = useCallback(async ({ name, email, password }) => {
    setAuthError('');
    const { data } = await apiClient.post('/auth/bootstrap-admin', { name, email, password });
    setStoredToken(data.token);
    setUser(data.user);
    setNeedsSetup(false);
    return data.user;
  }, []);

  const logout = useCallback(() => {
    setStoredToken('');
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({
      user,
      loading,
      needsSetup,
      authError,
      setAuthError,
      login,
      logout,
      bootstrapAdmin,
      refreshSetupStatus,
      reloadSession: loadSession,
      isAuthenticated: Boolean(user),
      isAdmin: user?.role === 'admin',
    }),
    [authError, bootstrapAdmin, loadSession, loading, login, logout, needsSetup, refreshSetupStatus, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
