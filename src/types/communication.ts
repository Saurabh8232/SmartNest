export interface TimeSeriesPoint {
  timestamp: string;
  value: number;
}

export interface SensorsPayload {
  voltage: number;
  current: { main: number; digital: number; ac: number; };
  power:   { ac: number; };
  energy:  { acKwh: number; mainKwh: number; digitalKwh: number; };
  environment: { temperatureC: number; humidityPct: number; };
  lastUpdated: string;
}

export interface RelayItem {
  relay: number;
  state: boolean;
  locked: boolean;
  runtimeSec: number;
}

export interface RelaysPayload {
  items: RelayItem[];
  masterLock: boolean;
  digitalSwitch: boolean;
  lastUpdated: string;
}

export interface StatusPayload {
  uptime: number;
  wifi: { ssid: string; rssi: number; };
  mqttStatus: number;
  sd: { ok: boolean; total: number; used: number; };
  digitalOnline: boolean;
  pzemOnline: boolean;
  pzemHealth: boolean;
  dhtOk: boolean;
  lastUpdated: string;
}

export interface CommandAck {
  cmd_id: string;
  command: string;
  ok: boolean;
  message: string;
  timestamp: number;
}

export interface DashboardData {
  voltage: number;
  current: number;
  power: number;
  energy: number;
  frequency?: number;
  powerFactor?: number;
  totalDevices: number;
  activeRelays: number;
  totalCurrent: number;
  systemOnline: boolean;
  lastUpdated: string;
  voltageHistory: TimeSeriesPoint[];
  powerHistory: TimeSeriesPoint[];
  energyHistory: TimeSeriesPoint[];
  currentHistory: TimeSeriesPoint[];
  temperature?: number;
  humidity?: number;
}

export interface Relay {
  id: string;
  name: string;
  number: number;
  isOn: boolean;
  current: number;
  status: 'normal' | 'error' | 'offline';
  locked: boolean;
}

export interface MainBoardStatus {
  masterLockEnabled: boolean;
  shutdownEnabled: boolean;
  relays: Relay[];
  mainCurrent: number;
  mainEnergyKwh: number;
}

export interface DigitalRelay {
  id: string;
  name: string;
  isOn: boolean;
  current: number;
  power: number;
  status: 'normal' | 'error' | 'offline';
  switchState: 'pressed' | 'released';
  locked: boolean;
}

export interface DigitalBoardStatus {
  masterLockEnabled: boolean;
  relays: DigitalRelay[];
  digitalCurrent: number;
  digitalEnergyKwh: number;
}

export interface AcStatus {
  isOn: boolean;
  temperature: number;
  fanSpeed: 'auto' | 'min' | 'low' | 'med' | 'high' | 'max';
  swingOn: boolean;
  irBlasterAvailable: boolean;
  acCurrent: number;
  acPower: number;
  acEnergyKwh: number;
  pzemCumulativeEnergyKwh: number;
}

export interface Alert {
  id: string;
  type: 'electrical' | 'communication' | 'relay';
  code: string;
  title: string;
  description: string;
  severity: 'critical' | 'warning' | 'info';
  suggestedSolution: string;
  timestamp: string;
  isResolved: boolean;
  deviceName?: string;
}

export interface IoTDevice {
  id: string;
  name: string;
  deviceId: string;
  ipAddress: string;
  macAddress: string;
  isOnline: boolean;
  rssi: number;
  lastConnected: string;
  type: 'main-board' | 'ac-controller' | 'digital-board';
}

export interface HistoryData {
  energyRecords: EnergyRecord[];
  acRecords: AcRecord[];
  energyTrend: TimeSeriesPoint[];
}

export interface EnergyRecord {
  id: string;
  timestamp: string;
  energy: number;
}

export interface AcRecord {
  id: string;
  action: string;
  oldValue?: string;
  newValue?: string;
  timestamp: string;
}