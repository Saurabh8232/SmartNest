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
  StatusPayload,
} from '../types/communication';
import { DEVICE_ID, REST_BASE_URL } from '../config/communication';
import { SOCKET_EVENTS } from './events';
import socketManager from './SocketManager';
import { authFetch, getAccessToken, subscribeToSession } from '../authentication/authService';

type Unsubscribe = () => void;

// ── Relay name maps (backend sends numbers only, names are local) ─
const MAIN_RELAY_NAMES: Record<number, string> = {
  1: 'Living Room Fan',
  2: 'Bedroom Light',
  3: 'Kitchen Exhaust',
  4: 'Outdoor Lights',
  5: 'Water Pump',
  6: 'Garden Lights',
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
    headers: {
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

// ── In-memory state (combines 3 events for DashboardData) ────────
let latestSensors: SensorsPayload | null = null;
let latestRelays: RelaysPayload | null = null;
let latestStatus: StatusPayload | null = null;
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

  return {
    systemOnline: latestStatus ? latestStatus.pzemOnline : true,
    totalDevices: 3,
    activeRelays,
    totalCurrent: +totalCurrent.toFixed(2),
    voltage: latestSensors.voltage,
    current: totalCurrent,
    power: latestSensors.power.ac,
    energy: totalEnergy,
    // frequency: 50.0,
    // powerFactor: 0.92,
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

export function subscribeToCommandAck(listener: (ack: CommandAck) => void): Unsubscribe {
  return socketManager.on<CommandAck>(SOCKET_EVENTS.commandAck, listener);
}

// ── Dashboard (composed from sensors + relays + status) ──────────
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

  socketManager.connect();

  return () => {
    dashboardListeners.delete(listener);
    removeSensors();
    removeRelays();
    removeStatus();
  };
}

export function requestDashboard(): void {
  socketManager.emit('dashboard:request');
}

// ── Dashboard Alerts (no backend event yet — kept as stub) ───────
export function subscribeToDashboardAlerts(listener: (alerts: Alert[]) => void): Unsubscribe {
  return socketManager.on<Alert[]>('dashboard-alerts:update', listener);
}

export function requestDashboardAlerts(): void {
  socketManager.emit('dashboard-alerts:request');
}

// ── Main Board ───────────────────────────────────────────────────
export function subscribeToMainBoard(listener: (status: MainBoardStatus) => void): Unsubscribe {
  let latestRelaysLocal: RelaysPayload | null = null;
  let latestSensorsLocal: SensorsPayload | null = null;

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

  const removeRelays  = socketManager.on<RelaysPayload>(SOCKET_EVENTS.deviceRelays,  r => { latestRelaysLocal  = r; emit(); });
  const removeSensors = socketManager.on<SensorsPayload>(SOCKET_EVENTS.deviceSensors, s => { latestSensorsLocal = s; emit(); });

  socketManager.connect();
  return () => { removeRelays(); removeSensors(); };
}

export function requestMainBoard(): void {
  socketManager.emit('main-board:request');
}

export function subscribeToShutdownAll(listener: () => void): Unsubscribe {
  shutdownAllListeners.add(listener);
  return () => {
    shutdownAllListeners.delete(listener);
  };
}

// ── Digital Board ────────────────────────────────────────────────
export function subscribeToDigitalBoard(listener: (status: DigitalBoardStatus) => void): Unsubscribe {
  let latestRelaysLocal: RelaysPayload | null = null;
  let latestSensorsLocal: SensorsPayload | null = null;

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
            power: +(( latestSensorsLocal?.current.digital ?? 0) * (latestSensorsLocal?.voltage ?? 220)).toFixed(0),
            status: 'normal' as const,
            switchState: latestRelaysLocal.digitalSwitch ? 'pressed' : 'released',
            locked: digitalItem.locked,
          }]
        : [],
    });
  }

  const removeRelays  = socketManager.on<RelaysPayload>(SOCKET_EVENTS.deviceRelays,  r => { latestRelaysLocal  = r; emit(); });
  const removeSensors = socketManager.on<SensorsPayload>(SOCKET_EVENTS.deviceSensors, s => { latestSensorsLocal = s; emit(); });

  socketManager.connect();
  return () => { removeRelays(); removeSensors(); };
}

export function requestDigitalBoard(): void {
  socketManager.emit('digital-board:request');
}

// ── AC ───────────────────────────────────────────────────────────
export function subscribeToAc(listener: (status: AcStatus) => void): Unsubscribe {
  let acTemp = 24;
  let acFan: AcStatus['fanSpeed'] = 'auto';
  let acSwing = false;

  return socketManager.on<SensorsPayload>(SOCKET_EVENTS.deviceSensors, s => {
    listener({
      isOn: s.current.ac > 0,
      temperature: acTemp,
      fanSpeed: acFan,
      swingOn: acSwing,
      irBlasterAvailable: true,
      acCurrent: s.current.ac,
      acPower: s.power.ac,
      acEnergyKwh: s.energy.acKwh,
      pzemCumulativeEnergyKwh: s.energy.acKwh,
    });
  });
}

