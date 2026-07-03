import {
  AcStatus,
  Alert,
  CommandAck,
  DashboardData,
  DigitalBoardStatus,
  IoTDevice,
  MainBoardStatus,
  RelaysPayload,
  SensorsPayload,
  SlavesPayload,
  StatusPayload,
} from '../types/communication';
import { DEVICE_ID, REST_BASE_URL } from '../config/communication';
import { SOCKET_EVENTS } from './events';
import socketManager from './SocketManager';
import { authFetch, getAccessToken, subscribeToSession } from '../authentication/authService';

type Unsubscribe = () => void;

// ── Relay name maps (backend sends numbers only, names are local) ─
const MAIN_RELAY_NAMES: Record<number, string> = {
  1: 'Light 1',
  2: 'Light 2',
  3: 'Light 3',
  4: 'Light 4',
  5: 'Light 5',
  6: 'Light 6',
};

const DIGITAL_RELAY_NAMES: Record<number, string> = {
  7: 'Smart Plug 1',
};

subscribeToSession(session => {
  socketManager.setAuthToken(session?.accessToken ?? null);
});

socketManager.setAuthToken(getAccessToken());

// ── REST helper ──────────────────────────────────────────────────
async function apiPost(path: string, body?: object): Promise<{ cmd_id?: string }> {
  const res = await authFetch(`${REST_BASE_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

// ── REST snapshot (initial hydration before live socket data arrives) ────
// The backend only pushes device:relays / device:sensors over the socket when
// real MQTT data changes — it does NOT send a snapshot on `subscribe`. Without
// this, screens stay blank until the hardware happens to report an update.
// Note: GET /api/devices/:id/relays returns a DIFFERENT shape than the socket
// event (arrays, not `items`), so we normalize it here.
interface RestRelaysResponse {
  success: boolean;
  data: {
    states: boolean[];
    locks: boolean[];
    masterLock: boolean;
    digitalSwitch: boolean;
    runtimeSec: number[];
  };
}

function normalizeRestRelays(data: RestRelaysResponse['data']): RelaysPayload {
  return {
    items: data.states.map((state, idx) => ({
      relay: idx + 1,
      state,
      locked: data.locks[idx] ?? false,
      runtimeSec: data.runtimeSec[idx] ?? 0,
    })),
    masterLock: data.masterLock,
    digitalSwitch: data.digitalSwitch,
    lastUpdated: new Date().toISOString(),
  };
}

async function fetchInitialRelays(): Promise<RelaysPayload | null> {
  try {
    const res = await authFetch(`${REST_BASE_URL}/api/devices/${DEVICE_ID}/relays`);
    if (!res.ok) return null;
    const json: RestRelaysResponse = await res.json();
    if (!json?.data) return null;
    return normalizeRestRelays(json.data);
  } catch {
    // Offline or backend unreachable — the socket will populate state once it connects.
    return null;
  }
}

// ── In-memory state (combines events for DashboardData) ──────────
let latestSensors: SensorsPayload | null = null;
let latestRelays: RelaysPayload | null = null;
let latestStatus: StatusPayload | null = null;
let latestSlaves: SlavesPayload | null = null;
const shutdownAllListeners = new Set<() => void>();

const dashboardListeners = new Set<(d: DashboardData) => void>();

function buildDashboard(): DashboardData | null {
  if (!latestSensors) return null;
  const activeRelays = latestRelays
    ? latestRelays.items.filter(r => r.state).length
    : 0;
  const totalCurrent =
    latestSensors.current.main +
    latestSensors.current.digital +
    latestSensors.current.ac;
  const totalEnergy =
    latestSensors.energy.mainKwh +
    latestSensors.energy.digitalKwh +
    latestSensors.energy.acKwh;

  // systemOnline: derived from device:slaves (authoritative for PZEM/Digital connectivity).
  // Falls back to whether we have received any status heartbeat at all.
  const systemOnline = latestSlaves
    ? latestSlaves.pzem.online
    : latestStatus !== null;

  return {
    systemOnline,
    totalDevices: 3,
    activeRelays,
    totalCurrent: +totalCurrent.toFixed(2),
    voltage: latestSensors.voltage,
    current: totalCurrent,
    power: latestSensors.power.ac,
    energy: totalEnergy,
    lastUpdated: latestSensors.lastUpdated,
    voltageHistory: [],
    powerHistory: [],
    energyHistory: [],
    currentHistory: [],
    temperature: latestSensors.environment.temperatureC,
    humidity: latestSensors.environment.humidityPct,
  };
}

function notifyDashboardListeners(): void {
  const dash = buildDashboard();
  if (!dash) return;
  dashboardListeners.forEach(l => l(dash));
}

// ── Raw event subscriptions ──────────────────────────────────────
export function subscribeToSensors(listener: (s: SensorsPayload) => void): Unsubscribe {
  return socketManager.on<SensorsPayload>(SOCKET_EVENTS.deviceSensors, listener);
}

export function subscribeToRelays(listener: (r: RelaysPayload) => void): Unsubscribe {
  return socketManager.on<RelaysPayload>(SOCKET_EVENTS.deviceRelays, listener);
}

export function subscribeToStatus(listener: (s: StatusPayload) => void): Unsubscribe {
  return socketManager.on<StatusPayload>(SOCKET_EVENTS.deviceStatus, listener);
}

export function subscribeToSlaves(listener: (s: SlavesPayload) => void): Unsubscribe {
  return socketManager.on<SlavesPayload>(SOCKET_EVENTS.deviceSlaves, listener);
}

export function subscribeToCommandAck(listener: (ack: CommandAck) => void): Unsubscribe {
  return socketManager.on<CommandAck>(SOCKET_EVENTS.commandAck, listener);
}

// ── Dashboard (composed from sensors + relays + status + slaves) ─
export function subscribeToDashboard(listener: (data: DashboardData) => void): Unsubscribe {
  dashboardListeners.add(listener);

  const removeSensors = socketManager.on<SensorsPayload>(SOCKET_EVENTS.deviceSensors, s => {
    latestSensors = s;
    notifyDashboardListeners();
  });
  const removeRelays = socketManager.on<RelaysPayload>(SOCKET_EVENTS.deviceRelays, r => {
    latestRelays = r;
    notifyDashboardListeners();
  });
  const removeStatus = socketManager.on<StatusPayload>(SOCKET_EVENTS.deviceStatus, s => {
    latestStatus = s;
    notifyDashboardListeners();
  });
  const removeSlaves = socketManager.on<SlavesPayload>(SOCKET_EVENTS.deviceSlaves, s => {
    latestSlaves = s;
    notifyDashboardListeners();
  });

  if (!latestRelays) {
    fetchInitialRelays().then(relays => {
      if (relays && !latestRelays) {
        latestRelays = relays;
        notifyDashboardListeners();
      }
    });
  }

  socketManager.connect();

  return () => {
    dashboardListeners.delete(listener);
    removeSensors();
    removeRelays();
    removeStatus();
    removeSlaves();
  };
}

// ── Dashboard Alerts (stub — no backend event documented) ────────
export function subscribeToDashboardAlerts(listener: (alerts: Alert[]) => void): Unsubscribe {
  // No backend socket event currently documents this. Listener will never fire.
  return socketManager.on<Alert[]>('dashboard-alerts:update', listener);
}

export function subscribeToAlerts(listener: (alerts: Alert[]) => void): Unsubscribe {
  return socketManager.on<Alert[]>('dashboard-alerts:update', listener);
}

export function resolveAlert(_alertId: string): void {}

// ── Devices (stub — no backend socket event documented) ──────────
export function subscribeToDevices(listener: (devices: IoTDevice[]) => void): Unsubscribe {
  // No backend socket event currently documents this. Listener will never fire.
  return socketManager.on<IoTDevice[]>('devices:update', listener);
}

// ── Main Board ───────────────────────────────────────────────────
export function subscribeToMainBoard(listener: (status: MainBoardStatus) => void): Unsubscribe {
  let latestRelaysLocal: RelaysPayload | null = latestRelays;
  let latestSensorsLocal: SensorsPayload | null = latestSensors;

  function emit() {
    if (!latestRelaysLocal) return;
    const mainItems = latestRelaysLocal.items.filter(r => r.relay >= 1 && r.relay <= 6);
    listener({
      masterLockEnabled: latestRelaysLocal.masterLock,
      shutdownEnabled: false,
      mainCurrent: latestSensorsLocal?.current.main ?? 0,
      mainEnergyKwh: latestSensorsLocal?.energy.mainKwh ?? 0,
      relays: mainItems.map(r => ({
        id: `r${r.relay}`,
        name: MAIN_RELAY_NAMES[r.relay] ?? `Relay ${r.relay}`,
        number: r.relay,
        isOn: r.state,
        current: 0,
        status: 'normal' as const,
        locked: r.locked,
      })),
    });
  }

  if (!latestRelaysLocal) {
    fetchInitialRelays().then(relays => {
      if (relays && !latestRelaysLocal) {
        latestRelaysLocal = relays;
        latestRelays = latestRelays ?? relays;
        emit();
      }
    });
  } else {
    emit();
  }

  const removeRelays  = socketManager.on<RelaysPayload>(SOCKET_EVENTS.deviceRelays,  r => { latestRelaysLocal  = r; latestRelays = r; emit(); });
  const removeSensors = socketManager.on<SensorsPayload>(SOCKET_EVENTS.deviceSensors, s => { latestSensorsLocal = s; latestSensors = s; emit(); });

  socketManager.connect();
  return () => { removeRelays(); removeSensors(); };
}

export function subscribeToShutdownAll(listener: () => void): Unsubscribe {
  shutdownAllListeners.add(listener);
  return () => { shutdownAllListeners.delete(listener); };
}

// ── Digital Board ────────────────────────────────────────────────
export function subscribeToDigitalBoard(listener: (status: DigitalBoardStatus) => void): Unsubscribe {
  let latestRelaysLocal: RelaysPayload | null = latestRelays;
  let latestSensorsLocal: SensorsPayload | null = latestSensors;

  function emit() {
    if (!latestRelaysLocal) return;
    const digitalItem = latestRelaysLocal.items.find(r => r.relay === 7);
    listener({
      masterLockEnabled: latestRelaysLocal.masterLock,
      digitalCurrent: latestSensorsLocal?.current.digital ?? 0,
      digitalEnergyKwh: latestSensorsLocal?.energy.digitalKwh ?? 0,
      relays: digitalItem
        ? [{
            id: 'd7',
            name: DIGITAL_RELAY_NAMES[7] ?? 'Digital Relay',
            isOn: digitalItem.state,
            current: latestSensorsLocal?.current.digital ?? 0,
            power: +((latestSensorsLocal?.current.digital ?? 0) * (latestSensorsLocal?.voltage ?? 220)).toFixed(0),
            status: 'normal' as const,
            switchState: latestRelaysLocal.digitalSwitch ? 'pressed' : 'released',
            locked: digitalItem.locked,
          }]
        : [],
    });
  }

  if (!latestRelaysLocal) {
    fetchInitialRelays().then(relays => {
      if (relays && !latestRelaysLocal) {
        latestRelaysLocal = relays;
        latestRelays = latestRelays ?? relays;
        emit();
      }
    });
  } else {
    emit();
  }

  const removeRelays  = socketManager.on<RelaysPayload>(SOCKET_EVENTS.deviceRelays,  r => { latestRelaysLocal  = r; latestRelays = r; emit(); });
  const removeSensors = socketManager.on<SensorsPayload>(SOCKET_EVENTS.deviceSensors, s => { latestSensorsLocal = s; latestSensors = s; emit(); });

  socketManager.connect();
  return () => { removeRelays(); removeSensors(); };
}

// ── AC ───────────────────────────────────────────────────────────
// AC state (power, temperature, fan) is not broadcast via socket.
// We track what was last sent locally and infer power from current.ac > 0.
let _acTemp = 24;
let _acFan: AcStatus['fanSpeed'] = 'auto';
let _acSwing = false;

export function subscribeToAc(listener: (status: AcStatus) => void): Unsubscribe {
  return socketManager.on<SensorsPayload>(SOCKET_EVENTS.deviceSensors, s => {
    listener({
      isOn: s.current.ac > 0,
      temperature: _acTemp,
      fanSpeed: _acFan,
      swingOn: _acSwing,
      irBlasterAvailable: true,
      acCurrent: s.current.ac,
      acPower: s.power.ac,
      acEnergyKwh: s.energy.acKwh,
      pzemCumulativeEnergyKwh: s.energy.acKwh,
    });
  });
}

// ── Connection ───────────────────────────────────────────────────
export function subscribeToConnection(
  onConnect: () => void,
  onDisconnect: () => void,
): Unsubscribe {
  const removeConnect    = socketManager.on(SOCKET_EVENTS.connect,      onConnect);
  const removeDisconnect = socketManager.on(SOCKET_EVENTS.disconnect,   onDisconnect);
  const removeError      = socketManager.on(SOCKET_EVENTS.connectError, onDisconnect);
  return () => { removeConnect(); removeDisconnect(); removeError(); };
}

// ── REST Commands — Main Board ───────────────────────────────────
export async function controlMainRelay(relayId: string, action: 'on' | 'off'): Promise<{ cmd_id?: string }> {
  const relayNo = parseInt(relayId.replace('r', ''), 10);
  return apiPost(`/api/devices/${DEVICE_ID}/relays/${relayNo}`, { state: action === 'on' });
}

export async function controlMainLightingGroup(action: 'on' | 'off'): Promise<{ cmd_id?: string }> {
  return apiPost(`/api/devices/${DEVICE_ID}/lights`, { state: action === 'on' });
}

export async function lockMainRelay(relayId: string, locked: boolean): Promise<{ cmd_id?: string }> {
  const relayNo = parseInt(relayId.replace('r', ''), 10);
  return apiPost(`/api/devices/${DEVICE_ID}/relays/${relayNo}/lock`, { locked });
}

export async function setMasterShutdown(_enabled: boolean): Promise<{ cmd_id?: string }> {
  return apiPost(`/api/devices/${DEVICE_ID}/relays/off`);
}

export async function rebootMainBoard(): Promise<{ cmd_id?: string }> {
  return apiPost(`/api/devices/${DEVICE_ID}/system/reboot`);
}

// ── REST Commands — Digital Board ────────────────────────────────
export async function controlDigitalRelay(_relayId: string, action: 'on' | 'off'): Promise<{ cmd_id?: string }> {
  return apiPost(`/api/devices/${DEVICE_ID}/relays/7`, { state: action === 'on' });
}

export async function lockDigitalRelay(_relayId: string, locked: boolean): Promise<{ cmd_id?: string }> {
  return apiPost(`/api/devices/${DEVICE_ID}/relays/7/lock`, { locked });
}

// ── REST Commands — Global ────────────────────────────────────────
export async function masterUnlockAll(): Promise<{ cmd_id?: string }> {
  return apiPost(`/api/devices/${DEVICE_ID}/relays/unlock`);
}

export async function masterShutdownAll(_enabled: boolean): Promise<{ cmd_id?: string }> {
  return apiPost(`/api/devices/${DEVICE_ID}/relays/off`);
}

export async function shutdownAll(): Promise<void> {
  await apiPost(`/api/devices/${DEVICE_ID}/relays/off`);
  shutdownAllListeners.forEach(listener => listener());
}

export async function rebootSystem(): Promise<{ cmd_id?: string }> {
  return apiPost(`/api/devices/${DEVICE_ID}/system/reboot`);
}

// ── REST Commands — AC ────────────────────────────────────────────
export async function sendAcCommand(action: string, value?: unknown): Promise<void> {
  if (action === 'power_on') {
    await apiPost(`/api/devices/${DEVICE_ID}/ac`, { power: true });
  } else if (action === 'power_off') {
    await apiPost(`/api/devices/${DEVICE_ID}/ac`, { power: false });
  } else if (action === 'set_temperature') {
    _acTemp = value as number;
    await apiPost(`/api/devices/${DEVICE_ID}/ac`, { temp: value });
  } else if (action === 'temperature_up') {
    _acTemp = Math.min(_acTemp + 1, 30);
    await apiPost(`/api/devices/${DEVICE_ID}/ac`, { tempStep: 'up' });
  } else if (action === 'temperature_down') {
    _acTemp = Math.max(_acTemp - 1, 16);
    await apiPost(`/api/devices/${DEVICE_ID}/ac`, { tempStep: 'down' });
  } else if (action === 'set_fan_speed') {
    _acFan = value as AcStatus['fanSpeed'];
    await apiPost(`/api/devices/${DEVICE_ID}/ac`, { fan: value });
  }
}

// ── Re-exports for screens that import types from here ───────────
export type {
  AcStatus,
  Alert,
  CommandAck,
  DashboardData,
  DigitalBoardStatus,
  IoTDevice,
  MainBoardStatus,
  RelaysPayload,
  SensorsPayload,
  SlavesPayload,
  StatusPayload,
} from '../types/communication';