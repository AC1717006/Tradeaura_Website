/**
 * server.js — Tradeaura Backend Server
 *
 * Serves the static site and the /api/market endpoint.
 * Yahoo Finance data requires no API keys.
 *
 * Usage:  node server.js
 *
 * Env vars (.env):
 *   PORT            — HTTP port (default: 3001)
 *   ALLOWED_ORIGINS — comma-separated CORS origins (production only)
 *                     e.g. "https://tradeaura.com"
 *   NODE_ENV        — set to "production" on your live server
 */

'use strict';

// ── Windows / corporate-proxy SSL fix ────────────────────────────────────
// Yahoo Finance (and npm) use certificates that some Windows CA stores
// can't verify.  This is safe on a private backend server; in production
// the cloud environment will have a proper CA chain and this is a no-op.
if (process.env.NODE_ENV !== 'production') {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
}

require('dotenv').config();

const express = require('express');
const path    = require('path');

const PORT = parseInt(process.env.PORT || '3001', 10);

const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
  : [];

const IS_PRODUCTION = process.env.NODE_ENV === 'production';

// ── App ────────────────────────────────────────────────────────────────────
const app = express();

// CORS — allow the static frontend to reach /api/market
app.use((req, res, next) => {
  const origin = req.headers.origin || '';
  if (!IS_PRODUCTION || ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', IS_PRODUCTION ? origin : '*');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

// Serve the static Tradeaura site (HTML, CSS, JS, assets)
app.use(express.static(path.join(__dirname)));

// ── Routes ─────────────────────────────────────────────────────────────────

// Live market data — Yahoo Finance, 60 s server-side cache, no API keys
app.use('/api/market', require('./server/routes/market'));

// Health / uptime check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// ── Start ──────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log('');
  console.log('  ╔══════════════════════════════════════════════════╗');
  console.log('  ║      Tradeaura Market Server  ·  Ready           ║');
  console.log('  ╠══════════════════════════════════════════════════╣');
  console.log(`  ║  Site    →  http://localhost:${PORT}               ║`);
  console.log(`  ║  Market  →  http://localhost:${PORT}/api/market    ║`);
  console.log(`  ║  Health  →  http://localhost:${PORT}/health        ║`);
  console.log('  ╚══════════════════════════════════════════════════╝');
  console.log('');
});

process.on('SIGTERM', () => { console.log('[Server] Shutting down…'); process.exit(0); });
process.on('SIGINT',  () => { console.log('[Server] Shutting down…'); process.exit(0); });
