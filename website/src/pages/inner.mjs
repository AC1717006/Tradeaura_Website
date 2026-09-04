/* All inner marketing pages. Every one preserves its existing URL. */
import { Layout } from '../lib/layout.mjs';
import {
  SectionHeader, ServiceCard, SolutionCard, IndustryCard, WhyCard,
  ProcessStep, ProjectCard, CTASection, Button, Badge, esc,
} from '../lib/components.mjs';
import { icon } from '../lib/icons.mjs';
import { site } from '../data/site.mjs';

const O = site.origin;

const PageHead = ({ eyebrow, title, body }) => `
<section class="ta-section ta-section--tight" style="padding-bottom:0">
  <div class="ta-container">
    <div class="ta-sechead" style="max-width:56ch">
      <span class="ta-eyebrow">${esc(eyebrow)}</span>
      <h1 style="font-size:clamp(32px,4.4vw,46px);font-weight:700;line-height:1.08">${esc(title)}</h1>
      <p style="font-size:17px;color:var(--ta-ink-2)">${esc(body)}</p>
    </div>
  </div>
</section>`;

const closing = CTASection({
  title: 'Tell us the one process that wastes the most time.',
  body: 'A 30-minute call. We will tell you honestly whether it is worth automating — and roughly what it would cost.',
  primary: { label: 'Book a Free Demo', href: '../pages/contact.html' },
  secondary: `or WhatsApp ${site.contact.phoneDisplay}`,
});

/* ── /pages/solutions.html — NEW ───────────────────────────── */
export const solutions = () =>
  Layout({
    title: 'Solutions | TradeAura Automation',
    description: 'WhatsApp automation, CRM and lead management, AI agents, business intelligence, custom SaaS and web & mobile platforms — built and operated by TradeAura.',
    canonical: `${O}/pages/solutions.html`,
    current: 'solutions', depth: 1,
    body: `
${PageHead({ eyebrow: 'Solutions', title: 'Where automation earns its place.', body: 'Six systems we build and run in production. Each one replaces a process a person is doing by hand today.' })}
<section class="ta-section">
  <div class="ta-container">
    <div class="ta-grid ta-grid--2">
      ${site.solutions.map((s) => `<div id="${s.id}" style="scroll-margin-top:90px">${SolutionCard(s)}</div>`).join('')}
    </div>
  </div>
</section>
${closing}`,
  });

