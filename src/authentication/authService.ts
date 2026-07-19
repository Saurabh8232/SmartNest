// Authentication REST calls and token persistence.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { REST_BASE_URL } from '../config/communication';

const STORAGE_KEY = '@smartnest_auth_session';
const REQUEST_TIMEOUT_MS = 12000;

export interface AuthSession {
  id?: number | string;
  name: string;
  username: string;
  email: string;
  accessToken: string;
  refreshToken: string;
  isDemo?: boolean;
}

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface RegisterPayload {
  name: string;
  username: string;
  email: string;
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

async function parseResponseMessage(
  response: Response,
): Promise<string | null> {
  try {
    const json = await response.json();
    if (typeof json?.error === 'string') return json.error;
    if (typeof json?.message === 'string') return json.message;
  } catch {}
  return null;
}

async function fetchWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit = {},
): Promise<Response> {
  const requestInput = input instanceof URL ? input.toString() : input;
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(
      () => reject(new Error('Request timed out')),
      REQUEST_TIMEOUT_MS,
    );
  });

  try {
    return await Promise.race([fetch(requestInput, init), timeout]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

function normalizeAuthSession(json: any, fallbackUsername = ''): AuthSession {
  const token = json?.token ?? json?.accessToken ?? json?.access_token;
  const refreshToken = json?.refreshToken ?? json?.refresh_token ?? '';
  const user =
    json?.user ?? json?.data?.user ?? json?.profile ?? json?.data ?? {};

  if (typeof token !== 'string' || token.length === 0) {
    throw new Error('Invalid authentication response');
  }

  const username = user?.username ?? json?.username ?? fallbackUsername;
  const name = user?.name ?? user?.fullName ?? json?.name ?? '';
  const email = user?.email ?? json?.email ?? '';

  if (typeof username !== 'string' || username.length === 0) {
    throw new Error('Invalid authentication response');
  }

  return {
    id: user?.id,
    name: typeof name === 'string' ? name : '',
    username,
    email: typeof email === 'string' ? email : '',
    accessToken: token,
    refreshToken: typeof refreshToken === 'string' ? refreshToken : '',
  };
}

function normalizeProfile(json: any, session: AuthSession): AuthSession {
  const user =
    json?.user ?? json?.data?.user ?? json?.profile ?? json?.data ?? json;
  const name = user?.name ?? user?.fullName ?? session.name;
  const email = user?.email ?? session.email;
  const username = user?.username ?? session.username;

  return {
    ...session,
    id: user?.id ?? session.id,
    name: typeof name === 'string' ? name : session.name,
    username: typeof username === 'string' ? username : session.username,
    email: typeof email === 'string' ? email : session.email,
  };
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
    if (
      typeof parsed.username === 'string' &&
      typeof parsed.accessToken === 'string'
    ) {
      currentSession = {
        id: parsed.id,
        name: typeof parsed.name === 'string' ? parsed.name : '',
        username: parsed.username,
        email: typeof parsed.email === 'string' ? parsed.email : '',
        accessToken: parsed.accessToken,
        refreshToken:
          typeof parsed.refreshToken === 'string' ? parsed.refreshToken : '',
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

export async function login(
  credentials: LoginCredentials,
): Promise<AuthSession> {
  const response = await fetchWithTimeout(`${REST_BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: credentials.username,
      password: credentials.password,
    }),
  });

  if (response.ok) {
    const json = await response.json();
    const session = normalizeAuthSession(json, credentials.username);
    await persistSession(session);
    return session;
  }

  const message = await parseResponseMessage(response);
  throw new Error(
    message ||
      (response.status === 401
        ? 'Invalid credentials'
        : `HTTP ${response.status}`),
  );
}

export async function register(payload: RegisterPayload): Promise<AuthSession> {
  const response = await fetchWithTimeout(
    `${REST_BASE_URL}/api/auth/register`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    },
  );

  if (response.ok) {
    const json = await response.json();
    const token = json?.token ?? json?.accessToken ?? json?.access_token;
    const message =
      typeof json?.message === 'string'
        ? json.message
        : 'Account is pending for admin approval.';

    if (typeof token !== 'string' || token.length === 0) {
      throw new Error(message);
    }

    const session = normalizeAuthSession(json, payload.username);
    await persistSession(session);
    return session;
  }

  const message = await parseResponseMessage(response);
  throw new Error(message || `HTTP ${response.status}`);
}

export async function fetchProfile(): Promise<AuthSession> {
  if (!currentSession?.accessToken) {
    throw new Error('Authentication required');
  }

  const response = await fetchWithTimeout(`${REST_BASE_URL}/api/auth/profile`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${currentSession.accessToken}`,
    },
  });

  if (response.ok) {
    const json = await response.json();
    const session = normalizeProfile(json, currentSession);
    await persistSession(session);
    return session;
  }

  const message = await parseResponseMessage(response);
  throw new Error(message || `HTTP ${response.status}`);
}

export async function refreshAccessToken(): Promise<AuthSession | null> {
  if (!currentSession || !currentSession.refreshToken) {
    return currentSession;
  }

  try {
    const response = await fetchWithTimeout(
      `${REST_BASE_URL}/api/auth/refresh`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: currentSession.refreshToken }),
      },
    );

    if (response.ok) {
      const json = await response.json();
      const accessToken =
        json?.accessToken ?? json?.token ?? json?.access_token;
      if (typeof accessToken !== 'string') {
        throw new Error('Invalid refresh response');
      }

      const nextSession: AuthSession = {
        ...currentSession,
        accessToken,
      };
      await persistSession(nextSession);
      return nextSession;
    }

    if (
      response.status === 404 ||
      response.status === 405 ||
      response.status === 501
    ) {
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
  if (session?.refreshToken) {
    try {
      await fetchWithTimeout(`${REST_BASE_URL}/api/auth/logout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session.accessToken
            ? { Authorization: `Bearer ${session.accessToken}` }
            : {}),
        },
        body: JSON.stringify({ refreshToken: session.refreshToken }),
      });
    } catch {}
  }

  await clearSession();
}

export async function authFetch(
  input: RequestInfo | URL,
  init: RequestInit = {},
): Promise<Response> {
  const baseHeaders = new Headers(init.headers);
  const session = currentSession;

  if (session?.accessToken) {
    baseHeaders.set('Authorization', `Bearer ${session.accessToken}`);
  }

  const requestInput = input instanceof URL ? input.toString() : input;
  const makeRequest = (headers: Headers) =>
    fetchWithTimeout(requestInput, { ...init, headers });
  let response = await makeRequest(baseHeaders);

  if (response.status !== 401 || !session?.refreshToken) {
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
