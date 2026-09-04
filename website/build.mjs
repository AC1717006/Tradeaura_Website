#!/usr/bin/env node
/* ─────────────────────────────────────────────────────────────
   TradeAura — static build.
   Zero dependencies. Outputs to dist/ ready for the existing
   S3 + CloudFront pipeline. Reads the LEGACY site read-only.
   ───────────────────────────────────────────────────────────── */
import { readFileSync, writeFileSync, mkdirSync, readdirSync, copyFileSync, rmSync, existsSync, statSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

import { build as buildHome } from './src/pages/index.mjs';
import * as inner from './src/pages/inner.mjs';
import { extract, renderArticle, renderIndex } from './src/news/retheme.mjs';
import { site } from './src/data/site.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));

/* ── Environment ───────────────────────────────────────────────
   TA_ENV=staging  → contact form disabled, robots.txt Disallow.
   Unset / anything else → PRODUCTION behaviour, byte-identical
   to before this flag existed. Production is the default; staging
   is the opt-in. */
const TA_ENV    = process.env.TA_ENV || 'production';
const IS_STAGING = TA_ENV === 'staging';

/* TA_CHAT=off removes the AI chat widget from every page — markup,
   stylesheet and script. Anything else leaves site.chat.enabled in
   charge. A one-flag rollback that needs no code change. */
const CHAT_OFF = /^(off|false|0|no)$/i.test(process.env.TA_CHAT || '');
if (CHAT_OFF) site.chat.enabled = false;
const ANALYTICS_OFF = /^(off|false|0|no)$/i.test(process.env.TA_ANALYTICS || '');
if (ANALYTICS_OFF) site.analytics.enabled = false;
const LEGACY = process.env.TA_LEGACY || '/home/ubuntu/tradeaura-api';
const DIST = join(HERE, 'dist');

/* The contact form keeps posting to the SAME endpoint as today. */
const WEBHOOK = (() => {
  try {
    const idx = readFileSync(join(LEGACY, 'index.html'), 'utf8');
    const m = idx.match(/WEBHOOK_URL\s*=\s*"([^"]+)"/);
    return m ? m[1] : '';
  } catch { return ''; }
})();

const log = (...a) => console.log(...a);
const write = (rel, html) => {
  const p = join(DIST, rel);
  mkdirSync(dirname(p), { recursive: true });
  writeFileSync(p, html, 'utf8');
  return p;
};
const copyDir = (from, to) => {
  if (!existsSync(from)) return 0;
  let n = 0;
  for (const e of readdirSync(from, { withFileTypes: true })) {
    const s = join(from, e.name), d = join(to, e.name);
    if (e.isDirectory()) { mkdirSync(d, { recursive: true }); n += copyDir(s, d); }
    else { mkdirSync(dirname(d), { recursive: true }); copyFileSync(s, d); n++; }
  }
  return n;
};

const t0 = Date.now();
log(`  environment       ${TA_ENV}${IS_STAGING ? '  ← form disabled, noindex robots' : ''}`);
log(`  ai chat widget    ${site.chat.enabled ? 'enabled → ' + site.chat.apiBase : 'DISABLED (TA_CHAT=off)'}`);
log(`  analytics         ${site.analytics.enabled ? 'enabled → ' + site.analytics.endpoint : 'DISABLED (TA_ANALYTICS=off)'}`);
rmSync(DIST, { recursive: true, force: true });
mkdirSync(DIST, { recursive: true });

/* ── 1. static assets ──────────────────────────────────────── */
let nAssets = copyDir(join(HERE, 'public'), DIST);
/* public/ is copied wholesale, so with the widget off its two assets
   would still ship as dead weight. Remove them, making TA_CHAT=off a
   true byte-for-byte rollback to the pre-chat build. */
if (!site.chat.enabled) {
  for (const f of ['assets/css/chat.css', 'assets/js/chat.js']) {
    const t = join(DIST, f);
    if (existsSync(t)) { rmSync(t); nAssets -= 1; }
  }
}
if (!site.analytics.enabled) {
  const t = join(DIST, 'assets/js/ta-analytics.js');
  if (existsSync(t)) { rmSync(t); nAssets -= 1; }
}
mkdirSync(join(DIST, 'assets/css'), { recursive: true });
copyFileSync(join(HERE, 'src/styles/tokens.css'), join(DIST, 'assets/css/tokens.css'));
copyFileSync(join(HERE, 'src/styles/site.css'), join(DIST, 'assets/css/site.css'));
log(`  assets            ${nAssets + 2} files`);

/* ── 2. carry legacy media across unchanged ────────────────── */
const nMedia = copyDir(join(LEGACY, 'assets'), join(DIST, 'assets'));
log(`  legacy media      ${nMedia} files (unchanged)`);