/* ── /pages/services.html — EXISTING URL ───────────────────── */
export const services = () =>
  Layout({
    title: 'Services | TradeAura Automation',
    description: 'Website development, mobile app development, custom software, AI automation, WhatsApp automation, CRM & business automation and the GYM Dashboard for gym owners.',
    canonical: `${O}/pages/services.html`,
    current: 'services', depth: 1,
    body: `
${PageHead({ eyebrow: 'Services', title: 'Seven services. One operating layer.', body: 'Start with the process that hurts most. We scope it, build it and prove it before moving to the next one.' })}
<section class="ta-section">
  <div class="ta-container">
    <div class="ta-grid ta-grid--3">
      ${site.services.map((s) => ServiceCard({ ...s, href: s.href || `solutions.html#${s.key}` })).join('')}
    </div>
  </div>
</section>
<section class="ta-section ta-section--ground">
  <div class="ta-container">
    ${SectionHeader({ eyebrow: 'How we work', title: 'Four steps, no open-ended retainer.' })}
    <div class="ta-process" style="margin-top:38px">${site.process.map(ProcessStep).join('')}</div>
  </div>
</section>
${closing}`,
  });

/* ── /pages/projects.html — NEW ────────────────────────────── */
export const projects = () =>
  Layout({
    title: 'Projects | TradeAura Automation',
    description: 'Software, automation and AI systems TradeAura runs in production — publishing platforms, content automation and integration work.',
    canonical: `${O}/pages/projects.html`,
    current: 'projects', depth: 1,
    body: `
${PageHead({ eyebrow: 'Selected work', title: 'Systems running in production.', body: 'Systems we build, run and monitor. Each of the three below is live today and verifiable from this site.' })}
<section class="ta-section">
  <div class="ta-container">
    <div class="ta-grid ta-grid--3">${site.projects.map(ProjectCard).join('')}</div>
  </div>
</section>
${closing}`,
  });

/* ── /pages/industries.html — EXISTING URL ─────────────────── */
export const industries = () =>
  Layout({
    title: 'Industries | TradeAura Automation',
    description: 'Automation for travel, real estate, healthcare, education, financial services, logistics, retail and manufacturing.',
    canonical: `${O}/pages/industries.html`,
    current: 'industries', depth: 1,
    body: `
${PageHead({ eyebrow: 'Industries', title: 'The process differs. The problem does not.', body: 'Every business we work with has the same shape of problem: a high-volume process running on someone’s attention. Only the vocabulary changes.' })}
<section class="ta-section">
  <div class="ta-container">
    <div class="ta-grid ta-grid--2">${site.industries.map(IndustryCard).join('')}</div>
  </div>
</section>
${closing}`,
  });

/* ── /pages/about.html — EXISTING URL ──────────────────────── */
export const about = () =>
  Layout({
    title: 'About | TradeAura Automation',
    description: 'TradeAura is an automation, AI and software company building systems that replace manual operational work for Indian businesses.',
    canonical: `${O}/pages/about.html`,
    current: 'about', depth: 1,
    body: `
${PageHead({ eyebrow: 'About', title: 'An automation, AI and software company.', body: 'We build the systems that sit underneath a business — the ones that answer enquiries, chase leads, move data between tools and produce the numbers you run on.' })}
<section class="ta-section">
  <div class="ta-container">
    <div class="ta-split ta-split--about">
      <div style="display:flex;flex-direction:column;gap:18px">
        <h2 style="font-size:26px;font-weight:700">What we actually do</h2>
        <p style="font-size:15.5px;color:var(--ta-ink-2)">Most companies do not have a software problem. They have a process running on a person — a sales executive re-typing enquiries, an operations lead assembling a report every Monday, a founder answering WhatsApp at midnight.</p>
        <p style="font-size:15.5px;color:var(--ta-ink-2)">We replace those processes with systems. Not by selling licences for someone else’s platform, but by building software that fits the operation as it actually runs, on infrastructure you control, with code you own.</p>
        <p style="font-size:15.5px;color:var(--ta-ink-2)">The work spans three areas that overlap more than they look: automation of existing workflows, AI applied narrowly where it beats a person, and custom software when nothing off the shelf fits.</p>
        <h2 style="font-size:26px;font-weight:700;margin-top:14px">How we engage</h2>
        <p style="font-size:15.5px;color:var(--ta-ink-2)">Fixed scope, written down before anything is built. The automation runs in parallel with your manual process until it is measurably better. If it is not, we fix it or we stop — you should not be paying a retainer for something that has not proved itself.</p>
      </div>
      <div style="display:flex;flex-direction:column;gap:14px">
        ${site.why.slice(0, 4).map(WhyCard).join('')}
      </div>
    </div>
  </div>
</section>
<section class="ta-section ta-section--ground">
  <div class="ta-container">
    ${SectionHeader({ eyebrow: 'How we work', title: 'Discover, design, automate, scale.' })}
    <div class="ta-process" style="margin-top:38px">${site.process.map(ProcessStep).join('')}</div>
  </div>
</section>
${closing}`,
  });

/* ── /pages/compare.html — EXISTING URL (pricing) ──────────── */
export const compare = () => {
  const tier = (name, price, note, points, featured) => `
    <div class="ta-card" style="padding:26px;display:flex;flex-direction:column;gap:14px;${featured ? 'border-color:var(--ta-accent-line);box-shadow:var(--ta-shadow)' : ''}">
      ${featured ? Badge({ label: 'Most chosen', variant: 'accent' }) : Badge({ label: name, variant: 'neutral' })}
      <div>
        <div style="font-family:var(--ta-font-display);font-size:15px;font-weight:600">${esc(name)}</div>
        <div style="font-family:var(--ta-font-display);font-size:30px;font-weight:700;letter-spacing:-.03em;margin-top:6px">${esc(price)}</div>
        <div class="ta-mono" style="font-size:11.5px;color:var(--ta-ink-4);margin-top:2px">${esc(note)}</div>
      </div>
      <ul style="margin:0;padding:0;list-style:none;display:flex;flex-direction:column;gap:9px">
        ${points.map((p) => `<li style="display:flex;gap:9px;font-size:13.5px;color:var(--ta-ink-2)"><span style="width:15px;height:15px;flex-shrink:0;color:var(--ta-ok);margin-top:3px">${icon('check')}</span>${esc(p)}</li>`).join('')}
      </ul>
      <div style="margin-top:auto;padding-top:8px">${Button({ label: 'Book a demo', href: 'contact.html', variant: featured ? 'primary' : 'secondary' })}</div>
    </div>`;
  return Layout({
    title: 'Pricing | TradeAura Automation',
    description: 'Engagement models for TradeAura automation projects — scoped builds, ongoing operation and custom software.',
    canonical: `${O}/pages/compare.html`,
    current: '', depth: 1,
    body: `
${PageHead({ eyebrow: 'Pricing', title: 'Scoped work, priced before it starts.', body: 'Every engagement is quoted against a written scope. The figures below are indicative starting points — the real number comes out of the discovery call.' })}
<section class="ta-section">
  <div class="ta-container">
    <div class="ta-grid ta-grid--3">
      ${tier('Starter', 'Talk to us', 'One process, fixed scope', ['One automation, built and handed over', 'Documentation and team training', '30 days of post-launch support', 'Client portal access'], false)}
      ${tier('Growth', 'Talk to us', 'Multiple processes, ongoing', ['Up to four services running', 'Monitoring and monthly reporting', 'Priority support', 'Quarterly extension work'], true)}
      ${tier('Enterprise', 'Talk to us', 'Custom SaaS and integration', ['Custom application development', 'Dedicated infrastructure', 'SLA-backed support', 'On-site discovery'], false)}
    </div>
  </div>
</section>
${closing}`,
  });
};

/* ── /pages/join.html — EXISTING URL (careers) ─────────────── */
export const join = () =>
  Layout({
    title: 'Careers | TradeAura Automation',
    description: 'Work at TradeAura — automation, AI and software engineering roles.',
    canonical: `${O}/pages/join.html`,
    current: '', depth: 1,
    body: `
${PageHead({ eyebrow: 'Careers', title: 'Build systems that replace busywork.', body: 'We are a small team. That means the person who designs a system is the person who ships it and the person who answers for it when it breaks.' })}
<section class="ta-section">
  <div class="ta-container">
    <div class="ta-card" style="padding:32px;text-align:center;display:flex;flex-direction:column;align-items:center;gap:12px;border-style:dashed;background:var(--ta-surface-2)">
      <span class="ta-icon-tile">${icon('crm')}</span>
      <h2 style="font-size:20px;font-weight:600">No open roles right now</h2>
      <p style="font-size:14px;color:var(--ta-ink-3);max-width:44ch">We are not actively hiring, but we read every message. If you build automation, data or AI systems, tell us what you have shipped.</p>
      <div style="margin-top:8px">${Button({ label: 'Get in touch', href: 'contact.html', variant: 'primary' })}</div>
      <p class="ta-mono" style="font-size:11px;color:var(--ta-ink-4);margin-top:6px">Replace this with live openings when hiring resumes.</p>
    </div>
  </div>
</section>
${closing}`,
  });

/* ── /pages/contact.html — EXISTING URL ────────────────────────
   Posts to the SAME Google Apps Script endpoint the current
   contact form uses. No new production API introduced.
   ─────────────────────────────────────────────────────────── */
export const contact = ({ webhook, staging = false }) =>
  Layout({
    title: 'Contact & Book a Demo | TradeAura Automation',
    description: 'Book a free 30-minute automation demo with TradeAura, or send us the process that is wasting the most time.',
    canonical: `${O}/pages/contact.html`,
    current: 'contact', depth: 1,
    stickyCta: false,
    body: `
${PageHead({ eyebrow: 'Contact', title: 'Book a free demo.', body: 'Tell us the one process that wastes the most time. Thirty minutes, no obligation, and an honest answer on whether it is worth automating.' })}
<section class="ta-section">
  <div class="ta-container">
    <div class="ta-split ta-split--contact">
      <div class="ta-card" style="padding:30px">
${staging ? `        <div class="ta-card" style="padding:16px 18px;margin-bottom:22px;border-left:3px solid var(--ta-warn);background:var(--ta-warn-soft);border-color:var(--ta-warn-line);box-shadow:none">
          <p style="font-size:13.5px;color:var(--ta-ink)"><strong>Contact form is disabled on staging.</strong> Nothing is sent. On the live site this form reaches the TradeAura team.</p>
        </div>
` : ''}        <form class="ta-form" id="taContactForm" method="POST"${staging ? ' data-ta-staging="1"' : ` action="${webhook}"`} novalidate>
          <div class="ta-field"><label for="ownerName">Name</label><input id="ownerName" name="ownerName" type="text" autocomplete="name" required></div>
          <div class="ta-field"><label for="businessName">Company</label><input id="businessName" name="businessName" type="text" autocomplete="organization" required></div>
          <div class="ta-field"><label for="email">Email</label><input id="email" name="email" type="email" autocomplete="email" required></div>
          <div class="ta-field"><label for="mobile">Phone</label><input id="mobile" name="mobile" type="tel" autocomplete="tel" inputmode="tel" required></div>
          <div class="ta-field ta-field--full">
            <label for="businessType">Service you are interested in</label>
            <select id="businessType" name="businessType" required>
              <option value="">Select a service</option>
              ${site.services.map((s) => `<option value="${esc(s.title)}">${esc(s.title)}</option>`).join('')}
              <option value="Not sure yet">Not sure yet</option>
            </select>
          </div>
          <div class="ta-field ta-field--full">
            <label for="requirements">Message</label>
            <textarea id="requirements" name="requirements" placeholder="Which process wastes the most time today?" required></textarea>
          </div>
          <input type="hidden" name="painPoints" value="">
          <input type="hidden" name="city" value="">
          <input type="hidden" name="state" value="">
          <input type="hidden" name="consent" value="yes">
          <div class="ta-field ta-field--full" style="gap:12px">
            <div style="display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap">
              <span class="ta-field__hint">${staging ? 'Staging environment — submissions are blocked.' : 'We reply within one working day. We never share your details.'}</span>
              <button class="ta-btn ta-btn--primary ta-btn--lg" type="submit" id="taSubmit"${staging ? ' disabled aria-disabled="true" style="opacity:.55;cursor:not-allowed"' : ''}>${staging ? 'Disabled on staging' : 'Book a Free Demo'}</button>
            </div>
            <p id="taFormMsg" role="status" aria-live="polite" style="font-size:13.5px;margin:0"></p>
          </div>
        </form>
      </div>
      <div style="display:flex;flex-direction:column;gap:14px">
        <div class="ta-card" style="padding:22px;display:flex;flex-direction:column;gap:14px">
          <h3 style="font-size:16px;font-weight:600">Reach us directly</h3>
          <a href="https://wa.me/${site.contact.whatsapp}" style="display:flex;align-items:center;gap:11px;font-size:14px;color:var(--ta-ink-2)"><span class="ta-icon-tile" style="width:34px;height:34px">${icon('whatsapp')}</span>${esc(site.contact.phoneDisplay)}</a>
          <a href="mailto:${site.contact.email}" style="display:flex;align-items:center;gap:11px;font-size:14px;color:var(--ta-ink-2)"><span class="ta-icon-tile" style="width:34px;height:34px">${icon('mail')}</span>${esc(site.contact.email)}</a>
          <div style="display:flex;align-items:center;gap:11px;font-size:14px;color:var(--ta-ink-3)"><span class="ta-icon-tile" style="width:34px;height:34px">${icon('pin')}</span>${esc(site.contact.location)}</div>
        </div>
        <div class="ta-card" style="padding:22px;display:flex;flex-direction:column;gap:11px">
          <h3 style="font-size:16px;font-weight:600">What happens next</h3>
          ${['We reply within one working day', 'A 30-minute call to understand the process', 'A written scope with a fixed price', 'You decide — no obligation'].map((t, i) => `<div style="display:flex;gap:11px;align-items:flex-start"><span class="ta-mono" style="font-size:11px;font-weight:600;color:var(--ta-accent);background:var(--ta-accent-soft);border:1px solid var(--ta-accent-line);border-radius:5px;padding:1px 7px;flex-shrink:0">0${i + 1}</span><span style="font-size:13.5px;color:var(--ta-ink-2)">${esc(t)}</span></div>`).join('')}
        </div>
      </div>
    </div>
  </div>
</section>`,
    scripts: ['assets/js/contact.js'],
  });

/* ── /login.html — placeholder until Phase 3 ───────────────── */
export const login = () =>
  Layout({
    title: 'Login | TradeAura Automation',
    description: 'Sign in to the TradeAura client portal.',
    canonical: `${O}/login.html`,
    current: '', depth: 0, stickyCta: false,
    body: `
<section class="ta-section">
  <div class="ta-container" style="max-width:520px">
    <div class="ta-card" style="padding:36px;text-align:center;display:flex;flex-direction:column;align-items:center;gap:14px">
      <span class="ta-icon-tile" style="width:46px;height:46px">${icon('shield')}</span>
      <h1 style="font-size:26px;font-weight:700">Client portal coming soon</h1>
      <p style="font-size:14.5px;color:var(--ta-ink-3);max-width:42ch">The TradeAura client portal is in development. Existing clients can reach us directly in the meantime.</p>
      <div style="display:flex;gap:10px;margin-top:8px;flex-wrap:wrap;justify-content:center">
        ${Button({ label: 'Contact us', href: 'pages/contact.html', variant: 'primary' })}
        ${Button({ label: 'Back to home', href: 'index.html', variant: 'secondary' })}
      </div>
      <p class="ta-mono" style="font-size:11px;color:var(--ta-ink-4);margin-top:8px">Authentication is unchanged in this phase — nothing was wired up.</p>
    </div>
  </div>
</section>`,
  });

/* ── Legal stubs ───────────────────────────────────────────── */
const legal = (slug, title, intro) =>
  Layout({
    title: `${title} | TradeAura Automation`,
    description: `${title} for TradeAura Automation.`,
    canonical: `${O}/legal/${slug}.html`,
    current: '', depth: 1, stickyCta: false,
    body: `
<section class="ta-section">
  <div class="ta-container" style="max-width:760px">
    <h1 style="font-size:34px;font-weight:700;margin-bottom:16px">${esc(title)}</h1>
    <p style="font-size:15.5px;color:var(--ta-ink-2)">${esc(intro)}</p>
    <div class="ta-card" style="margin-top:26px;padding:18px 22px;border-left:3px solid var(--ta-warn);background:var(--ta-warn-soft);border-color:var(--ta-warn-line)">
      <p style="font-size:13.5px;color:var(--ta-ink-2)"><strong style="color:var(--ta-ink)">Placeholder.</strong> This page needs real legal copy before launch. No terms have been invented.</p>
    </div>
  </div>
</section>`,
  });

export const privacy = () => legal('privacy', 'Privacy Policy', 'How TradeAura Automation collects, uses and protects your information.');
export const terms = () => legal('terms', 'Terms of Service', 'The terms under which TradeAura Automation provides its services.');

/* ── /pages/gym-dashboard.html — GYM Dashboard product page ── */
export const gymDashboard = () => {
  const faq = [
    ['Is the 3-month demo really free?', 'Yes. Gym owners get the full dashboard free for 3 months — members, plans, barcodes, attendance and WhatsApp reminders. No card required. Near the end of the demo we discuss a plan that fits your gym.'],
    ['Do I need any hardware?', 'No. Any phone, tablet or computer with a browser works. A basic USB barcode scanner (₹800–1,500) makes reception faster, but the camera on your phone can scan member cards too.'],
    ['How do WhatsApp reminders work?', 'The system watches every membership expiry date and automatically sends reminders on the official WhatsApp Business API — for example 7, 3 and 1 day before expiry. You choose the schedule and can switch each reminder on or off.'],
    ['Can I bring my existing members from Excel?', 'Yes. During onboarding the TradeAura team helps you load your current member list so you start with everything in place.'],
    ['Is my member data safe?', 'Each gym’s data is fully isolated — no other gym can ever see your members. Access is password-protected with staff roles, and every important change is logged.'],
    ['What happens after the demo ends?', 'Nothing is deleted. Your dashboard shows the demo status the whole time, and before it ends we agree a simple subscription. If you don’t continue, your data stays safe and exportable.'],
  ];
  const feat = (iconName, title, body) => WhyCard({ iconName, title, body });
  return Layout({
    title: 'GYM Dashboard — Gym Management Software | TradeAura',
    description: 'Gym management dashboard for Indian gym owners: members, membership plans, barcode entry, attendance and automatic WhatsApp reminders before memberships expire. 3-month free demo.',
    canonical: `${O}/pages/gym-dashboard.html`,
    current: 'services', depth: 1,
    headExtra: `
  <title>GYM Dashboard — Gym Management Software | TradeAura</title>
  <meta name="description" content="Gym management dashboard for gym owners: members, membership plans, barcode entry, attendance tracking and automatic WhatsApp reminders before memberships expire. Start a 3-month free demo.">
  <link rel="canonical" href="${O}/pages/gym-dashboard.html">
  <meta property="og:type" content="website">
  <meta property="og:title" content="TradeAura GYM Dashboard — Run Your Gym. Not Your Register.">
  <meta property="og:description" content="Members, memberships, barcode entry and automatic WhatsApp expiry reminders in one dashboard. 3 months free for gym owners.">
  <meta property="og:site_name" content="TradeAura">
  <meta property="og:locale" content="en_IN">
  <meta property="og:url" content="${O}/pages/gym-dashboard.html">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="TradeAura GYM Dashboard">
  <meta name="twitter:description" content="Your gym memberships, fully automated. 3-month free demo.">
  <script type="application/ld+json">{"@context":"https://schema.org","@type":"SoftwareApplication","name":"TradeAura GYM Dashboard","applicationCategory":"BusinessApplication","operatingSystem":"Web","description":"Gym management software: members, membership plans, attendance, barcode entry and automated WhatsApp expiry reminders.","offers":{"@type":"Offer","price":"0","priceCurrency":"INR","description":"3-month free demo for gym owners"}}</script>`,
    scripts: ['assets/js/gym-apply.js'],
    body: `
<section class="ta-section ta-section--tight" data-gym-landing>
  <div class="ta-container">
    <div class="ta-sechead" style="max-width:60ch">
      <span class="ta-eyebrow">GYM Dashboard · Gym Management &amp; Automation</span>
      <h1 style="font-size:clamp(34px,4.8vw,52px);font-weight:700;line-height:1.06">Run your gym.<br>Not your register.</h1>
      <p style="font-size:18px;color:var(--ta-ink-2)">Track members, memberships and attendance from one smart dashboard — with automatic WhatsApp reminders before memberships expire. Apne gym ke members, memberships aur attendance ko ek hi dashboard se manage karein.</p>
      <div style="display:flex;gap:12px;flex-wrap:wrap;margin-top:8px">
        ${Button({ label: 'Start 3-Month Free Demo', href: '#gym-demo-form', variant: 'primary', size: 'lg' })}
        ${Button({ label: 'See how it works', href: '#gym-how', variant: 'ghost', size: 'lg' })}
      </div>
      <p class="ta-mono" style="font-size:11.5px;color:var(--ta-ink-3)">3 MONTHS FREE · No card required · Setup help included</p>
    </div>
  </div>
</section>

<section class="ta-section">
  <div class="ta-container">
    ${SectionHeader({ eyebrow: 'The problem', title: 'Registers forget. Excel doesn’t follow up.', body: 'Expired memberships slip through, renewals depend on someone remembering, and nobody knows who actually came in today. Every missed renewal is money already earned — walking out.' })}
    <div class="ta-grid ta-grid--3" style="margin-top:38px">
      ${feat('gym', 'Members & memberships', 'Every member in one place with plan, dates, payments and status — Active, Expiring Soon or Expired at a glance. Create any plan: monthly, quarterly, student, couple, personal training, custom days.')}
      ${feat('scale', 'Barcode entry', 'Every member gets a unique barcode. Print the member card, scan at reception, and entry plus attendance is recorded in one second — green for allowed, red for expired.')}
      ${feat('whatsapp', 'WhatsApp reminders', 'The system messages members automatically before their membership expires — 7, 3 and 1 day before, on the official WhatsApp Business API. Renewals happen before the lapse, not after.')}
      ${feat('chart', 'Live dashboard', 'Total members, today’s check-ins, expiring memberships and revenue — the numbers a gym owner actually checks, updated live.')}
      ${feat('shield', 'Your data, isolated', 'Each gym’s data is completely separate, access is password-protected with staff roles, and every important change is logged.')}
      ${feat('layers', 'Reports & exports', 'Member lists, expiring memberships, attendance and plan-wise reports — downloadable as CSV whenever you need them.')}
    </div>
  </div>
</section>

<section class="ta-section ta-section--ground" id="gym-how">
  <div class="ta-container">
    ${SectionHeader({ eyebrow: 'How it works', title: 'From register to dashboard in a day.' })}
    <div class="ta-process" style="margin-top:38px">
      ${ProcessStep({ n: '01', title: 'Apply for the demo', body: 'Fill the form below. The TradeAura team calls you, understands your gym and switches on your dashboard.' })}
      ${ProcessStep({ n: '02', title: 'Add plans & members', body: 'Create your membership plans — any duration, any price — and add members. We help you bring your existing list across.' })}
      ${ProcessStep({ n: '03', title: 'Print member cards', body: 'Every member gets a unique barcode and a printable member card with your gym’s name on it.' })}
      ${ProcessStep({ n: '04', title: 'Scan & relax', body: 'Reception scans the card — entry recorded, expiry checked, attendance counted. WhatsApp reminders go out automatically.' })}
    </div>
  </div>
</section>

<section class="ta-section" id="gym-demo-form">
  <div class="ta-container">
    <div class="ta-grid" style="grid-template-columns:minmax(0,5fr) minmax(0,7fr);gap:48px;align-items:start">
      <div class="ta-sechead">
        <span class="ta-eyebrow">3 months free</span>
        <h2>Start your free demo</h2>
        <p>Tell us about your gym. The TradeAura team will contact you, set up your dashboard and help you add your first members. Membership khatam hone se pehle WhatsApp reminder — automatically.</p>
        <p class="ta-mono" style="font-size:11.5px;color:var(--ta-ink-3)">Application reviewed within 1 working day.</p>
      </div>
      <div>
        <form class="ta-form" id="taGymForm" novalidate>
          <div class="ta-field"><label for="gOwner">Your name</label><input id="gOwner" name="ownerName" type="text" autocomplete="name" required></div>
          <div class="ta-field"><label for="gGym">Gym name</label><input id="gGym" name="gymName" type="text" autocomplete="organization" required></div>
          <div class="ta-field"><label for="gPhone">Mobile number</label><input id="gPhone" name="phone" type="tel" inputmode="tel" autocomplete="tel" required></div>
          <div class="ta-field"><label for="gWa">WhatsApp number <span class="ta-field__hint">(if different)</span></label><input id="gWa" name="whatsapp" type="tel" inputmode="tel"></div>
          <div class="ta-field"><label for="gEmail">Email <span class="ta-field__hint">(optional)</span></label><input id="gEmail" name="email" type="email" autocomplete="email"></div>
          <div class="ta-field"><label for="gCity">City</label><input id="gCity" name="city" type="text" autocomplete="address-level2"></div>
          <div class="ta-field"><label for="gCount">Number of members</label>
            <select id="gCount" name="memberCount"><option value="">Select…</option><option>Under 50</option><option>50–150</option><option>150–400</option><option>400–1000</option><option>1000+</option></select></div>
          <div class="ta-field"><label for="gMethod">How do you manage members today?</label>
            <select id="gMethod" name="currentMethod"><option value="">Select…</option><option>Paper register</option><option>Excel / Google Sheets</option><option>WhatsApp only</option><option>Another software</option><option>No system yet</option></select></div>
          <div class="ta-field ta-field--full"><label>Which features interest you most?</label>
            <div style="display:flex;gap:14px;flex-wrap:wrap;font-size:13.5px;color:var(--ta-ink-2)">
              <label style="display:flex;gap:6px;align-items:center"><input type="checkbox" name="feature" value="whatsapp_reminders" checked> WhatsApp reminders</label>
              <label style="display:flex;gap:6px;align-items:center"><input type="checkbox" name="feature" value="barcode"> Barcode entry</label>
              <label style="display:flex;gap:6px;align-items:center"><input type="checkbox" name="feature" value="attendance"> Attendance</label>
              <label style="display:flex;gap:6px;align-items:center"><input type="checkbox" name="feature" value="members"> Member management</label>
              <label style="display:flex;gap:6px;align-items:center"><input type="checkbox" name="feature" value="reports"> Reports</label>
            </div></div>
          <div class="ta-field"><label for="gPref">Preferred contact</label>
            <select id="gPref" name="preferredContact"><option value="whatsapp">WhatsApp</option><option value="call">Phone call</option><option value="email">Email</option></select></div>
          <div class="ta-field"><label for="gInsta">Website / Instagram <span class="ta-field__hint">(optional)</span></label><input id="gInsta" name="websiteInstagram" type="text"></div>
          <div class="ta-field ta-field--full"><label style="display:flex;gap:8px;align-items:flex-start;font-weight:400;font-size:13px;color:var(--ta-ink-2)">
            <input type="checkbox" id="gConsent" name="consent" required style="margin-top:2px">
            I agree to be contacted by TradeAura regarding the GYM Dashboard demo.</label></div>
          <div class="ta-field ta-field--full">
            <button class="ta-btn ta-btn--primary ta-btn--lg" type="submit" id="taGymSubmit">Start My Free Demo</button>
            <p id="taGymMsg" role="status" style="font-size:13.5px;margin-top:8px"></p>
          </div>
        </form>
        <div id="taGymSuccess" hidden style="border:1px solid var(--ta-line);border-radius:14px;padding:28px;background:var(--ta-surface)">
          <h3 style="margin-bottom:8px">Your 3-Month Free Demo request has been received. 🎉</h3>
          <p style="color:var(--ta-ink-2)">Application ID: <strong class="ta-mono" id="taGymAppId"></strong></p>
          <p style="color:var(--ta-ink-2);margin-top:8px">The TradeAura team will contact you within 1 working day to set up your gym dashboard.</p>
        </div>
      </div>
    </div>
  </div>
</section>

<section class="ta-section ta-section--ground">
  <div class="ta-container">
    ${SectionHeader({ eyebrow: 'FAQ', title: 'Questions gym owners ask us.' })}
    <div style="max-width:72ch;margin-top:30px;display:flex;flex-direction:column;gap:10px">
      ${faq.map(([q, a]) => `<details style="border:1px solid var(--ta-line);border-radius:10px;padding:14px 18px;background:var(--ta-surface)"><summary style="font-weight:600;cursor:pointer">${esc(q)}</summary><p style="margin-top:10px;color:var(--ta-ink-2)">${esc(a)}</p></details>`).join('')}
    </div>
  </div>
</section>

${CTASection({ title: 'Your gym. Your members. Fully automated.', body: 'Start the 3-month free demo today — the TradeAura team sets everything up with you.', primary: { label: 'Start 3-Month Free Demo', href: '#gym-demo-form' }, secondary: 'No card required · Cancel anytime' })}`,
  });
};
