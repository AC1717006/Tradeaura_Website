# TradeAura — Codebase Summary

**Site:** https://www.auraautomation.site  
**Business:** AI & Business Automation Agency (India)  
**Stack:** Static HTML + Tailwind CSS + Vanilla JS · Node.js Express server · Yahoo Finance market data · GitHub Actions CI/CD · AWS S3 hosting · Vercel (API / serverless)

---

## Project Structure

```
Antigavity/
├── index.html                        # Homepage (ticker bar + news section)
├── robots.txt                        # Search engine crawl rules
├── sitemap.xml                       # Auto-updated XML sitemap (static + news URLs)
├── package.json                      # Node.js deps (express, yahoo-finance2, groq…)
├── server.js                         # Local dev server: static site + GET /api/market
├── vercel.json                       # Vercel deployment config (routes + serverless)
│
├── api/
│   └── market.js                     # Vercel serverless function → GET /api/market
│
├── server/
│   └── routes/
│       └── market.js                 # Express route module (used by server.js in dev)
│
├── css/
│   ├── style.css                     # Global styles, animations, glassmorphism
│   └── stockTicker.css               # Live market ticker bar styles
│
├── js/
│   ├── script.js                     # AOS init, navbar scroll, mobile menu, counters, tabs, FAQs
│   ├── stockTicker.js                # Ticker: fetches /api/market, renders scrolling bar, IST clock
│   └── websocketService.js           # WebSocket client utility (archived — not active)
│
├── pages/                            # Static marketing pages
│   ├── about.html
│   ├── compare.html                  # Pricing / competitor comparison
│   ├── contact.html                  # Contact form (Google Apps Script backend)
│   ├── industries.html
│   ├── join.html                     # Partnership / onboarding page
│   └── services.html                 # Full services overview
│
├── news/
│   └── index.html                    # News hub landing (auto-regenerated each run)
│   └── [slug].html                   # Individual article pages (auto-generated)
│
├── admin/
│   └── index.html                    # Password-protected admin panel (client-side)
│
├── data/
│   └── news.json                     # Article database (JSON, schema v2.0)
│   └── auto-publish-disabled         # Flag file — created to pause auto-publishing
│
├── assets/
│   ├── images/
│   │   ├── og-image.png              # Open Graph social preview image
│   │   └── 12-week-dashboard-hero.png
│   └── videos/
│       └── 12-week-execution-demo.mp4
│
├── scripts/                          # Node.js automation scripts (GitHub Actions)
│   ├── news-config.js                # RSS feed URLs, category config, GROQ settings
│   ├── fetch-news.js                 # Main pipeline: RSS → dedupe → GROQ → DB → pages
│   ├── generate-pages.js             # Static HTML generator for all news pages + sitemap
│   ├── admin-actions.js              # Admin operations: delete, feature, regenerate
│   └── marketFeed.js                 # Upstox market feed module (archived — superseded by Yahoo Finance)
│
├── google_apps_script.js             # Serverless form handler (deployed to Google Apps Script)
│
└── .github/
    └── workflows/
        ├── deploy.yml                # Push to main → sync entire repo to AWS S3
        ├── news-refresh.yml          # Cron every 6h: fetch news → generate → commit → deploy
        └── news-admin.yml            # Manual workflow_dispatch: admin actions via GitHub UI
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | HTML5, Tailwind CSS (CDN), Vanilla JS |
| Animations | AOS (Animate On Scroll) |
| Icons | Font Awesome 6.4 |
| Fonts | Google Fonts — Inter + Outfit |
| Form backend | Google Apps Script (serverless) |
| Market data | Yahoo Finance via `yahoo-finance2` npm package |
| News AI | GROQ API — `llama-3.3-70b-versatile` |
| News sources | RSS feeds (18 sources across 9 categories) |
| Local dev server | Node.js + Express (`server.js`) |
| Production API | Vercel Serverless Functions (`api/market.js`) |
| Static hosting | AWS S3 (`auraautomation.site`) |
| CI/CD | GitHub Actions |
| Node runtime | Node.js 20 |

---

## Brand / Design System

| Token | Value |
|---|---|
| Background | `#0B0F19` (`darkBase`) |
| Primary Blue | `#3B82F6` (`brandBlue`) |
| Primary Purple | `#8B5CF6` (`brandPurple`) |
| Accent Pink | `#EC4899` (`brandPink`) |
| Glass card | `rgba(255,255,255,0.04)` bg + `rgba(255,255,255,0.1)` border |
| Body font | Inter |
| Heading font | Outfit |

