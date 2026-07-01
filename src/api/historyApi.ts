import { REST_BASE_URL } from '../config/communication';
import { authFetch } from '../authentication/authService';
import {
  AcRecord,
  EnergyRecord,
  HistoryData,
  TimeSeriesPoint,
} from '../types/communication';

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
      throw new Error(`REST request failed with status ${response.status}`);
    }

    return response.json();
  } finally {
    clearTimeout(timeoutId);
  }
}

interface EnergyHistoryResponse {
  energyRecords?: EnergyRecord[];
  electricalRecords?: Array<EnergyRecord & Record<string, unknown>>;
  energyTrend?: TimeSeriesPoint[];
}

interface AcActivityHistoryResponse {
  acRecords?: AcRecord[];
}

type HistoryPeriod = 'daily' | 'weekly' | 'monthly';

function normalizePeriod(period: string): HistoryPeriod {
  if (period === 'last7days' || period === 'weekly') return 'weekly';
  if (period === 'last30days' || period === 'monthly') return 'monthly';
  return 'daily';
}

export async function getEnergyHistory(
  period: string,
): Promise<Pick<HistoryData, 'energyRecords' | 'energyTrend'>> {
  const normalizedPeriod = normalizePeriod(period);
  const history = await request<EnergyHistoryResponse>(
    `/energyHistory?period=${normalizedPeriod}`,
  );
  const sourceRecords = Array.isArray(history.energyRecords)
    ? history.energyRecords
    : Array.isArray(history.electricalRecords)
      ? history.electricalRecords
      : [];
  const energyRecords = sourceRecords.map(record => ({
    id: String(record.id),
    timestamp: record.timestamp,
    energy: Number(record.energy) || 0,
  }));

  return {
    energyRecords,
    energyTrend: Array.isArray(history.energyTrend)
      ? history.energyTrend
      : energyRecords.map(record => ({
          timestamp: record.timestamp,
          value: Number(record.energy) || 0,
        })),
  };
}

export async function getAcActivityHistory(period: string): Promise<AcRecord[]> {
  const normalizedPeriod = normalizePeriod(period);
  const history = await request<AcActivityHistoryResponse>(
    `/acActivityHistory?period=${normalizedPeriod}`,
  );
  return Array.isArray(history.acRecords) ? history.acRecords : [];
}

// The existing History screen consumes one model, composed exclusively from REST.
export async function getHistory(period: string): Promise<HistoryData> {
  const [energyHistory, acRecords] = await Promise.all([
    getEnergyHistory(period),
    getAcActivityHistory(period),
  ]);

  return {
    ...energyHistory,
    acRecords,
  };
}

export type {
  AcRecord,
  EnergyRecord,
  HistoryData,
  TimeSeriesPoint,
} from '../types/communication';
