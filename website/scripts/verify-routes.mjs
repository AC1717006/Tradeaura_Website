#!/usr/bin/env node
/* Route preservation check: every URL that exists on the LIVE site
   must exist in dist/, with its canonical + description intact. */
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const LEGACY = process.env.TA_LEGACY || '/home/ubuntu/tradeaura-api';
const DIST = join(HERE, '..', 'dist');

const legacyRoutes = [];
const walk = (dir, base = '') => {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (['node_modules', '.git', 'logs', 'scripts', 'server', 'api', 'cloudflare-worker', 'Tradeaura_Website', '.github'].includes(e.name)) continue;
    const rel = base ? `${base}/${e.name}` : e.name;
    if (e.isDirectory()) walk(join(dir, e.name), rel);
    else if (e.name.endsWith('.html')) legacyRoutes.push(rel);
  }
};
walk(LEGACY);

const meta = (file, re) => {
  if (!existsSync(file)) return null;
  const m = readFileSync(file, 'utf8').match(re);
  return m ? m[1] : null;
};

let missing = [], canonBroken = [], descMissing = [], ok = 0;
const INTENTIONAL = new Set(['admin/index.html']); // rebuilt server-side in a later phase

for (const r of legacyRoutes) {
  if (INTENTIONAL.has(r)) continue;
  const out = join(DIST, r);
  if (!existsSync(out)) { missing.push(r); continue; }
  const oldCanon = meta(join(LEGACY, r), /<link\s+rel="canonical"\s+href="([^"]*)"/i);
  const newCanon = meta(out, /<link\s+rel="canonical"\s+href="([^"]*)"/i);
  if (oldCanon && oldCanon !== newCanon) canonBroken.push({ r, oldCanon, newCanon });
  if (!meta(out, /<meta\s+name="description"\s+content="([^"]*)"/i)) descMissing.push(r);
  ok++;
}

const pad = (s, n) => String(s).padEnd(n);
console.log('════ ROUTE PRESERVATION ════');
console.log(`  legacy .html routes found : ${legacyRoutes.length}`);
console.log(`  intentionally excluded    : ${INTENTIONAL.size} (${[...INTENTIONAL].join(', ')})`);
console.log(`  present in dist/          : ${ok}`);
console.log(`  MISSING                   : ${missing.length}`);
console.log(`  canonical changed         : ${canonBroken.length}`);
console.log(`  description missing       : ${descMissing.length}`);

if (missing.length) { console.log('\n  ❌ MISSING ROUTES:'); missing.slice(0, 20).forEach((r) => console.log('     ' + r)); }
if (canonBroken.length) {
  console.log('\n  ❌ CANONICAL CHANGED:');
  canonBroken.slice(0, 10).forEach((c) => console.log(`     ${pad(c.r, 40)}\n       was: ${c.oldCanon}\n       now: ${c.newCanon}`));
}
if (descMissing.length) { console.log('\n  ⚠ DESCRIPTION MISSING:'); descMissing.slice(0, 10).forEach((r) => console.log('     ' + r)); }

/* sitemap coverage */
const sm = readFileSync(join(DIST, 'sitemap.xml'), 'utf8');
const smLocs = (sm.match(/<loc>([^<]+)<\/loc>/g) || []).length;
const distNews = readdirSync(join(DIST, 'news')).filter((f) => f.endsWith('.html')).length;
console.log(`\n  sitemap URLs              : ${smLocs}`);
console.log(`  news pages in dist/       : ${distNews}`);

const fail = missing.length || canonBroken.length;
console.log(`\n  ${fail ? '❌ FAIL' : '✅ PASS'} — every legacy route ${fail ? 'NOT ' : ''}preserved`);
process.exit(fail ? 1 : 0);
