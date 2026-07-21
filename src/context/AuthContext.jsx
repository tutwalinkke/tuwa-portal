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

  /**
   * Returns either { requiresTwoFactor: true, pendingToken } — the
   * caller (Login page) is responsible for prompting for a code and
   * calling verifyTwoFactor — or a real logged-in session directly,
   * same as before MFA existed.
   */
  async function login(email, password) {
    const res = await identityApi.login(email, password);

    if (res.data.requires_two_factor) {
      return { requiresTwoFactor: true, pendingToken: res.data.pending_token };
    }

    setToken(res.data.token);
    setUser(res.data.user);
    setRoles(res.data.roles || []);
    return { requiresTwoFactor: false };
  }

  async function verifyTwoFactor(pendingToken, code) {
    const res = await identityApi.verifyTwoFactor(pendingToken, code);
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
    <AuthContext.Provider value={{ user, roles, loading, login, verifyTwoFactor, logout }}>
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
