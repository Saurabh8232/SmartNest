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
import {
  authFetch,
  clearSession,
  getCurrentSession,
  getAccessToken,
  refreshAccessToken,
  subscribeToSession,
} from '../authentication/authService';

type Unsubscribe = () => void;
const DEVICE_API_PATH = `/api/devices/${DEVICE_ID}`;

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
  const fetchOpts: RequestInit = {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  };

  let res = await authFetch(`${REST_BASE_URL}${path}`, fetchOpts);

  if (!res.ok) {
    // FIX (Issue 1): This backend returns 404 (not 401) for expired or invalid
    // tokens to hide route existence. It also returns 401 for demo/missing tokens.
    // Handle both the same way: attempt a manual refresh + retry before giving up.
    if (res.status === 404 || res.status === 401) {
      const session = getCurrentSession();

      // Demo session or no token at all — cannot recover, must log in for real.
      if (!session?.accessToken || session.isDemo) {
        clearSession().catch(() => {});
        throw new Error(
          'Authentication required. Please log out and log in again to send commands.',
        );
      }

      // Real session with a refresh token — try to get a new access token and retry.
      if (session.refreshToken) {
        const refreshed = await refreshAccessToken();
        if (refreshed?.accessToken) {
          const retryRes = await authFetch(`${REST_BASE_URL}${path}`, fetchOpts);
          if (retryRes.ok) return retryRes.json();
        }
      }

      // Refresh failed or retry still rejected — session is fully stale.
      clearSession().catch(() => {});
      throw new Error(
        'Your session has expired. Please log out and log in again to send commands.',
      );
    }

    let detail = '';
    try {
      const json = await res.json();
      if (typeof json?.error === 'string') detail = `: ${json.error}`;
      else if (typeof json?.message === 'string') detail = `: ${json.message}`;
    } catch {}
    throw new Error(`Command request failed with HTTP ${res.status}${detail}`);
  }
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

// FIX (Issue 3 — Performance): Deduplicate fetchInitialRelays so that multiple
// screens subscribing at the same time (subscribeToDashboard, subscribeToMainBoard,
// subscribeToDigitalBoard) only issue a SINGLE network request rather than three.
let _relaysFetchPromise: Promise<RelaysPayload | null> | null = null;

async function fetchInitialRelays(): Promise<RelaysPayload | null> {
  // If we already have live relay data, skip the REST fetch entirely.
  if (latestRelays) return latestRelays;

  // If a fetch is already in-flight, share its promise with all callers.
  if (_relaysFetchPromise) return _relaysFetchPromise;

  _relaysFetchPromise = (async () => {
    try {
      const res = await authFetch(`${REST_BASE_URL}${DEVICE_API_PATH}/relays`);
      if (!res.ok) return null;
      const json: RestRelaysResponse = await res.json();
      if (!json?.data) return null;
      return normalizeRestRelays(json.data);
    } catch {
      // Offline or backend unreachable — the socket will populate state once it connects.
      return null;
    }
  })();

  // Clear the shared promise after it settles so a later retry can re-fetch if needed.
  _relaysFetchPromise.finally(() => {
    _relaysFetchPromise = null;
  });

  return _relaysFetchPromise;
}

// ── In-memory state (combines events for DashboardData) ──────────
let latestSensors: SensorsPayload | null = null;
let latestRelays: RelaysPayload | null = null;
let latestStatus: StatusPayload | null = null;
let latestSlaves: SlavesPayload | null = null;
const shutdownAllListeners = new Set<() => void>();
const unlockAllListeners = new Set<() => void>();

const dashboardListeners = new Set<(d: DashboardData) => void>();

// ── Staleness watchdog ─────────────────────────────────────────────
// The backend only pushes device:* socket events when it actually receives an
// MQTT message. Several MQTT topics (live/status, live/relays, live/slaves)
// are published with `retain: true`, so a broker can replay an OLD cached
// message the moment the backend reconnects — even if the physical device is
// offline. That replayed message looks identical to a fresh one (same shape,
// same "online" booleans), so without tracking *when we actually last heard
// something*, the UI can show "online" with frozen/stale data indefinitely.
//
// Fix: track the wall-clock time of the last real socket event we received
// (of any live-data type) and treat the device as stale if nothing has
// arrived within STALE_THRESHOLD_MS. The firmware heartbeats live/sensors
// (retain: false, so it can NEVER be replayed) roughly every 30s, so 3x that
// gives headroom for normal jitter while still catching a truly dead device.
const STALE_THRESHOLD_MS = 90_000; // 3x the ~30s firmware heartbeat interval
let lastLiveUpdateAt: number | null = null;

function markLiveUpdate(): void {
  lastLiveUpdateAt = Date.now();
}

function isLiveDataStale(): boolean {
  if (lastLiveUpdateAt === null) return true;
  return Date.now() - lastLiveUpdateAt > STALE_THRESHOLD_MS;
}

// Track live-data arrival globally (independent of which screens are mounted)
// so staleness is detected even if the dashboard listener isn't active.
socketManager.on<SensorsPayload>(SOCKET_EVENTS.deviceSensors, markLiveUpdate);
socketManager.on<RelaysPayload>(SOCKET_EVENTS.deviceRelays, markLiveUpdate);
socketManager.on<StatusPayload>(SOCKET_EVENTS.deviceStatus, markLiveUpdate);
socketManager.on<SlavesPayload>(SOCKET_EVENTS.deviceSlaves, markLiveUpdate);

