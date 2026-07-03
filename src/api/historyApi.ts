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
      const error = new Error(`REST request failed with status ${response.status}`);
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

function normalizeHistoryResponse(res: EnergyHistoryResponse, fallbackFilter: string): HistoryData {
  const payload = res.data ?? res;
  const records = Array.isArray(payload.records) ? payload.records : [];

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

  try {
    const res = await request<EnergyHistoryResponse>(
      `/api/history/energy/${encodedDeviceId}?filter=${filter}`,
    );
    return normalizeHistoryResponse(res, filter);
  } catch (error) {
    if ((error as Error & { status?: number }).status !== 404) throw error;
  }

  const res = await request<EnergyHistoryResponse>(
    `/api/history/energy?deviceId=${encodedDeviceId}&filter=${filter}`,
  );
  return normalizeHistoryResponse(res, filter);
}

// Reads DEVICE_ID from config. Imported here to keep historyApi self-contained.
async function getDeviceId(): Promise<string> {
  const { DEVICE_ID } = await import('../config/communication');
  return DEVICE_ID;
}

export type { EnergyRecord, HistoryData } from '../types/communication';
