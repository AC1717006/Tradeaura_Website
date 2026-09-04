/* ─────────────────────────────────────────────────────────────
   TradeAura — reusable components.
   Each returns an HTML string. No duplication in page files.
   ───────────────────────────────────────────────────────────── */
import { icon } from './icons.mjs';

export const esc = (s = '') =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/* ── Logo ─────────────────────────────────────────────────────
   THE SINGLE PLACE THE BRAND MARK IS DEFINED.

   To swap in a real logo, change ONLY the `mark` constant below to
   an <img> and drop the file in public/assets/. Everything else —
   the 32×32 box, the gap, the wordmark, the header height — is
   fixed by CSS (.ta-logo__mark), so layout does not move.

     const mark = '<img src="' + r + 'assets/logo.svg" alt="" width="32" height="32">';

   Sizing lives in .ta-logo__mark in site.css. Nothing else references
   the mark, so no page or component needs to change.
   ─────────────────────────────────────────────────────────── */
export const Logo = ({ href = 'index.html', word = 'TradeAura', size = 18, label = 'TradeAura Automation — home' }) => {
  /* TEMPORARY monogram — replace this one line with a real asset. */
  const mark = `<span class="ta-logo__mark" aria-hidden="true">TA</span>`;
  return `<a class="ta-logo" href="${href}" aria-label="${esc(label)}">${mark}<span class="ta-logo__word" style="font-size:${size}px">${esc(word)}</span></a>`;
};

/* ── Button ────────────────────────────────────────────────── */
export const Button = ({ label, href = '#', variant = 'primary', size = '', iconName = '', trailing = false }) => {
  const g = iconName ? `<span style="width:15px;height:15px;display:grid;place-items:center">${icon(iconName)}</span>` : '';
  const cls = `ta-btn ta-btn--${variant}${size === 'lg' ? ' ta-btn--lg' : ''}`;
  return `<a class="${cls}" href="${href}">${trailing ? '' : g}${esc(label)}${trailing ? g : ''}</a>`;
};

/* ── Badge ─────────────────────────────────────────────────── */
export const Badge = ({ label, variant = 'accent', pill = false }) =>
  `<span class="ta-badge ta-badge--${variant}${pill ? ' ta-badge--pill' : ''}">${esc(label)}</span>`;

/* ── SectionHeader ─────────────────────────────────────────── */
export const SectionHeader = ({ eyebrow = '', title, body = '', aside = '' }) => {
  const head = `${eyebrow ? `<span class="ta-eyebrow">${esc(eyebrow)}</span>` : ''}<h2>${esc(title)}</h2>${body ? `<p>${esc(body)}</p>` : ''}`;
  if (!aside) return `<div class="ta-sechead">${head}</div>`;
  return `<div class="ta-sechead ta-sechead--split"><div>${eyebrow ? `<span class="ta-eyebrow">${esc(eyebrow)}</span>` : ''}<h2>${esc(title)}</h2></div><p>${esc(aside)}</p></div>`;
};

/* ── ServiceCard ───────────────────────────────────────────── */
export const ServiceCard = ({ iconName, title, body, href }) => `
  <a class="ta-card ta-card--link ta-svc" href="${href}">
    <span class="ta-icon-tile">${icon(iconName)}</span>
    <h3>${esc(title)}</h3>
    <p>${esc(body)}</p>
    <span class="ta-svc__more">Learn more <span style="width:13px;height:13px;display:grid;place-items:center">${icon('arrow')}</span></span>
  </a>`;

/* ── SolutionCard ──────────────────────────────────────────── */
export const SolutionCard = ({ iconName, title, body, points = [] }) => `
  <div class="ta-card ta-sol">
    <span class="ta-icon-tile">${icon(iconName)}</span>
    <div>
      <h3>${esc(title)}</h3>
      <p>${esc(body)}</p>
      ${points.length ? `<ul>${points.map((p) => `<li>${esc(p)}</li>`).join('')}</ul>` : ''}
    </div>
  </div>`;

/* ── IndustryCard ──────────────────────────────────────────── */
export const IndustryCard = ({ iconName, title, body }) => `
  <div class="ta-card ta-ind">
    <span class="ta-icon-tile">${icon(iconName)}</span>
    <div><h3>${esc(title)}</h3><p>${esc(body)}</p></div>
  </div>`;

/* ── WhyCard ───────────────────────────────────────────────── */
export const WhyCard = ({ iconName, title, body }) => `
  <div class="ta-card ta-why">
    <span class="ta-icon-tile">${icon(iconName)}</span>
    <h3>${esc(title)}</h3>
    <p>${esc(body)}</p>
  </div>`;

/* ── ProcessStep ───────────────────────────────────────────── */
export const ProcessStep = ({ n, title, body }) => `
  <div class="ta-step">
    <div class="ta-step__head"><span class="ta-step__n">${esc(n)}</span><span class="ta-step__rule"></span></div>
    <h3>${esc(title)}</h3>
    <p>${esc(body)}</p>
  </div>`;

/* ── ProjectCard ───────────────────────────────────────────────
   `placeholder: true` renders a clearly-marked slot.
   No invented client names, metrics or testimonials.
   ─────────────────────────────────────────────────────────── */
