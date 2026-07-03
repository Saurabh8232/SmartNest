import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import {
  AuthSession,
  loadStoredSession,
  login as loginToBackend,
  logout as logoutFromBackend,
} from './authService';

export interface UserProfile {
  username: string;
  isDemo: boolean;
}

export interface LoginCredentials {
  username: string;
  password: string;
}

interface AuthContextValue {
  user: UserProfile | null;
  loading: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
  login: async () => {},
  logout: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStoredSession().then((session: AuthSession | null) => {
      if (session) {
        setUser({ username: session.username, isDemo: session.isDemo });
      }
      setLoading(false);
    }).catch(() => {
      setUser(null);
      setLoading(false);
    });
  }, []);

  const login = useCallback(async (credentials: LoginCredentials) => {
    const session = await loginToBackend(credentials);
    setUser({ username: session.username, isDemo: session.isDemo });
  }, []);

  const logout = useCallback(async () => {
    await logoutFromBackend();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}