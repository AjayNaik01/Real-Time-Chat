/**
 * Native WebSocket client manager for RFC 6455 WebSockets.
 * Notice how clean and direct native WebSockets are: zero client libraries needed!
 */

const DEFAULT_WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:3001';

export class WebSocketClient {
  constructor(url = DEFAULT_WS_URL) {
    this.url = url;
    this.ws = null;
    this.listeners = new Map(); // event -> Set<callback>
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectTimeout = null;
    this.isExplicitlyClosed = false;
  }

  connect(roomId, user, password = '') {
    this.roomId = roomId;
    this.user = user;
    this.password = password;
    this.isExplicitlyClosed = false;

    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    try {
      this.ws = new WebSocket(this.url);

      this.ws.onopen = () => {
        this.reconnectAttempts = 0;
        this.emit('status', 'connected');

        // Immediately send room join frame (with password for private rooms)
        if (this.roomId && this.user) {
          this.send('join', { roomId: this.roomId, user: this.user, password: this.password });
        }
      };

      this.ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          // Frame size in bytes (2 bytes frame header + data length)
          const frameBytes = 2 + (typeof event.data === 'string' ? event.data.length : 0);
          this.emit('metric_frame', { bytes: frameBytes, direction: 'in' });

          if (payload.type) {
            this.emit(payload.type, payload);
          }
          this.emit('message', payload);
        } catch (err) {
          console.error('Failed to parse WebSocket message frame:', err);
        }
      };

      this.ws.onclose = () => {
        this.emit('status', 'disconnected');
        if (!this.isExplicitlyClosed) {
          this.scheduleReconnect();
        }
      };

      this.ws.onerror = (err) => {
        this.emit('status', 'error');
        this.emit('error', err);
      };
    } catch (err) {
      console.error('WebSocket connection error:', err);
      this.scheduleReconnect();
    }
  }

  scheduleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) return;
    this.reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 10000);
    this.emit('status', `reconnecting_in_${Math.round(delay / 1000)}s`);

    clearTimeout(this.reconnectTimeout);
    this.reconnectTimeout = setTimeout(() => {
      this.connect(this.roomId, this.user);
    }, delay);
  }

  send(type, data = {}) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.warn('Cannot send WS frame: socket is not open');
      return false;
    }

    const payload = JSON.stringify({ type, roomId: this.roomId, user: this.user, ...data });
    this.ws.send(payload);

    // Frame size in bytes (2 bytes framing + payload)
    const frameBytes = 2 + payload.length;
    this.emit('metric_frame', { bytes: frameBytes, direction: 'out' });
    return true;
  }

  sendChatMessage(text) {
    return this.send('chat_message', { text });
  }

  sendTyping(isTyping) {
    return this.send('typing', { isTyping: Boolean(isTyping) });
  }

  sendDelivered(messageId) {
    return this.send('msg_delivered', { messageId });
  }

  sendRead(messageIds) {
    const ids = Array.isArray(messageIds) ? messageIds : [messageIds];
    return this.send('msg_read', { messageIds: ids });
  }

  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event).add(callback);
    return () => this.off(event, callback);
  }

  off(event, callback) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).delete(callback);
    }
  }

  emit(event, data) {
    if (this.listeners.has(event)) {
      for (const cb of this.listeners.get(event)) {
        cb(data);
      }
    }
  }

  disconnect() {
    this.isExplicitlyClosed = true;
    clearTimeout(this.reconnectTimeout);
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.emit('status', 'disconnected');
  }
}
