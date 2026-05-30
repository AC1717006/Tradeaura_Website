// ── News API Endpoints ────────────────────────────────────────────────────

export const CURRENTS_API_URL  = 'https://api.currentsapi.services/v1/latest-news';
export const NEWSDATA_API_URL  = 'https://newsdata.io/api/1/news';

// ── Fetch categories per source ───────────────────────────────────────────

// Currents API category slugs  →  curator bucket
export const CURRENTS_QUERIES = [
  { category: 'finance',    bucket: 'Finance & Markets' },
  { category: 'business',   bucket: 'Finance & Markets' },
  { category: 'technology', bucket: 'Technology'         },
  { category: 'science',    bucket: 'Technology'         },
];

// NewsData.io category slugs  →  curator bucket
export const NEWSDATA_QUERIES = [
  { category: 'business',   bucket: 'Finance & Markets', country: 'in' },
  { category: 'technology', bucket: 'Technology',         country: 'in' },
  { category: 'science',    bucket: 'Technology',         country: 'in' },
];

// ── GROQ settings ─────────────────────────────────────────────────────────

export const GROQ_MODEL      = 'llama-3.3-70b-versatile';
export const GROQ_API_URL    = 'https://api.groq.com/openai/v1/chat/completions';
export const GROQ_MAX_TOKENS = 2048;
export const GROQ_DELAY_MS   = 3500;   // between rewriter calls

// ── Pipeline limits ───────────────────────────────────────────────────────

export const ARTICLES_PER_API_CALL = 10;  // max items to pull from each API call
export const MAX_TOTAL_ARTICLES    = 200; // rolling DB cap
export const API_TIMEOUT_MS        = 10000;

// ── Category display config (9 sub-categories for rendered pages) ─────────

export const CATEGORY_CONFIG = {
  'AI & Automation':        { color: '#3B82F6', bg: 'rgba(59,130,246,0.15)',  border: 'rgba(59,130,246,0.3)',  icon: 'fa-robot',        fab: false },
  'WhatsApp Business':      { color: '#22C55E', bg: 'rgba(34,197,94,0.15)',   border: 'rgba(34,197,94,0.3)',   icon: 'fa-whatsapp',     fab: true  },
  'CRM & Sales':            { color: '#8B5CF6', bg: 'rgba(139,92,246,0.15)',  border: 'rgba(139,92,246,0.3)',  icon: 'fa-address-card', fab: false },
  'SaaS & Software':        { color: '#06B6D4', bg: 'rgba(6,182,212,0.15)',   border: 'rgba(6,182,212,0.3)',   icon: 'fa-layer-group',  fab: false },
  'Meta & Advertising':     { color: '#EC4899', bg: 'rgba(236,72,153,0.15)',  border: 'rgba(236,72,153,0.3)',  icon: 'fa-meta',         fab: true  },
  'Google & Marketing':     { color: '#F59E0B', bg: 'rgba(245,158,11,0.15)',  border: 'rgba(245,158,11,0.3)',  icon: 'fa-google',       fab: true  },
  'MarTech':                { color: '#14B8A6', bg: 'rgba(20,184,166,0.15)',  border: 'rgba(20,184,166,0.3)',  icon: 'fa-chart-line',   fab: false },
  'Business Tools':         { color: '#F97316', bg: 'rgba(249,115,22,0.15)',  border: 'rgba(249,115,22,0.3)',  icon: 'fa-briefcase',    fab: false },
  'Digital Transformation': { color: '#6366F1', bg: 'rgba(99,102,241,0.15)', border: 'rgba(99,102,241,0.3)',  icon: 'fa-rocket',       fab: false },
};

export const DEFAULT_CATEGORY = {
  color: '#3B82F6', bg: 'rgba(59,130,246,0.15)', border: 'rgba(59,130,246,0.3)', icon: 'fa-newspaper', fab: false,
};

// All 9 sub-category names (used in rewriter prompt)
export const VALID_CATEGORIES = Object.keys(CATEGORY_CONFIG).join(', ');

export const SITE_URL  = 'https://www.auraautomation.site';
export const SITE_NAME = 'Tradeaura';
