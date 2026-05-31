/**
 * api/market.js — Vercel Serverless Function
 *
 * Automatically becomes GET /api/market when deployed to Vercel.
 * Uses the same Yahoo Finance logic as the local Express server.
 *
 * Deploy:
 *   npx vercel          (first time — follow prompts)
 *   npx vercel --prod   (production deployment)
 */

'use strict';

const { default: YahooFinance } = require('yahoo-finance2');

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

// ── In-module cache (survives hot invocations; resets on cold starts) ─────
const CACHE_TTL_MS = 60 * 1000;

let cache = { data: null, updatedAt: null, fetchedAt: 0 };

// ── Fetch ─────────────────────────────────────────────────────────────────
async function fetchFromYahoo() {
  const results = await Promise.allSettled(
    SYMBOLS.map(s => yf.quote(s.yahoo, {}, { validateResult: false }))
  );

  return results.reduce((acc, result, i) => {
    if (result.status !== 'fulfilled') return acc;
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

// ── Vercel handler ────────────────────────────────────────────────────────
module.exports = async (req, res) => {
  // Only GET allowed
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // CORS — the ticker is embedded on a static site that may have a different origin
  res.setHeader('Access-Control-Allow-Origin',  '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

  try {
    // Serve from cache if still fresh
    if (cache.data && (Date.now() - cache.fetchedAt) < CACHE_TTL_MS) {
      res.setHeader('Cache-Control', `public, max-age=${CACHE_TTL_MS / 1000}`);
      return res.json({ updatedAt: cache.updatedAt, data: cache.data });
    }

    // Cache expired or cold start — fetch fresh
    const data = await fetchFromYahoo();

    if (data.length === 0) {
      return res.status(503).json({
        error: 'Market data temporarily unavailable.',
        updatedAt: null,
        data: [],
      });
    }

    cache = { data, updatedAt: new Date().toISOString(), fetchedAt: Date.now() };

    res.setHeader('Cache-Control', `public, max-age=${CACHE_TTL_MS / 1000}`);
    return res.json({ updatedAt: cache.updatedAt, data: cache.data });

  } catch (err) {
    console.error('[api/market] Error:', err.message);
    return res.status(503).json({
      error: 'Market data temporarily unavailable.',
      updatedAt: null,
      data: [],
    });
  }
};
