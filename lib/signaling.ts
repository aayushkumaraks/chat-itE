// File: lib/signaling.ts

type SignalPayload = any;

type SignalCallback = (from: string, payload: SignalPayload) => void;

export class SignalingClient {
  private socket: WebSocket;
  private username: string;
  private onSignalCallback: SignalCallback | null = null;

  constructor(serverUrl: string, username: string) {
    this.username = username;
    this.socket = new WebSocket(serverUrl);

    this.socket.onopen = () => {
      this.register();
    };

    this.socket.onmessage = (event) => {
      const { type, from, payload } = JSON.parse(event.data);

      if (type === 'signal' && this.onSignalCallback) {
        this.onSignalCallback(from, payload);
      }
    };

    this.socket.onerror = (e) => {
      console.error('🔌 WebSocket error:', e);
    };

    this.socket.onclose = () => {
      console.log('🔌 Disconnected from signaling server');
    };
  }

  private register() {
    this.send({
      type: 'register',
      payload: { username: this.username },
    });
  }

  sendSignal(to: string, payload: SignalPayload) {
    this.send({
      type: 'signal',
      to,
      payload,
    });
  }

  onSignal(callback: SignalCallback) {
    this.onSignalCallback = callback;
  }

  private send(data: any) {
    if (this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(data));
    } else {
      console.warn('🕸️ WebSocket not ready, message skipped');
    }
  }

  close() {
    this.socket.close();
  }
}
