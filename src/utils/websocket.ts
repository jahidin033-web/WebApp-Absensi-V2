/**
 * Real-Time WebSocket Client untuk AbsensiPro
 * Menghubungkan semua perangkat (Laptop Admin, HP Pekerja di lapangan, Device 1, Device 2)
 * secara instan dan dua arah (two-way real-time data sync).
 */

type RealtimeListener = (data: unknown) => void;

class WebSocketClient {
  private ws: WebSocket | null = null;
  private listeners: Map<string, Set<RealtimeListener>> = new Map();
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private isConnected = false;
  private isConnecting = false;
  private shouldReconnect = true;

  constructor() {
    if (typeof window !== 'undefined') {
      this.connect();

      // Sambungkan kembali saat tab browser kembali aktif
      window.addEventListener('online', () => this.connect());
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible' && !this.isConnected) {
          this.connect();
        }
      });
    }
  }

  public connect(): void {
    if (typeof window === 'undefined') return;
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    this.isConnecting = true;
    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws`;

      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        this.isConnected = true;
        this.isConnecting = false;
        this.emit('connection_change', true);
        // Minta sync data terbaru saat pertama kali koneksi terbuka
        this.sendAction('request_sync', {});
      };

      this.ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          if (!message || !message.type) return;

          // Emit ke listener berdasarkan tipe event
          this.emit(message.type, message.data);
          this.emit('*', message);
        } catch (err) {
          console.warn('[WebSocket] Gagal parse pesan masuk:', err);
        }
      };

      this.ws.onclose = () => {
        this.isConnected = false;
        this.isConnecting = false;
        this.emit('connection_change', false);
        this.scheduleReconnect();
      };

      this.ws.onerror = (err) => {
        console.warn('[WebSocket] Error koneksi, akan mencoba kembali...', err);
        this.isConnected = false;
        this.isConnecting = false;
        this.emit('connection_change', false);
      };
    } catch (err) {
      console.warn('[WebSocket] Gagal inisialisasi WebSocket:', err);
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect(): void {
    if (!this.shouldReconnect) return;
    if (this.reconnectTimer) return;

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, 2500);
  }

  /**
   * Kirim aksi mutasi langsung melalui WebSocket ke server,
   * dengan fallback HTTP POST /api/sync jika socket belum terhubung.
   */
  public sendAction(action: string, payload: Record<string, unknown>): void {
    const message = {
      type: 'action',
      action,
      payload,
      timestamp: Date.now(),
    };

    let sentViaWs = false;
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(JSON.stringify(message));
        sentViaWs = true;
      } catch (e) {
        console.warn('[WebSocket] Gagal kirim lewat WS:', e);
      }
    }

    // Selalu pastikan tersimpan ke backend melalui /api/sync sebagai jaminan redundansi data
    fetch('/api/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, ...payload }),
    }).catch(() => {
      // Abaikan jika offline
    });
  }

  public on(event: string, callback: RealtimeListener): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);

    return () => {
      this.listeners.get(event)?.delete(callback);
    };
  }

  private emit(event: string, data: unknown): void {
    const set = this.listeners.get(event);
    if (set) {
      set.forEach((cb) => {
        try {
          cb(data);
        } catch (e) {
          console.error(`[WebSocket] Error in handler for event "${event}":`, e);
        }
      });
    }
  }

  public getIsConnected(): boolean {
    return this.isConnected;
  }
}

export const wsClient = new WebSocketClient();
