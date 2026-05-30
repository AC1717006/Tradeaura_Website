/**
 * TradeAura News Hub — Currents + NewsData → GROQ Curator → GROQ Rewriter
 *
 * Pipeline per run:
 *   1. Fetch Finance & Markets articles  (Currents API + NewsData.io)
 *   2. Fetch Technology articles         (Currents API + NewsData.io)
 *   3. Deduplicate both pools against DB
 *   4. GROQ Curator  → picks [financeIdx, techIdx] from the combined list
 *   5. GROQ Rewriter → rewrites each selected article (Indian business angle)
 *   6. Save to data/news.json
 *   7. Generate all static pages + sitemap
 */

import 'dotenv/config';
import axios  from 'axios';
import fs     from 'fs';
import path   from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

import {
  CURRENTS_API_URL, NEWSDATA_API_URL,
  CURRENTS_QUERIES, NEWSDATA_QUERIES,
  GROQ_API_URL, GROQ_MODEL, GROQ_MAX_TOKENS, GROQ_DELAY_MS,
  ARTICLES_PER_API_CALL, MAX_TOTAL_ARTICLES, API_TIMEOUT_MS,
  VALID_CATEGORIES,
} from './news-config.js';
import { generateAllPages } from './generate-pages.js';

const __dirname  = path.dirname(fileURLToPath(import.meta.url));
const ROOT       = path.join(__dirname, '..');
const DATA_FILE  = path.join(ROOT, 'data', 'news.json');

const GROQ_KEY     = process.env.GROQ_API_KEY;
const CURRENTS_KEY = process.env.CURRENTS_API_KEY;
const NEWSDATA_KEY = process.env.NEWSDATA_API_KEY;

// ── DB Helpers ────────────────────────────────────────────────────────────

function loadDB() {
  fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
  if (fs.existsSync(DATA_FILE)) {
    try { return JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8')); }
    catch { console.warn('  ⚠ Corrupt DB — resetting'); }
  }
  return { articles: [], lastUpdated: null, totalCount: 0, schema: '2.0' };
}

function saveDB(db) {
  db.totalCount  = db.articles.length;
  db.lastUpdated = new Date().toISOString();
  fs.writeFileSync(DATA_FILE, JSON.stringify(db, null, 2));
}

// ── Utilities ─────────────────────────────────────────────────────────────

function makeId(url)  { return crypto.createHash('md5').update(url).digest('hex').slice(0, 12); }
function delay(ms)    { return new Promise(r => setTimeout(r, ms)); }

function makeSlug(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-{2,}/g, '-')
    .substring(0, 75)
    .replace(/-$/, '');
}

function uniqueSlug(base, usedSlugs) {
  if (!usedSlugs.has(base)) return base;
  let n = 2;
  while (usedSlugs.has(`${base}-${n}`)) n++;
  return `${base}-${n}`;
}

function stripHtml(str = '') { return str.replace(/<[^>]+>/g, '').trim(); }

// ── Currents API Fetcher ──────────────────────────────────────────────────

async function fetchCurrents(category, bucket) {
  if (!CURRENTS_KEY) return [];
  try {
    const { data } = await axios.get(CURRENTS_API_URL, {
      params: {
        apiKey:   CURRENTS_KEY,
        language: 'en',
        category,
        page_size: ARTICLES_PER_API_CALL,
      },
      timeout: API_TIMEOUT_MS,
    });

    return (data.news || [])
      .filter(a => a.url && a.title && a.title !== '[Removed]')
      .map(a => ({
        originalUrl:    a.url,
        originalTitle:  stripHtml(a.title),
        description:    stripHtml(a.description || '').slice(0, 600),
        imageUrl:       a.image && a.image !== 'None' ? a.image : null,
        source:         a.author || new URL(a.url).hostname,
        publishedDate:  a.published || new Date().toISOString(),
        bucket,
        apiSource:      'currents',
      }));
  } catch (e) {
    console.warn(`  ✗ Currents [${category}]: ${e.message}`);
    return [];
  }
}

// ── NewsData.io Fetcher ───────────────────────────────────────────────────

async function fetchNewsdata(category, bucket, country = 'in') {
  if (!NEWSDATA_KEY) return [];
  try {
    const { data } = await axios.get(NEWSDATA_API_URL, {
      params: {
        apikey:   NEWSDATA_KEY,
        language: 'en',
        category,
        country,
        size:     ARTICLES_PER_API_CALL,
      },
      timeout: API_TIMEOUT_MS,
    });

    return (data.results || [])
      .filter(a => a.link && a.title)
      .map(a => ({
        originalUrl:   a.link,
        originalTitle: stripHtml(a.title),
        description:   stripHtml(a.description || a.content || '').slice(0, 600),
        imageUrl:      a.image_url || null,
        source:        a.source_name || new URL(a.link).hostname,
        publishedDate: a.pubDate  || new Date().toISOString(),
        bucket,
        apiSource:     'newsdata',
      }));
  } catch (e) {
    console.warn(`  ✗ NewsData [${category}/${country}]: ${e.message}`);
    return [];
  }
}

