/**
 * websocketService.js — Client-side WebSocket manager
 *
 * Connects to the Tradeaura market feed backend with:
 *   - Exponential backoff auto-reconnect
 *   - Heartbeat keepalive pings
 *   - Chainable event listeners
 */

/* global WebSocket */

const WebSocketService = (() => {
  // ── Config ──────────────────────────────────────────────────────────────
  const RECONNECT_BASE_MS  = 2000;   // initial retry delay
  const RECONNECT_MAX_MS   = 30000;  // cap retry delay at 30 s
  const HEARTBEAT_MS       = 25000;  // ping every 25 s

  // ── State ────────────────────────────────────────────────────────────────
  let ws               = null;
  let reconnectAttempts = 0;
  let reconnectTimer   = null;
  let heartbeatTimer   = null;
  let manualClose      = false;
  let serverUrl        = '';

  // ── Listeners ────────────────────────────────────────────────────────────
  const listeners = {
    onData:       null,
    onConnect:    null,
    onDisconnect: null,
    onError:      null,
    onReconnect:  null,
  };

  // ── Helpers ──────────────────────────────────────────────────────────────

  /** Exponential back-off with random jitter so clients don't all retry at once. */
  function backoffDelay() {
    const base = Math.min(RECONNECT_BASE_MS * (2 ** reconnectAttempts), RECONNECT_MAX_MS);
    return base + Math.random() * 1000;
  }

  function startHeartbeat() {
    stopHeartbeat();
    heartbeatTimer = setInterval(() => {
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'ping' }));
      }
    }, HEARTBEAT_MS);
  }

  function stopHeartbeat() {
    clearInterval(heartbeatTimer);
    heartbeatTimer = null;
  }

  // ── Core ─────────────────────────────────────────────────────────────────

  /**
   * Open a WebSocket connection to `url`.
   * @param {string} url  ws:// or wss:// URL of the market feed server
   */
  function connect(url) {
    serverUrl    = url;
    manualClose  = false;

    try {
      ws = new WebSocket(url);
    } catch (err) {
      console.error('[WSService] Could not create WebSocket:', err);
      if (listeners.onError) listeners.onError(err);
      scheduleReconnect();
      return;
    }

    ws.onopen = () => {
      reconnectAttempts = 0;
      startHeartbeat();
      if (listeners.onConnect) listeners.onConnect();
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        // Silently drop heartbeat replies
        if (data.type === 'pong') return;
        if (listeners.onData) listeners.onData(data);
      } catch {
        console.warn('[WSService] Non-JSON message ignored');
      }
    };

    ws.onerror = () => {
      // onerror fires before onclose; pass a generic error object
      if (listeners.onError) listeners.onError(new Error('WebSocket error'));
    };

    ws.onclose = (event) => {
      stopHeartbeat();
      if (listeners.onDisconnect) listeners.onDisconnect(event);
      if (!manualClose) scheduleReconnect();
    };
  }

  function scheduleReconnect() {
    if (reconnectTimer) clearTimeout(reconnectTimer);
    const delay = backoffDelay();
    reconnectAttempts++;

    if (listeners.onReconnect) {
      listeners.onReconnect({ attempt: reconnectAttempts, delay });
    }

    reconnectTimer = setTimeout(() => connect(serverUrl), delay);
  }

  /**
   * Close the connection permanently (disables auto-reconnect).
   */
  function disconnect() {
    manualClose = true;
    stopHeartbeat();
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
    if (ws) { ws.close(); ws = null; }
  }

  /**
   * Current readable state string: CONNECTING | OPEN | CLOSING | CLOSED
   */
  function getState() {
    if (!ws) return 'CLOSED';
    return ['CONNECTING', 'OPEN', 'CLOSING', 'CLOSED'][ws.readyState] ?? 'UNKNOWN';
  }

  // ── Public API ───────────────────────────────────────────────────────────
  return {
    connect,
    disconnect,
    getState,
    /**
     * Register an event listener.  Returns `this` for chaining.
     * @param {'onData'|'onConnect'|'onDisconnect'|'onError'|'onReconnect'} event
     * @param {Function} callback
     */
    on(event, callback) {
      if (Object.prototype.hasOwnProperty.call(listeners, event)) {
        listeners[event] = callback;
      }
      return this;
    },
  };
})();
