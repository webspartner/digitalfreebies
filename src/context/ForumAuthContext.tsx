'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';

export interface ForumUser {
  id: number;
  username: string;
  email: string;
  isBanned?: boolean;
  banReason?: string | null;
  createdAt?: string;
  _count?: {
    posts: number;
    comments: number;
  };
}

interface ForumAuthContextType {
  user: ForumUser | null;
  token: string | null;
  loading: boolean;
  login: (token: string | undefined, user: ForumUser) => void;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  getAuthHeaders: () => Record<string, string>;
}

const ForumAuthContext = createContext<ForumAuthContextType>({
  user: null,
  token: null,
  loading: true,
  login: () => {},
  logout: async () => {},
  refreshUser: async () => {},
  getAuthHeaders: () => ({}),
});

export function ForumAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<ForumUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const getAuthHeaders = useCallback((): Record<string, string> => {
    if (token) {
      return { Authorization: `Bearer ${token}` };
    }
    return {};
  }, [token]);

  const refreshUser = useCallback(async () => {
    try {
      const res = await fetch('/api/forum/auth/me', {
        credentials: 'same-origin',
        cache: 'no-store',
      });

      if (res.ok) {
        const data = await res.json();
        if (data.user) {
          setUser(data.user);
          if (typeof window !== 'undefined') {
            localStorage.removeItem('forum_token'); // Do not store raw JWT in localStorage (HttpOnly cookie used)
            localStorage.setItem('forum_user', JSON.stringify(data.user));
          }
        } else {
          setUser(null);
          setToken(null);
          if (typeof window !== 'undefined') {
            localStorage.removeItem('forum_token');
            localStorage.removeItem('forum_user');
          }
        }
      }
    } catch (err) {
      console.error('Failed to verify forum session:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('forum_token');
      const storedUser = localStorage.getItem('forum_user');
      const isForumRoute = window.location.pathname.startsWith('/forum');

      if (storedUser) {
        try {
          setUser(JSON.parse(storedUser));
        } catch {
          // ignore corrupted JSON
        }
      }

      // Only hit /api/forum/auth/me on mount if user has an active session cached or is visiting /forum
      if (storedUser || isForumRoute) {
        refreshUser();
      } else {
        setLoading(false);
      }
    }
  }, [refreshUser]);

  const login = useCallback((newToken: string | undefined, newUser: ForumUser) => {
    if (newToken) setToken(newToken);
    setUser(newUser);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('forum_token');
      localStorage.setItem('forum_user', JSON.stringify(newUser));
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await fetch('/api/forum/auth/logout', {
        method: 'POST',
        credentials: 'same-origin',
      });
    } catch {
      // ignore
    }
    setUser(null);
    setToken(null);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('forum_token');
      localStorage.removeItem('forum_user');
    }
  }, []);

  const contextValue = useMemo(
    () => ({
      user,
      token,
      loading,
      login,
      logout,
      refreshUser,
      getAuthHeaders,
    }),
    [user, token, loading, login, logout, refreshUser, getAuthHeaders]
  );

  return (
    <ForumAuthContext.Provider value={contextValue}>
      {children}
    </ForumAuthContext.Provider>
  );
}

export function useForumAuth() {
  return useContext(ForumAuthContext);
}
