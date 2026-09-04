/* ─────────────────────────────────────────────────────────────
   Site content. Facts are drawn from the existing site and repo.
   Anything not verifiable is marked as a placeholder, never invented.
   ───────────────────────────────────────────────────────────── */

export const site = {
  name: 'TradeAura',
  legalName: 'TradeAura Automation',
  year: 2026,
  origin: 'https://www.auraautomation.site',
  tagline:
    'AI and business automation for Indian companies that would rather grow than hire.',

  /* Verified against the existing site — nothing here is invented.
     email:    appears 14× in the current pages
     whatsapp: appears 15× as wa.me/919587402524
     No postal address exists anywhere in the repo, so none is shown. */
  contact: {
    email: 'helloajaychouhan@gmail.com',
    whatsapp: '919587402524',
    phoneDisplay: '+91 95874 02524',
    location: 'India',
  },

  /* The current site links to no social profiles. Rather than invent
     one, this stays empty and the footer renders no social row.
     Add entries here when real profile URLs are supplied. */
  social: [],

  nav: [
    { key: 'home', label: 'Home', href: 'index.html' },
    { key: 'solutions', label: 'Solutions', href: 'pages/solutions.html' },
    { key: 'services', label: 'Services', href: 'pages/services.html' },
    { key: 'projects', label: 'Projects', href: 'pages/projects.html' },
    { key: 'industries', label: 'Industries', href: 'pages/industries.html' },
    { key: 'about', label: 'About', href: 'pages/about.html' },
    { key: 'news', label: 'News', href: 'news/index.html' },
    { key: 'contact', label: 'Contact', href: 'pages/contact.html' },
  ],

  footer: [
    {
      title: 'Solutions',
      links: [
        { label: 'WhatsApp Automation', href: 'pages/solutions.html#whatsapp' },
        { label: 'CRM & Lead Management', href: 'pages/solutions.html#crm' },
        { label: 'AI Agents & Automation', href: 'pages/solutions.html#ai' },
        { label: 'Business Intelligence', href: 'pages/solutions.html#bi' },
        { label: 'Custom SaaS', href: 'pages/solutions.html#saas' },
        { label: 'Web & Mobile Platforms', href: 'pages/solutions.html#platforms' },
      ],
    },
    {
      title: 'Services',
      links: [
        { label: 'All services', href: 'pages/services.html' },
        { label: 'Pricing', href: 'pages/compare.html' },
        { label: 'Book a demo', href: 'pages/contact.html' },
      ],
    },
    {
      title: 'Company',
      links: [
        { label: 'About', href: 'pages/about.html' },
        { label: 'Projects', href: 'pages/projects.html' },
        { label: 'Industries', href: 'pages/industries.html' },
        { label: 'Careers', href: 'pages/join.html' },
      ],
    },
    {
      title: 'Resources',
      links: [
        { label: 'News', href: 'news/index.html' },
        { label: 'Contact', href: 'pages/contact.html' },
        { label: 'Login', href: 'login.html' },
      ],
    },
  ],

  /* ── AI chat widget ──────────────────────────────────────────
     apiBase is a PUBLIC url. No key, token or secret is ever placed
     here — every credential stays on the API server. Set enabled to
     false (or build with TA_CHAT=off) to remove the widget entirely. */
  /* First-party analytics. PUBLIC endpoint, no key. TA_ANALYTICS=off at
     build time removes the tag and the script from every page. */
  analytics: {
    enabled: true,
    endpoint: 'https://api.auraautomation.site/api/analytics/collect',
  },
  chat: {
    enabled: true,
    apiBase: 'https://api.auraautomation.site/api/chat',
    quickActions: [
      'Build a Website',
      'Mobile App',
      'AI Automation',
      'WhatsApp Automation',
      'CRM',
      'Custom Software',
    ],
  },

  /* ── Services — the six you specified ────────────────────── */
  services: [
    { key: 'web', iconName: 'web', title: 'Website Development',
      body: 'Fast, accessible marketing sites and web platforms — built to load quickly, rank well and be edited without a developer.' },
    { key: 'mobile', iconName: 'mobile', title: 'Mobile App Development',
      body: 'Android and iOS apps for customers or field teams, connected to the systems your business already runs on.' },
    { key: 'software', iconName: 'code', title: 'Custom Software Development',
      body: 'When off-the-shelf software nearly fits but not quite, we build the product your operation actually runs on — and you own the code.' },
    { key: 'ai', iconName: 'ai', title: 'AI Automation',
      body: 'Drafting, summarising, classifying and answering — pointed only at the jobs where a model genuinely beats a person.' },
    { key: 'whatsapp', iconName: 'whatsapp', title: 'WhatsApp Automation',
      body: 'Broadcasts, drip sequences and inbound routing on the official WhatsApp Business API — not a browser hack that gets your number banned.' },
    { key: 'crm', iconName: 'crm', title: 'CRM & Business Automation',
      body: 'Every enquiry captured, scored, assigned and chased automatically. No lead sits unread in a shared inbox over a weekend.' },
    { key: 'gym_dashboard', iconName: 'gym', title: 'GYM Dashboard', href: 'gym-dashboard.html',
      body: 'Manage members, memberships and attendance from one smart dashboard. Barcode entry, expiry tracking and automatic WhatsApp reminders — without spreadsheets or registers.' },
  ],

  /* ── Solutions — business-language, with concrete capabilities ── */
  solutions: [
    {
      id: 'whatsapp',
      iconName: 'whatsapp',
      title: 'WhatsApp Automation',
      body:
        'Most Indian businesses already run on WhatsApp. The problem is that it runs on a person holding a phone. We move it onto the Business API so it keeps working at 2am and at scale.',
      points: [
        'Official WhatsApp Business API — template approval and number registration handled',
        'Inbound routing by keyword, language or business hours',
        'Drip sequences tied to CRM stage rather than a manual list',
        'Delivery and read reporting per campaign',
      ],
    },
    {
      id: 'crm',
      iconName: 'crm',
      title: 'CRM & Lead Management',
      body:
        'Enquiries arrive from a website form, a WhatsApp message, a phone call and a marketplace — and then get lost between them. We make one pipeline out of all of it.',
      points: [
        'Single pipeline across web, WhatsApp, phone and marketplace sources',
        'Automatic assignment by territory, product line or load',
        'Follow-up sequences that escalate when a rep goes quiet',
        'Duplicate detection across channels',
      ],
    },
    {
      id: 'ai',
      iconName: 'ai',
      title: 'AI Agents & Automation',
      body:
        'We are deliberately narrow about where AI goes. It handles the high-volume, low-judgement work — classification, extraction, first-draft replies — and hands anything consequential to a person.',
      points: [
        'Document and email extraction into structured fields',
        'First-draft replies a human approves before sending',
        'Enquiry classification and intent routing',
        'Summarisation of long threads and call notes',
      ],
    },
    {
      id: 'bi',
      iconName: 'chart',
      title: 'Business Intelligence',
      body:
        'Reporting that nobody has to assemble. Numbers pulled from the systems that already hold them, reconciled, and put on one screen with an audit trail.',
      points: [
        'Live dashboards over your existing databases and SaaS tools',
        'Scheduled reports delivered to email or WhatsApp',
        'Drill-down from summary figure to source record',
        'Alerting when a metric crosses a threshold',
      ],
    },
    {
      id: 'saas',
      iconName: 'saas',
      title: 'Custom SaaS',
      body:
        'Sometimes the process is the product. When your operation has a shape no vendor sells, we build the application around it — and you own the code.',
      points: [
        'Multi-tenant applications with role-based access',
        'Client portals with per-customer data isolation',
        'Billing, subscription and usage metering',
        'Built on your infrastructure, handed over with documentation',
      ],
    },
    {
      id: 'platforms',
      iconName: 'web',
      title: 'Web & Mobile Platforms',
      body:
        'The customer-facing half of the work: the site people find you through, and the app your customers or field staff use every day.',
      points: [
        'Marketing sites built for speed, accessibility and search',
        'Customer portals and booking flows',
        'Android and iOS apps sharing one backend',
        'Connected to your CRM and operational systems, not siloed',
      ],
    },
  ],

  /* ── Why TradeAura ───────────────────────────────────────── */
  why: [
    { iconName: 'layers', title: 'Automation-first architecture', body: 'Systems designed around the process, not bolted onto it after the fact. Every step has an owner, a log and a fallback.' },
    { iconName: 'saas', title: 'Custom-built solutions', body: 'No reselling someone else’s platform with our name on it. The code is written for your operation, and you own it.' },
    { iconName: 'ai', title: 'AI-powered workflows', body: 'Applied where it measurably beats a person and kept away from decisions it should not be making.' },
    { iconName: 'chart', title: 'Real-time dashboards', body: 'Live operational views over your own data, so decisions are made on today’s numbers rather than last month’s export.' },
    { iconName: 'api', title: 'API integrations', body: 'Your booking engine, accounting, payment gateway and CRM talking to each other instead of to a person copying fields.' },
    { iconName: 'scale', title: 'Scalable systems', body: 'Built to survive a tenfold increase in volume without a rewrite — queued, observable and horizontally scalable.' },
  ],

  /* ── Process ─────────────────────────────────────────────── */
  process: [
    { n: '01', title: 'Discover', body: 'We sit with your team and document the process as it actually runs — not as the SOP claims it does.' },
    { n: '02', title: 'Design', body: 'Fixed scope, written down. You see exactly what will be built, what it will cost and what it will not do.' },
    { n: '03', title: 'Automate', body: 'Built in your environment with your data, running alongside the manual process until it is provably better.' },
    { n: '04', title: 'Scale', body: 'Handover with documentation and training, then we extend to the next process once the first one has paid for itself.' },
  ],

  /* ── Industries — from existing positioning ─────────────── */
  industries: [
    { iconName: 'travel', title: 'Travel & Tourism', body: 'Itinerary generation, booking confirmations, supplier coordination.' },
    { iconName: 'realestate', title: 'Real Estate', body: 'Site-visit scheduling, lead qualification, follow-up sequences.' },
    { iconName: 'health', title: 'Healthcare', body: 'Appointment reminders, intake forms, report delivery.' },
    { iconName: 'education', title: 'Education', body: 'Admissions pipelines, fee reminders, parent communication.' },
    { iconName: 'finance', title: 'Financial Services', body: 'Client onboarding, document collection, portfolio reporting.' },
    { iconName: 'logistics', title: 'Logistics', body: 'Shipment status updates, proof-of-delivery capture, exception alerts.' },
    { iconName: 'retail', title: 'Retail & E-commerce', body: 'Order updates, abandoned-cart recovery, returns handling.' },
    { iconName: 'manufacturing', title: 'Manufacturing', body: 'Production reporting, vendor coordination, quality logs.' },
  ],

  /* ── Projects ─────────────────────────────────────────────────
     Only the work evidenced in the repo is described concretely.
     The rest are explicitly marked as needing content — no invented
     client names, metrics or testimonials.
     ─────────────────────────────────────────────────────────── */
  projects: [
    {
      sector: 'Web Development',
      title: 'TradeAura Insights platform',
      body:
        'A 622-page static publishing platform with a zero-dependency build: component-driven templates, automatic sitemap generation and sub-second builds. It is the site you are reading.',
      metrics: [
        { label: 'Pages', value: '622' },
        { label: 'Build', value: '<1s' },
      ],
    },
    {
      sector: 'AI Automation',
      title: 'Automated news pipeline',
      body:
        'An end-to-end content pipeline: 18 RSS sources, deduplication, AI rewriting, static page generation and scheduled publishing — running unattended every six hours.',
      metrics: [
        { label: 'Sources', value: '18' },
        { label: 'Articles', value: '600+' },
      ],
    },
    {
      sector: 'Business Automation',
      title: 'Instagram feed automation',
      body:
        'Hourly synchronisation from the Instagram Graph API into a static feed, hardened against empty-response failures so a bad API call can never blank the site.',
      metrics: [
        { label: 'Cadence', value: 'Hourly' },
        { label: 'Downtime', value: 'None' },
      ],
    },
  ],
};
