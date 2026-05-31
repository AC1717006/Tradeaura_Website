/**
 * marketFeed.js — Upstox Market Data Feed Module
 *
 * Polls the Upstox v2 REST API every POLL_INTERVAL_MS milliseconds.
 * On each successful fetch, calls the `onData` callback with a
 * normalized `{ type, stocks }` payload.
 *
 * Upstox OAuth note:
 *   Access tokens are valid for one trading day (until 05:30 UTC the next day).
 *   Regenerate UPSTOX_ACCESS_TOKEN in your Upstox developer portal daily,
 *   OR automate via: https://upstox.com/developer/api-documentation/authentication/
 */

'use strict';

const axios = require('axios');

// ── Instrument Registry ──────────────────────────────────────────────────────
// Maps our internal symbol keys → Upstox instrument keys and display metadata.
const INSTRUMENTS = {
  NIFTY50:   { key: 'NSE_INDEX|Nifty 50',   label: 'NIFTY 50',   type: 'index'  },
  BANKNIFTY: { key: 'NSE_INDEX|Nifty Bank',  label: 'BANK NIFTY', type: 'index'  },
  SENSEX:    { key: 'BSE_INDEX|SENSEX',      label: 'SENSEX',      type: 'index'  },
  RELIANCE:  { key: 'NSE_EQ|INE002A01018',   label: 'RELIANCE',    type: 'equity' },
  TCS:       { key: 'NSE_EQ|INE467B01029',   label: 'TCS',         type: 'equity' },
  INFY:      { key: 'NSE_EQ|INE009A01021',   label: 'INFY',        type: 'equity' },
  HDFCBANK:  { key: 'NSE_EQ|INE040A01034',   label: 'HDFCBANK',    type: 'equity' },
  ICICIBANK: { key: 'NSE_EQ|INE090A01021',   label: 'ICICIBANK',   type: 'equity' },
};

const UPSTOX_QUOTES_URL  = 'https://api.upstox.com/v2/market-quote/quotes';
const POLL_INTERVAL_MS   = 5000;   // 5 s — adjust to taste (min 1 s per Upstox ToS)
const REQUEST_TIMEOUT_MS = 8000;

// ── Internal State ───────────────────────────────────────────────────────────
let pollTimer    = null;
let onDataCb     = null;
let onErrorCb    = null;

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Comma-separated Upstox instrument_key param. */
function instrumentQuery() {
  return Object.values(INSTRUMENTS).map(i => i.key).join(',');
}

/**
 * Convert raw Upstox quote blob → clean ticker-ready object.
 * Upstox returns keys with ":" instead of "|" (e.g. "NSE_INDEX:Nifty 50").
 *
 * @param {Object} rawData  - value of response.data.data
 * @returns {Object}        - keyed by our internal symbol key
 */
function normalize(rawData) {
  const stocks = {};

  Object.entries(INSTRUMENTS).forEach(([symbol, meta]) => {
    // Upstox uses colon as separator in response keys
    const apiKey = meta.key.replace('|', ':');
    const q      = rawData[apiKey];
    if (!q) return;

    const ltp       = q.last_price   ?? null;
    const prevClose = q.ohlc?.close  ?? null;
    const change    = (ltp != null && prevClose != null)
      ? parseFloat((ltp - prevClose).toFixed(2))
      : null;
    const changePct = (change != null && prevClose && prevClose !== 0)
      ? parseFloat(((change / prevClose) * 100).toFixed(2))
      : null;

    stocks[symbol] = {
      label:     meta.label,
      type:      meta.type,
      price:     ltp,
      change,
      changePct,
      prevClose,
      volume:    q.volume ?? null,
      high:      q.ohlc?.high ?? null,
      low:       q.ohlc?.low  ?? null,
      timestamp: Date.now(),
    };
  });

  return stocks;
}

// ── Core Fetch ───────────────────────────────────────────────────────────────

async function fetchQuotes() {
  const token = process.env.UPSTOX_ACCESS_TOKEN;
  if (!token) throw new Error('UPSTOX_ACCESS_TOKEN missing from environment.');

  const response = await axios.get(UPSTOX_QUOTES_URL, {
    params:  { instrument_key: instrumentQuery() },
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
    timeout: REQUEST_TIMEOUT_MS,
  });

  if (response.data?.status !== 'success') {
    throw new Error(`Upstox API returned: ${JSON.stringify(response.data)}`);
  }

  return normalize(response.data.data);
}

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Start polling Upstox.  Callbacks fire asynchronously after each poll.
 *
 * @param {Function} onData   Called with `{ type: 'marketData', stocks }` on success
 * @param {Function} onError  Called with an Error instance on failure
 */
function startPolling(onData, onError) {
  onDataCb  = onData;
  onErrorCb = onError;

  const poll = async () => {
    try {
      const stocks = await fetchQuotes();
      if (onDataCb) onDataCb({ type: 'marketData', stocks });
    } catch (err) {
      console.error('[MarketFeed] Poll error:', err.message);

      // Surface token expiry specifically so the operator knows what to fix
      if (err.response?.status === 401) {
        console.error('[MarketFeed] Access token expired — regenerate UPSTOX_ACCESS_TOKEN.');
      }

      if (onErrorCb) onErrorCb(err);
    }

    pollTimer = setTimeout(poll, POLL_INTERVAL_MS);
  };

  console.log(`[MarketFeed] Starting — polling every ${POLL_INTERVAL_MS / 1000}s`);
  poll(); // first fetch immediately
}

/** Stop the polling loop cleanly. */
function stopPolling() {
  clearTimeout(pollTimer);
  pollTimer = null;
  onDataCb  = null;
  onErrorCb = null;
  console.log('[MarketFeed] Polling stopped.');
}

module.exports = { startPolling, stopPolling, INSTRUMENTS };
