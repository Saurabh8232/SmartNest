import { REST_BASE_URL } from '../config/communication';
import { authFetch } from '../authentication/authService';
import { EnergyRecord, HistoryData } from '../types/communication';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);

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

export async function getHistory(period: string): Promise<HistoryData> {
  const filter = toBackendFilter(period);
  const deviceId = await getDeviceId();
  const encodedDeviceId = encodeURIComponent(deviceId);
  const paths = [
    // Matches the backend guide route written as /api/history/energy:deviceId.
    `/api/history/energy${encodedDeviceId}?deviceId=${encodedDeviceId}&filter=${filter}`,
    `/api/history/energy/${encodedDeviceId}?filter=${filter}`,
    `/api/history/energy?deviceId=${encodedDeviceId}&filter=${filter}`,
  ];
  let lastError: unknown = null;

  for (const path of paths) {
    try {
      const res = await request<EnergyHistoryResponse>(path);
      return normalizeHistoryResponse(res, filter);
    } catch (error) {
      lastError = error;
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
