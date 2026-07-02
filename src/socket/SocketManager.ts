import { io, Socket } from 'socket.io-client';
import { DEVICE_ID, SOCKET_URL } from '../config/communication';

type Listener<T = unknown> = (payload: T) => void;

class SocketManager {
  private socket: Socket | null = null;
  private authToken: string | null = null;

  setAuthToken(token: string | null): void {
    this.authToken = token;
    if (this.socket) {
      this.socket.auth = { token: token ?? '' };
    }
  }

  connect(): Socket {
    if (!this.socket) {
      this.socket = io(SOCKET_URL, {
        auth: { token: this.authToken ?? '' },
        autoConnect: false,
        transports: ['websocket'],
        reconnection: true,
        reconnectionAttempts: Infinity,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 10000,
        timeout: 10000,
      });

      // 'connect' fires on both first connect and every reconnect in Socket.IO v4.
      // Re-subscribing here is sufficient — no separate 'reconnect' listener needed.
      this.socket.on('connect', () => {
        this.socket?.emit('subscribe', DEVICE_ID);
      });
    }

    if (!this.socket.connected) {
      this.socket.connect();
    }

    return this.socket;
  }

  disconnect(): void {
    this.socket?.removeAllListeners();
    this.socket?.disconnect();
    this.socket = null;
  }

  emit<T = unknown>(event: string, payload?: T): void {
    const socket = this.connect();
    socket.emit(event, payload);
  }

  on<T = unknown>(event: string, listener: Listener<T>): () => void {
    const socket = this.connect();
    socket.off(event, listener);
    socket.on(event, listener);
    return () => this.off(event, listener);
  }

  off<T = unknown>(event: string, listener?: Listener<T>): void {
    if (!this.socket) return;
    if (listener) {
      this.socket.off(event, listener);
    } else {
      this.socket.removeAllListeners(event);
    }
  }

  isConnected(): boolean {
    return this.socket?.connected ?? false;
  }
}

export default new SocketManager();