// ── GROQ Shared Caller ────────────────────────────────────────────────────

async function callGroq(prompt, maxTokens = 256, temperature = 0.5) {
  const { data } = await axios.post(
    GROQ_API_URL,
    {
      model:       GROQ_MODEL,
      messages:    [{ role: 'user', content: prompt }],
      temperature,
      max_tokens:  maxTokens,
    },
    {
      headers: {
        'Authorization': `Bearer ${GROQ_KEY}`,
        'Content-Type':  'application/json',
      },
      timeout: 30000,
    }
  );
  return data.choices[0]?.message?.content?.trim() || '';
}

// ── Step 1 — Fetch + Pool by bucket ──────────────────────────────────────

async function buildArticlePools(urlSet) {
  const raw = { 'Finance & Markets': [], 'Technology': [] };

  // Currents API
  for (const { category, bucket } of CURRENTS_QUERIES) {
    const items = await fetchCurrents(category, bucket);
    raw[bucket].push(...items);
  }

  // NewsData.io
  for (const { category, bucket, country } of NEWSDATA_QUERIES) {
    const items = await fetchNewsdata(category, bucket, country);
    raw[bucket].push(...items);
  }

  // Deduplicate within each pool (by URL) and against existing DB
  const pools = {};
  for (const [bucket, items] of Object.entries(raw)) {
    const seen = new Set();
    pools[bucket] = items.filter(a => {
      if (urlSet.has(a.originalUrl) || seen.has(a.originalUrl)) return false;
      seen.add(a.originalUrl);
      return true;
    });
    console.log(`  [${bucket}] ${pools[bucket].length} fresh articles`);
  }

  return pools;
}

// ── Step 2 — GROQ Curator ─────────────────────────────────────────────────

async function curate(pools) {
  const finance = pools['Finance & Markets'] || [];
  const tech    = pools['Technology']         || [];

  if (finance.length === 0 && tech.length === 0) return [];
  if (finance.length === 0) return tech.slice(0, 1).map(a => ({ ...a, bucket: 'Technology' }));
  if (tech.length    === 0) return finance.slice(0, 1).map(a => ({ ...a, bucket: 'Finance & Markets' }));

  // Build numbered list for curator
  const combined = [
    ...finance.slice(0, 10).map(a => ({ ...a, bucket: 'Finance & Markets' })),
    ...tech.slice(0,    10).map(a => ({ ...a, bucket: 'Technology' })),
  ];

  const financeCount = Math.min(finance.length, 10);

  const articleList = combined
    .map((a, i) => `${i}. [${a.bucket}] "${a.originalTitle}" — ${a.source} (${a.publishedDate?.slice(0, 10) || 'unknown'})`)
    .join('\n');

  const prompt = `You are a news curator for an AI & Business Automation agency \ntargeting Indian businesses.

From the list below, pick EXACTLY 2 articles:
- 1 from Finance & Markets category
- 1 from Technology category

Priority criteria:
1. Most relevant to Indian businesses, fintech, AI, or digital transformation
2. Published in last 24 hours preferred
3. No duplicate or very similar topics

Return ONLY a JSON array of 2 zero-based indices.
Example: [2, 7]
No explanation. No markdown. Pure JSON only.

Articles:
${articleList}`;

  console.log('  🧠 Running GROQ curator...');
  const raw = await callGroq(prompt, 32, 0.1);

  const match = raw.match(/\[\s*(\d+)\s*,\s*(\d+)\s*\]/);
  if (!match) {
    console.warn(`  ⚠ Curator returned unexpected format: "${raw}" — falling back to [0, ${financeCount}]`);
    return [combined[0], combined[financeCount]].filter(Boolean);
  }

  const idxA = parseInt(match[1], 10);
  const idxB = parseInt(match[2], 10);

  const selected = [combined[idxA], combined[idxB]].filter(Boolean);
  selected.forEach(a => console.log(`  ✓ Curator picked: "${a.originalTitle.slice(0, 65)}" [${a.bucket}]`));
  return selected;
}

// ── Step 3 — GROQ Rewriter ────────────────────────────────────────────────

