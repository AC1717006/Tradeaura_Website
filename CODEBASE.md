# TradeAura — Codebase Summary

**Site:** https://www.auraautomation.site  
**Business:** AI & Business Automation Agency (India)  
**Stack:** Static HTML + Tailwind CSS + Vanilla JS · Node.js scripts · GitHub Actions CI/CD · AWS S3 hosting

---

## Project Structure

```
Antigavity/
├── index.html                        # Homepage (auto-updated with news section)
├── robots.txt                        # Search engine crawl rules
├── sitemap.xml                       # Auto-updated XML sitemap (static + news URLs)
├── package.json                      # Node.js deps for news automation scripts
│
├── css/
│   └── style.css                     # Global styles, animations, glassmorphism
│
├── js/
│   └── script.js                     # AOS init, navbar scroll, mobile menu, counters, tabs, FAQs
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
│   └── assets/videos/
│       └── 12-week-execution-demo.mp4
│
├── scripts/                          # Node.js automation scripts (run by GitHub Actions)
│   ├── news-config.js                # RSS feed URLs, category config, GROQ settings
│   ├── fetch-news.js                 # Main pipeline: RSS → dedupe → GROQ → DB → pages
│   ├── generate-pages.js             # Static HTML generator for all news pages + sitemap
│   └── admin-actions.js             # Admin operations: delete, feature, regenerate
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
| News AI | GROQ API — `llama-3.3-70b-versatile` |
| News sources | RSS feeds (18 sources across 9 categories) |
| Hosting | AWS S3 (static site) |
| CI/CD | GitHub Actions |
| Node runtime | Node.js 20 (scripts only, not a server) |

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
# Required for news pipeline (GitHub Secrets)
GROQ_API_KEY=gsk_...               # GROQ Cloud API key
NEWS_API_KEY=...                   # NewsAPI.org key (reserved, not currently active)

# Already set as GitHub Secrets for deployment
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...

# Legacy (not used in current pipeline)
GEMINI_API_KEY=...
```

---

## Key Files — What Each Does

| File | Responsibility |
|---|---|
| `scripts/news-config.js` | Single source of truth: RSS URLs, category colors/icons, GROQ model, limits |
| `scripts/fetch-news.js` | Orchestrates the full pipeline end-to-end |
| `scripts/generate-pages.js` | All HTML templates: article, index, homepage section, sitemap |
| `scripts/admin-actions.js` | CRUD operations on articles, called by workflow |
| `js/script.js` | All client-side interactions on every page |
| `css/style.css` | Global styles, animations, component classes |
| `google_apps_script.js` | Google Sheets form handler (deployed separately) |

---

## Navigation Structure

```
Home (index.html)
├── Solutions (dropdown)
│   ├── WhatsApp Automation
│   ├── AI Business Automation
│   ├── CRM Setup
│   ├── Custom SaaS
│   ├── Lead Management
│   └── Business Intelligence
├── Services (pages/services.html)
├── Industries (pages/industries.html)
├── News (news/index.html)           ← AI News Hub
├── About (pages/about.html)
└── Contact (pages/contact.html)
```

---

## Deployment Flow

```
Developer pushes to main
        │
        ▼
  GitHub Actions: deploy.yml
        │
        ▼
  aws s3 sync → s3://auraautomation.site
        │
        ▼
  Live at https://www.auraautomation.site
```

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
  git commit + push to main
        │
        ▼
  Triggers deploy.yml → S3 sync
        │
        ▼
  New articles live within ~2 minutes of cron
```

---

## Contact / Owner

- **Owner:** Ajay Chouhan
- **Email:** helloajaychouhan@gmail.com
- **WhatsApp:** +91 95874 02524
- **Website:** www.auraautomation.site
