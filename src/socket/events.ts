// Socket event names used by the app.
export const SOCKET_EVENTS = {
  connect: 'connect',
  disconnect: 'disconnect',
  connectError: 'connect_error',

  subscribe: 'subscribe',
  unsubscribe: 'unsubscribe',

  deviceSensors: 'device:sensors',
  deviceRelays: 'device:relays',
  deviceStatus: 'device:status',
  deviceSlaves: 'device:slaves',
  commandAck: 'command:ack',
  deviceConnection: 'device:connection',
} as const;
