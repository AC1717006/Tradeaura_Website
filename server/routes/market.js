/**
 * server/routes/market.js — Live Market Data Route
 *
 * GET /api/market
 *
 * Fetches quotes from Yahoo Finance via yahoo-finance2, caches them
 * for 60 seconds, and returns sanitized JSON.  No API keys needed.
 *
 * Response:
 * {
 *   "updatedAt": "2026-05-31T10:00:00.000Z",
 *   "data": [
 *     { "symbol": "NIFTY 50",  "type": "index",
 *       "price": 23547.75, "change": -359.40, "changePercent": -1.5027 },
 *     { "symbol": "RELIANCE",  "type": "equity",
 *       "price": 1321.20,  "change":  -29.30, "changePercent": -2.1700 },
 *     ...
 *   ]
 * }
 */

'use strict';

const express      = require('express');
const { default: YahooFinance } = require('yahoo-finance2');

const router = express.Router();

// Create a single shared instance (suppresses the one-time survey notice)
const yf = new YahooFinance({ suppressNotices: ['yahooSurvey'] });

// ── Instrument Registry ────────────────────────────────────────────────────
const SYMBOLS = [
  { yahoo: '^NSEI',        label: 'NIFTY 50',   type: 'index'  },
  { yahoo: '^NSEBANK',     label: 'BANK NIFTY', type: 'index'  },
  { yahoo: 'RELIANCE.NS',  label: 'RELIANCE',   type: 'equity' },
  { yahoo: 'TCS.NS',       label: 'TCS',        type: 'equity' },
  { yahoo: 'INFY.NS',      label: 'INFY',       type: 'equity' },
  { yahoo: 'HDFCBANK.NS',  label: 'HDFCBANK',   type: 'equity' },
  { yahoo: 'ICICIBANK.NS', label: 'ICICIBANK',  type: 'equity' },
];

// ── In-Memory Cache ────────────────────────────────────────────────────────
const CACHE_TTL_MS = 60 * 1000; // 60 seconds

let cache = {
  data:      null,
  updatedAt: null,
  fetchedAt: 0,      // epoch ms for TTL check
};

// ── Fetch ─────────────────────────────────────────────────────────────────

/**
 * Fetch all symbols in parallel; individual failures are logged and skipped.
 * @returns {Array} Normalized stock objects
 */
async function fetchFromYahoo() {
  const results = await Promise.allSettled(
    SYMBOLS.map(s => yf.quote(s.yahoo, {}, { validateResult: false }))
  );

  return results.reduce((acc, result, i) => {
    const meta = SYMBOLS[i];

    if (result.status === 'rejected') {
      console.warn(`[Market] ${meta.yahoo} failed:`, result.reason?.message);
      return acc;
    }

    const q = result.value;
    if (!q || q.regularMarketPrice == null) return acc;

    acc.push({
      symbol:        meta.label,
      type:          meta.type,
      price:         parseFloat(q.regularMarketPrice.toFixed(2)),
      change:        parseFloat((q.regularMarketChange        ?? 0).toFixed(2)),
      changePercent: parseFloat((q.regularMarketChangePercent ?? 0).toFixed(4)),
    });

    return acc;
  }, []);
}

// ── Cache Logic ────────────────────────────────────────────────────────────

/**
 * Serve from cache if fresh; fetch and refresh otherwise.
 */
async function getMarketData() {
  if (cache.data && (Date.now() - cache.fetchedAt) < CACHE_TTL_MS) {
    return { data: cache.data, updatedAt: cache.updatedAt };
  }

  console.log('[Market] Cache miss — fetching from Yahoo Finance…');
  const data = await fetchFromYahoo();

  // Only replace cache if we got at least something back
  if (data.length > 0) {
    cache = { data, updatedAt: new Date().toISOString(), fetchedAt: Date.now() };
  }

  return { data: cache.data || [], updatedAt: cache.updatedAt };
}

// ── Background Refresh ────────────────────────────────────────────────────
// Proactively warms the cache every 60 s so request latency stays near zero.
setInterval(async () => {
  try {
    const data = await fetchFromYahoo();
    if (data.length > 0) {
      cache = { data, updatedAt: new Date().toISOString(), fetchedAt: Date.now() };
      console.log(`[Market] Cache refreshed — ${data.length} symbols at ${cache.updatedAt}`);
    }
  } catch (err) {
    // Keep serving stale cache; don't crash on transient network errors
    console.error('[Market] Background refresh failed:', err.message);
  }
}, CACHE_TTL_MS);

// ── Route ─────────────────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const { data, updatedAt } = await getMarketData();

    if (!data || data.length === 0) {
      return res.status(503).json({
        error: 'Market data temporarily unavailable.',
        updatedAt: null,
        data: [],
      });
    }

    // Allow CDN / browser to honour the 60 s TTL
    res.set('Cache-Control', `public, max-age=${CACHE_TTL_MS / 1000}`);
    return res.json({ updatedAt, data });

  } catch (err) {
    console.error('[Market] Route error:', err.message);
    return res.status(503).json({
      error: 'Market data temporarily unavailable.',
      updatedAt: null,
      data: [],
    });
  }
});

module.exports = router;