async function rewrite(article) {
  const prompt = `TASK: Rewrite the following news article for AuraAutomation.site

TARGET AUDIENCE: Indian business owners, startup founders, and enterprise decision-makers

REWRITE RULES:
- Title must be under 60 characters, SEO-optimized, no clickbait
- Add Indian business context (mention India, RBI, SEBI, Indian market only if naturally relevant)
- Content must be 300-500 words in professional English
- Use proper HTML tags: <h2> for subheadings, <p> for paragraphs, <ul><li> for lists
- Meta description: under 155 characters, includes main keyword
- Extract exactly 5 relevant keywords
- Extract exactly 5 tags (short, lowercase)
- Estimate read time in minutes (integer)
- category must be exactly one of: ${VALID_CATEGORIES}

ARTICLE TO REWRITE:
Title: ${article.originalTitle}
Source: ${article.source}
Category: ${article.bucket}
Published: ${article.publishedDate}
Description: ${article.description || 'No description available.'}
Original URL: ${article.originalUrl}

Return ONLY this exact JSON structure — no markdown, no backticks, no explanation:
{
  "title": "...",
  "metaDescription": "...",
  "keywords": ["kw1","kw2","kw3","kw4","kw5"],
  "summary": "2-3 sentence executive summary for Indian business context",
  "content": "<h2>...</h2><p>...</p>",
  "category": "...",
  "tags": ["tag1","tag2","tag3","tag4","tag5"],
  "readTime": 3
}`;

  const raw    = await callGroq(prompt, GROQ_MAX_TOKENS, 0.65);
  const clean  = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
  const match  = clean.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('No JSON object in GROQ rewriter response');

  const parsed = JSON.parse(match[0]);

  const required = ['title', 'metaDescription', 'keywords', 'summary', 'content', 'category', 'tags'];
  for (const f of required) {
    if (!parsed[f]) throw new Error(`Rewriter missing field: ${f}`);
  }
  return parsed;
}

// ── Main ──────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n🚀 TradeAura News Hub — Pipeline starting\n');

  if (!GROQ_KEY)                  throw new Error('GROQ_API_KEY not set');
  if (!CURRENTS_KEY && !NEWSDATA_KEY)
    throw new Error('Set at least one of: CURRENTS_API_KEY, NEWSDATA_API_KEY');

  const db      = loadDB();
  const urlSet  = new Set(db.articles.map(a => a.originalUrl));
  const slugSet = new Set(db.articles.map(a => a.slug));

  // 1 ── Fetch + build category pools ───────────────────────────────────
  console.log('📡 Fetching from APIs...');
  const pools = await buildArticlePools(urlSet);

  const totalFresh = Object.values(pools).reduce((s, p) => s + p.length, 0);
  console.log(`\n✅ ${totalFresh} fresh articles available\n`);

  if (totalFresh === 0) {
    console.log('ℹ️  No new articles found. Regenerating pages with existing data...');
    await generateAllPages(db);
    return;
  }

  // 2 ── GROQ Curator ────────────────────────────────────────────────────
  console.log('🎯 Curating articles...');
  const selected = await curate(pools);

  if (selected.length === 0) {
    console.log('ℹ️  Curator found nothing to process.');
    await generateAllPages(db);
    return;
  }

  console.log(`\n✍️  Rewriting ${selected.length} articles with GROQ...\n`);

  // 3 ── GROQ Rewriter ───────────────────────────────────────────────────
  const published = [];
  const failed    = [];

  for (const [i, article] of selected.entries()) {
    console.log(`  [${i + 1}/${selected.length}] ${article.originalTitle.slice(0, 65)}...`);
    try {
      const ai   = await rewrite(article);
      const base = makeSlug(ai.title);
      const slug = uniqueSlug(base, slugSet);
      slugSet.add(slug);

      published.push({
        id:             makeId(article.originalUrl),
        // Source
        originalUrl:    article.originalUrl,
        originalTitle:  article.originalTitle,
        source:         article.source,
        imageUrl:       article.imageUrl || null,
        publishedDate:  article.publishedDate,
        createdAt:      new Date().toISOString(),
        // AI output
        title:          ai.title,
        metaDescription:ai.metaDescription,
        keywords:       Array.isArray(ai.keywords)  ? ai.keywords  : [],
        summary:        ai.summary,
        content:        ai.content,
        category:       ai.category || 'Digital Transformation',
        tags:           Array.isArray(ai.tags)       ? ai.tags       : [],
        readTime:       ai.readTime  || 3,
        // State
        slug,
        status:         'published',
        featured:       false,
        sitemapAdded:   false,
      });

      console.log(`     ✓ → /news/${slug}.html`);
    } catch (e) {
      console.warn(`     ✗ ${e.message}`);
      failed.push({ url: article.originalUrl, error: e.message });
    }

    if (i < selected.length - 1) await delay(GROQ_DELAY_MS);
  }

  // 4 ── Save DB ─────────────────────────────────────────────────────────
  db.articles = [...published, ...db.articles].slice(0, MAX_TOTAL_ARTICLES);
  saveDB(db);

  console.log(`\n💾 +${published.length} published | ${failed.length} failed | ${db.articles.length} total\n`);

  // 5 ── Generate pages ──────────────────────────────────────────────────
  await generateAllPages(db);

  console.log('✨ Pipeline complete!\n');
}

main().catch(err => {
  console.error('\n❌ Fatal:', err.message);
  process.exit(1);
});
