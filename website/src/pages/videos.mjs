import { Layout } from '../lib/layout.mjs';
import { esc, Button, Badge, SectionHeader, ServiceCard, CTASection, VideoCard } from '../lib/components.mjs';
import { descHtml } from '../lib/videos.mjs';
import { videoMap } from '../data/videos-map.mjs';
import { site } from '../data/site.mjs';

const CTA_LABEL = 'Book a Free 30-Min Consultation';
const contactHref = (r, v) => `${r}pages/contact.html${v && v.serviceMeta ? `?service=${encodeURIComponent(v.serviceMeta.title)}` : ''}`;
const jsonLd = (obj) => `<script type="application/ld+json">${JSON.stringify(obj).replace(/</g, '\\u003c')}</script>`;

/* ── /pages/videos.html ─────────────────────────────────────── */
export const index = (V) => {
  const r = '../';
  const card = (v, short) => VideoCard({ v, short, href: `${r}videos/${v.slug}.html`, badge: v.serviceMeta ? v.serviceMeta.title : '' });
  const chips = [['all', 'All'], ...V.services.map((s) => [s.key, s.title]), ...(V.shorts.length ? [['short', 'Shorts']] : [])];
  const empty = `<div class="ta-card ta-placeholder ta-video-empty"><p>Videos are on their way. Until then, watch us on YouTube.</p>${Button({ label: 'Open the channel', href: videoMap.channelUrl, variant: 'secondary', iconName: 'arrow', trailing: true })}</div>`;
  const body = `
<section class="ta-section ta-section--tight">
  <div class="ta-container">
    ${SectionHeader({ eyebrow: 'YouTube', title: 'Watch how we build it.', aside: 'Short, practical Hindi tutorials on automation, WhatsApp, AI agents and the systems we ship for clients.' })}
    ${V.all.length ? `
    <div class="ta-vbar">
      <div class="ta-chips" role="group" aria-label="Filter videos">${chips.map(([k, l], i) => `<button type="button" class="ta-chip${i === 0 ? ' is-on' : ''}" data-vfilter="${esc(k)}" aria-pressed="${i === 0}">${esc(l)}</button>`).join('')}</div>
      <span class="ta-mono ta-vcount">${V.videos.length} videos · ${V.shorts.length} shorts</span>
    </div>
    <section class="ta-vsection" data-vmain>
      <div class="ta-grid ta-grid--3 ta-vgrid" data-vlist>${V.videos.map((v) => card(v, false)).join('')}</div>
      ${V.videos.length ? '' : '<p class="ta-muted">No long-form videos yet.</p>'}
    </section>
    ${V.shorts.length ? `
    <section class="ta-vsection ta-vsection--shorts" data-vshorts>
      <h2 class="ta-vsection__title">Shorts <span class="ta-mono">${V.shorts.length}</span></h2>
      <div class="ta-grid ta-vgrid ta-vgrid--shorts">${V.shorts.map((v) => card(v, true)).join('')}</div>
    </section>` : ''}
    <p class="ta-vfoot">${Button({ label: 'Subscribe on YouTube', href: videoMap.channelUrl, variant: 'secondary', iconName: 'arrow', trailing: true })}</p>` : empty}
  </div>
</section>
${CTASection({ title: 'Saw something you want for your business?', body: 'A 30-minute call. We will tell you honestly whether it is worth automating — and roughly what it would cost.', primary: { label: CTA_LABEL, href: `${r}pages/contact.html` }, secondary: `or WhatsApp ${site.contact.phoneDisplay}` })}`;
  return Layout({
    title: 'Videos — Automation tutorials in Hindi | TradeAura',
    description: 'Watch TradeAura build WhatsApp automation, AI agents, n8n workflows and business software — practical Hindi tutorials from our YouTube channel.',
    canonical: `${site.origin}/pages/videos.html`, current: '', depth: 1, body,
  });
};

/* ── /videos/<slug>.html ────────────────────────────────────── */
const PLAY = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="11" fill="rgba(0,0,0,.55)"/><path d="M9.5 7.5v9l7-4.5z" fill="#fff"/></svg>';

