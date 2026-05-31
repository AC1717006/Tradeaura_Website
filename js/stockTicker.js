/**
 * stockTicker.js — Tradeaura Live Market Ticker
 *
 * Polls /api/market (via the backend proxy) every 60 seconds and
 * renders a scrolling price bar.
 *
 * API URL resolution order:
 *  1. data-api attribute on the #stockTicker element
 *     e.g.  <div id="stockTicker" data-api="https://your-api.vercel.app">
 *  2. Same origin as the page (works when site is served by node server.js)
 *  3. Falls back to the local dev server at localhost:3001
 */

/* global fetch */

const StockTicker = (() => {
  // ── Config ───────────────────────────────────────────────────────────────
  const REFRESH_MS   = 60 * 1000;
  const API_PATH     = '/api/market';
  const LOCAL_DEV    = 'http://localhost:3001';

  // ── State ─────────────────────────────────────────────────────────────────
  let trackEl      = null;
  let timeEl       = null;
  let statusEl     = null;
  let statusTextEl = null;
  let refreshTimer = null;
  let lastData     = [];
  let apiBase      = '';

  // ── URL Resolution ────────────────────────────────────────────────────────

  /**
   * Decide which base URL to call for /api/market.
   *  - Prefer explicit data-api attribute on #stockTicker (set in HTML for prod)
   *  - If the page is being served by node server.js, same origin works fine
   *  - If the page is on S3 / file:// and no data-api is set, fall back to localhost
   */
  function resolveApiBase(tickerEl) {
    // 1. Explicit override in HTML
    const override = tickerEl?.dataset?.api?.trim();
    if (override) return override.replace(/\/$/, '');

    // 2. Page served by the Node server — relative call works
    const proto = window.location.protocol;
    const host  = window.location.hostname;
    if (proto === 'http:' || proto === 'https:') {
      // Avoid pointing to S3 domains (amazonaws.com) or CloudFront
      const isS3 = host.includes('amazonaws') || host.includes('s3-website') || host.includes('cloudfront');
      if (!isS3) return '';   // empty string → relative /api/market
    }

    // 3. Fallback: local dev server
    console.info('[StockTicker] No API host configured — trying localhost:3001');
    return LOCAL_DEV;
  }

  // ── Formatters ────────────────────────────────────────────────────────────

  function fmtPrice(price, type) {
    if (price == null || isNaN(price)) return '—';
    const str = parseFloat(price).toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    return type === 'equity' ? `₹${str}` : str;
  }

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

  // ── DOM ───────────────────────────────────────────────────────────────────

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

  function renderTrack(stocks) {
    if (!trackEl) return;
    const html = stocks.map(buildItem).join('');
    trackEl.innerHTML = html + html;   // duplicate for seamless infinite loop

    requestAnimationFrame(() => {
      const halfWidth = trackEl.scrollWidth / 2;
      const speed     = 90;            // px/s — tweak to taste
      const duration  = Math.max(15, halfWidth / speed);
      trackEl.style.animationDuration  = `${duration}s`;
      trackEl.style.animationPlayState = 'running';
    });
  }

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
    statusTextEl.textContent = msg || '';
    statusEl.style.display   = msg ? 'flex' : 'none';
  }

  // ── Fetch ─────────────────────────────────────────────────────────────────

  async function fetchAndRender() {
    const url = `${apiBase}${API_PATH}`;
    try {
      const res = await fetch(url, { cache: 'no-store' });

      if (!res.ok) throw new Error(`HTTP ${res.status} from ${url}`);

      const json = await res.json();
      if (!json.data || json.data.length === 0) throw new Error('Empty data array');

      lastData = json.data;
      renderTrack(lastData);
      setStatus(null);

    } catch (err) {
      console.warn('[StockTicker] Fetch failed:', err.message);

      if (lastData.length > 0) {
        // Keep showing stale data, show a brief transient notice
        setStatus('Refreshing…');
        setTimeout(() => setStatus(null), 4000);
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
    if (!tickerEl) return;

    trackEl      = document.getElementById('tickerTrack');
    timeEl       = document.getElementById('tickerTime');
    statusEl     = document.getElementById('tickerStatus');
    statusTextEl = document.getElementById('tickerStatusText');
    apiBase      = resolveApiBase(tickerEl);

    showLoading();
    startClock();
    fetchAndRender();

    refreshTimer = setInterval(fetchAndRender, REFRESH_MS);

    // Pause scroll on touch so users can read
    if (trackEl) {
      trackEl.addEventListener('touchstart', () => {
        trackEl.style.animationPlayState = 'paused';
      }, { passive: true });
      trackEl.addEventListener('touchend', () => {
        trackEl.style.animationPlayState = 'running';
      }, { passive: true });
    }
  }

  return {
    init,
    destroy() { clearInterval(refreshTimer); },
  };
})();

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => StockTicker.init());
} else {
  StockTicker.init();
}