// Periodically re-evaluate staleness even when no new socket event arrives —
// a silent/dead device produces NO events at all, so without this timer the
// UI would keep showing the last-known "online" state forever.
setInterval(() => {
  if (dashboardListeners.size === 0) return;
  notifyDashboardListeners();
}, 10_000);

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
  // A device-reported "online" flag can be lying if it came from a retained
  // MQTT replay rather than a fresh message, so it is gated by our own
  // staleness watchdog: if nothing real has arrived in a while, we always
  // report offline regardless of what the last payload claimed.
  const reportedOnline = latestSlaves
    ? latestSlaves.pzem.online
    : latestStatus !== null;
  const systemOnline = reportedOnline && !isLiveDataStale();

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

// FIX (Issue 3 — Performance): Batch rapid socket events so that multiple events
// arriving within the same JS tick (sensors + relays + status at once) only trigger
// ONE dashboard rebuild + listener notification instead of one per event.
let _dashboardNotifyScheduled = false;

function notifyDashboardListeners(): void {
  if (_dashboardNotifyScheduled) return;
  _dashboardNotifyScheduled = true;
  setTimeout(() => {
    _dashboardNotifyScheduled = false;
    const dash = buildDashboard();
    if (!dash) return;
    dashboardListeners.forEach(l => l(dash));
  }, 0);
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

export function subscribeToUnlockAll(listener: () => void): Unsubscribe {
  unlockAllListeners.add(listener);
  return () => { unlockAllListeners.delete(listener); };
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
  return apiPost(`${DEVICE_API_PATH}/relays/${relayNo}`, { state: action === 'on' });
}

export async function controlMainLightingGroup(action: 'on' | 'off'): Promise<{ cmd_id?: string }> {
  return apiPost(`${DEVICE_API_PATH}/lights`, { state: action === 'on' });
}

export async function lockMainRelay(relayId: string, locked: boolean): Promise<{ cmd_id?: string }> {
  const relayNo = parseInt(relayId.replace('r', ''), 10);
  return apiPost(`${DEVICE_API_PATH}/relays/${relayNo}/lock`, { locked });
}

export async function setMasterShutdown(_enabled: boolean): Promise<{ cmd_id?: string }> {
  return apiPost(`${DEVICE_API_PATH}/relays/off`);
}

export async function rebootMainBoard(): Promise<{ cmd_id?: string }> {
  return apiPost(`${DEVICE_API_PATH}/system/reboot`);
}

// ── REST Commands — Digital Board ────────────────────────────────
export async function controlDigitalRelay(_relayId: string, action: 'on' | 'off'): Promise<{ cmd_id?: string }> {
  return apiPost(`${DEVICE_API_PATH}/relays/7`, { state: action === 'on' });
}

export async function lockDigitalRelay(_relayId: string, locked: boolean): Promise<{ cmd_id?: string }> {
  return apiPost(`${DEVICE_API_PATH}/relays/7/lock`, { locked });
}

// ── REST Commands — Global ────────────────────────────────────────
export async function masterUnlockAll(): Promise<{ cmd_id?: string }> {
  const result = await apiPost(`${DEVICE_API_PATH}/relays/unlock`);
  unlockAllListeners.forEach(listener => listener());
  return result;
}

export async function masterShutdownAll(_enabled: boolean): Promise<{ cmd_id?: string }> {
  const result = await apiPost(`${DEVICE_API_PATH}/relays/off`);
  shutdownAllListeners.forEach(listener => listener());
  return result;
}

export async function shutdownAll(): Promise<void> {
  await apiPost(`${DEVICE_API_PATH}/relays/off`);
  shutdownAllListeners.forEach(listener => listener());
}

export async function rebootSystem(): Promise<{ cmd_id?: string }> {
  return apiPost(`${DEVICE_API_PATH}/system/reboot`);
}

// ── REST Commands — AC ────────────────────────────────────────────
export async function sendAcCommand(action: string, value?: unknown): Promise<void> {
  if (action === 'power_on') {
    await apiPost(`${DEVICE_API_PATH}/ac`, { power: true });
  } else if (action === 'power_off') {
    await apiPost(`${DEVICE_API_PATH}/ac`, { power: false });
  } else if (action === 'set_temperature') {
    _acTemp = value as number;
    await apiPost(`${DEVICE_API_PATH}/ac`, { temp: value });
  } else if (action === 'temperature_up') {
    _acTemp = Math.min(_acTemp + 1, 30);
    await apiPost(`${DEVICE_API_PATH}/ac`, { tempStep: 'up' });
  } else if (action === 'temperature_down') {
    _acTemp = Math.max(_acTemp - 1, 16);
    await apiPost(`${DEVICE_API_PATH}/ac`, { tempStep: 'down' });
  } else if (action === 'set_fan_speed') {
    _acFan = value as AcStatus['fanSpeed'];
    await apiPost(`${DEVICE_API_PATH}/ac`, { fan: value });
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