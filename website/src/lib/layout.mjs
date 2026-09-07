import { icon } from './icons.mjs';
import { esc, Button, TrustStrip, Logo } from './components.mjs';
import { ChatWidget } from './chat.mjs';
import { site } from '../data/site.mjs';

const R = (depth) => (depth === 0 ? '' : '../'.repeat(depth));

/* ── Header ────────────────────────────────────────────────── */
export const Header = ({ current = '', depth = 0 }) => {
  const r = R(depth);
  const link = (n) =>
    `<a href="${r}${n.href}"${current === n.key ? ' aria-current="page"' : ''}>${esc(n.label)}</a>`;
  return `
<header class="ta-header">
  <div class="ta-container ta-header__inner">
    ${Logo({ href: `${r}index.html` })}
    <nav class="ta-nav" aria-label="Main">${site.nav.map(link).join('')}</nav>
    <div class="ta-header__cta">
      ${Button({ label: 'Login', href: `${r}login.html`, variant: 'ghost' })}
      ${Button({ label: 'Book a Demo', href: `${r}pages/contact.html`, variant: 'primary' })}
      <button class="ta-burger" type="button" aria-label="Open menu" aria-expanded="false" data-ta-menu-open>
        <span style="width:22px;height:22px;display:grid;place-items:center;color:var(--ta-ink)">${icon('menu')}</span>
      </button>
    </div>
  </div>
</header>
<div class="ta-drawer" data-ta-drawer data-open="false">
  <div class="ta-drawer__scrim" data-ta-menu-close></div>
  <div class="ta-drawer__panel" role="dialog" aria-modal="true" aria-label="Menu">
    <button class="ta-drawer__close" type="button" aria-label="Close menu" data-ta-menu-close>
      <span style="width:22px;height:22px;display:grid;place-items:center;color:var(--ta-ink-3)">${icon('close')}</span>
    </button>
    ${site.nav.map((n) => `<a href="${r}${n.href}">${esc(n.label)}</a>`).join('')}
    <a href="${r}login.html">Login</a>
    <div style="margin-top:12px">${Button({ label: 'Book a Demo', href: `${r}pages/contact.html`, variant: 'primary' })}</div>
  </div>
</div>`;
};

/* ── Footer ────────────────────────────────────────────────── */
export const Footer = ({ depth = 0 }) => {
  const r = R(depth);
  const col = (c) =>
    `<div class="ta-footer__col"><h4>${esc(c.title)}</h4>${c.links
      .map((l) => `<a href="${l.href.startsWith('http') ? l.href : r + l.href}">${esc(l.label)}</a>`)
      .join('')}</div>`;
  const social = site.social.length
    ? `<div style="display:flex;gap:10px;margin-top:4px">${site.social
        .map(
          (s) =>
            `<a href="${s.href}" aria-label="${esc(s.label)}" rel="me noopener" target="_blank" style="width:32px;height:32px;border:1px solid var(--ta-line);border-radius:8px;display:grid;place-items:center;color:var(--ta-ink-3)"><span style="width:16px;height:16px;display:grid;place-items:center">${icon(s.icon)}</span></a>`
        )
        .join('')}</div>`
    : '';
  return `
<footer class="ta-footer">
  <div class="ta-container">
    <div class="ta-footer__grid">
      <div class="ta-footer__brand">
        ${Logo({ href: `${r}index.html`, word: 'TradeAura Automation', size: 16, label: 'TradeAura Automation' })}
        <p>${esc(site.tagline)}</p>
        <div style="display:flex;flex-direction:column;gap:6px;margin-top:4px">
          <a href="mailto:${site.contact.email}" style="font-size:13.5px;color:var(--ta-ink-2);display:inline-flex;align-items:center;gap:8px"><span style="width:15px;height:15px;display:grid;place-items:center;color:var(--ta-ink-4)">${icon('mail')}</span>${esc(site.contact.email)}</a>
          <a href="https://wa.me/${site.contact.whatsapp}" style="font-size:13.5px;color:var(--ta-ink-2);display:inline-flex;align-items:center;gap:8px"><span style="width:15px;height:15px;display:grid;place-items:center;color:var(--ta-ink-4)">${icon('phone')}</span>${esc(site.contact.phoneDisplay)}</a>
          <span style="font-size:13.5px;color:var(--ta-ink-3);display:inline-flex;align-items:center;gap:8px"><span style="width:15px;height:15px;display:grid;place-items:center;color:var(--ta-ink-4)">${icon('pin')}</span>${esc(site.contact.location)}</span>
        </div>
        ${social}
      </div>
      ${site.footer.map(col).join('')}
    </div>
    <div class="ta-footer__base">
      <span>© ${site.year} ${esc(site.legalName)}</span>
      <span><a href="${r}legal/privacy.html">Privacy</a> · <a href="${r}legal/terms.html">Terms</a> · <a href="https://api.auraautomation.site/admin/login">Admin Login</a></span>
    </div>
  </div>
</footer>`;
};

