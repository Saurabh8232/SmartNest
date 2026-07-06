import AsyncStorage from '@react-native-async-storage/async-storage';
import { REST_BASE_URL } from '../config/communication';

const STORAGE_KEY = '@smartnest_auth_session';
const REQUEST_TIMEOUT_MS = 12000;

export interface AuthSession {
  username: string;
  accessToken: string;
  refreshToken: string;
  isDemo: boolean;
}

export interface LoginCredentials {
  username: string;
  password: string;
}

type SessionListener = (session: AuthSession | null) => void;

let currentSession: AuthSession | null = null;
const sessionListeners = new Set<SessionListener>();

function notifySessionListeners(): void {
  sessionListeners.forEach(listener => listener(currentSession));
}

async function persistSession(session: AuthSession | null): Promise<void> {
  currentSession = session;
  if (session) {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  } else {
    await AsyncStorage.removeItem(STORAGE_KEY);
  }
  notifySessionListeners();
}

function buildDemoSession(username: string): AuthSession {
  return {
    username,
    accessToken: '',
    refreshToken: '',
    isDemo: true,
  };
}

async function parseResponseMessage(response: Response): Promise<string | null> {
  try {
    const json = await response.json();
    if (typeof json?.error === 'string') return json.error;
    if (typeof json?.message === 'string') return json.message;
  } catch {}
  return null;
}

async function fetchWithTimeout(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  const requestInput = input instanceof URL ? input.toString() : input;
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error('Request timed out')), REQUEST_TIMEOUT_MS);
  });

  try {
    return await Promise.race([fetch(requestInput, init), timeout]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

export async function loadStoredSession(): Promise<AuthSession | null> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) {
    currentSession = null;
    notifySessionListeners();
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<AuthSession>;
    if (typeof parsed.username === 'string') {
      currentSession = {
        username: parsed.username,
        accessToken: typeof parsed.accessToken === 'string' ? parsed.accessToken : '',
        refreshToken: typeof parsed.refreshToken === 'string' ? parsed.refreshToken : '',
        isDemo: Boolean(parsed.isDemo),
      };
      notifySessionListeners();
      return currentSession;
    }
  } catch {}

  currentSession = null;
  notifySessionListeners();
  return null;
}

export function subscribeToSession(listener: SessionListener): () => void {
  sessionListeners.add(listener);
  listener(currentSession);
  return () => {
    sessionListeners.delete(listener);
  };
}

export function getCurrentSession(): AuthSession | null {
  return currentSession;
}

export function getAccessToken(): string | null {
  return currentSession?.accessToken || null;
}

export async function login(credentials: LoginCredentials): Promise<AuthSession> {
  try {
    const response = await fetchWithTimeout(`${REST_BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials),
    });

    if (response.ok) {
      const json = await response.json();
      if (typeof json?.accessToken !== 'string' || typeof json?.refreshToken !== 'string') {
        throw new Error('Invalid authentication response');
      }

      const session: AuthSession = {
        username: credentials.username,
        accessToken: json.accessToken,
        refreshToken: json.refreshToken,
        isDemo: false,
      };
      await persistSession(session);
      return session;
    }

    if (response.status === 400 || response.status === 401) {
      const message = await parseResponseMessage(response);
      throw new Error(message || 'Invalid credentials');
    }

    if (response.status === 404 || response.status === 405 || response.status === 501) {
      const session = buildDemoSession(credentials.username);
      await persistSession(session);
      return session;
    }

    const message = await parseResponseMessage(response);
    throw new Error(message || `HTTP ${response.status}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (
      message.toLowerCase().includes('network request failed') ||
      message.toLowerCase().includes('failed to fetch')
    ) {
      const session = buildDemoSession(credentials.username);
      await persistSession(session);
      return session;
    }
    throw error;
  }
}

export async function refreshAccessToken(): Promise<AuthSession | null> {
  if (!currentSession || currentSession.isDemo || !currentSession.refreshToken) {
    return currentSession;
  }

  try {
    const response = await fetchWithTimeout(`${REST_BASE_URL}/api/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: currentSession.refreshToken }),
    });

    if (response.ok) {
      const json = await response.json();
      if (typeof json?.accessToken !== 'string') {
        throw new Error('Invalid refresh response');
      }

      const nextSession: AuthSession = {
        ...currentSession,
        accessToken: json.accessToken,
      };
      await persistSession(nextSession);
      return nextSession;
    }

    if (response.status === 404 || response.status === 405 || response.status === 501) {
      return currentSession;
    }

    if (response.status === 401) {
      await clearSession();
      return null;
    }

    const message = await parseResponseMessage(response);
    throw new Error(message || `HTTP ${response.status}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (
      message.toLowerCase().includes('network request failed') ||
      message.toLowerCase().includes('failed to fetch')
    ) {
      return currentSession;
    }
    throw error;
  }
}

export async function clearSession(): Promise<void> {
  await persistSession(null);
}

export async function logout(): Promise<void> {
  const session = currentSession;
  if (session && !session.isDemo && session.refreshToken) {
    try {
      await fetchWithTimeout(`${REST_BASE_URL}/api/auth/logout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session.accessToken ? { Authorization: `Bearer ${session.accessToken}` } : {}),
        },
        body: JSON.stringify({ refreshToken: session.refreshToken }),
      });
    } catch {}
  }

  await clearSession();
}

export async function authFetch(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  const baseHeaders = new Headers(init.headers);
  const session = currentSession;

  if (session?.accessToken) {
    baseHeaders.set('Authorization', `Bearer ${session.accessToken}`);
  }

  const requestInput = input instanceof URL ? input.toString() : input;
  const makeRequest = (headers: Headers) => fetchWithTimeout(requestInput, { ...init, headers });
  let response = await makeRequest(baseHeaders);

  if (response.status !== 401 || !session?.refreshToken || session.isDemo) {
    return response;
  }

  const refreshedSession = await refreshAccessToken();
  if (!refreshedSession?.accessToken) {
    return response;
  }

  const retryHeaders = new Headers(init.headers);
  retryHeaders.set('Authorization', `Bearer ${refreshedSession.accessToken}`);
  response = await makeRequest(retryHeaders);
  return response;
}
