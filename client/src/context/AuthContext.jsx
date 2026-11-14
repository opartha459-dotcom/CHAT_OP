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
    let isMounted = true;
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

        const contentType = res.headers.get('content-type') || '';
        if (!res.ok || !contentType.includes('application/json')) {
          if (isMounted) {
            setUser(null);
            if (res.status === 401) {
              localStorage.removeItem('pulsechat_token');
            }
          }
          return;
        }

        const data = await res.json();
        if (isMounted && data.success && data.user) {
          setUser(data.user);
          try {
            // Initialize E2EE Keys
            const keys = await getOrCreateUserKeys(data.user._id);
            if (isMounted) setE2eeInfo(keys);
          } catch (keyErr) {
            console.warn('E2EE initialization non-fatal warning:', keyErr);
          }
        } else if (isMounted) {
          setUser(null);
          localStorage.removeItem('pulsechat_token');
        }
      } catch (err) {
        console.error('Failed to restore session:', err);
        if (isMounted) setUser(null);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchMe();
    return () => {
      isMounted = false;
    };
  }, []);

  const setSession = async (userData, authToken) => {
    setUser(userData);
    if (authToken) {
      setToken(authToken);
      localStorage.setItem('pulsechat_token', authToken);
    }
    if (userData?._id) {
      try {
        const keys = await getOrCreateUserKeys(userData._id);
        setE2eeInfo(keys);
      } catch (e) {
        console.warn('E2EE init warning:', e);
      }
    }
  };

  const login = async (identifier, password) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ identifier, password })
    });

    const data = await res.json();
    if (!data.success) {
      if (data.isDeletedByAdmin) {
        const err = new Error(data.message || 'Your account was deleted by an administrator.');
        err.isDeletedByAdmin = true;
        err.adminMessage = data.adminMessage || data.deletionReason;
        err.deletionReason = data.deletionReason || data.adminMessage;
        err.deletedAt = data.deletedAt;
        err.recoveryDeadline = data.recoveryDeadline;
        err.appealUrl = data.appealUrl;
        err.email = data.email;
        err.username = data.username;
        throw err;
      }
      if (data.requiresRecovery) {
        const err = new Error(data.message || 'Account is currently pending deletion.');
        err.requiresRecovery = true;
        err.recoveryData = {
          email: data.email,
          username: data.username,
          recoveryDeadline: data.recoveryDeadline
        };
        throw err;
      }
      if (data.requiresEmailVerification) {
        const err = new Error(data.message || 'Email verification is mandatory before logging in.');
        err.requiresEmailVerification = true;
        err.email = data.email;
        err.username = data.username;
        throw err;
      }
      throw new Error(data.message || 'Login failed');
    }

    await setSession(data.user, data.token);
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
      if (data.isDeletedByAdmin) {
        const err = new Error(data.message || 'Your account was deleted by an administrator.');
        err.isDeletedByAdmin = true;
        err.adminMessage = data.adminMessage || data.deletionReason;
        err.deletionReason = data.deletionReason || data.adminMessage;
        err.deletedAt = data.deletedAt;
        err.recoveryDeadline = data.recoveryDeadline;
        err.appealUrl = data.appealUrl;
        err.email = data.email;
        err.username = data.username;
        throw err;
      }
      if (data.requiresRecovery) {
        const err = new Error(data.message || 'An account with this email is pending deletion.');
        err.requiresRecovery = true;
        err.recoveryData = {
          email: data.email,
          username: data.username,
          recoveryDeadline: data.recoveryDeadline
        };
        throw err;
      }
      throw new Error(data.message || 'Registration failed');
    }

    if (data.requiresEmailVerification) {
      return {
        requiresEmailVerification: true,
        email: data.email,
        username: data.username,
        message: data.message
      };
    }

    await setSession(data.user, data.token);
    return data.user;
  };

  const resendVerification = async (emailOrIdentifier) => {
    const res = await fetch('/api/auth/resend-verification', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: emailOrIdentifier, identifier: emailOrIdentifier })
    });
    const data = await res.json();
    if (!data.success) {
      throw new Error(data.message || 'Failed to resend verification email.');
    }
    return data;
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

  const authHeaders = (isJson = true) => {
    const storedToken = token || localStorage.getItem('pulsechat_token');
    const headers = {};
    if (isJson) headers['Content-Type'] = 'application/json';
    if (storedToken) headers['Authorization'] = `Bearer ${storedToken}`;
    return headers;
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
        setUser,
        setToken,
        setSession,
        authHeaders,
        e2eeInfo,
        resendVerification
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
