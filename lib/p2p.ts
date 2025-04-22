/// <reference lib="dom" />

type PeerEvents = {
  onMessage?: (data: string) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
};

export class P2PConnection {
  private peer: RTCPeerConnection;
  private channel: RTCDataChannel | null = null;
  private events: PeerEvents;

  private myKeyPair!: CryptoKeyPair;
  private sharedKey!: CryptoKey;

  constructor(events: PeerEvents = {}) {
    this.events = events;

    this.peer = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
    });

    this.peer.ondatachannel = (event) => {
      this.channel = event.channel;
      this.setupChannel();
    };

    this.peer.onconnectionstatechange = () => {
      const state = this.peer.connectionState;
      if (state === 'connected') this.events.onConnect?.();
      else if (state === 'disconnected' || state === 'failed') this.events.onDisconnect?.();
    };

    this.generateKeyPair();
  }

  // 🔐 Generate local keypair for ECDH
  private async generateKeyPair() {
    this.myKeyPair = await crypto.subtle.generateKey(
      {
        name: 'ECDH',
        namedCurve: 'P-256',
      },
      true,
      ['deriveKey']
    );
  }

  async exportPublicKey(): Promise<JsonWebKey> {
    return crypto.subtle.exportKey('jwk', this.myKeyPair.publicKey);
  }

  async importRemoteKey(remoteJWK: JsonWebKey) {
    const remoteKey = await crypto.subtle.importKey(
      'jwk',
      remoteJWK,
      { name: 'ECDH', namedCurve: 'P-256' },
      true,
      []
    );

    this.sharedKey = await crypto.subtle.deriveKey(
      {
        name: 'ECDH',
        public: remoteKey,
      },
      this.myKeyPair.privateKey,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  }

  // 📤 Encrypt and send message
  async send(data: string) {
    if (!this.sharedKey || !this.channel || this.channel.readyState !== 'open') return;

    const encoder = new TextEncoder();
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encoded = encoder.encode(data);

    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      this.sharedKey,
      encoded
    );

    const payload = {
      iv: Array.from(iv),
      data: Array.from(new Uint8Array(encrypted)),
    };

    this.channel.send(JSON.stringify(payload));
  }

  // 📥 Decrypt received message
  private setupChannel() {
    if (!this.channel) return;

    this.channel.onopen = () => this.events.onConnect?.();
    this.channel.onclose = () => this.events.onDisconnect?.();

    this.channel.onmessage = async (e) => {
      try {
        const payload = JSON.parse(e.data);
        const iv = new Uint8Array(payload.iv);
        const encrypted = new Uint8Array(payload.data);

        const decrypted = await crypto.subtle.decrypt(
          { name: 'AES-GCM', iv },
          this.sharedKey,
          encrypted
        );

        const message = new TextDecoder().decode(decrypted);
        this.events.onMessage?.(message);
      } catch (err) {
        console.warn('❌ Decryption failed', err);
      }
    };
  }

  // 🔌 Setup peer connection
  createDataChannel(label = 'chat') {
    this.channel = this.peer.createDataChannel(label);
    this.setupChannel();
  }

  async createOffer(): Promise<RTCSessionDescriptionInit> {
    const offer = await this.peer.createOffer();
    await this.peer.setLocalDescription(offer);
    return offer;
  }

  async createAnswer(): Promise<RTCSessionDescriptionInit> {
    const answer = await this.peer.createAnswer();
    await this.peer.setLocalDescription(answer);
    return answer;
  }

  async setRemoteDescription(desc: RTCSessionDescriptionInit) {
    await this.peer.setRemoteDescription(new RTCSessionDescription(desc));
  }

  async addIceCandidate(candidate: RTCIceCandidateInit) {
    await this.peer.addIceCandidate(new RTCIceCandidate(candidate));
  }

  setOnIceCandidate(callback: (e: RTCPeerConnectionIceEvent) => void) {
    this.peer.onicecandidate = callback;
  }

  close() {
    this.channel?.close();
    this.peer.close();
  }
}
