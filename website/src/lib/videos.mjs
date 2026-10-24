/* ─────────────────────────────────────────────────────────────
   Videos — loads data/videos.json (written by scripts/fetch-youtube.js)
   and shapes it for the pages. Titles/descriptions are cleaned HERE at
   build time: emojis and #hashtags out, boilerplate lines out, chapters
   split off. Nothing in this file touches the network.
   ───────────────────────────────────────────────────────────── */
import { readFileSync, existsSync } from 'node:fs';
import { videoMap } from '../data/videos-map.mjs';
import { site } from '../data/site.mjs';
import { esc } from './components.mjs';

const EMOJI = /[\p{Extended_Pictographic}\u{FE0F}\u{200D}\u{20E3}\u{1F3FB}-\u{1F3FF}]/gu;
const HASHTAG = /(^|\s)#[\p{L}\p{N}_]+/gu;

export const cleanTitle = (t) => String(t || '')
  .replace(HASHTAG, '$1').replace(EMOJI, '')
  .replace(/\s{2,}/g, ' ').replace(/\s+([?!.,;:])/g, '$1')
  .replace(/^[\s|\-–—:·]+|[\s|\-–—:·]+$/g, '').trim();

export function cleanDescription(raw) {
  const chapters = [];
  const kept = [];
  for (const line of String(raw || '').replace(/\r/g, '').split('\n')) {
    const t = line.replace(HASHTAG, '$1').replace(EMOJI, '').replace(/\s{2,}/g, ' ').trim();
    if (!t) { kept.push(''); continue; }
    const ch = /^\(?((?:\d{1,2}:)?\d{1,2}:\d{2})\)?\s*[-–—:]?\s*(.+)$/.exec(t);
    if (ch) { chapters.push({ time: ch[1], label: ch[2].trim() }); continue; }
    if (videoMap.boilerplate.some((re) => re.test(t))) continue;
    kept.push(t);
  }
  const paragraphs = [];
  let cur = [];
  for (const l of kept) { if (!l) { if (cur.length) paragraphs.push(cur); cur = []; } else cur.push(l); }
  if (cur.length) paragraphs.push(cur);
  const capped = [];
  let total = 0;
  for (const p of paragraphs) { const len = p.join(' ').length; if (capped.length && total + len > 1800) break; capped.push(p); total += len; }
  const excerpt = (capped[0] || []).join(' ').replace(/https?:\/\/\S+/g, '').replace(/\s{2,}/g, ' ').trim().slice(0, 160);
  return { paragraphs: capped, chapters, excerpt };
}

/* escaped text with bare URLs turned into links (nofollow, new tab) */
export const linkify = (text) => esc(text).replace(/https?:\/\/[^\s<]+/g, (u) => {
  const clean = u.replace(/[.,)!?]+$/, ''); const tail = u.slice(clean.length);
  const label = clean.replace(/^https?:\/\/(www\.)?/, '');
  return `<a href="${clean}" rel="nofollow noopener" target="_blank">${label.length > 64 ? label.slice(0, 60) + '…' : label}</a>${tail}`;
});
export const descHtml = (d) => d.paragraphs.map((p) => `<p>${p.map(linkify).join('<br>')}</p>`).join('');

export function serviceFor(v) {
  if (Object.prototype.hasOwnProperty.call(videoMap.overrides, v.id)) return videoMap.overrides[v.id];
  for (const pid of v.playlists || []) if (videoMap.playlists[pid]) return videoMap.playlists[pid];
  for (const [re, key] of videoMap.keywords) if (re.test(v.title)) return key;
  const head = String(v.description || '').slice(0, 400);
  for (const [re, key] of videoMap.keywords) if (re.test(head)) return key;
  return null;
}
const serviceMeta = (key) => {
  const s = key && site.services.find((x) => x.key === key);
  return s ? { key: s.key, title: s.title, iconName: s.iconName, body: s.body, href: s.href ? `pages/${s.href}` : `pages/solutions.html#${s.key}` } : null;
};

const durLabel = (sec) => sec === null || sec === undefined ? '' : sec >= 3600
  ? `${Math.floor(sec / 3600)}:${String(Math.floor((sec % 3600) / 60)).padStart(2, '0')}:${String(sec % 60).padStart(2, '0')}`
  : `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;
const durIso = (sec) => sec === null || sec === undefined ? null : `PT${sec >= 3600 ? Math.floor(sec / 3600) + 'H' : ''}${Math.floor((sec % 3600) / 60)}M${sec % 60}S`;
const dateLabel = (iso) => new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' });

const shape = (raw) => {
  const service = serviceFor(raw);
  return {
    ...raw,
    titleClean: cleanTitle(raw.title),
    desc: cleanDescription(raw.description),
    service, serviceMeta: serviceMeta(service),
    durationLabel: durLabel(raw.durationSec), durationIso: durIso(raw.durationSec),
    dateLabel: dateLabel(raw.publishedAt),
    url: `${site.origin}/videos/${raw.slug}.html`,
    watchUrl: `https://www.youtube.com/watch?v=${raw.id}`,
    embedUrl: `https://www.youtube-nocookie.com/embed/${raw.id}`,
  };
};

/** Load the first existing JSON; never throws — a missing file just means an empty catalogue. */
export function loadVideos(paths) {
  const file = paths.find((p) => p && existsSync(p));
  let data = null;
  if (file) { try { data = JSON.parse(readFileSync(file, 'utf8')); } catch (e) { console.warn(`  ⚠ videos: ${file} unreadable (${e.message}) — building without videos`); } }
  const raw = (data && Array.isArray(data.videos) ? data.videos : []).filter((v) => v && /^[A-Za-z0-9_-]{11}$/.test(v.id) && /^[a-z0-9-]+$/.test(v.slug));
  const live = raw.filter((v) => !v.removed && !videoMap.exclude.includes(v.id)).map(shape)
    .sort((a, b) => String(b.publishedAt).localeCompare(String(a.publishedAt)));
  return {
    file, source: data ? data.source : null, fetchedAt: data ? data.fetchedAt : null, playlists: (data && data.playlists) || [],
    all: live, videos: live.filter((v) => v.kind !== 'short'), shorts: live.filter((v) => v.kind === 'short'),
    removed: raw.filter((v) => v.removed).map(shape),
    services: [...new Set(live.map((v) => v.service).filter(Boolean))].map(serviceMeta),
  };
}
