/**
 * stockTicker.js — Tradeaura Live Market Ticker
 *
 * Production: Cloudflare Worker (Yahoo Finance, no token needed)
 * Local dev:  Node.js server /api/market (localhost:3001)
 *
 * Symbols (from Worker): SENSEX · NIFTY 50 · BANK NIFTY · MIDCAP 50
 *                        GOLD · SILVER · CRUDE OIL · COPPER
 *
 * URL resolution order:
 *  1. localhost → http://localhost:3001/api/market
 *  2. data-api attribute on #stockTicker (set in HTML for production)
 *  3. Fallback → WORKER_URL constant below
 */

/* global fetch */

const WORKER_URL = 'https://market-ticker.tradeaura.workers.dev';

const StockTicker = (() => {
  // ── Config ───────────────────────────────────────────────────────────────
  const REFRESH_MS = 30 * 1000;   // 30s — matches Cloudflare Worker cache TTL
  const API_PATH   = '/api/market';
  const LOCAL_DEV  = 'http://localhost:3001';

  // ── State ─────────────────────────────────────────────────────────────────
  let trackEl      = null;
  let timeEl       = null;
  let statusEl     = null;
  let statusTextEl = null;
  let refreshTimer = null;
  let lastData     = [];
  let apiBase      = '';

  // ── URL Resolution ────────────────────────────────────────────────────────
  function resolveApiBase() {
    const hostname = window.location.hostname;
    const isLocal  = hostname === 'localhost' || hostname === '127.0.0.1';

    // Local dev → Express proxy
    if (isLocal) return LOCAL_DEV;

    // Production → read Cloudflare Worker URL from data-api attribute
    const ticker = document.getElementById('stockTicker');
    if (ticker && ticker.dataset.api) return ticker.dataset.api;

    return WORKER_URL;
  }

  // ── Formatters ────────────────────────────────────────────────────────────

  function getCurrencySymbol(type, currency) {
    if (type === 'index')     return '';
    if (type === 'commodity') return (currency === 'INR') ? '₹' : '$';
    return '₹';
  }

  function fmtPrice(price, type, currency) {
    if (price == null || isNaN(price)) return '—';
    const locale = (type === 'index' || currency === 'INR') ? 'en-IN' : 'en-US';
    const str = parseFloat(price).toLocaleString(locale, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    return getCurrencySymbol(type, currency) + str;
  }

  function fmtChange(change, pct, type, currency) {
    const ch = parseFloat(change);
    const p  = parseFloat(pct);
    if (isNaN(ch)) return { text: '—', cls: 'neutral' };

    const locale  = (type === 'index' || currency === 'INR') ? 'en-IN' : 'en-US';
    const arrow   = ch >= 0 ? '▲' : '▼';
    const sign    = ch >= 0 ? '+' : '';
    const cls     = ch > 0 ? 'positive' : ch < 0 ? 'negative' : 'neutral';
    const absStr  = Math.abs(ch).toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const cur     = getCurrencySymbol(type, currency);
    const pctStr  = !isNaN(p) ? ` (${sign}${p.toFixed(2)}%)` : '';

    return { text: `${arrow} ${cur}${absStr}${pctStr}`, cls };
  }

  // ── DOM ───────────────────────────────────────────────────────────────────

  function buildItem(stock) {
    const price          = fmtPrice(stock.price, stock.type, stock.currency);
    const { text, cls } = fmtChange(stock.change, stock.changePercent, stock.type, stock.currency);

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
      const speed     = 90;            // px/s
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

  function buildApiUrl() {
    // Worker returns data directly; Node proxy adds /api/market path
    const base = apiBase;
    const isWorker = base.includes('workers.dev') || base.includes('cloudflare');
    return isWorker ? base : `${base}${API_PATH}`;
  }

  async function fetchAndRender() {
    const url = buildApiUrl();
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
    apiBase      = resolveApiBase();

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
