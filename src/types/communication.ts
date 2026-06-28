export interface TimeSeriesPoint {
  timestamp: string;
  value: number;
}

export interface DashboardData {
  voltage: number;
  current: number;
  power: number;
  energy: number;
  frequency: number;
  powerFactor: number;
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
}

export interface MainBoardStatus {
  masterLockEnabled: boolean;
  shutdownEnabled: boolean;
  relays: Relay[];
  totalCurrent: number;
}

export interface DigitalRelay {
  id: string;
  name: string;
  isOn: boolean;
  current: number;
  power: number;
  status: 'normal' | 'error' | 'offline';
}

export interface DigitalBoardStatus {
  masterLockEnabled: boolean;
  relays: DigitalRelay[];
}

export interface AcStatus {
  isOn: boolean;
  temperature: number;
  mode: 'cool' | 'fan' | 'dry' | 'auto';
  fanSpeed: 'low' | 'medium' | 'high' | 'auto';
  swingOn: boolean;
  irBlasterAvailable: boolean;
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

export interface IoTDevice {
  id: string;
  name: string;
  deviceId: string;
  ipAddress: string;
  macAddress: string;
  isOnline: boolean;
  rssi: number;
  lastConnected: string;
  type: 'main-board' | 'digital-board' | 'ac-controller' | 'sensor';
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
