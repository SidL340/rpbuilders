import React, { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('rp_user')); }
    catch { return null; }
  });
  const [loading, setLoading] = useState(false);

  const login = async (username, password) => {
    setLoading(true);
    try {
      const cleanUser = String(username || '').trim();
      const cleanPass = String(password || '').trim();
      const { data } = await authAPI.login({ username: cleanUser, password: cleanPass });
      if (data.success && data.data?.token) {
        localStorage.setItem('rp_token', data.data.token);
        localStorage.setItem('rp_user', JSON.stringify(data.data.user));
        setUser(data.data.user);
        return { success: true, user: data.data.user };
      }
      return { success: false, message: data.message || 'Login failed' };
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || 'Invalid username or password';
      return { success: false, message: msg };
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    await authAPI.logout().catch(() => {});
    localStorage.removeItem('rp_token');
    localStorage.removeItem('rp_user');
    setUser(null);
  };

  const hasRole = (...roles) => {
    if (!user) return false;
    if (user.role === 'super_admin') return true;
    return roles.includes(user.role);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, hasRole }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
