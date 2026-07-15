// Authentication context for app-wide session state.
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import {
  AuthSession,
  fetchProfile as fetchProfileFromBackend,
  loadStoredSession,
  login as loginToBackend,
  logout as logoutFromBackend,
  register as registerToBackend,
  RegisterPayload,
  subscribeToSession,
} from './authService';

export interface UserProfile {
  id?: number | string;
  name: string;
  username: string;
  email: string;
}

export interface LoginCredentials {
  username: string;
  password: string;
}

interface AuthContextValue {
  user: UserProfile | null;
  loading: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  refreshProfile: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
  login: async () => {},
  register: async () => {},
  refreshProfile: async () => {},
  logout: async () => {},
});

function toUserProfile(session: AuthSession): UserProfile {
  return {
    id: session.id,
    name: session.name,
    username: session.username,
    email: session.email,
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = subscribeToSession((session: AuthSession | null) => {
      setUser(session ? toUserProfile(session) : null);
    });

    loadStoredSession()
      .then((session: AuthSession | null) => {
        if (session) {
          setUser(toUserProfile(session));
        }
        setLoading(false);
      })
      .catch(() => {
        setUser(null);
        setLoading(false);
      });

    return unsubscribe;
  }, []);

  const login = useCallback(async (credentials: LoginCredentials) => {
    const session = await loginToBackend(credentials);
    setUser(toUserProfile(session));
  }, []);

  const register = useCallback(async (payload: RegisterPayload) => {
    const session = await registerToBackend(payload);
    setUser(toUserProfile(session));
  }, []);

  const refreshProfile = useCallback(async () => {
    const session = await fetchProfileFromBackend();
    setUser(toUserProfile(session));
  }, []);

  const logout = useCallback(async () => {
    await logoutFromBackend();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, loading, login, register, refreshProfile, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