All pages share dark glassmorphism aesthetic with gradient orbs, grid overlay, and AOS scroll animations.

---

## Live Market Ticker

A premium CNBC-style scrolling ticker bar sits directly below the navbar on the homepage, showing live NSE/BSE prices updated every 60 seconds.

### Architecture

```
Browser (index.html)
    │  fetch('/api/market') every 60s
    ▼
/api/market endpoint
    ├── Local dev  → server.js (Express, port 3001)
    └── Production → api/market.js (Vercel serverless)
                         │
                         ▼
                   yahoo-finance2
                   (no API key needed)
                         │
                         ▼
              60s in-memory cache
              returns sanitized JSON
```

### Tracked Instruments

| Internal Key | Yahoo Symbol | Display Label | Type |
|---|---|---|---|
| NIFTY50 | `^NSEI` | NIFTY 50 | Index |
| BANKNIFTY | `^NSEBANK` | BANK NIFTY | Index |
| RELIANCE | `RELIANCE.NS` | RELIANCE | Equity |
| TCS | `TCS.NS` | TCS | Equity |
| INFY | `INFY.NS` | INFY | Equity |
| HDFCBANK | `HDFCBANK.NS` | HDFCBANK | Equity |
| ICICIBANK | `ICICIBANK.NS` | ICICIBANK | Equity |

### API Response

```
GET /api/market

{
  "updatedAt": "2026-05-31T08:37:34.590Z",
  "data": [
    {
      "symbol":        "NIFTY 50",
      "type":          "index",
      "price":         23547.75,
      "change":        -359.40,
      "changePercent": -1.5033
    },
    {
      "symbol":        "RELIANCE",
      "type":          "equity",
      "price":         1321.20,
      "change":        -29.30,
      "changePercent": -2.17
    }
  ]
}
```

### Frontend files

| File | Role |
|---|---|
| `css/stockTicker.css` | Glassmorphism bar, scroll animation, green/red colors, responsive |
| `js/stockTicker.js` | Fetches API, renders/patches DOM, IST clock, error states |

### URL resolution in `stockTicker.js`

The frontend picks the API host in this order:
1. `data-api="..."` attribute on `#stockTicker` in HTML ← **set this for production**
2. Same origin (works when `npm start` serves the site via `server.js`)
3. `http://localhost:3001` (fallback for local dev)

### Display format

```
NIFTY 50   23,547.75   ▼ -359.40 (-1.50%)    ← red, negative
INFY       ₹1,160.90   ▲ +1.00 (+0.09%)      ← green, positive
```

- Indices: plain number (no ₹)
- Equities: ₹ prefix
- Green `▲` for positive change, red `▼` for negative

---

## Backend — Express Dev Server (`server.js`)

Self-contained server for local development. No separate route files needed.

```bash
npm start          # starts on PORT=3001 (or $PORT)
# http://localhost:3001         → static site
# http://localhost:3001/api/market → live JSON
# http://localhost:3001/health  → status check
```

Key behaviours:
- Pre-warms the Yahoo Finance cache on startup (first page load is instant)
- Refreshes cache every 60 seconds via `setInterval`
- Sets `NODE_TLS_REJECT_UNAUTHORIZED=0` in dev to handle Windows corporate CA issues
- Serves all static files via `express.static`

---

## Production API — Vercel Serverless (`api/market.js`)

Deployed to Vercel, this file automatically becomes the `GET /api/market` endpoint. No server to manage.

```bash
npx vercel           # first-time setup
npx vercel --prod    # deploy to production
```

After deployment:
1. Copy the Vercel project URL (e.g. `https://tradeaura.vercel.app`)
2. Set `data-api="https://tradeaura.vercel.app"` on the `#stockTicker` div in `index.html`
3. Push to GitHub → S3 deploys updated HTML → ticker calls Vercel for live data

`vercel.json` routes:
- `/api/market` → `api/market.js` (serverless)
- `/(.*)`      → static file passthrough

---

## Automated News Pipeline

