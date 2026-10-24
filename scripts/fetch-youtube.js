#!/usr/bin/env node
/**
 * scripts/fetch-youtube.js — builds data/videos.json for the website.
 *
 *   YOUTUBE_API_KEY=… node scripts/fetch-youtube.js            # YouTube Data API v3 (all public uploads)
 *   node scripts/fetch-youtube.js --from-rss                    # preview only: latest 15 via the public RSS feed, no key
 *   options: --out <file>  --allow-shrink  --channel <UC…>
 *
 * Runs in the "YouTube Feed — Auto Refresh" workflow (daily + manual). The site
 * build never calls YouTube: it only reads the committed JSON, so an API outage
 * can never break a deploy — the script exits non-zero WITHOUT writing and the
 * previous JSON stays. Public repo + public Actions logs: the key is never
 * printed (every error message is masked) and never written to the JSON.
 *
 * Output shape (titles/descriptions are stored RAW; the site cleans them):
 *   { channelId, channelTitle, source, fetchedAt, playlists:[{id,title}],
 *     videos:[{ id, slug, kind:'video'|'short', title, description, publishedAt,
 *               durationSec, thumbs:{mq,hq,max|null,vertical|null}, playlists:[id], removed:false }] }
 *   thumbs.vertical = YouTube's 9:16 poster (oar2.jpg), present for Shorts only.
 * Slugs are assigned once and never change. Videos that disappear from the
 * channel are kept with removed:true (the site renders a noindex "no longer
 * available" page so the S3 deploy never has to delete an object).
 * View counts are deliberately not stored.
 */
'use strict';
const fs = require('fs');
const path = require('path');

const argv = process.argv.slice(2);
const opt = (n) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : undefined; };
const KEY = process.env.YOUTUBE_API_KEY || '';
const CHANNEL = opt('--channel') || process.env.YOUTUBE_CHANNEL_ID || 'UCGvvp1dn6jiXIBXpLs6WMGA';
const OUT = path.resolve(opt('--out') || path.join(__dirname, '..', 'data', 'videos.json'));
const FROM_RSS = argv.includes('--from-rss');
const ALLOW_SHRINK = argv.includes('--allow-shrink');
const API = 'https://www.googleapis.com/youtube/v3';
const UA = 'Mozilla/5.0 (compatible; TradeAuraSiteBot/1.0; +https://www.auraautomation.site)';

const mask = (s) => { let t = String(s); if (KEY) t = t.split(KEY).join('***'); return t.replace(/([?&]key=)[^&\s]+/g, '$1***'); };
const die = (msg) => { console.error(`✗ ${mask(msg)}`); process.exit(1); };
const log = (...a) => console.log(...a.map(mask));

/* ── helpers ──────────────────────────────────────────────────────────── */
const slugify = (s) => String(s)
  .replace(/[\p{Extended_Pictographic}\u{FE0F}\u{200D}\u{20E3}]/gu, '').replace(/#\w+/g, '')
  .normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase()
  .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 70).replace(/-+$/, '') || 'video';