export function requestAcStatus(): void {
  socketManager.emit('ac:request');
}

// ── Alerts ───────────────────────────────────────────────────────
export function subscribeToAlerts(listener: (alerts: Alert[]) => void): Unsubscribe {
  return socketManager.on<Alert[]>('dashboard-alerts:update', listener);
}

export function requestAlerts(): void {
  socketManager.emit('dashboard-alerts:request');
}

export function resolveAlert(_alertId: string): void {}

// ── Devices ─────────────────────────────────────────────────────
export function subscribeToDevices(listener: (devices: IoTDevice[]) => void): Unsubscribe {
  return socketManager.on<IoTDevice[]>('devices:update', listener);
}

export function requestDevices(): void {
  socketManager.emit('devices:request');
}

// ── Connection ───────────────────────────────────────────────────
export function subscribeToConnection(
  onConnect: () => void,
  onDisconnect: () => void,
): Unsubscribe {
  const removeConnect    = socketManager.on(SOCKET_EVENTS.connect,       onConnect);
  const removeDisconnect = socketManager.on(SOCKET_EVENTS.disconnect,    onDisconnect);
  const removeError      = socketManager.on(SOCKET_EVENTS.connectError,  onDisconnect);
  return () => { removeConnect(); removeDisconnect(); removeError(); };
}

// ── REST Commands — Main Board ───────────────────────────────────
export async function controlMainRelay(relayId: string, action: 'on' | 'off'): Promise<void> {
  const relayNo = parseInt(relayId.replace('r', ''), 10);
  await apiPost(`/api/device/${DEVICE_ID}/relays/${relayNo}`, { state: action === 'on' });
}

export async function controlMainLightingGroup(action: 'on' | 'off'): Promise<void> {
  await apiPost(`/api/device/${DEVICE_ID}/lights`, { state: action === 'on' });
}

export async function setMasterLock(enabled: boolean): Promise<void> {
  await apiPost(`/api/device/${DEVICE_ID}/master-lock`, { state: enabled });
}

export async function lockMainRelay(relayId: string, locked: boolean): Promise<void> {
  const relayNo = parseInt(relayId.replace('r', ''), 10);
  await apiPost(`/api/device/${DEVICE_ID}/relays/${relayNo}/lock`, { locked });
}

export async function setMasterShutdown(_enabled: boolean): Promise<void> {
  await apiPost(`/api/device/${DEVICE_ID}/relays/off`);
}

export async function rebootMainBoard(): Promise<void> {
  await apiPost(`/api/device/${DEVICE_ID}/system/reboot`);
}

// ── REST Commands — Digital Board ────────────────────────────────
export async function controlDigitalRelay(_relayId: string, action: 'on' | 'off'): Promise<{ cmd_id?: string }> {
  return apiPost(`/api/device/${DEVICE_ID}/relays/7`, { state: action === 'on' });
}

export async function lockDigitalRelay(_relayId: string, locked: boolean): Promise<{ cmd_id?: string }> {
  return apiPost(`/api/device/${DEVICE_ID}/relays/7/lock`, { locked });
}

export async function setDigitalMasterLock(enabled: boolean): Promise<void> {
  await apiPost(`/api/device/${DEVICE_ID}/master-lock`, { state: enabled });
}

export async function rebootDigitalBoard(): Promise<void> {
  await apiPost(`/api/device/${DEVICE_ID}/slave-reboot`, { target: 'digital' });
}

// ── REST Commands — Global ────────────────────────────────────────
export async function masterUnlockAll(): Promise<void> {
  await apiPost(`/api/device/${DEVICE_ID}/relays/unlock`);
}

export async function masterShutdownAll(_enabled: boolean): Promise<void> {
  await apiPost(`/api/device/${DEVICE_ID}/relays/off`);
}

export async function shutdownAll(): Promise<void> {
  await apiPost(`/api/device/${DEVICE_ID}/relays/off`);
  shutdownAllListeners.forEach(listener => listener());
}

export async function rebootSystem(): Promise<{ cmd_id?: string }> {
  return apiPost(`/api/device/${DEVICE_ID}/system/reboot`);
}

// ── REST Commands — AC ────────────────────────────────────────────
export async function sendAcCommand(action: string, value?: unknown): Promise<void> {
  if (action === 'power_on')        await apiPost(`/api/device/${DEVICE_ID}/ac`, { power: true });
  else if (action === 'power_off')  await apiPost(`/api/device/${DEVICE_ID}/ac`, { power: false });
  else if (action === 'set_temperature')  await apiPost(`/api/device/${DEVICE_ID}/ac`, { temp: value });
  else if (action === 'temperature_up')   await apiPost(`/api/device/${DEVICE_ID}/ac`, { tempStep: 'up' });
  else if (action === 'temperature_down') await apiPost(`/api/device/${DEVICE_ID}/ac`, { tempStep: 'down' });
  else if (action === 'set_fan_speed')    await apiPost(`/api/device/${DEVICE_ID}/ac`, { fan: value });
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
  StatusPayload,
} from '../types/communication';