### How it runs
```
GitHub Actions (cron: 0 0,6,12,18 * * *)
  └─ node scripts/fetch-news.js
        ├─ 1. Parse 18 RSS feeds (rss-parser)
        ├─ 2. Deduplicate by URL against data/news.json
        ├─ 3. Rewrite up to 8 new articles via GROQ API
        │      Model: llama-3.3-70b-versatile
        │      Output: title, metaDescription, keywords[5], summary,
        │              content (full HTML), category, tags, readTime
        ├─ 4. Append to data/news.json (max 200 articles stored)
        └─ node scripts/generate-pages.js
              ├─ news/[slug].html  — individual article pages
              ├─ news/index.html   — hub with category filters
              ├─ index.html        — homepage section updated in-place
              └─ sitemap.xml       — all static + news URLs regenerated
  └─ git commit + push → triggers deploy.yml → AWS S3 sync
```

### Article schema (data/news.json)
```json
{
  "id":              "md5 hash of originalUrl (12 chars)",
  "originalUrl":     "https://source-article-url",
  "originalTitle":   "Raw title from RSS",
  "source":          "Feed publisher name",
  "imageUrl":        "Article hero image or null",
  "publishedDate":   "ISO 8601",
  "createdAt":       "ISO 8601 (when processed)",
  "title":           "GROQ SEO title (≤60 chars)",
  "metaDescription": "GROQ meta description (≤155 chars)",
  "keywords":        ["kw1", "kw2", "kw3", "kw4", "kw5"],
  "summary":         "2-3 sentence executive summary",
  "content":         "<article HTML from GROQ>",
  "category":        "One of 9 predefined categories",
  "tags":            ["tag1", "tag2", "tag3", "tag4", "tag5"],
  "readTime":        3,
  "slug":            "url-safe-slug",
  "status":          "published | draft | failed",
  "featured":        false,
  "sitemapAdded":    true
}
```

### 9 news categories
`AI & Automation` · `WhatsApp Business` · `CRM & Sales` · `SaaS & Software` ·
`Meta & Advertising` · `Google & Marketing` · `MarTech` · `Business Tools` · `Digital Transformation`

### Rate limits respected
- GROQ: 3-second delay between calls, max 8 articles/run
- RSS: 8-second timeout per feed, 600ms between feeds
- GROQ model: `llama-3.3-70b-versatile` (max 2048 tokens output)

---

## SEO Implementation

Each generated article page includes:
- `<title>` — GROQ-generated ≤60 chars
- `<meta name="description">` — GROQ-generated ≤155 chars
- `<meta name="keywords">` — 5 GROQ keywords
- `<link rel="canonical">`
- Open Graph tags (`og:title`, `og:description`, `og:image`, `og:type=article`)
- Twitter Card tags (`summary_large_image`)
- JSON-LD `NewsArticle` structured data
- JSON-LD `BreadcrumbList` structured data
- `sitemap.xml` entry with `lastmod` and `priority`

---

## Admin Panel (`/admin/index.html`)

Client-side only. Authenticates with:
1. Local admin password (hardcoded in HTML — change from `tradeaura2026`)
2. GitHub Personal Access Token (stored in `localStorage`)
3. GitHub repository name (`owner/repo`)

### Admin capabilities
| Action | How |
|---|---|
| View all articles | Fetches `/data/news.json` from live site |
| Search + filter by category | Client-side JS |
| Feature article | Triggers `news-admin.yml` via GitHub API `workflow_dispatch` |
| Delete article | Triggers `news-admin.yml` → removes from DB + HTML file |
| Regenerate AI content | Triggers `news-admin.yml` → re-calls GROQ for article |
| Manual refresh | Triggers `news-refresh.yml` immediately |
| Disable auto-publish | Creates `data/auto-publish-disabled` flag file |

---

## GitHub Actions Workflows

### `deploy.yml`
- **Trigger:** push to `main`
- **Action:** `aws s3 sync ./ s3://auraautomation.site --delete`
- **Excludes:** `.git/*`, `node_modules/*`
- **Secrets needed:** `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`

### `news-refresh.yml`
- **Trigger:** cron `0 0,6,12,18 * * *` (every 6 hours) + `workflow_dispatch`
- **Action:** `npm ci` → `node scripts/fetch-news.js` → git commit → push (triggers deploy)
- **Secrets needed:** `GROQ_API_KEY`, `NEWS_API_KEY`
- **Permissions:** `contents: write`

### `news-admin.yml`
- **Trigger:** `workflow_dispatch` with inputs (`action`, `article_id`)
- **Action:** `npm ci` → `node scripts/admin-actions.js` → git commit → push
- **Secrets needed:** `GROQ_API_KEY`
- **Permissions:** `contents: write`

---

## Environment Variables

