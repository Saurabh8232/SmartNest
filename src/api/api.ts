// ─── Change this to your backend URL ───────────────────────────────────────
const BASE_URL = 'http://192.168.42.43:5000';
// ────────────────────────────────────────────────────────────────────────────

const TIMEOUT_MS = 5000;

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      headers: { 'Content-Type': 'application/json', ...options?.headers },
      signal: controller.signal,
      ...options,
    });
    if (!res.ok) throw new Error(`API error ${res.status}`);
    return res.json();
  } finally {
    clearTimeout(timer);
  }
}

// ── Dashboard ────────────────────────────────────────────────────────────────
export const getDashboard = () => request<DashboardData>('/dashboard');

// ── Main Board ───────────────────────────────────────────────────────────────
export const getMainBoardRelays = () => request<MainBoardStatus>('/main-board/relays');
export const controlMainRelay = (relayId: string, action: 'on' | 'off') =>
  request<Relay>(`/main-board/relay/${relayId}/control`, {
    method: 'POST', body: JSON.stringify({ action }),
  });
export const setMasterLock = (enabled: boolean) =>
  request<{ enabled: boolean }>('/main-board/master-lock', {
    method: 'POST', body: JSON.stringify({ enabled }),
  });
export const rebootMainBoard = () =>
  request<{ success: boolean }>('/main-board/reboot', { method: 'POST' });

// ── Digital Board ─────────────────────────────────────────────────────────────
export const getDigitalBoardRelays = () => request<DigitalBoardStatus>('/digital-board/relays');
export const controlDigitalRelay = (relayId: string, action: 'on' | 'off') =>
  request<DigitalRelay>(`/digital-board/relay/${relayId}/control`, {
    method: 'POST', body: JSON.stringify({ action }),
  });
export const setDigitalLock = (enabled: boolean) =>
  request<{ enabled: boolean }>('/digital-board/master-lock', {
    method: 'POST', body: JSON.stringify({ enabled }),
  });
export const rebootDigitalBoard = () =>
  request<{ success: boolean }>('/digital-board/reboot', { method: 'POST' });

// ── AC ────────────────────────────────────────────────────────────────────────
export const getAcStatus = () => request<AcStatus>('/ac/status');
export const sendAcCommand = (action: string, value?: unknown) =>
  request<AcStatus>('/ac/command', {
    method: 'POST', body: JSON.stringify({ action, value }),
  });
export const rebootAc = () =>
  request<{ success: boolean }>('/ac/reboot', { method: 'POST' });

// ── History ───────────────────────────────────────────────────────────────────
export const getHistory = (period: string) =>
  request<HistoryData>(`/history?period=${period}`);

// ── Devices ───────────────────────────────────────────────────────────────────
export const getDevices = () => request<{ devices: IoTDevice[] }>('/devices');
export const reconnectDevice = (deviceId: string) =>
  request<IoTDevice>(`/devices/${deviceId}/reconnect`, { method: 'POST' });
export const removeDevice = (deviceId: string) =>
  request<{ success: boolean }>(`/devices/${deviceId}`, { method: 'DELETE' });

// ── Alerts ────────────────────────────────────────────────────────────────────
export const getAlerts = (params?: { severity?: string }) => {
  const qs = params?.severity ? `?severity=${params.severity}` : '';
  return request<{ alerts: Alert[]; unreadCount: number }>(`/alerts${qs}`);
};
export const resolveAlert = (alertId: string) =>
  request<Alert>(`/alerts/${alertId}/resolve`, { method: 'POST' });

// ── Types ─────────────────────────────────────────────────────────────────────
export interface TimeSeriesPoint { timestamp: string; value: number; }

export interface DashboardData {
  voltage: number; current: number; power: number; energy: number;
  frequency: number; powerFactor: number; totalDevices: number;
  activeRelays: number; totalCurrent: number; systemOnline: boolean;
  lastUpdated: string; voltageHistory: TimeSeriesPoint[];
  powerHistory: TimeSeriesPoint[]; currentHistory: TimeSeriesPoint[];
}

export interface Relay {
  id: string; name: string; number: number; isOn: boolean;
  current: number; status: 'normal' | 'error' | 'offline';
}

export interface MainBoardStatus {
  masterLockEnabled: boolean; relays: Relay[]; totalCurrent: number;
}

export interface DigitalRelay {
  id: string; name: string; isOn: boolean; current: number;
  power: number; status: 'normal' | 'error' | 'offline';
  switchState: 'pressed' | 'released';
}

export interface DigitalBoardStatus {
  relays: DigitalRelay[];
  masterLockEnabled: boolean;
  totalCurrent: number;
}

export interface AcStatus {
  isOn: boolean; temperature: number; mode: 'cool' | 'fan' | 'dry' | 'auto';
  fanSpeed: 'low' | 'medium' | 'high' | 'auto'; swingOn: boolean;
  irBlasterAvailable: boolean;
  voltage: number; current: number; power: number; energy: number;
}

export interface HistoryData {
  electricalRecords: ElectricalRecord[]; relayRecords: RelayRecord[];
  acRecords: AcRecord[]; powerTrend: TimeSeriesPoint[]; energyTrend: TimeSeriesPoint[];
}

export interface ElectricalRecord {
  id: string; timestamp: string; voltage: number; current: number;
  power: number; energy: number; frequency: number; powerFactor: number;
}

export interface RelayRecord {
  id: string; relayName: string; action: 'on' | 'off';
  userAction: string; timestamp: string;
}

export interface AcRecord {
  id: string; action: string; oldValue?: string; newValue?: string; timestamp: string;
}

export interface IoTDevice {
  id: string; name: string; deviceId: string; ipAddress: string;
  macAddress: string; isOnline: boolean; rssi: number;
  lastConnected: string; type: 'main-board' | 'digital-board' | 'ac-controller' | 'sensor';
}

export interface Alert {
  id: string; type: 'electrical' | 'communication' | 'relay';
  code: string; title: string; description: string;
  severity: 'critical' | 'warning' | 'info'; suggestedSolution: string;
  timestamp: string; isResolved: boolean; deviceName?: string;
}
