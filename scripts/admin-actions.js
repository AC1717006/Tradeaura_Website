/**
 * TradeAura Admin Actions — run by GitHub Actions workflow
 * Usage: ACTION=<action> ARTICLE_ID=<id> node scripts/admin-actions.js
 * Actions: delete | feature | unfeature | regenerate | disable-auto | enable-auto
 */

import 'dotenv/config';
import axios  from 'axios';
import fs     from 'fs';
import path   from 'path';
import { fileURLToPath } from 'url';
import {
  GROQ_MODEL, GROQ_API_URL, GROQ_MAX_TOKENS, SITE_NAME,
} from './news-config.js';
import { generateAllPages } from './generate-pages.js';

const __dirname  = path.dirname(fileURLToPath(import.meta.url));
const ROOT       = path.join(__dirname, '..');
const DATA_FILE  = path.join(ROOT, 'data', 'news.json');
const NEWS_DIR   = path.join(ROOT, 'news');
const FLAG_FILE  = path.join(ROOT, 'data', 'auto-publish-disabled');

const GROQ_KEY = process.env.GROQ_API_KEY;

// ── DB helpers ────────────────────────────────────────────────────────────

function loadDB() { return JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8')); }
function saveDB(db) {
  db.totalCount  = db.articles.length;
  db.lastUpdated = new Date().toISOString();
  fs.writeFileSync(DATA_FILE, JSON.stringify(db, null, 2));
}

// ── Actions ───────────────────────────────────────────────────────────────

async function doDelete(id) {
  const db  = loadDB();
  const art = db.articles.find(a => a.id === id);
  if (!art) throw new Error(`Article not found: ${id}`);

  db.articles = db.articles.filter(a => a.id !== id);
  saveDB(db);

  const htmlFile = path.join(NEWS_DIR, `${art.slug}.html`);
  if (fs.existsSync(htmlFile)) fs.unlinkSync(htmlFile);

  console.log(`✓ Deleted: "${art.title}"`);
  await generateAllPages(db);
}

async function doFeature(id, featured) {
  const db  = loadDB();
  const art = db.articles.find(a => a.id === id);
  if (!art) throw new Error(`Article not found: ${id}`);

  // Only one article can be featured at a time
  db.articles.forEach(a => { a.featured = a.id === id ? featured : false; });
  saveDB(db);

  console.log(`✓ ${featured ? 'Featured' : 'Unfeatured'}: "${art.title}"`);
  await generateAllPages(db);
}

async function doRegenerate(id) {
  if (!GROQ_KEY) throw new Error('GROQ_API_KEY not set');

  const db  = loadDB();
  const idx = db.articles.findIndex(a => a.id === id);
  if (idx === -1) throw new Error(`Article not found: ${id}`);

  const art = db.articles[idx];
  console.log(`Regenerating: "${art.title}"`);

  const prompt = `You are a senior content writer for ${SITE_NAME}, an AI & business automation agency.
Rewrite the following article with fresh, updated, SEO-optimized content.

Original Title: ${art.originalTitle || art.title}
Summary: ${art.summary || ''}
Category: ${art.category}

Return ONLY valid JSON (no markdown fences):
{
  "title": "New compelling SEO title max 60 chars",
  "metaDescription": "New meta description max 155 chars",
  "keywords": ["kw1","kw2","kw3","kw4","kw5"],
  "summary": "Updated 2-3 sentence summary",
  "content": "<article HTML with h2, h3, p, ul, li tags — min 400 words>",
  "tags": ["tag1","tag2","tag3","tag4","tag5"],
  "readTime": 3
}`;

  const res = await axios.post(
    GROQ_API_URL,
    {
      model:      GROQ_MODEL,
      messages:   [{ role: 'user', content: prompt }],
      temperature: 0.7,
      max_tokens:  GROQ_MAX_TOKENS,
    },
    {
      headers: { 'Authorization': `Bearer ${GROQ_KEY}`, 'Content-Type': 'application/json' },
      timeout: 30000,
    }
  );

  const raw    = res.data.choices[0]?.message?.content?.trim() || '';
  const json   = raw.replace(/^```(?:json)?\s*/i,'').replace(/\s*```$/i,'').trim();
  const parsed = JSON.parse(json.match(/\{[\s\S]*\}/)[0]);

  db.articles[idx] = {
    ...art,
    title:          parsed.title          || art.title,
    metaDescription:parsed.metaDescription|| art.metaDescription,
    keywords:       parsed.keywords       || art.keywords,
    summary:        parsed.summary        || art.summary,
    content:        parsed.content        || art.content,
    tags:           parsed.tags           || art.tags,
    readTime:       parsed.readTime       || art.readTime,
    createdAt:      new Date().toISOString(),
  };

  saveDB(db);
  console.log(`✓ Regenerated: "${db.articles[idx].title}"`);
  await generateAllPages(db);
}

function doDisableAuto() {
  fs.mkdirSync(path.dirname(FLAG_FILE), { recursive: true });
  fs.writeFileSync(FLAG_FILE, new Date().toISOString());
  console.log('✓ Auto-publish disabled');
}

function doEnableAuto() {
  if (fs.existsSync(FLAG_FILE)) fs.unlinkSync(FLAG_FILE);
  console.log('✓ Auto-publish enabled');
}

// ── Main ──────────────────────────────────────────────────────────────────

async function main() {
  const action    = process.env.ACTION?.trim();
  const articleId = process.env.ARTICLE_ID?.trim();

  if (!action) throw new Error('ACTION env var not set');
  console.log(`\n🔧 Admin: ${action}${articleId ? ` → ${articleId}` : ''}\n`);

  switch (action) {
    case 'delete':       await doDelete(articleId); break;
    case 'feature':      await doFeature(articleId, true); break;
    case 'unfeature':    await doFeature(articleId, false); break;
    case 'regenerate':   await doRegenerate(articleId); break;
    case 'disable-auto': doDisableAuto(); break;
    case 'enable-auto':  doEnableAuto(); break;
    default:
      throw new Error(`Unknown action: "${action}". Valid: delete | feature | unfeature | regenerate | disable-auto | enable-auto`);
  }

  console.log('\n✨ Done.\n');
}

main().catch(err => {
  console.error('\n❌', err.message);
  process.exit(1);
});
