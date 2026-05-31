/**
 * stockTicker.js — Tradeaura Live Market Ticker
 *
 * Polls /api/market every 60 seconds (matching server cache TTL),
 * renders the scrolling price bar, and handles errors gracefully.
 * No API keys or WebSocket — all data comes through the backend proxy.
 */

const StockTicker = (() => {
  // ── Config ───────────────────────────────────────────────────────────────
  const API_URL    = '/api/market';
  const REFRESH_MS = 60 * 1000;   // match server-side cache TTL

  // ── State ─────────────────────────────────────────────────────────────────
  let trackEl      = null;
  let timeEl       = null;
  let statusEl     = null;
  let statusTextEl = null;
  let refreshTimer = null;
  let lastData     = [];          // keep last successful fetch to survive errors

  // ── Formatters ────────────────────────────────────────────────────────────

  /** Indian locale price with ₹ prefix for equities. */
  function fmtPrice(price, type) {
    if (price == null) return '—';
    const n = parseFloat(price);
    if (isNaN(n)) return '—';
    const str = n.toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    return type === 'equity' ? `₹${str}` : str;
  }

  /** Change number + percentage with directional arrow. Returns { text, cls }. */
  function fmtChange(change, pct) {
    const ch = parseFloat(change);
    const p  = parseFloat(pct);
    if (isNaN(ch)) return { text: '—', cls: 'neutral' };

    const arrow  = ch >= 0 ? '▲' : '▼';
    const sign   = ch >= 0 ? '+' : '';
    const cls    = ch > 0 ? 'positive' : ch < 0 ? 'negative' : 'neutral';
    const pctStr = !isNaN(p) ? ` (${sign}${p.toFixed(2)}%)` : '';

    return { text: `${arrow} ${sign}${Math.abs(ch).toFixed(2)}${pctStr}`, cls };
  }

  // ── DOM Builders ──────────────────────────────────────────────────────────

  function buildItem(stock) {
    const price          = fmtPrice(stock.price, stock.type);
    const { text, cls } = fmtChange(stock.change, stock.changePercent);

    return `<div class="ticker-item" data-symbol="${stock.symbol}">
      <span class="ticker-dot"></span>
      <span class="ticker-symbol">${stock.symbol}</span>
      <span class="ticker-price">${price}</span>
      <span class="ticker-change ${cls}">${text}</span>
    </div>`;
  }

  /**
   * Render all items into the track.
   * Items are duplicated so the CSS animation loops seamlessly.
   */
  function renderTrack(stocks) {
    if (!trackEl) return;
    const html = stocks.map(buildItem).join('');
    trackEl.innerHTML = html + html;         // duplicate for seamless infinite loop

    // Dynamically adjust animation speed so 1 item set takes ~constant time
    requestAnimationFrame(() => {
      const halfWidth = trackEl.scrollWidth / 2;
      const speed     = 90;                  // px / second
      const duration  = Math.max(15, halfWidth / speed);
      trackEl.style.animationDuration    = `${duration}s`;
      trackEl.style.animationPlayState   = 'running';
    });
  }

  // ── Status & State Indicators ─────────────────────────────────────────────

  function showLoading() {
    if (!trackEl) return;
    trackEl.innerHTML = `
      <div class="ticker-loading">
        <span>Connecting to live market feed</span>
        <div class="ticker-loading-dots">
          <span></span><span></span><span></span>
        </div>
      </div>`;
    trackEl.style.animationPlayState = 'paused';
  }

  function showError(msg) {
    if (!trackEl) return;
    trackEl.innerHTML = `
      <div class="ticker-error-msg">
        <i class="fas fa-exclamation-circle"></i>
        <span>${msg || 'Market data temporarily unavailable'}</span>
      </div>`;
    trackEl.style.animationPlayState = 'paused';
  }

  function setStatus(msg) {
    if (!statusEl || !statusTextEl) return;
    if (msg) {
      statusTextEl.textContent = msg;
      statusEl.style.display   = 'flex';
    } else {
      statusEl.style.display   = 'none';
    }
  }

  // ── Data Fetch ────────────────────────────────────────────────────────────

  async function fetchAndRender() {
    try {
      const res = await fetch(API_URL, { cache: 'no-store' });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const json = await res.json();

      if (!json.data || json.data.length === 0) {
        throw new Error('Empty response');
      }

      lastData = json.data;
      renderTrack(lastData);
      setStatus(null);
    } catch (err) {
      console.warn('[StockTicker] Fetch failed:', err.message);

      if (lastData.length > 0) {
        // Keep displaying stale data — just show a subtle status note
        setStatus('Refreshing…');
        setTimeout(() => setStatus(null), 5000);
      } else {
        showError('Market data temporarily unavailable');
      }
    }
  }

  // ── IST Clock ─────────────────────────────────────────────────────────────

  function startClock() {
    if (!timeEl) return;
    const tick = () => {
      timeEl.textContent = new Date().toLocaleTimeString('en-IN', {
        hour:     '2-digit',
        minute:   '2-digit',
        second:   '2-digit',
        hour12:   false,
        timeZone: 'Asia/Kolkata',
      }) + ' IST';
    };
    tick();
    setInterval(tick, 1000);
  }

  // ── Init ──────────────────────────────────────────────────────────────────

  function init() {
    const tickerEl = document.getElementById('stockTicker');
    if (!tickerEl) return;   // ticker bar not present on this page

    trackEl      = document.getElementById('tickerTrack');
    timeEl       = document.getElementById('tickerTime');
    statusEl     = document.getElementById('tickerStatus');
    statusTextEl = document.getElementById('tickerStatusText');

    showLoading();
    startClock();

    // First fetch immediately
    fetchAndRender();

    // Recurring refresh every 60 s
    refreshTimer = setInterval(fetchAndRender, REFRESH_MS);

    // Pause animation on touch to let users read
    if (trackEl) {
      trackEl.addEventListener('touchstart', () => {
        trackEl.style.animationPlayState = 'paused';
      }, { passive: true });
      trackEl.addEventListener('touchend', () => {
        trackEl.style.animationPlayState = 'running';
      }, { passive: true });
    }
  }

  // ── Public ────────────────────────────────────────────────────────────────
  return {
    init,
    destroy() {
      clearInterval(refreshTimer);
      refreshTimer = null;
    },
  };
})();

// Auto-boot when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => StockTicker.init());
} else {
  StockTicker.init();
}
