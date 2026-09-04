/* ─────────────────────────────────────────────────────────────
   News re-theme.

   CRITICAL: 609 article files exist on disk but news.json holds only
   200 records. Regenerating from data would destroy 409 live URLs via
   `s3 sync --delete`. So we TRANSFORM each existing file instead:
   lift its <head> metadata verbatim and its <article> body, then
   re-render inside the new layout.

   Nothing about the URL, canonical, title, description, og:* or
   twitter:* tags is altered.
   ───────────────────────────────────────────────────────────── */
import { Layout } from '../lib/layout.mjs';
import { esc, Button, NewsCard, SectionHeader } from '../lib/components.mjs';
import { icon } from '../lib/icons.mjs';
import { site } from '../data/site.mjs';

/* Head tags we carry across verbatim, in source order. */
const HEAD_KEEP =
  /<title>[\s\S]*?<\/title>|<meta\s+(?:name|property)="(?:description|keywords|robots|author|news_keywords|og:[a-z:]+|twitter:[a-z:]+|article:[a-z:]+)"[^>]*>|<link\s+rel="canonical"[^>]*>|<script\s+type="application\/ld\+json"[\s\S]*?<\/script>/gi;

/* Return the inner HTML of the first element matching `open`, found by
   counting nested open/close tags — so nested <div>s cannot end it early. */
const sliceBalanced = (html, open, tag = 'div') => {
  const m = html.match(open);
  if (!m) return '';
  const start = m.index + m[0].length;
  const re = new RegExp(`<${tag}\\b[^>]*>|</${tag}>`, 'gi');
  re.lastIndex = start;
  let depth = 1, hit;
  while ((hit = re.exec(html))) {
    depth += hit[0][1] === '/' ? -1 : 1;
    if (depth === 0) return html.slice(start, hit.index);
  }
  return html.slice(start);
};

/* Remove everything the old dark template left behind. Tailwind and
   Font Awesome are no longer loaded, so their markup would render as
   unstyled text and empty boxes. */
const LEGACY_CLASS = /\b(glass-card|glassBorder|brandBlue|brandPurple|brandPink|darkBase|text-gray-\d{3}|bg-white\/\d+|text-white|bg-black\/\d+|backdrop-blur[\w-]*)\b/;

export const cleanBody = (html) =>
  html
    .replace(/<h1[\s\S]*?<\/h1>/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<i\s+class="fa[bsr]?[^"]*"[^>]*>\s*<\/i>/gi, '')   // Font Awesome icons
    .replace(/<button[\s\S]*?<\/button>/gi, '')                   // share buttons
    .replace(/\son[a-z]+="[^"]*"/gi, '')                          // inline handlers
    .replace(/<(\w+)([^>]*\bclass="[^"]*"[^>]*)>/gi, (full, tag, attrs) => {
      const cm = attrs.match(/class="([^"]*)"/i);
      if (cm && LEGACY_CLASS.test(cm[1])) {
        return `<${tag}${attrs.replace(/\sclass="[^"]*"/i, '')}>`;  // drop dead classes
      }
      return full;
    })
    .replace(/\sstyle="[^"]*(?:rgba?\(|gradient|#[0-9a-f]{3,8})[^"]*"/gi, '') // legacy inline colour
    .replace(/(\s*<p>\s*<\/p>|\s*<div>\s*<\/div>)/gi, '')
    .trim();

export const extract = (html) => {
  const headMatch = html.match(/<head[^>]*>([\s\S]*?)<\/head>/i);
  const head = headMatch ? headMatch[1] : '';
  const keep = (head.match(HEAD_KEEP) || []).join('\n  ');

  const titleM = head.match(/<title>([\s\S]*?)<\/title>/i);
  const title = titleM ? titleM[1].replace(/\s*\|\s*Tradeaura.*$/i, '').trim() : '';

  const descM = head.match(/<meta\s+name="description"\s+content="([^"]*)"/i);
  const description = descM ? descM[1] : '';

  const canonM = head.match(/<link\s+rel="canonical"\s+href="([^"]*)"/i);
  const canonical = canonM ? canonM[1] : '';

  const imgM = head.match(/<meta\s+property="og:image"\s+content="([^"]*)"/i);
  const image = imgM ? imgM[1] : '';

  const timeM = head.match(/<meta\s+property="article:published_time"\s+content="([^"]*)"/i);

  /* Headline: prefer the <h1> in the document body. */
  const h1M = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  const headline = h1M ? h1M[1].replace(/<[^>]+>/g, '').trim() : title;

  /* Article body: the .article-content block, matched by DEPTH so we
     stop at its real closing tag rather than the first </div>. */
  let bodyHtml = sliceBalanced(html, /<div[^>]*class="[^"]*\barticle-content\b[^"]*"[^>]*>/i);
  if (!bodyHtml) bodyHtml = sliceBalanced(html, /<article[^>]*>/i, 'article');
  bodyHtml = cleanBody(bodyHtml);

  /* Date: from meta, else a visible <time>, else empty. */
  let date = timeM ? timeM[1] : '';
  if (!date) {
    const tM = html.match(/<time[^>]*datetime="([^"]*)"/i);
    if (tM) date = tM[1];
  }

  const catM = html.match(/data-category="([^"]*)"/i);

  return {
    keep, title, headline, description, canonical, image, date,
    category: catM ? catM[1] : '',
    bodyHtml,
    ok: Boolean(bodyHtml && headline),
  };
};

