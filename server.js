/**
 * server.js — Tradeaura Local Development Server
 *
 * Serves the entire static site + the /api/market endpoint in one process.
 * For production, the API runs as a Vercel serverless function (api/market.js).
 *
 * Run locally:
 *   npm start               → http://localhost:3001
 *   http://localhost:3001/api/market  → live JSON
 */

'use strict';

// ── Windows / corporate-proxy TLS fix ────────────────────────────────────
// Yahoo Finance's certificate can't be verified by some Windows CA stores.
// In production (Linux cloud server) this env var is unset, so it's a no-op.
if (process.env.NODE_ENV !== 'production') {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
}

require('dotenv').config();

const express      = require('express');
const path         = require('path');
const { default: YahooFinance } = require('yahoo-finance2');

const PORT = parseInt(process.env.PORT || '3001', 10);

// ── Yahoo Finance client ──────────────────────────────────────────────────
const yf = new YahooFinance({ suppressNotices: ['yahooSurvey'] });

// ── Symbols ───────────────────────────────────────────────────────────────
const SYMBOLS = [
  { yahoo: '^NSEI',        label: 'NIFTY 50',   type: 'index'  },
  { yahoo: '^NSEBANK',     label: 'BANK NIFTY', type: 'index'  },
  { yahoo: 'RELIANCE.NS',  label: 'RELIANCE',   type: 'equity' },
  { yahoo: 'TCS.NS',       label: 'TCS',        type: 'equity' },
  { yahoo: 'INFY.NS',      label: 'INFY',       type: 'equity' },
  { yahoo: 'HDFCBANK.NS',  label: 'HDFCBANK',   type: 'equity' },
  { yahoo: 'ICICIBANK.NS', label: 'ICICIBANK',  type: 'equity' },
];

// ── In-memory cache ───────────────────────────────────────────────────────
const CACHE_TTL_MS = 60 * 1000; // 60 seconds

let cache = {
  data:      null,   // Array of stock objects
  updatedAt: null,   // ISO timestamp of last successful fetch
  fetchedAt: 0,      // epoch ms — used for TTL check
};

// ── Core fetch ────────────────────────────────────────────────────────────
async function fetchFromYahoo() {
  const results = await Promise.allSettled(
    SYMBOLS.map(s => yf.quote(s.yahoo, {}, { validateResult: false }))
  );

  return results.reduce((acc, result, i) => {
    if (result.status !== 'fulfilled') {
      console.warn(`[Market] ${SYMBOLS[i].yahoo} failed:`, result.reason?.message);
      return acc;
    }
    const q = result.value;
    if (!q || q.regularMarketPrice == null) return acc;

    acc.push({
      symbol:        SYMBOLS[i].label,
      type:          SYMBOLS[i].type,
      price:         parseFloat(q.regularMarketPrice.toFixed(2)),
      change:        parseFloat((q.regularMarketChange        ?? 0).toFixed(2)),
      changePercent: parseFloat((q.regularMarketChangePercent ?? 0).toFixed(4)),
    });
    return acc;
  }, []);
}

// ── Cache refresh ─────────────────────────────────────────────────────────
async function refreshCache() {
  try {
    const data = await fetchFromYahoo();
    if (data.length > 0) {
      cache = { data, updatedAt: new Date().toISOString(), fetchedAt: Date.now() };
      console.log(`[Market] ${data.length} symbols cached — ${cache.updatedAt}`);
    }
  } catch (err) {
    console.error('[Market] Refresh failed:', err.message);
  }
}

// ── Express app ───────────────────────────────────────────────────────────
const app = express();

// CORS — allow any origin so the ticker works when site is on S3
app.use((_req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin',  '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (_req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

// Serve static Tradeaura site (HTML, CSS, JS, assets)
app.use(express.static(path.join(__dirname)));

// ══ GET /api/market ═══════════════════════════════════════════════════════
app.get('/api/market', async (req, res) => {
  try {
    // Return cached data if still within TTL
    if (cache.data && (Date.now() - cache.fetchedAt) < CACHE_TTL_MS) {
      res.set('Cache-Control', `public, max-age=${CACHE_TTL_MS / 1000}`);
      return res.json({ updatedAt: cache.updatedAt, data: cache.data });
    }

    // Cache stale — fetch fresh data
    await refreshCache();

    if (!cache.data || cache.data.length === 0) {
      return res.status(503).json({
        error: 'Market data temporarily unavailable.',
        updatedAt: null,
        data: [],
      });
    }

    res.set('Cache-Control', `public, max-age=${CACHE_TTL_MS / 1000}`);
    return res.json({ updatedAt: cache.updatedAt, data: cache.data });

  } catch (err) {
    console.error('[Market] API error:', err.message);
    return res.status(503).json({
      error: 'Market data temporarily unavailable.',
      updatedAt: null,
      data: [],
    });
  }
});

// ══ GET /api/instagram ════════════════════════════════════════════════════
// Proxies to the same serverless function logic for local dev parity.
// Requires INSTAGRAM_ACCESS_TOKEN + INSTAGRAM_USER_ID in .env
app.get('/api/instagram', async (req, res) => {
  try {
    // Dynamically require the Vercel handler so its module-level cache works
    const handler = require('./api/instagram');
    await handler(req, res);
  } catch (err) {
    console.error('[Instagram] Route error:', err.message);
    res.status(503).json({ error: 'Instagram feed temporarily unavailable.' });
  }
});

// Health check
app.get('/health', (_req, res) => {
  res.json({
    status:    'ok',
    cached:    !!cache.data,
    symbols:   cache.data?.length ?? 0,
    updatedAt: cache.updatedAt,
  });
});

// ── Start ─────────────────────────────────────────────────────────────────
app.listen(PORT, async () => {
  console.log(`\n[Server] http://localhost:${PORT}`);
  console.log(`[Server] Market    → http://localhost:${PORT}/api/market`);
  console.log(`[Server] Instagram → http://localhost:${PORT}/api/instagram`);
  console.log(`[Server] Health    → http://localhost:${PORT}/health\n`);

  // Pre-warm cache so the very first page load has data
  await refreshCache();

  // Keep cache warm with a background interval
  setInterval(refreshCache, CACHE_TTL_MS);
});

process.on('SIGTERM', () => { console.log('[Server] Stopping…'); process.exit(0); });
process.on('SIGINT',  () => { console.log('[Server] Stopping…'); process.exit(0); });