/* ── Layout ───────────────────────────────────────────────────
   `head` accepts pre-built metadata (used verbatim for news pages
   so existing SEO tags survive the re-theme untouched).
   ─────────────────────────────────────────────────────────── */
export const Layout = ({
  title,
  description = '',
  canonical = '',
  current = '',
  depth = 0,
  body,
  headExtra = '',
  trustStrip = null,
  scripts = [],
  stickyCta = true,
  chat = site.chat && site.chat.enabled,
  analytics = site.analytics && site.analytics.enabled,
}) => {
  const r = R(depth);
  const meta = headExtra
    ? headExtra
    : `
  <title>${esc(title)}</title>
  <meta name="description" content="${esc(description)}">
  ${canonical ? `<link rel="canonical" href="${canonical}">` : ''}
  <meta property="og:type" content="website">
  <meta property="og:title" content="${esc(title)}">
  <meta property="og:description" content="${esc(description)}">
  <meta property="og:site_name" content="TradeAura">
  <meta property="og:locale" content="en_IN">
  ${canonical ? `<meta property="og:url" content="${canonical}">` : ''}
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${esc(title)}">
  <meta name="twitter:description" content="${esc(description)}">`;

  return `<!doctype html>
<html lang="en-IN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
${meta}
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Outfit:wght@500;600;700;800&family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500;600&display=swap">
<link rel="stylesheet" href="${r}assets/css/tokens.css">
<link rel="stylesheet" href="${r}assets/css/site.css">
<link rel="stylesheet" href="${r}assets/css/intl-phone-input.css">${chat ? `\n<link rel="stylesheet" href="${r}assets/css/chat.css">` : ''}
<link rel="icon" href="${r}assets/favicon.svg" type="image/svg+xml">${analytics ? `\n<meta name="ta-analytics" content="${esc(site.analytics.endpoint)}">` : ''}
</head>
<body>
${Header({ current, depth })}
${trustStrip ? TrustStrip(trustStrip) : ''}
<main id="main">
${body}
</main>
${Footer({ depth })}
${stickyCta ? `<div class="ta-sticky-cta">${Button({ label: 'Book a Free Demo', href: `${r}pages/contact.html`, variant: 'primary' })}</div>` : ''}
${chat ? ChatWidget({ apiBase: site.chat.apiBase, quickActions: site.chat.quickActions, whatsapp: site.contact.whatsapp }) + '\n' : ''}<script src="${r}assets/js/site.js" defer></script>${analytics ? `\n<script src="${r}assets/js/ta-analytics.js" defer></script>` : ''}${chat ? `\n<script src="${r}assets/js/chat.js" defer></script>` : ''}
${scripts.map((s) => `<script src="${r}${s}" defer></script>`).join('\n')}
</body>
</html>`;
};
