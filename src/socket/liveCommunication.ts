import {
  AcStatus,
  Alert,
  DashboardData,
  DigitalBoardStatus,
  IoTDevice,
  MainBoardStatus,
} from '../types/communication';
import { SOCKET_EVENTS } from './events';
import socketManager from './SocketManager';

type Unsubscribe = () => void;

function subscribe<T>(
  updateEvent: string,
  requestEvent: string,
  listener: (payload: T) => void,
): Unsubscribe {
  const unsubscribe = socketManager.on<T>(updateEvent, listener);
  socketManager.emit(requestEvent);
  return unsubscribe;
}

export const subscribeToDashboard = (listener: (data: DashboardData) => void) =>
  subscribe(SOCKET_EVENTS.dashboardUpdate, SOCKET_EVENTS.dashboardRequest, listener);
export const requestDashboard = () =>
  socketManager.emit(SOCKET_EVENTS.dashboardRequest);

export const subscribeToDashboardAlerts = (listener: (alerts: Alert[]) => void) =>
  subscribe(
    SOCKET_EVENTS.dashboardAlertsUpdate,
    SOCKET_EVENTS.dashboardAlertsRequest,
    listener,
  );
export const requestDashboardAlerts = () =>
  socketManager.emit(SOCKET_EVENTS.dashboardAlertsRequest);

export const subscribeToDevices = (listener: (devices: IoTDevice[]) => void) =>
  subscribe(SOCKET_EVENTS.devicesUpdate, SOCKET_EVENTS.devicesRequest, listener);
export const requestDevices = () =>
  socketManager.emit(SOCKET_EVENTS.devicesRequest);

export const subscribeToMainBoard = (
  listener: (status: MainBoardStatus) => void,
) => subscribe(SOCKET_EVENTS.mainBoardUpdate, SOCKET_EVENTS.mainBoardRequest, listener);
export const requestMainBoard = () =>
  socketManager.emit(SOCKET_EVENTS.mainBoardRequest);

export const controlMainRelay = (relayId: string, action: 'on' | 'off') =>
  socketManager.emit(SOCKET_EVENTS.mainRelayControl, { relayId, action });
export const setMasterLock = (enabled: boolean) =>
  socketManager.emit(SOCKET_EVENTS.masterLockControl, { enabled });
export const setMasterShutdown = (enabled: boolean) =>
  socketManager.emit(SOCKET_EVENTS.masterShutdownControl, { enabled });

// ── Global controls ──────────────────────────────────────────────────────────
export const masterUnlockAll = () => {
  socketManager.emit(SOCKET_EVENTS.masterUnlockAll);
};

export const masterShutdownAll = (enabled: boolean) => {
  socketManager.emit(SOCKET_EVENTS.masterShutdown, { enabled });
};

// ── One-shot: turns all relays OFF on both boards, no persistent state ────────
export const shutdownAll = () => {
  socketManager.emit(SOCKET_EVENTS.shutdownAll);
};

// ── Individual relay lock ────────────────────────────────────────────────────
export const lockMainRelay = (relayId: string, locked: boolean) => {
  socketManager.emit(SOCKET_EVENTS.mainRelayLock, { relayId, locked });
};

export const lockDigitalRelay = (relayId: string, locked: boolean) => {
  socketManager.emit(SOCKET_EVENTS.digitalRelayLock, { relayId, locked });
};

export const subscribeToDigitalBoard = (
  listener: (status: DigitalBoardStatus) => void,
) =>
  subscribe(
    SOCKET_EVENTS.digitalBoardUpdate,
    SOCKET_EVENTS.digitalBoardRequest,
    listener,
  );
export const requestDigitalBoard = () =>
  socketManager.emit(SOCKET_EVENTS.digitalBoardRequest);
export const controlDigitalRelay = (relayId: string, action: 'on' | 'off') =>
  socketManager.emit(SOCKET_EVENTS.digitalRelayControl, { relayId, action });
export const setDigitalMasterLock = (enabled: boolean) =>
  socketManager.emit(SOCKET_EVENTS.digitalMasterLockControl, { enabled });

export const subscribeToAc = (listener: (status: AcStatus) => void) =>
  subscribe(SOCKET_EVENTS.acUpdate, SOCKET_EVENTS.acRequest, listener);
export const requestAcStatus = () => socketManager.emit(SOCKET_EVENTS.acRequest);
export const sendAcCommand = (action: string, value?: unknown) =>
  socketManager.emit(SOCKET_EVENTS.acControl, { action, value });

export const subscribeToAlerts = (listener: (alerts: Alert[]) => void) =>
  subscribe(SOCKET_EVENTS.alertsUpdate, SOCKET_EVENTS.alertsRequest, listener);
export const requestAlerts = () => socketManager.emit(SOCKET_EVENTS.alertsRequest);
export const resolveAlert = (alertId: string) =>
  socketManager.emit(SOCKET_EVENTS.alertResolve, { alertId });

export const subscribeToConnection = (
  onConnect: () => void,
  onDisconnect: () => void,
): Unsubscribe => {
  const removeConnect = socketManager.on(SOCKET_EVENTS.connect, onConnect);
  const removeDisconnect = socketManager.on(
    SOCKET_EVENTS.disconnect,
    onDisconnect,
  );
  const removeError = socketManager.on(
    SOCKET_EVENTS.connectError,
    onDisconnect,
  );
  return () => {
    removeConnect();
    removeDisconnect();
    removeError();
  };
};

export type {
  AcStatus,
  Alert,
  DashboardData,
  DigitalBoardStatus,
  IoTDevice,
  MainBoardStatus,
} from '../types/communication';