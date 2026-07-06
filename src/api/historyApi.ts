import { REST_BASE_URL } from '../config/communication';
import { authFetch } from '../authentication/authService';
import { EnergyRecord, HistoryData } from '../types/communication';

// FIX (Issue 2 — History freeze): Accept an external AbortSignal so that
// HistoryScreen can cancel an in-flight request when the user changes the
// period filter. Without this, switching filters leaves the old (slow) request
// running in parallel with the new one, holding the JS thread's promise chain
// busy for up to 8 seconds per attempt.
async function request<T>(
  path: string,
  options?: RequestInit,
  externalSignal?: AbortSignal,
): Promise<T> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);

  // Link the external cancellation signal to the internal controller so that
  // when the caller aborts (e.g. filter changed), this fetch is also cancelled.
  if (externalSignal) {
    if (externalSignal.aborted) {
      clearTimeout(timeoutId);
      controller.abort();
    } else {
      externalSignal.addEventListener('abort', () => controller.abort(), { once: true });
    }
  }

  try {
    const response = await authFetch(`${REST_BASE_URL}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      let detail = '';
      try {
        const json = await response.json();
        if (typeof json?.error === 'string') detail = `: ${json.error}`;
        else if (typeof json?.message === 'string') detail = `: ${json.message}`;
      } catch {}

      const error = new Error(`History request failed with HTTP ${response.status}${detail}`);
      (error as Error & { status?: number }).status = response.status;
      throw error;
    }

    return response.json();
  } finally {
    clearTimeout(timeoutId);
  }
}

// Map UI period keys to the values the backend accepts
type BackendFilter = 'today' | '7d' | '30d' | 'custom';

function toBackendFilter(period: string): BackendFilter {
  if (period === 'last7days'  || period === '7d')  return '7d';
  if (period === 'last30days' || period === '30d') return '30d';
  return 'today';
}

interface EnergyHistoryResponse {
  success: boolean;
  filter: string;
  summary: { totalEnergyKwh: number; recordCount: number; };
  records: EnergyRecord[];
  data?: {
    filter?: string;
    summary?: { totalEnergyKwh: number; recordCount: number; };
    records?: EnergyRecord[];
  };
}

function normalizeRecord(record: EnergyRecord): EnergyRecord {
  return {
    ...record,
    date: typeof record.date === 'string'
      ? record.date.replace(' ', 'T')
      : record.date,
    totalEnergyKwh: Number(record.totalEnergyKwh) || 0,
    mainEnergyKwh: Number(record.mainEnergyKwh) || 0,
    digitalEnergyKwh: Number(record.digitalEnergyKwh) || 0,
    acEnergyKwh: Number(record.acEnergyKwh) || 0,
  };
}

function normalizeHistoryResponse(res: EnergyHistoryResponse, fallbackFilter: string): HistoryData {
  const payload = res.data ?? res;
  const records = Array.isArray(payload.records) ? payload.records.map(normalizeRecord) : [];

  return {
    filter: payload.filter ?? fallbackFilter,
    summary: payload.summary ?? { totalEnergyKwh: 0, recordCount: records.length },
    records,
  };
}

// FIX (Issue 2 — History freeze): Accept an external AbortSignal forwarded from
// HistoryScreen so that changing the period filter cancels the previous request
// immediately instead of letting it time out after 8 seconds.
export async function getHistory(period: string, signal?: AbortSignal): Promise<HistoryData> {
  const filter = toBackendFilter(period);
  const deviceId = await getDeviceId();
  const encodedDeviceId = encodeURIComponent(deviceId);

  // Per the backend README, the history endpoint is:
  //   GET /api/history/energy:deviceId?deviceId=<id>&filter=<filter>
  // (note: no slash between "energy" and the deviceId — that is the backend route format).
  // Paths 2 and 3 are fallbacks for backends that use a different route structure.
  const paths = [
    `/api/history/energy${encodedDeviceId}?deviceId=${encodedDeviceId}&filter=${filter}`,
    `/api/history/energy/${encodedDeviceId}?filter=${filter}`,
    `/api/history/energy?deviceId=${encodedDeviceId}&filter=${filter}`,
  ];
  let lastError: unknown = null;

  for (const path of paths) {
    try {
      const res = await request<EnergyHistoryResponse>(path, undefined, signal);
      return normalizeHistoryResponse(res, filter);
    } catch (error) {
      lastError = error;
      // If the request was cancelled by the caller (filter changed), propagate
      // immediately — do not retry the remaining paths.
      if ((error as Error).name === 'AbortError') throw error;
      // Only retry the next path on 404 (route not found); all other errors are final.
      if ((error as Error & { status?: number }).status !== 404) throw error;
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error('History endpoint was not found.');
}

// Reads DEVICE_ID from config. Imported here to keep historyApi self-contained.
async function getDeviceId(): Promise<string> {
  const { DEVICE_ID } = await import('../config/communication');
  return DEVICE_ID;
}

export type { EnergyRecord, HistoryData } from '../types/communication';