export const ProjectCard = ({ sector, title, body, metrics = [], placeholder = false }) => `
  <div class="ta-card ta-proj${placeholder ? ' ta-placeholder' : ''}">
    <div class="ta-proj__top">
      <span class="ta-icon-tile">${icon('layers')}</span>
      ${placeholder
        ? Badge({ label: 'Content needed', variant: 'neutral' })
        : Badge({ label: sector, variant: 'accent' })}
    </div>
    <div class="ta-proj__body">
      <h3>${esc(title)}</h3>
      <p>${esc(body)}</p>
      ${metrics.length ? `<div class="ta-proj__meta">${metrics.map((m) => `<div><span>${esc(m.label)}</span><strong>${esc(m.value)}</strong></div>`).join('')}</div>` : ''}
    </div>
  </div>`;

/* ── NewsCard ──────────────────────────────────────────────── */
export const NewsCard = ({ title, summary = '', href, category = '', date = '' }) => `
  <a class="ta-card ta-card--link ta-news" href="${href}">
    ${category ? Badge({ label: category, variant: 'neutral' }) : ''}
    <h3>${esc(title)}</h3>
    ${summary ? `<p>${esc(summary)}</p>` : ''}
    <span class="ta-news__meta">${date ? esc(date) : ''}</span>
  </a>`;

/* ── CTASection ────────────────────────────────────────────── */
export const CTASection = ({ title, body, primary, secondary = '' }) => `
  <section class="ta-section ta-section--tight">
    <div class="ta-container">
      <div class="ta-cta">
        <div>
          <h2>${esc(title)}</h2>
          <p>${esc(body)}</p>
        </div>
        <div class="ta-cta__actions">
          ${Button({ label: primary.label, href: primary.href, variant: 'primary', size: 'lg' })}
          ${secondary ? `<span class="ta-mono" style="font-size:11.5px;color:var(--ta-ink-3);text-align:center">${esc(secondary)}</span>` : ''}
        </div>
      </div>
    </div>
  </section>`;

/* ── Hero ──────────────────────────────────────────────────── */
export const Hero = ({ eyebrow, title, body, primary, secondary, note = '', peek = '' }) => `
  <section class="ta-hero">
    <div class="ta-container">
      <div class="ta-hero__grid">
        <div class="ta-hero__copy">
          <span class="ta-badge ta-badge--accent ta-badge--pill">${esc(eyebrow)}</span>
          <h1>${title}</h1>
          <p class="ta-hero__sub">${esc(body)}</p>
          <div class="ta-hero__actions">
            ${Button({ label: primary.label, href: primary.href, variant: 'primary', size: 'lg' })}
            ${Button({ label: secondary.label, href: secondary.href, variant: 'secondary', size: 'lg' })}
          </div>
          ${note ? `<span class="ta-mono" style="font-size:11.5px;color:var(--ta-ink-3)">${esc(note)}</span>` : ''}
        </div>
        ${peek}
      </div>
    </div>
  </section>`;

/* ── ProductPeek — the hero's right-hand visual ────────────── */
export const ProductPeek = () => {
  const kpi = (l, v) => `<div class="ta-peek__kpi"><span>${l}</span><strong>${v}</strong></div>`;
  const row = (n, w, v) => `<div class="ta-peek__row"><b>${n}</b><span class="ta-peek__bar-fill" style="width:${w}"></span><span class="ta-mono" style="color:var(--ta-ink-3)">${v}</span></div>`;
  return `
  <div class="ta-peek" role="img" aria-label="Preview of the TradeAura client portal showing automation counts and service health">
    <div class="ta-peek__bar">
      <span class="ta-peek__dot"></span><span class="ta-peek__dot"></span><span class="ta-peek__dot"></span>
      <span class="ta-peek__url">app.auraautomation.site</span>
      <span class="ta-peek__url" style="margin-left:auto;opacity:.75">Product preview</span>
    </div>
    <div class="ta-peek__body">
      <div class="ta-peek__kpis">
        ${kpi('Services', '4')}${kpi('Automations', '8')}${kpi('Reports', '24')}
      </div>
      <div class="ta-peek__panel">
        <div class="ta-peek__row" style="border-bottom-color:var(--ta-line)">
          <b style="font-weight:600;color:var(--ta-ink)">Service health</b>
          <span class="ta-mono" style="color:var(--ta-ink-4)">30 days</span>
        </div>
        ${row('WhatsApp Automation', '78px', '98.2%')}
        ${row('CRM Automation', '82px', '99.1%')}
        ${row('AI Automation', '70px', '96.4%')}
      </div>
    </div>
  </div>`;
};

/* ── TrustStrip ───────────────────────────────────────────────
   Replaces the former market ticker. Static markup: no API call,
   no polling, no WebSocket, no JavaScript of any kind.
   ─────────────────────────────────────────────────────────── */
export const TrustStrip = ({ eyebrow, items }) => `
  <div class="ta-strip">
    <div class="ta-container ta-strip__inner">
      <span class="ta-strip__label ta-eyebrow">${esc(eyebrow)}</span>
      <div class="ta-strip__items">
        ${items
          .map(
            (i) => `<span class="ta-strip__item">
          <span class="ta-strip__icon">${icon(i.iconName)}</span>${esc(i.label)}
        </span>`
          )
          .join('')}
      </div>
    </div>
  </div>`;