const isoDur = (iso) => { const m = /^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/.exec(iso || ''); return m ? (+m[1] || 0) * 3600 + (+m[2] || 0) * 60 + (+m[3] || 0) : null; };
const thumbs = (id, t = {}) => ({
  mq: (t.medium && t.medium.url) || `https://i.ytimg.com/vi/${id}/mqdefault.jpg`,
  hq: (t.high && t.high.url) || `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
  max: (t.maxres && t.maxres.url) || null,
});
async function head(url) {
  try { const r = await fetch(url, { method: 'HEAD', redirect: 'manual', headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(15000) }); return r.status; }
  catch { return 0; }
}
/* YouTube has no API flag for Shorts: /shorts/<id> answers 200 for a Short and redirects (303) for a normal video. */
async function detectKind(id, durationSec, text) {
  const s = await head(`https://www.youtube.com/shorts/${id}`);
  if (s === 200) return 'short';
  if (s >= 300 && s < 400) return 'video';
  return (durationSec !== null && durationSec <= 180 && /#shorts/i.test(text)) ? 'short' : 'video';   // network hiccup: fall back to heuristics
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* ── sources ──────────────────────────────────────────────────────────── */
async function apiGet(endpoint, params) {
  const items = []; let pageToken = '';
  for (let page = 0; page < 40; page++) {
    const u = new URL(`${API}/${endpoint}`);
    for (const [k, v] of Object.entries({ ...params, key: KEY, maxResults: 50, ...(pageToken ? { pageToken } : {}) })) u.searchParams.set(k, v);
    const r = await fetch(u, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(20000) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok || j.error) throw new Error(`${endpoint}: HTTP ${r.status} ${(j.error && j.error.message) || ''}`.trim());
    items.push(...(j.items || []));
    pageToken = j.nextPageToken || '';
    if (!pageToken) break;
  }
  return items;
}
async function fromApi() {
  if (!KEY) die('YOUTUBE_API_KEY is not set (use --from-rss for a keyless preview)');
  const ch = await apiGet('channels', { part: 'snippet,contentDetails', id: CHANNEL });
  if (!ch.length) die(`channel ${CHANNEL} not found`);
  const uploads = ch[0].contentDetails.relatedPlaylists.uploads;
  const items = await apiGet('playlistItems', { part: 'contentDetails', playlistId: uploads });
  const ids = [...new Set(items.map((i) => i.contentDetails.videoId))];
  const details = [];
  for (let i = 0; i < ids.length; i += 50) details.push(...await apiGet('videos', { part: 'snippet,contentDetails,status', id: ids.slice(i, i + 50).join(',') }));
  const pub = details.filter((v) => v.status && v.status.privacyStatus === 'public' && v.status.uploadStatus === 'processed');
  const playlists = await apiGet('playlists', { part: 'snippet', channelId: CHANNEL });
  const inPl = new Map();
  for (const p of playlists) {
    if (p.id === uploads) continue;
    for (const it of await apiGet('playlistItems', { part: 'contentDetails', playlistId: p.id })) {
      const vid = it.contentDetails.videoId; if (!inPl.has(vid)) inPl.set(vid, []); inPl.get(vid).push(p.id);
    }
  }
  return {
    channelTitle: ch[0].snippet.title,
    playlists: playlists.filter((p) => p.id !== uploads).map((p) => ({ id: p.id, title: p.snippet.title })),
    videos: pub.map((v) => ({ id: v.id, title: v.snippet.title, description: v.snippet.description || '', publishedAt: v.snippet.publishedAt,
      durationSec: isoDur(v.contentDetails.duration), thumbs: thumbs(v.id, v.snippet.thumbnails), playlists: inPl.get(v.id) || [] })),
  };
}
async function fromRss() {
  const r = await fetch(`https://www.youtube.com/feeds/videos.xml?channel_id=${CHANNEL}`, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(20000) });
  if (!r.ok) die(`RSS HTTP ${r.status}`);
  const xml = await r.text();
  const un = (s) => String(s || '').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&');
  const pick = (block, re) => { const m = re.exec(block); return m ? un(m[1]) : ''; };
  const videos = [];
  for (const m of xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)) {
    const b = m[1]; const id = pick(b, /<yt:videoId>([^<]+)</);
    const max = (await head(`https://i.ytimg.com/vi/${id}/maxresdefault.jpg`)) === 200 ? `https://i.ytimg.com/vi/${id}/maxresdefault.jpg` : null;
    videos.push({ id, title: pick(b, /<title>([^<]*)</), description: pick(b, /<media:description>([\s\S]*?)<\/media:description>/),
      publishedAt: pick(b, /<published>([^<]+)</), durationSec: null, thumbs: { ...thumbs(id), max }, playlists: [] });
  }
  return { channelTitle: pick(xml, /<title>([^<]*)<\/title>/), playlists: [], videos };
}

/* ── main ─────────────────────────────────────────────────────────────── */
(async () => {
  let prev = null;
  try { prev = JSON.parse(fs.readFileSync(OUT, 'utf8')); } catch { /* first run */ }
  const prevById = new Map(((prev && prev.videos) || []).map((v) => [v.id, v]));
  const prevPublic = ((prev && prev.videos) || []).filter((v) => !v.removed).length;

  const src = FROM_RSS ? await fromRss() : await fromApi();
  if (!src.videos.length) die('fetched 0 videos — not writing');
  if (!FROM_RSS && !ALLOW_SHRINK && prevPublic && src.videos.length < prevPublic * 0.8) die(`fetched ${src.videos.length} videos but the previous file had ${prevPublic} — refusing to shrink (use --allow-shrink if intended)`);

  const used = new Set([...prevById.values()].map((v) => v.slug));
  const out = [];
  for (const v of src.videos) {
    const old = prevById.get(v.id);
    let slug = old && old.slug;
    if (!slug) { const base = slugify(v.title); slug = base; for (let n = 2; used.has(slug); n++) slug = `${base}-${n}`; used.add(slug); }
    const kind = (old && old.kind) || await detectKind(v.id, v.durationSec, `${v.title}\n${v.description}`);
    let vertical = old && old.thumbs ? old.thumbs.vertical || null : null;
    if (kind === 'short' && !vertical) { const u = `https://i.ytimg.com/vi/${v.id}/oar2.jpg`; vertical = (await head(u)) === 200 ? u : null; }
    if (!old) await sleep(150);
    out.push({ id: v.id, slug, kind, title: v.title, description: v.description, publishedAt: v.publishedAt, durationSec: v.durationSec, thumbs: { ...v.thumbs, vertical }, playlists: v.playlists, removed: false });
  }
  if (!FROM_RSS) for (const [id, old] of prevById) if (!out.some((v) => v.id === id)) out.push({ ...old, removed: true });   // tombstone
  out.sort((a, b) => String(b.publishedAt).localeCompare(String(a.publishedAt)));

  const data = { channelId: CHANNEL, channelTitle: src.channelTitle, source: FROM_RSS ? 'rss' : 'api', fetchedAt: new Date().toISOString(), playlists: src.playlists, videos: out };
  const json = JSON.stringify(data, null, 2) + '\n';
  if (KEY && json.includes(KEY)) die('refusing to write: output would contain the API key');
  if (/AIza[0-9A-Za-z_-]{35}/.test(json)) die('refusing to write: output contains a Google API key pattern');
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, json, 'utf8');

  const live = out.filter((v) => !v.removed);
  log(`✓ ${OUT}: ${live.length} public (${live.filter((v) => v.kind === 'video').length} videos, ${live.filter((v) => v.kind === 'short').length} shorts), ${out.length - live.length} removed, ${src.playlists.length} playlists, source=${data.source}`);
  log('\n  date        type   id            dur    title');
  for (const v of live) log(`  ${v.publishedAt.slice(0, 10)}  ${v.kind.padEnd(6)} ${v.id}   ${v.durationSec === null ? '  ?  ' : String(Math.floor(v.durationSec / 60) + ':' + String(v.durationSec % 60).padStart(2, '0')).padStart(5)}  ${v.title.slice(0, 80)}`);
})().catch((e) => die(e && e.message ? e.message : e));
