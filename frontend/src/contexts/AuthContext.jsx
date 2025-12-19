import { createContext, useContext, useState, useEffect, useCallback } from 'react';

const AuthContext = createContext(null);

const API_URL = import.meta.env.VITE_API_URL ?? '';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Get stored tokens
  const getTokens = () => {
    return {
      accessToken: localStorage.getItem('accessToken'),
      refreshToken: localStorage.getItem('refreshToken')
    };
  };

  // Store tokens
  const storeTokens = (accessToken, refreshToken) => {
    localStorage.setItem('accessToken', accessToken);
    if (refreshToken) {
      localStorage.setItem('refreshToken', refreshToken);
    }
  };

  // Clear tokens
  const clearTokens = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
  };

  // Refresh access token
  const refreshAccessToken = async () => {
    const { refreshToken } = getTokens();
    if (!refreshToken) return null;

    try {
      const res = await fetch(`${API_URL}/api/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken })
      });

      if (!res.ok) {
        clearTokens();
        return null;
      }

      const data = await res.json();
      if (data.success && data.accessToken) {
        storeTokens(data.accessToken, null);
        return data.accessToken;
      }
      return null;
    } catch {
      return null;
    }
  };

  // Authenticated fetch
  const authFetch = useCallback(async (url, options = {}) => {
    let { accessToken } = getTokens();

    const makeRequest = async (token) => {
      return fetch(url, {
        ...options,
        headers: {
          ...options.headers,
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
    };

    let res = await makeRequest(accessToken);

    // If 403, try to refresh token
    if (res.status === 403) {
      const newToken = await refreshAccessToken();
      if (newToken) {
        res = await makeRequest(newToken);
      }
    }

    return res;
  }, []);

  // Check if user is authenticated
  const checkAuth = useCallback(async () => {
    const { accessToken } = getTokens();
    if (!accessToken) {
      setLoading(false);
      return;
    }

    try {
      const res = await authFetch(`${API_URL}/api/auth/me`);
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setUser(data.user);
        }
      } else {
        clearTokens();
        setUser(null);
      }
    } catch {
      clearTokens();
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, [authFetch]);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // Register
  const register = async (email, password, username) => {
    setError(null);
    try {
      const res = await fetch(`${API_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, username })
      });

      const data = await res.json();

      if (!data.success) {
        setError(data.error);
        return false;
      }

      storeTokens(data.accessToken, data.refreshToken);
      setUser(data.user);
      return true;
    } catch (err) {
      setError('Erreur de connexion au serveur');
      return false;
    }
  };

  // Login
  const login = async (email, password) => {
    setError(null);
    try {
      const res = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await res.json();

      if (!data.success) {
        setError(data.error);
        return false;
      }

      storeTokens(data.accessToken, data.refreshToken);
      setUser(data.user);
      return true;
    } catch (err) {
      setError('Erreur de connexion au serveur');
      return false;
    }
  };

  // Logout
  const logout = async () => {
    const { refreshToken } = getTokens();
    try {
      await authFetch(`${API_URL}/api/auth/logout`, {
        method: 'POST',
        body: JSON.stringify({ refreshToken })
      });
    } catch {
      // Ignore errors
    }
    clearTokens();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      error,
      setError,
      login,
      register,
      logout,
      authFetch,
      isAuthenticated: !!user
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