export const page = (v, V) => {
  const r = '../';
  const short = v.kind === 'short';
  const description = (v.desc.excerpt || v.titleClean).slice(0, 160);
  const img = v.thumbs.max || v.thumbs.hq;
  const head = `
  <title>${esc(v.titleClean)} · TradeAura Videos</title>
  <meta name="description" content="${esc(description)}">
  <link rel="canonical" href="${v.url}">
  <link rel="preconnect" href="https://www.youtube-nocookie.com">
  <meta property="og:type" content="video.other">
  <meta property="og:title" content="${esc(v.titleClean)}">
  <meta property="og:description" content="${esc(description)}">
  <meta property="og:image" content="${esc(img)}">
  <meta property="og:url" content="${v.url}">
  <meta property="og:site_name" content="TradeAura">
  <meta property="og:locale" content="en_IN">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${esc(v.titleClean)}">
  <meta name="twitter:description" content="${esc(description)}">
  <meta name="twitter:image" content="${esc(img)}">
  ${jsonLd({
    '@context': 'https://schema.org', '@type': 'VideoObject',
    name: v.titleClean, description: v.desc.paragraphs.map((p) => p.join(' ')).join('\n\n').slice(0, 2000) || v.titleClean,
    thumbnailUrl: [v.thumbs.hq, v.thumbs.max].filter(Boolean), uploadDate: v.publishedAt,
    ...(v.durationIso ? { duration: v.durationIso } : {}),
    embedUrl: v.embedUrl, url: v.url, inLanguage: 'hi',
    publisher: { '@type': 'Organization', name: site.legalName, url: site.origin },
  })}`;
  const related = V.all.filter((x) => x.id !== v.id && x.kind === v.kind).sort((a, b) => (b.service === v.service) - (a.service === v.service)).slice(0, 3);
  const body = `
<section class="ta-section ta-section--tight">
  <div class="ta-container ta-video-page">
    <nav class="ta-crumbs" aria-label="Breadcrumb"><a href="${r}index.html">Home</a> › <a href="${r}pages/videos.html">Videos</a>${v.serviceMeta ? ` › <a href="${r}${v.serviceMeta.href}">${esc(v.serviceMeta.title)}</a>` : ''}</nav>
    <div class="ta-video-head">${v.serviceMeta ? Badge({ label: v.serviceMeta.title, variant: 'accent', pill: true }) : ''}${short ? Badge({ label: 'Short', variant: 'neutral', pill: true }) : ''}</div>
    <h1>${esc(v.titleClean)}</h1>
    <p class="ta-video__meta">${esc(v.dateLabel)}${v.durationLabel ? ` · ${esc(v.durationLabel)}` : ''} · YouTube</p>
    <div class="ta-grid ta-grid--split ta-video-grid">
      <div>
        <div class="ta-embed${short ? ' ta-embed--short' : ''}" data-yt="${v.id}" data-title="${esc(v.titleClean)}" role="button" tabindex="0" aria-label="Play video">
          <img src="${esc(short && v.thumbs.vertical ? v.thumbs.vertical : v.thumbs.hq)}"${!short && v.thumbs.max ? ` srcset="${esc(v.thumbs.hq)} 480w, ${esc(v.thumbs.max)} 1280w" sizes="(max-width: 960px) 100vw, 960px"` : ''} alt="" width="${short ? 360 : 480}" height="${short ? 640 : 360}" decoding="async">
          <span class="ta-embed__play">${PLAY}</span>
          <a class="ta-embed__link" href="${v.watchUrl}" target="_blank" rel="noopener">Watch on YouTube</a>
        </div>
        ${v.desc.paragraphs.length ? `<div class="ta-video-desc">${descHtml(v.desc)}</div>` : ''}
        ${v.desc.chapters.length ? `<h2 class="ta-h3">Chapters</h2><ul class="ta-chapters">${v.desc.chapters.map((c) => `<li><time>${esc(c.time)}</time><span>${esc(c.label)}</span></li>`).join('')}</ul>` : ''}
      </div>
      <aside class="ta-video-side">
        ${v.serviceMeta ? `<p class="ta-eyebrow">Related service</p>${ServiceCard({ ...v.serviceMeta, href: `${r}${v.serviceMeta.href}` })}` : ''}
        <div class="ta-card ta-video-cta"><h3>Want this for your business?</h3><p>Tell us the process that wastes the most time. 30 minutes, no obligation.</p>${Button({ label: CTA_LABEL, href: contactHref(r, v), variant: 'primary' })}</div>
      </aside>
    </div>
    ${related.length ? `<h2 class="ta-h3 ta-video-more">More ${short ? 'shorts' : 'videos'}</h2><div class="ta-grid ${short ? 'ta-vgrid ta-vgrid--shorts' : 'ta-grid--3'} ta-vgrid">${related.map((x) => VideoCard({ v: x, short, href: `${x.slug}.html`, badge: x.serviceMeta ? x.serviceMeta.title : '' })).join('')}</div>` : ''}
    <p class="ta-vfoot">${Button({ label: 'All videos', href: `${r}pages/videos.html`, variant: 'secondary', iconName: 'arrow', trailing: true })}</p>
  </div>
</section>`;
  return Layout({ title: v.titleClean, headExtra: head, current: '', depth: 1, body, stickyCta: false });
};

/* tombstone: the video left the channel — keep the URL alive, keep it out of search */
export const gone = (v) => Layout({
  title: 'Video no longer available', current: '', depth: 1, stickyCta: false,
  headExtra: `<title>Video no longer available · TradeAura</title><meta name="robots" content="noindex, nofollow"><meta name="description" content="This video is no longer available.">`,
  body: `<section class="ta-section"><div class="ta-container"><h1>This video is no longer available</h1><p class="ta-muted">${esc(v.titleClean)} has been removed from our channel.</p><p>${Button({ label: 'See all videos', href: '../pages/videos.html', variant: 'primary' })}</p></div></section>`,
});

/* ── homepage section (3 latest long-form videos) ───────────── */
export const homeSection = (V) => {
  const latest = V.videos.slice(0, 3);
  if (!latest.length) return '';
  return `
<section class="ta-section ta-section--ground">
  <div class="ta-container">
    ${SectionHeader({ eyebrow: 'Latest from our YouTube', title: 'Watch how we build it.', aside: 'Practical Hindi tutorials on the automation we ship — new videos every week.' })}
    <div class="ta-grid ta-grid--3 ta-vgrid" style="margin-top:38px">
      ${latest.map((v) => VideoCard({ v, href: `videos/${v.slug}.html`, badge: v.serviceMeta ? v.serviceMeta.title : '' })).join('')}
    </div>
    <div style="margin-top:24px">${Button({ label: 'See all videos', href: 'pages/videos.html', variant: 'secondary', iconName: 'arrow', trailing: true })}</div>
  </div>
</section>`;
};
