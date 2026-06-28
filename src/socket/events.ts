export const SOCKET_EVENTS = {
  connect: 'connect',
  disconnect: 'disconnect',
  connectError: 'connect_error',

  dashboardRequest: 'dashboard:request',
  dashboardUpdate: 'dashboard:update',
  dashboardAlertsRequest: 'dashboard-alerts:request',
  dashboardAlertsUpdate: 'dashboard-alerts:update',

  devicesRequest: 'devices:request',
  devicesUpdate: 'devices:update',

  mainBoardRequest: 'main-board:request',
  mainBoardUpdate: 'main-board:update',
  mainRelayControl: 'main-board:relay-control',
  masterLockControl: 'main-board:master-lock',
  masterShutdownControl: 'main-board:master-shutdown',

  digitalBoardRequest: 'digital-board:request',
  digitalBoardUpdate: 'digital-board:update',
  digitalRelayControl: 'digital-board:relay-control',
  digitalMasterLockControl: 'digital-board:master-lock',

  acRequest: 'ac:request',
  acUpdate: 'ac:update',
  acControl: 'ac:control',

  alertsRequest: 'alerts:request',
  alertsUpdate: 'alerts:update',
  alertResolve: 'alerts:resolve',
} as const;
