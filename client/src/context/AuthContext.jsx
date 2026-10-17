import React, { createContext, useContext, useState, useEffect } from 'react';
import { getOrCreateUserKeys } from '../utils/crypto';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('pulsechat_token') || '');
  const [loading, setLoading] = useState(true);
  const [e2eeInfo, setE2eeInfo] = useState(null);

  // Initialize auth state
  useEffect(() => {
    const fetchMe = async () => {
      try {
        const storedToken = localStorage.getItem('pulsechat_token');
        const headers = { 'Content-Type': 'application/json' };
        if (storedToken) {
          headers['Authorization'] = `Bearer ${storedToken}`;
        }

        const res = await fetch('/api/auth/me', {
          credentials: 'include',
          headers
        });

        const data = await res.json();
        if (data.success && data.user) {
          setUser(data.user);
          // Initialize E2EE Keys
          const keys = await getOrCreateUserKeys(data.user._id);
          setE2eeInfo(keys);
        } else {
          setUser(null);
          localStorage.removeItem('pulsechat_token');
        }
      } catch (err) {
        console.error('Failed to restore session:', err);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    fetchMe();
  }, []);

  const login = async (identifier, password) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ identifier, password })
    });

    const data = await res.json();
    if (!data.success) {
      throw new Error(data.message || 'Login failed');
    }

    setUser(data.user);
    if (data.token) {
      setToken(data.token);
      localStorage.setItem('pulsechat_token', data.token);
    }

    const keys = await getOrCreateUserKeys(data.user._id);
    setE2eeInfo(keys);

    return data.user;
  };

  const register = async (userData) => {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(userData)
    });

    const data = await res.json();
    if (!data.success) {
      throw new Error(data.message || 'Registration failed');
    }

    setUser(data.user);
    if (data.token) {
      setToken(data.token);
      localStorage.setItem('pulsechat_token', data.token);
    }

    const keys = await getOrCreateUserKeys(data.user._id);
    setE2eeInfo(keys);

    return data.user;
  };

  const logout = async () => {
    try {
      const storedToken = localStorage.getItem('pulsechat_token');
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...(storedToken ? { Authorization: `Bearer ${storedToken}` } : {})
        }
      });
    } catch (e) {
      console.error('Logout error', e);
    } finally {
      setUser(null);
      setToken('');
      localStorage.removeItem('pulsechat_token');
    }
  };

  const logoutAll = async () => {
    try {
      const storedToken = localStorage.getItem('pulsechat_token');
      await fetch('/api/auth/logout-all', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...(storedToken ? { Authorization: `Bearer ${storedToken}` } : {})
        }
      });
    } finally {
      setUser(null);
      setToken('');
      localStorage.removeItem('pulsechat_token');
    }
  };

  const updateUser = (updatedUser) => {
    setUser(updatedUser);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        isAuthenticated: !!user,
        login,
        register,
        logout,
        logoutAll,
        updateUser,
        e2eeInfo
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
