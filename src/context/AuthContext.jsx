import { createContext, useContext, useState, useEffect } from 'react';
import { getToken, setToken, clearToken, identityApi } from '../lib/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      setLoading(false);
      return;
    }

    identityApi
      .me()
      .then((res) => {
        setUser(res.data.user);
        setRoles(res.data.roles || []);
      })
      .catch(() => {
        clearToken();
      })
      .finally(() => setLoading(false));
  }, []);

  async function login(email, password) {
    const res = await identityApi.login(email, password);
    setToken(res.data.token);
    setUser(res.data.user);
    setRoles(res.data.roles || []);
    return res.data;
  }

  async function logout() {
    try {
      await identityApi.logout();
    } catch {
      // Even if the API call fails (e.g. token already invalid),
      // still clear local state so the user isn't stuck.
    }
    clearToken();
    setUser(null);
    setRoles([]);
  }

  return (
    <AuthContext.Provider value={{ user, roles, loading, login, logout }}>
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
