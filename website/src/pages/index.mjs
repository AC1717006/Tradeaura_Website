import { Layout } from '../lib/layout.mjs';
import {
  Hero, ProductPeek, SectionHeader, ServiceCard, SolutionCard,
  WhyCard, ProcessStep, ProjectCard, CTASection, Button, esc,
} from '../lib/components.mjs';
import { site } from '../data/site.mjs';

export const build = () => {
  const body = `
${Hero({
  eyebrow: 'Technology · Automation · AI · Software',
  title: 'Build smarter.<br>Automate faster.<br>Scale further.',
  body:
    'TradeAura builds websites, mobile apps, custom software and AI-powered automation systems that help businesses work smarter and grow faster.',
  primary: { label: 'Book a Free Consultation', href: 'pages/contact.html' },
  secondary: { label: 'Explore Our Services', href: 'pages/services.html' },
  note: 'Fixed scope · Fixed timeline · You own the code',
  peek: ProductPeek(),
})}

<section class="ta-section ta-section--ground ta-section--tight">
  <div class="ta-container" style="display:flex;align-items:center;gap:44px;flex-wrap:wrap">
    <span class="ta-eyebrow" style="flex-shrink:0">Built for teams in</span>
    <div style="display:flex;gap:32px;flex-wrap:wrap;flex:1">
      ${site.industries.slice(0, 5).map((i) => `<span style="font-family:var(--ta-font-display);font-weight:600;font-size:15px;color:var(--ta-ink-4)">${esc(i.title)}</span>`).join('')}
    </div>
  </div>
</section>

<section class="ta-section">
  <div class="ta-container">
    ${SectionHeader({
      eyebrow: 'What we build',
      title: 'Six services. One technology partner.',
      aside: 'Start with the process that costs you the most time. Each service is scoped, priced and proved on its own.',
    })}
    <div class="ta-grid ta-grid--3" style="margin-top:38px">
      ${site.services.map((s) => ServiceCard({ ...s, href: `pages/solutions.html#${s.key}` })).join('')}
    </div>
  </div>
</section>

<section class="ta-section ta-section--ground">
  <div class="ta-container">
    ${SectionHeader({
      eyebrow: 'Why TradeAura',
      title: 'The difference is what happens after launch.',
      body: 'Plenty of agencies can build an automation. Fewer build one that is still running, observable and extendable a year later.',
    })}
    <div class="ta-grid ta-grid--3" style="margin-top:38px">
      ${site.why.map(WhyCard).join('')}
    </div>
  </div>
</section>

<section class="ta-section">
  <div class="ta-container">
    ${SectionHeader({
      eyebrow: 'How we work',
      title: 'Four steps, no open-ended retainer.',
      body: 'Scope is fixed before anything is built, and the automation runs alongside your manual process until it proves itself.',
    })}
    <div class="ta-process" style="margin-top:38px">
      ${site.process.map(ProcessStep).join('')}
    </div>
  </div>
</section>

<section class="ta-section ta-section--ground">
  <div class="ta-container">
    ${SectionHeader({
      eyebrow: 'Solutions',
      title: 'Where automation earns its place.',
      aside: 'Each of these is a system we build and operate, not a slide in a deck.',
    })}
    <div class="ta-grid ta-grid--2" style="margin-top:38px">
      ${site.solutions.slice(0, 4).map((s) => SolutionCard({ ...s, points: s.points.slice(0, 3) })).join('')}
    </div>
    <div style="margin-top:24px">${Button({ label: 'See all solutions', href: 'pages/solutions.html', variant: 'secondary', iconName: 'arrow', trailing: true })}</div>
  </div>
</section>

<section class="ta-section">
  <div class="ta-container">
    ${SectionHeader({
      eyebrow: 'Selected work',
      title: 'Systems running in production.',
      aside: 'The three below run live today. Client case studies are being prepared for publication.',
    })}
    <div class="ta-grid ta-grid--3" style="margin-top:38px">
      ${site.projects.slice(0, 3).map(ProjectCard).join('')}
    </div>
    <div style="margin-top:24px">${Button({ label: 'View all projects', href: 'pages/projects.html', variant: 'secondary', iconName: 'arrow', trailing: true })}</div>
  </div>
</section>

${CTASection({
  title: 'Tell us the one process that wastes the most time.',
  body:
    'A 30-minute call. We will tell you honestly whether it is worth automating — and roughly what it would cost.',
  primary: { label: 'Book a Free Demo', href: 'pages/contact.html' },
  secondary: `or WhatsApp ${site.contact.phoneDisplay}`,
})}
`;

  return Layout({
    title: 'TradeAura — Web, Mobile, Software & AI Automation Development',
    description:
      'TradeAura builds websites, mobile apps, custom software and AI-powered automation systems. Website development, mobile apps, AI automation, WhatsApp automation and CRM & business automation.',
    canonical: `${site.origin}/`,
    current: 'home',
    depth: 0,
    trustStrip: {
      eyebrow: 'Technology • Automation • AI • Software',
      items: [
        { iconName: 'web',      label: 'Web Development' },
        { iconName: 'mobile',   label: 'Mobile App Development' },
        { iconName: 'ai',       label: 'AI & Automation' },
        { iconName: 'crm',      label: 'CRM & Business Software' },
        { iconName: 'whatsapp', label: 'WhatsApp Automation' },
      ],
    },
    body,
  });
};