/* ── 3. marketing pages ────────────────────────────────────── */
const pages = [
  ['index.html', buildHome()],
  ['pages/solutions.html', inner.solutions()],
  ['pages/services.html', inner.services()],
  ['pages/projects.html', inner.projects()],
  ['pages/industries.html', inner.industries()],
  ['pages/about.html', inner.about()],
  ['pages/compare.html', inner.compare()],
  ['pages/join.html', inner.join()],
  ['pages/contact.html', inner.contact({ webhook: WEBHOOK, staging: IS_STAGING })],
  ['pages/gym-dashboard.html', inner.gymDashboard()],
  ['login.html', inner.login()],
  ['legal/privacy.html', inner.privacy()],
  ['legal/terms.html', inner.terms()],
];
pages.forEach(([rel, html]) => write(rel, html));
log(`  marketing pages   ${pages.length}`);

/* ── 4. news — transform every existing file, URLs frozen ──── */
const newsDir = join(LEGACY, 'news');
const files = existsSync(newsDir)
  ? readdirSync(newsDir).filter((f) => f.endsWith('.html') && f !== 'index.html')
  : [];

const articles = [];
const failures = [];
for (const f of files) {
  const raw = readFileSync(join(newsDir, f), 'utf8');
  const a = extract(raw);
  if (!a.ok) { failures.push(f); continue; }
  a.file = f;
  articles.push(a);
  write(`news/${f}`, renderArticle(a));
}

/* Any article we could not parse is copied through BYTE-IDENTICAL
   rather than dropped — a stale-looking page beats a dead URL. */
for (const f of failures) {
  mkdirSync(join(DIST, 'news'), { recursive: true });
  copyFileSync(join(newsDir, f), join(DIST, 'news', f));
}

articles.sort((a, b) => (Date.parse(b.date) || 0) - (Date.parse(a.date) || 0));
write('news/index.html', renderIndex(articles));
log(`  news articles     ${articles.length} re-themed, ${failures.length} passed through, 1 index`);

/* ── 5. sitemap — every built page, none dropped ───────────── */
const today = new Date().toISOString().slice(0, 10);
const urls = [
  { loc: `${site.origin}/`, pri: '1.0', freq: 'weekly' },
  ...pages.filter(([r]) => r !== 'index.html' && !r.startsWith('legal/')).map(([r]) => ({ loc: `${site.origin}/${r}`, pri: '0.8', freq: 'monthly' })),
  { loc: `${site.origin}/news/index.html`, pri: '0.9', freq: 'daily' },
  ...articles.map((a) => ({ loc: a.canonical || `${site.origin}/news/${a.file}`, pri: '0.6', freq: 'monthly' })),
  ...failures.map((f) => ({ loc: `${site.origin}/news/${f}`, pri: '0.6', freq: 'monthly' })),
  ...pages.filter(([r]) => r.startsWith('legal/')).map(([r]) => ({ loc: `${site.origin}/${r}`, pri: '0.2', freq: 'yearly' })),
];
write(
  'sitemap.xml',
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls
    .map((u) => `  <url>\n    <loc>${u.loc}</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>${u.freq}</changefreq>\n    <priority>${u.pri}</priority>\n  </url>`)
    .join('\n')}\n</urlset>\n`
);
log(`  sitemap.xml       ${urls.length} URLs`);

/* ── 6. robots.txt ─────────────────────────────────────────────
   PRODUCTION: preserved verbatim from the live site.
   STAGING:    Disallow: / so the test host is never indexed. */
const robotsSrc = join(LEGACY, 'robots.txt');
if (IS_STAGING) {
  writeFileSync(join(DIST, 'robots.txt'), 'User-agent: *\nDisallow: /\n');
  log('  robots.txt        STAGING — Disallow: /');
} else {
  writeFileSync(
    join(DIST, 'robots.txt'),
    existsSync(robotsSrc) ? readFileSync(robotsSrc, 'utf8') : `User-agent: *\nAllow: /\n\nSitemap: ${site.origin}/sitemap.xml\n`
  );
  log('  robots.txt        preserved (production)');
}

/* ── 7. carry data files the site reads at runtime ─────────── */
for (const f of ['instagram-feed.json']) {
  const s = join(LEGACY, f);
  if (existsSync(s)) copyFileSync(s, join(DIST, f));
}
mkdirSync(join(DIST, 'data'), { recursive: true });
if (existsSync(join(LEGACY, 'data/news.json'))) copyFileSync(join(LEGACY, 'data/news.json'), join(DIST, 'data/news.json'));
log('  runtime data      carried across');

/* ── done ──────────────────────────────────────────────────── */
const count = (d) => readdirSync(d, { withFileTypes: true }).reduce((n, e) => n + (e.isDirectory() ? count(join(d, e.name)) : 1), 0);
log(`\n  ✔ built ${count(DIST)} files in ${Date.now() - t0}ms → dist/`);
if (failures.length) log(`  ⚠ ${failures.length} article(s) copied through unparsed: ${failures.slice(0, 5).join(', ')}${failures.length > 5 ? '…' : ''}`);