const fmtDate = (d) => {
  if (!d) return '';
  const t = Date.parse(d);
  if (Number.isNaN(t)) return '';
  return new Date(t).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
};

/* ── Article page ──────────────────────────────────────────── */
export const renderArticle = (a) => {
  const head = `
  ${a.keep}
  <meta property="og:site_name" content="TradeAura">
  <meta property="og:locale" content="en_IN">`;

  const body = `
<article class="ta-container">
  <div class="ta-article">
    <nav class="ta-breadcrumb" aria-label="Breadcrumb">
      <a href="../index.html">Home</a>
      <span style="width:13px;height:13px;display:grid;place-items:center;color:var(--ta-ink-4)">${icon('chevron')}</span>
      <a href="index.html">News</a>
      <span style="width:13px;height:13px;display:grid;place-items:center;color:var(--ta-ink-4)">${icon('chevron')}</span>
      <span style="color:var(--ta-ink-2)">${esc(a.headline.slice(0, 60))}${a.headline.length > 60 ? '…' : ''}</span>
    </nav>

    <h1>${esc(a.headline)}</h1>

    <div class="ta-article__meta">
      ${a.category ? `<span class="ta-badge ta-badge--neutral">${esc(a.category)}</span>` : ''}
      ${fmtDate(a.date) ? `<span>${esc(fmtDate(a.date))}</span>` : ''}
      <span>TradeAura Insights</span>
    </div>

    ${a.image ? `<img src="${a.image}" alt="" loading="lazy" decoding="async" style="margin-bottom:28px">` : ''}

    <div class="ta-article__body">
${a.bodyHtml}
    </div>

    <div style="margin-top:44px;padding-top:26px;border-top:1px solid var(--ta-line);display:flex;gap:12px;flex-wrap:wrap">
      ${Button({ label: 'More news', href: 'index.html', variant: 'secondary' })}
      ${Button({ label: 'Book a Free Demo', href: '../pages/contact.html', variant: 'primary' })}
    </div>
  </div>
</article>`;

  return Layout({
    title: a.title, description: a.description, canonical: a.canonical,
    current: 'news', depth: 1, body, headExtra: head, stickyCta: false,
  });
};

/* ── News index ────────────────────────────────────────────── */
export const renderIndex = (articles) => {
  const cards = articles
    .map((a) =>
      NewsCard({
        title: a.headline,
        summary: a.description,
        href: a.file,
        category: a.category,
        date: fmtDate(a.date),
      })
    )
    .join('');

  const body = `
<section class="ta-section ta-section--tight" style="padding-bottom:0">
  <div class="ta-container">
    <div class="ta-sechead" style="max-width:56ch">
      <span class="ta-eyebrow">TradeAura Insights</span>
      <h1 style="font-size:clamp(32px,4.4vw,46px);font-weight:700;line-height:1.08">News &amp; analysis</h1>
      <p style="font-size:17px;color:var(--ta-ink-2)">Technology, AI and business coverage, refreshed automatically throughout the day.</p>
    </div>
  </div>
</section>
<section class="ta-section">
  <div class="ta-container">
    <div class="ta-grid ta-grid--3">${cards}</div>
  </div>
</section>`;

  return Layout({
    title: 'News & Analysis | TradeAura Insights',
    description:
      'Technology, AI and business news from TradeAura Insights — automated coverage refreshed throughout the day.',
    canonical: `${site.origin}/news/index.html`,
    current: 'news', depth: 1, body, stickyCta: false,
  });
};