```env
# News pipeline (set as GitHub Secrets)
GROQ_API_KEY=gsk_...               # GROQ Cloud API key
NEWS_API_KEY=...                   # NewsAPI.org (reserved, not currently active)
CURRENTS_API_KEY=...               # Currents API
NEWSDATA_API_KEY=...               # NewsData.io

# AWS S3 deployment (set as GitHub Secrets)
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...

# Market ticker backend (local .env only — never committed)
UPSTOX_ACCESS_TOKEN=...            # Archived — was used with Upstox; replaced by Yahoo Finance
UPSTOX_API_KEY=...                 # Archived
UPSTOX_API_SECRET=...              # Archived
PORT=3001                          # Local dev server port
ALLOWED_ORIGINS=http://localhost,http://127.0.0.1

# Legacy (not used)
GEMINI_API_KEY=...
```

**Note:** Yahoo Finance (`yahoo-finance2`) requires no API key — it uses Yahoo's public endpoints.

---

## Dependencies (`package.json`)

| Package | Version | Purpose |
|---|---|---|
| `express` | ^4.22 | Local dev HTTP server |
| `yahoo-finance2` | ^3.15 | Live market quotes (no API key needed) |
| `axios` | ^1.9 | HTTP client (used by news scripts) |
| `dotenv` | ^16.6 | `.env` file loader |
| `rss-parser` | ^3.13 | RSS feed parsing for news pipeline |
| `@google/generative-ai` | ^0.21 | Legacy Gemini SDK (not active) |

---

## Key Files — What Each Does

| File | Responsibility |
|---|---|
| `server.js` | All-in-one local dev server: static site + `/api/market` + health check |
| `api/market.js` | Vercel serverless function for production `/api/market` |
| `vercel.json` | Vercel build + routing config |
| `css/stockTicker.css` | Ticker bar: glassmorphism, scroll animation, responsive |
| `js/stockTicker.js` | Ticker logic: fetch loop, DOM rendering, IST clock, error states |
| `scripts/news-config.js` | Single source of truth: RSS URLs, category colors/icons, GROQ settings |
| `scripts/fetch-news.js` | Orchestrates the full news pipeline end-to-end |
| `scripts/generate-pages.js` | All HTML templates: article, index, homepage section, sitemap |
| `scripts/admin-actions.js` | CRUD operations on articles, called by workflow |
| `js/script.js` | All client-side interactions on every page |
| `css/style.css` | Global styles, animations, component classes |
| `google_apps_script.js` | Google Sheets form handler (deployed separately) |

---

## Navigation Structure

```
Home (index.html)
├── [LIVE TICKER BAR]             ← new — below navbar, above hero
├── Solutions (dropdown)
│   ├── WhatsApp Automation
│   ├── AI Business Automation
│   ├── CRM Setup
│   ├── Custom SaaS
│   ├── Lead Management
│   └── Business Intelligence
├── Services (pages/services.html)
├── Industries (pages/industries.html)
├── News (news/index.html)        ← AI News Hub
├── About (pages/about.html)
└── Contact (pages/contact.html)
```

---

## Deployment Flow

### Static site (existing — unchanged)
```
Developer pushes to main
        │
        ▼
  GitHub Actions: deploy.yml
        │  aws s3 sync → s3://auraautomation.site
        ▼
  Live at https://www.auraautomation.site
```

### Market API (new — Vercel)
```
npx vercel --prod
        │
        ▼
  api/market.js deployed as serverless function
        │
        ▼
  https://<project>.vercel.app/api/market
        │  returns live JSON, 60s cache
        ▼
  Set data-api="https://<project>.vercel.app" in index.html
        │
        ▼
  Push to main → S3 deploys updated HTML → ticker works globally
```

### News pipeline (existing — unchanged)
```
Cron fires (every 6h)
        │
        ▼
  GitHub Actions: news-refresh.yml
        │  npm ci + node scripts/fetch-news.js
        ▼
  RSS fetch → GROQ rewrite → HTML generated
        │
        ▼
  git commit + push to main → triggers deploy.yml → S3 sync
        │
        ▼
  New articles live within ~2 minutes of cron
```

### Local development
```
npm start
        │  node server.js (port 3001)
        ▼
  http://localhost:3001        → full static site
  http://localhost:3001/api/market → live market JSON
```

---

## Contact / Owner

- **Owner:** Ajay Chouhan
- **Email:** helloajaychouhan@gmail.com
- **WhatsApp:** +91 95874 02524
- **Website:** www.auraautomation.site
