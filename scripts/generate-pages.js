/**
 * TradeAura News Hub — Static Page Generator
 * Generates: news/[slug].html, news/index.html, homepage section, sitemap
 */

import fs   from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { CATEGORY_CONFIG, DEFAULT_CATEGORY, SITE_URL, SITE_NAME } from './news-config.js';

const __dirname  = path.dirname(fileURLToPath(import.meta.url));
const ROOT       = path.join(__dirname, '..');
const NEWS_DIR   = path.join(ROOT, 'news');
const DATA_FILE  = path.join(ROOT, 'data', 'news.json');
const INDEX_FILE = path.join(ROOT, 'index.html');
const SITEMAP    = path.join(ROOT, 'sitemap.xml');

// ── Helpers ───────────────────────────────────────────────────────────────

function esc(str = '') {
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function catCfg(cat) { return CATEGORY_CONFIG[cat] || DEFAULT_CATEGORY; }

function fmtDate(iso) {
  try {
    return new Date(iso).toLocaleDateString('en-IN', { year:'numeric', month:'long', day:'numeric' });
  } catch { return ''; }
}

function isoDate(iso) {
  try { return new Date(iso).toISOString().split('T')[0]; }
  catch { return new Date().toISOString().split('T')[0]; }
}

function catBadge(cat) {
  const c   = catCfg(cat);
  const pre = c.fab ? 'fab' : 'fas';
  return `<span class="cat-badge" style="background:${c.bg};border:1px solid ${c.border};color:${c.color}"><i class="${pre} ${c.icon}"></i>${esc(cat)}</span>`;
}

function heroImage(url, cat) {
  const c = catCfg(cat);
  const pre = c.fab ? 'fab' : 'fas';
  if (url) {
    return `<img src="${esc(url)}" alt="" loading="lazy" class="w-full h-full object-cover" onerror="this.parentElement.classList.add('img-fallback');this.remove()">`;
  }
  return `<div class="img-fallback w-full h-full" style="--cat-bg:${c.bg}"><i class="${pre} ${c.icon}" style="color:${c.color}"></i></div>`;
}

// ── Shared Page Chrome ────────────────────────────────────────────────────

function pageHead({ title, desc, canonical, ogImage, keywords, schema }) {
  return `<!DOCTYPE html>
<html lang="en" class="scroll-smooth">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">

  <!-- Primary SEO -->
  <title>${esc(title)}</title>
  <meta name="description" content="${esc(desc)}">
  ${keywords?.length ? `<meta name="keywords" content="${esc(keywords.join(', '))}">` : ''}
  <link rel="canonical" href="${canonical}">
  <meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large">

  <!-- Open Graph -->
  <meta property="og:type"        content="article">
  <meta property="og:url"         content="${canonical}">
  <meta property="og:title"       content="${esc(title)}">
  <meta property="og:description" content="${esc(desc)}">
  <meta property="og:image"       content="${ogImage || SITE_URL + '/assets/images/og-image.png'}">
  <meta property="og:site_name"   content="${SITE_NAME}">
  <meta property="og:locale"      content="en_IN">

  <!-- Twitter Card -->
  <meta name="twitter:card"        content="summary_large_image">
  <meta name="twitter:title"       content="${esc(title)}">
  <meta name="twitter:description" content="${esc(desc)}">
  <meta name="twitter:image"       content="${ogImage || SITE_URL + '/assets/images/og-image.png'}">

  ${schema ? `<!-- Structured Data -->\n  <script type="application/ld+json">${schema}</script>` : ''}

  <!-- Tailwind + Config -->
  <script src="https://cdn.tailwindcss.com"></script>
  <script>
    tailwind.config = {
      theme: {
        extend: {
          colors: {
            darkBase:'#0B0F19', brandBlue:'#3B82F6', brandPurple:'#8B5CF6',
            brandPink:'#EC4899', glassBg:'rgba(255,255,255,0.04)', glassBorder:'rgba(255,255,255,0.1)'
          },
          fontFamily: { sans:['Inter','sans-serif'], heading:['Outfit','sans-serif'] }
        }
      }
    }
  </script>

  <!-- Fonts & Icons -->
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&family=Outfit:wght@400;600;700;800;900&display=swap" rel="stylesheet">
  <link href="https://unpkg.com/aos@2.3.1/dist/aos.css" rel="stylesheet">
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
  <link rel="stylesheet" href="../css/style.css">
</head>`;
}

const BODY_BG = `<body class="bg-darkBase text-gray-100 font-sans antialiased overflow-x-hidden">
<div class="fixed inset-0 z-0 pointer-events-none grid-pattern opacity-20"></div>
<div class="fixed top-[-10%] left-[-5%] w-96 h-96 bg-brandBlue/20 rounded-full blur-[130px] z-0 orb-blue"></div>
<div class="fixed top-[40%] right-[-5%] w-80 h-80 bg-brandPurple/20 rounded-full blur-[120px] z-0 orb-purple"></div>
<div class="fixed bottom-[-5%] left-[30%] w-64 h-64 bg-brandPink/10 rounded-full blur-[140px] z-0 orb-pink"></div>`;

function nav(active) {
  const link = (href, label, isActive) =>
    `<a href="${href}" class="px-4 py-2 rounded-lg text-sm font-medium ${isActive ? 'text-white bg-white/5' : 'text-gray-300 hover:text-white hover:bg-white/5'} transition-all">${label}</a>`;

  return `
<nav class="fixed w-full z-50 bg-black/50 backdrop-blur-xl border-b border-glassBorder" id="navbar">
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
    <div class="flex items-center justify-between h-20">
      <a href="../index.html" class="flex items-center gap-3 group">
        <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-brandBlue to-brandPurple flex items-center justify-center font-heading font-black text-lg shadow-[0_0_20px_rgba(59,130,246,0.4)] group-hover:shadow-[0_0_30px_rgba(139,92,246,0.5)] transition-shadow">TA</div>
        <span class="font-heading font-bold text-xl">Tradeaura</span>
      </a>
      <div class="hidden lg:flex items-center gap-1">
        ${link('../index.html', 'Home', false)}
        ${link('../pages/services.html', 'Services', false)}
        ${link('../pages/industries.html', 'Industries', false)}
        ${link('index.html', 'News', active === 'news')}
        ${link('../pages/about.html', 'About', false)}
        ${link('../pages/contact.html', 'Contact', false)}
      </div>
      <a href="../pages/contact.html" class="hidden lg:inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-gradient-to-r from-brandBlue to-brandPurple text-white text-sm font-semibold hover:scale-105 transition-transform shadow-[0_0_20px_rgba(59,130,246,0.35)]">
        Book Free Demo
      </a>
      <button id="menuBtn" class="lg:hidden text-gray-300 hover:text-white p-2 rounded-lg hover:bg-white/5">
        <i id="menuIconOpen" class="fas fa-bars text-xl"></i>
        <i id="menuIconClose" class="fas fa-times text-xl hidden"></i>
      </button>
    </div>
  </div>
  <div id="mobileMenu" class="hidden lg:hidden border-t border-glassBorder bg-black/95 backdrop-blur-xl">
    <div class="px-4 pt-3 pb-6 space-y-1">
      <a href="../index.html"           class="block px-4 py-3 rounded-xl text-sm text-gray-300 hover:text-white hover:bg-white/5 transition-all">Home</a>
      <a href="../pages/services.html"  class="block px-4 py-3 rounded-xl text-sm text-gray-300 hover:text-white hover:bg-white/5 transition-all">Services</a>
      <a href="../pages/industries.html"class="block px-4 py-3 rounded-xl text-sm text-gray-300 hover:text-white hover:bg-white/5 transition-all">Industries</a>
      <a href="index.html"              class="block px-4 py-3 rounded-xl text-sm ${active === 'news' ? 'text-white bg-white/5' : 'text-gray-300 hover:text-white hover:bg-white/5'} transition-all">News & Insights</a>
      <a href="../pages/about.html"     class="block px-4 py-3 rounded-xl text-sm text-gray-300 hover:text-white hover:bg-white/5 transition-all">About</a>
      <a href="../pages/contact.html"   class="block px-4 py-3 rounded-xl text-sm text-gray-300 hover:text-white hover:bg-white/5 transition-all">Contact</a>
      <a href="../pages/contact.html"   class="block text-center px-4 py-3.5 mt-2 rounded-xl bg-gradient-to-r from-brandBlue to-brandPurple text-white text-sm font-semibold">Book Free Demo</a>
    </div>
  </div>
</nav>`;
}

const FOOTER = `
<footer class="relative z-10 border-t border-glassBorder bg-black/50 backdrop-blur-xl mt-20">
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
    <div class="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
      <div>
        <a href="../index.html" class="flex items-center gap-3 mb-4">
          <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-brandBlue to-brandPurple flex items-center justify-center font-heading font-black text-lg">TA</div>
          <span class="font-heading font-bold text-xl">Tradeaura</span>
        </a>
        <p class="text-gray-500 text-sm leading-relaxed">AI & business automation agency helping Indian SMBs scale with smart workflows and digital tools.</p>
      </div>
      <div>
        <h4 class="font-heading font-semibold text-white mb-4">Quick Links</h4>
        <ul class="space-y-2 text-sm">
          <li><a href="../pages/services.html"  class="text-gray-500 hover:text-white transition-colors">Services</a></li>
          <li><a href="index.html"              class="text-gray-500 hover:text-white transition-colors">Industry News</a></li>
          <li><a href="../pages/about.html"     class="text-gray-500 hover:text-white transition-colors">About</a></li>
          <li><a href="../pages/contact.html"   class="text-gray-500 hover:text-white transition-colors">Contact</a></li>
        </ul>
      </div>
      <div>
        <h4 class="font-heading font-semibold text-white mb-4">Get In Touch</h4>
        <div class="space-y-3 text-sm">
          <div class="flex items-center gap-2"><i class="fab fa-whatsapp text-green-400"></i><a href="https://wa.me/919587402524" target="_blank" class="text-gray-500 hover:text-white transition-colors">+91 95874 02524</a></div>
          <div class="flex items-center gap-2"><i class="fas fa-envelope text-brandBlue"></i><a href="mailto:helloajaychouhan@gmail.com" class="text-gray-500 hover:text-white transition-colors">helloajaychouhan@gmail.com</a></div>
          <div class="flex items-center gap-2"><i class="fas fa-globe text-brandPurple"></i><a href="https://www.auraautomation.site" class="text-gray-500 hover:text-white transition-colors">www.auraautomation.site</a></div>
        </div>
      </div>
    </div>
    <div class="pt-6 border-t border-glassBorder flex flex-col md:flex-row items-center justify-between gap-3 text-sm text-gray-600">
      <p>&copy; ${new Date().getFullYear()} Tradeaura Digital Solutions. All rights reserved.</p>
      <div class="flex gap-4">
        <a href="#" class="hover:text-gray-400 transition-colors">Privacy Policy</a>
        <a href="#" class="hover:text-gray-400 transition-colors">Terms of Service</a>
      </div>
    </div>
  </div>
</footer>
<a href="https://wa.me/919587402524" target="_blank" rel="noopener"
   class="whatsapp-fab fixed bottom-6 right-6 z-50 w-14 h-14 bg-green-500 rounded-full flex items-center justify-center text-white text-3xl shadow-[0_0_20px_rgba(34,197,94,0.5)] hover:scale-110 transition-transform duration-300" aria-label="Chat on WhatsApp">
  <i class="fab fa-whatsapp"></i>
</a>
<script src="https://unpkg.com/aos@2.3.1/dist/aos.js"></script>
<script src="../js/script.js"></script>
</body>
</html>`;

// ── Article Card (for index / homepage) ───────────────────────────────────

function articleCard(a, large = false) {
  const c    = catCfg(a.category);
  const date = fmtDate(a.publishedDate || a.createdAt);

  if (large) {
    return `
<a href="${esc(a.slug)}.html" class="group block glass-card border border-glassBorder rounded-2xl overflow-hidden hover:border-brandBlue/40 transition-all duration-300 hover:shadow-[0_0_40px_rgba(59,130,246,0.15)]" data-aos="fade-up">
  <div class="grid md:grid-cols-2">
    <div class="relative h-64 md:h-auto overflow-hidden img-wrap">
      ${heroImage(a.imageUrl, a.category)}
      <div class="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
      <div class="absolute top-4 left-4">${catBadge(a.category)}</div>
      ${a.featured ? '<div class="absolute top-4 right-4 px-3 py-1 rounded-full bg-gradient-to-r from-brandBlue to-brandPurple text-white text-xs font-bold">⭐ Featured</div>' : ''}
    </div>
    <div class="p-8 flex flex-col justify-between">
      <div>
        <div class="flex items-center gap-3 text-xs text-gray-500 mb-3">
          <span>${esc(date)}</span><span>·</span>
          <span>${esc(a.source)}</span><span>·</span>
          <span><i class="fas fa-clock mr-1"></i>${a.readTime || 3} min read</span>
        </div>
        <h2 class="font-heading font-bold text-2xl text-white mb-3 group-hover:text-brandBlue transition-colors leading-snug">${esc(a.title)}</h2>
        <p class="text-gray-400 text-sm leading-relaxed line-clamp-4">${esc(a.summary)}</p>
      </div>
      <div class="mt-6 flex items-center gap-4">
        ${a.keywords?.slice(0,2).map(k => `<span class="px-2 py-0.5 rounded text-[10px] font-medium bg-white/5 text-gray-500 border border-glassBorder">${esc(k)}</span>`).join('') || ''}
        <span class="ml-auto inline-flex items-center gap-1.5 text-sm font-semibold" style="color:${c.color}">
          Read Full Article <i class="fas fa-arrow-right text-xs group-hover:translate-x-1 transition-transform"></i>
        </span>
      </div>
    </div>
  </div>
</a>`;
  }

  return `
<a href="${esc(a.slug)}.html" class="group block glass-card border border-glassBorder rounded-2xl overflow-hidden hover:border-brandBlue/40 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_0_30px_rgba(59,130,246,0.1)]" data-aos="fade-up">
  <div class="relative h-44 overflow-hidden img-wrap">
    ${heroImage(a.imageUrl, a.category)}
    <div class="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent"></div>
    <div class="absolute top-3 left-3">${catBadge(a.category)}</div>
    ${a.featured ? '<div class="absolute top-3 right-3 px-2 py-0.5 rounded-full bg-gradient-to-r from-brandBlue to-brandPurple text-white text-[10px] font-bold">⭐</div>' : ''}
  </div>
  <div class="p-5">
    <div class="flex items-center gap-2 text-[10px] text-gray-600 mb-2">
      <span>${esc(date)}</span><span>·</span>
      <span>${esc(a.source)}</span><span>·</span>
      <span>${a.readTime || 3} min</span>
    </div>
    <h3 class="font-heading font-bold text-sm text-white mb-2 group-hover:text-brandBlue transition-colors leading-snug line-clamp-2">${esc(a.title)}</h3>
    <p class="text-gray-500 text-xs leading-relaxed line-clamp-2 mb-3">${esc(a.summary)}</p>
    <span class="inline-flex items-center gap-1.5 text-xs font-semibold" style="color:${c.color}">
      Read More <i class="fas fa-arrow-right text-[9px] group-hover:translate-x-0.5 transition-transform"></i>
    </span>
  </div>
</a>`;
}

// ── Article Page ──────────────────────────────────────────────────────────

function buildArticlePage(article, related = []) {
  const c      = catCfg(article.category);
  const url    = `${SITE_URL}/news/${article.slug}.html`;
  const date   = fmtDate(article.publishedDate || article.createdAt);
  const pre    = c.fab ? 'fab' : 'fas';

  const schema = JSON.stringify({
    '@context':        'https://schema.org',
    '@type':           'NewsArticle',
    headline:          article.title,
    description:       article.metaDescription,
    image:             article.imageUrl || `${SITE_URL}/assets/images/og-image.png`,
    datePublished:     article.publishedDate || article.createdAt,
    dateModified:      article.createdAt,
    author:            { '@type': 'Organization', name: SITE_NAME, url: SITE_URL },
    publisher:         { '@type': 'Organization', name: SITE_NAME, url: SITE_URL, logo: { '@type': 'ImageObject', url: `${SITE_URL}/assets/images/og-image.png` } },
    mainEntityOfPage:  { '@type': 'WebPage', '@id': url },
    keywords:          (article.keywords || []).join(', '),
    articleSection:    article.category,
    wordCount:         Math.round((article.content?.replace(/<[^>]+>/g,'') || '').split(/\s+/).length),
  }, null, 0);

  const breadcrumbSchema = JSON.stringify({
    '@context':   'https://schema.org',
    '@type':      'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home',     item: SITE_URL },
      { '@type': 'ListItem', position: 2, name: 'Insights', item: `${SITE_URL}/news/` },
      { '@type': 'ListItem', position: 3, name: article.title },
    ],
  }, null, 0);

  return `${pageHead({
    title:     `${article.title} | ${SITE_NAME} Insights`,
    desc:      article.metaDescription,
    canonical: url,
    ogImage:   article.imageUrl || '',
    keywords:  article.keywords,
    schema:    schema + '\n  <script type="application/ld+json">' + breadcrumbSchema + '</script>',
  })}
${BODY_BG}
${nav('article')}

<main class="relative z-10">

  <!-- Breadcrumb -->
  <div class="pt-28 pb-0 px-4">
    <div class="max-w-4xl mx-auto">
      <nav class="flex items-center gap-2 text-xs text-gray-500 mb-8" aria-label="Breadcrumb">
        <a href="../index.html" class="hover:text-white transition-colors">Home</a>
        <i class="fas fa-chevron-right text-[8px]"></i>
        <a href="index.html" class="hover:text-white transition-colors">Insights</a>
        <i class="fas fa-chevron-right text-[8px]"></i>
        <span class="text-gray-400 truncate max-w-[200px]" title="${esc(article.category)}">${esc(article.category)}</span>
      </nav>

      <!-- Meta row -->
      <div class="flex flex-wrap items-center gap-3 mb-5">
        ${catBadge(article.category)}
        <span class="text-xs text-gray-500">${esc(date)}</span>
        <span class="text-gray-700">·</span>
        <span class="text-xs text-gray-500">${esc(article.source)}</span>
        <span class="text-gray-700">·</span>
        <span class="text-xs text-gray-500"><i class="fas fa-clock mr-1"></i>${article.readTime || 3} min read</span>
      </div>

      <!-- Title -->
      <h1 class="font-heading font-black text-3xl md:text-5xl text-white leading-tight mb-5">
        ${esc(article.title)}
      </h1>

      <!-- Summary Lead -->
      <p class="text-lg text-gray-300 leading-relaxed mb-8 font-light">
        ${esc(article.summary)}
      </p>
    </div>
  </div>

  <!-- Hero Image -->
  ${article.imageUrl ? `
  <div class="px-4 mb-10">
    <div class="max-w-4xl mx-auto">
      <div class="relative rounded-2xl overflow-hidden h-72 md:h-[420px] img-wrap">
        <img src="${esc(article.imageUrl)}" alt="${esc(article.title)}" class="w-full h-full object-cover"
          onerror="this.parentElement.classList.add('img-fallback');this.remove()">
        <div class="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent"></div>
      </div>
    </div>
  </div>` : `
  <div class="px-4 mb-10">
    <div class="max-w-4xl mx-auto">
      <div class="relative rounded-2xl overflow-hidden h-48 img-fallback flex items-center justify-center" style="--cat-bg:${c.bg}">
        <i class="${pre} ${c.icon} text-7xl opacity-15" style="color:${c.color}"></i>
      </div>
    </div>
  </div>`}

  <!-- Content + Sidebar -->
  <div class="px-4 pb-12">
    <div class="max-w-4xl mx-auto grid lg:grid-cols-3 gap-10">

      <!-- Article Body -->
      <article class="lg:col-span-2">
        <div class="article-content">
          ${article.content}
        </div>

        <!-- Keywords -->
        ${article.keywords?.length ? `
        <div class="mt-8 pt-6 border-t border-glassBorder">
          <p class="text-xs text-gray-500 mb-3 font-medium">SEO Keywords</p>
          <div class="flex flex-wrap gap-2">
            ${article.keywords.map(k => `<span class="px-3 py-1 rounded-full text-xs font-medium bg-white/5 border border-glassBorder text-gray-400">${esc(k)}</span>`).join('')}
          </div>
        </div>` : ''}

        <!-- Source Attribution -->
        <div class="mt-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 glass-card border border-glassBorder rounded-2xl p-5">
          <div>
            <p class="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Original Source</p>
            <p class="text-sm font-semibold text-white">${esc(article.source)}</p>
          </div>
          <a href="${esc(article.originalUrl)}" target="_blank" rel="noopener noreferrer"
            class="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold border transition-all hover:scale-105 flex-shrink-0"
            style="border-color:${c.border};color:${c.color};background:${c.bg}">
            Read Original <i class="fas fa-external-link-alt text-xs"></i>
          </a>
        </div>

        <!-- Share + Back -->
        <div class="flex flex-wrap items-center gap-3 mt-6">
          <a href="index.html" class="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium border border-glassBorder text-gray-400 hover:text-white hover:border-white/20 transition-all">
            <i class="fas fa-arrow-left text-xs"></i> All Insights
          </a>
          <a href="../pages/contact.html" class="btn-primary inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-white text-sm font-semibold">
            <i class="fas fa-robot text-xs"></i> Automate My Business
          </a>
          <button onclick="shareArticle()" class="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium border border-glassBorder text-gray-400 hover:text-white hover:border-white/20 transition-all ml-auto">
            <i class="fas fa-share-alt text-xs"></i> Share
          </button>
        </div>
      </article>

      <!-- Sidebar -->
      <aside class="space-y-6">

        <!-- CTA -->
        <div class="glass-card border rounded-2xl p-6 text-center sticky top-24" style="border-color:${c.border};background:linear-gradient(135deg,${c.bg},rgba(0,0,0,0))">
          <div class="w-12 h-12 rounded-xl bg-gradient-to-br from-brandBlue to-brandPurple flex items-center justify-center mx-auto mb-4">
            <i class="fas fa-robot text-white text-xl"></i>
          </div>
          <h3 class="font-heading font-bold text-lg text-white mb-2">Automate This</h3>
          <p class="text-gray-400 text-xs leading-relaxed mb-5">Turn this insight into a real automation workflow for your business.</p>
          <a href="../pages/contact.html"
            class="block w-full py-3 rounded-xl bg-gradient-to-r from-brandBlue to-brandPurple text-white text-sm font-semibold hover:scale-105 transition-transform">
            Book Free Consultation
          </a>
          <a href="https://wa.me/919587402524" target="_blank"
            class="block w-full py-3 rounded-xl mt-3 bg-green-500/15 border border-green-500/30 text-green-400 text-sm font-semibold hover:bg-green-500/25 transition-colors">
            <i class="fab fa-whatsapp mr-1"></i> WhatsApp Us
          </a>
        </div>

        <!-- Related -->
        ${related.length ? `
        <div class="glass-card border border-glassBorder rounded-2xl p-6">
          <h3 class="font-heading font-semibold text-sm text-white mb-4">Related Articles</h3>
          <div class="space-y-4">
            ${related.map(r => {
              const rc = catCfg(r.category);
              const rp = rc.fab ? 'fab' : 'fas';
              return `
            <a href="${esc(r.slug)}.html" class="flex gap-3 group hover:bg-white/5 rounded-xl p-2 -mx-2 transition-all">
              <div class="w-16 h-14 rounded-lg overflow-hidden flex-shrink-0 img-wrap" style="min-width:64px">
                ${r.imageUrl ? `<img src="${esc(r.imageUrl)}" alt="" class="w-full h-full object-cover">` : `<div class="w-full h-full img-fallback flex items-center justify-center" style="--cat-bg:${rc.bg}"><i class="${rp} ${rc.icon} text-sm opacity-40" style="color:${rc.color}"></i></div>`}
              </div>
              <div class="flex-1 min-w-0">
                <p class="text-xs font-medium text-white line-clamp-2 group-hover:text-brandBlue transition-colors">${esc(r.title)}</p>
                <p class="text-[10px] text-gray-600 mt-1">${fmtDate(r.publishedDate || r.createdAt)}</p>
              </div>
            </a>`;
            }).join('')}
          </div>
        </div>` : ''}

      </aside>
    </div>
  </div>

</main>

${FOOTER}

<script>
function shareArticle() {
  if (navigator.share) {
    navigator.share({ title: '${esc(article.title).replace(/'/g,"\\'")}', url: window.location.href });
  } else {
    navigator.clipboard.writeText(window.location.href).then(() => {
      const btn = event.currentTarget;
      btn.innerHTML = '<i class="fas fa-check text-xs"></i> Copied!';
      setTimeout(() => btn.innerHTML = '<i class="fas fa-share-alt text-xs"></i> Share', 2000);
    });
  }
}
</script>`;
}

// ── News Index Page ───────────────────────────────────────────────────────

function buildNewsIndex(articles) {
  const featured   = articles.find(a => a.featured) || articles[0];
  const cats       = [...new Set(articles.map(a => a.category).filter(Boolean))];
  const lastUpdate = articles[0]?.createdAt ? fmtDate(articles[0].createdAt) : 'Recently';

  const schema = JSON.stringify({
    '@context':   'https://schema.org',
    '@type':      'CollectionPage',
    name:         `${SITE_NAME} Industry Insights Hub`,
    description:  'AI-rewritten industry news on automation, AI, SaaS, CRM, and digital transformation for Indian SMBs.',
    url:          `${SITE_URL}/news/`,
    publisher:    { '@type': 'Organization', name: SITE_NAME, url: SITE_URL },
  });

  return `${pageHead({
    title:     `Industry Insights & News | ${SITE_NAME}`,
    desc:      'AI-rewritten industry news on automation, AI, SaaS, CRM & digital transformation — updated every 6 hours for Indian business owners.',
    canonical: `${SITE_URL}/news/index.html`,
    keywords:  ['business automation news', 'AI news India', 'SaaS updates', 'CRM news', 'WhatsApp business'],
    schema,
  })}
${BODY_BG}
${nav('news')}

<!-- Hero -->
<section class="relative z-10 pt-36 pb-12 px-4 text-center">
  <div class="max-w-4xl mx-auto">
    <div class="label-badge mb-6 mx-auto w-fit">
      <span class="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"></span>
      AI-Rewritten · Updated Every 6 Hours
    </div>
    <h1 class="font-heading font-black text-5xl md:text-7xl tracking-tight mb-5">
      Industry<br><span class="gradient-text-animated">Insights Hub</span>
    </h1>
    <p class="text-lg text-gray-400 max-w-2xl mx-auto mb-3">
      AI-rewritten news in automation, AI, SaaS, CRM & marketing technology — business-focused analysis for Indian SMBs.
    </p>
    <p class="text-xs text-gray-600">Last updated: ${lastUpdate} · ${articles.length} articles</p>
  </div>
</section>

<!-- Category Filters -->
<section class="relative z-10 px-4 mb-8">
  <div class="max-w-7xl mx-auto">
    <div class="flex flex-wrap gap-2 justify-center" id="catFilters">
      <button onclick="filterCat('all')" data-cat="all"
        class="cat-btn px-4 py-2 rounded-full text-sm font-medium border border-brandBlue/40 bg-brandBlue/10 text-brandBlue transition-all">
        All Topics
      </button>
      ${cats.map(cat => {
        const c   = catCfg(cat);
        const pre = c.fab ? 'fab' : 'fas';
        return `<button onclick="filterCat('${esc(cat)}')" data-cat="${esc(cat)}"
          class="cat-btn px-4 py-2 rounded-full text-sm font-medium border border-glassBorder text-gray-400 hover:text-white hover:border-white/20 transition-all"
          data-color="${c.color}">
          <i class="${pre} ${c.icon} text-xs mr-1.5"></i>${esc(cat)}
        </button>`;
      }).join('\n      ')}
    </div>
  </div>
</section>

<!-- Featured -->
${featured ? `
<section class="relative z-10 px-4 mb-10">
  <div class="max-w-7xl mx-auto">
    <h2 class="font-heading font-bold text-lg text-white mb-5">
      <i class="fas fa-star text-brandBlue mr-2"></i>Featured Article
    </h2>
    ${articleCard(featured, true)}
  </div>
</section>` : ''}

<!-- Grid -->
<section class="relative z-10 px-4 pb-16">
  <div class="max-w-7xl mx-auto">
    <div class="flex items-center justify-between mb-6">
      <h2 class="font-heading font-bold text-lg text-white">
        <i class="fas fa-newspaper text-brandPurple mr-2"></i>Latest Articles
      </h2>
      <span id="countBadge" class="text-xs text-gray-500">${articles.length} articles</span>
    </div>
    <div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-6" id="grid">
      ${articles.map(a => `<div data-cat="${esc(a.category)}">${articleCard(a)}</div>`).join('\n      ')}
    </div>
    <div id="noResults" class="hidden text-center py-20 text-gray-500">
      <i class="fas fa-search text-4xl mb-4 block opacity-20"></i>
      No articles in this category yet. Check back soon.
    </div>
  </div>
</section>

<!-- CTA Strip -->
<section class="relative z-10 px-4 pb-20">
  <div class="max-w-3xl mx-auto glass-card border border-glassBorder rounded-3xl p-10 text-center">
    <div class="w-14 h-14 rounded-2xl bg-gradient-to-br from-brandBlue to-brandPurple flex items-center justify-center mx-auto mb-5">
      <i class="fas fa-robot text-white text-xl"></i>
    </div>
    <h2 class="font-heading font-bold text-3xl text-white mb-3">Ready to Automate?</h2>
    <p class="text-gray-400 mb-7 max-w-md mx-auto">Turn these industry insights into real automation for your business. Book a free strategy call.</p>
    <a href="../pages/contact.html" class="btn-primary inline-flex items-center gap-2 px-8 py-4 rounded-full text-white font-semibold">
      <i class="fas fa-calendar-alt"></i> Book Free Consultation
    </a>
  </div>
</section>

${FOOTER}

<script>
let activecat = 'all';
function filterCat(cat) {
  activecat = cat;
  const cards  = document.querySelectorAll('#grid > div[data-cat]');
  const btns   = document.querySelectorAll('.cat-btn');
  let   shown  = 0;

  btns.forEach(b => {
    const on  = b.dataset.cat === cat;
    b.classList.toggle('active', on);
    if (on) {
      const col = b.dataset.color || '#3B82F6';
      b.style.borderColor     = col;
      b.style.backgroundColor = col + '20';
      b.style.color           = col;
    } else {
      b.style.borderColor = b.style.backgroundColor = b.style.color = '';
    }
  });

  cards.forEach(card => {
    const show = cat === 'all' || card.dataset.cat === cat;
    card.style.display = show ? '' : 'none';
    if (show) shown++;
  });

  document.getElementById('countBadge').textContent = shown + ' articles';
  document.getElementById('noResults').classList.toggle('hidden', shown > 0);
}
</script>`;
}

// ── Homepage Section ──────────────────────────────────────────────────────

function buildHomepageSection(articles) {
  const featured = articles.find(a => a.featured) || articles[0];
  const latest   = articles.filter(a => a !== featured).slice(0, 6);

  return `
<!-- ════════════════════════════════════════════
     LATEST INDUSTRY INSIGHTS (AUTO-GENERATED)
════════════════════════════════════════════ -->
<!-- TRADEAURA_NEWS_SECTION_START -->
<section class="relative z-10 py-24 px-4">
  <div class="max-w-7xl mx-auto">

    <div class="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-12" data-aos="fade-up">
      <div>
        <div class="label-badge mb-4 w-fit">
          <span class="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"></span>
          AI-Rewritten · Every 6 Hours
        </div>
        <h2 class="font-heading font-bold text-4xl md:text-5xl">
          Latest Industry<br><span class="gradient-text">Insights</span>
        </h2>
      </div>
      <a href="news/index.html" class="btn-ghost inline-flex items-center gap-2 px-6 py-3 rounded-full text-white font-medium text-sm flex-shrink-0">
        View All ${articles.length} Articles <i class="fas fa-arrow-right text-xs"></i>
      </a>
    </div>

    <!-- Category Filters -->
    <div class="flex flex-wrap gap-2 mb-10" data-aos="fade-up">
      <button onclick="hFilter('all')" data-hcat="all" class="hcat-btn px-4 py-2 rounded-full text-sm font-medium border border-brandBlue/40 bg-brandBlue/10 text-brandBlue transition-all">All</button>
      ${[...new Set(articles.map(a => a.category))].slice(0, 5).map(cat => {
        const c   = catCfg(cat);
        const pre = c.fab ? 'fab' : 'fas';
        return `<button onclick="hFilter('${esc(cat)}')" data-hcat="${esc(cat)}" data-color="${c.color}"
          class="hcat-btn px-4 py-2 rounded-full text-sm font-medium border border-glassBorder text-gray-400 hover:text-white transition-all">
          <i class="${pre} ${c.icon} text-xs mr-1.5"></i>${esc(cat)}
        </button>`;
      }).join('\n      ')}
    </div>

    ${featured ? `
    <!-- Featured Article -->
    <div class="mb-8" data-aos="fade-up">
      <a href="news/${esc(featured.slug)}.html"
        class="group block glass-card border border-glassBorder rounded-2xl overflow-hidden hover:border-brandBlue/40 transition-all duration-300 hover:shadow-[0_0_40px_rgba(59,130,246,0.15)]">
        <div class="grid md:grid-cols-2">
          <div class="relative h-64 md:h-72 overflow-hidden img-wrap">
            ${heroImage(featured.imageUrl, featured.category)}
            <div class="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
            <div class="absolute top-4 left-4">${catBadge(featured.category)}</div>
            <div class="absolute top-4 right-4 px-3 py-1 rounded-full bg-gradient-to-r from-brandBlue to-brandPurple text-white text-xs font-bold">⭐ Featured</div>
          </div>
          <div class="p-8 flex flex-col justify-between">
            <div>
              <div class="flex items-center gap-2 text-xs text-gray-500 mb-3">
                <span>${fmtDate(featured.publishedDate || featured.createdAt)}</span>
                <span>·</span><span>${esc(featured.source)}</span>
                <span>·</span><span>${featured.readTime || 3} min read</span>
              </div>
              <h3 class="font-heading font-bold text-2xl text-white mb-3 group-hover:text-brandBlue transition-colors">${esc(featured.title)}</h3>
              <p class="text-gray-400 text-sm leading-relaxed line-clamp-3">${esc(featured.summary)}</p>
            </div>
            <span class="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-brandBlue">
              Read Full Article <i class="fas fa-arrow-right text-xs group-hover:translate-x-1 transition-transform"></i>
            </span>
          </div>
        </div>
      </a>
    </div>` : ''}

    <!-- Latest Grid -->
    <div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-5" id="homeGrid">
      ${latest.map(a => {
        const c   = catCfg(a.category);
        const pre = c.fab ? 'fab' : 'fas';
        return `
      <a href="news/${esc(a.slug)}.html" data-hcat="${esc(a.category)}"
        class="group block glass-card border border-glassBorder rounded-2xl overflow-hidden hover:border-brandBlue/40 transition-all duration-300 hover:-translate-y-1" data-aos="fade-up">
        <div class="relative h-44 overflow-hidden img-wrap">
          ${heroImage(a.imageUrl, a.category)}
          <div class="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent"></div>
          <div class="absolute top-3 left-3">${catBadge(a.category)}</div>
        </div>
        <div class="p-5">
          <p class="text-[10px] text-gray-600 mb-1.5">${fmtDate(a.publishedDate || a.createdAt)} · ${esc(a.source)}</p>
          <h3 class="font-heading font-bold text-sm text-white mb-2 group-hover:text-brandBlue transition-colors line-clamp-2">${esc(a.title)}</h3>
          <p class="text-gray-500 text-xs line-clamp-2 mb-3">${esc(a.summary)}</p>
          <span class="inline-flex items-center gap-1.5 text-xs font-semibold" style="color:${c.color}">
            Read More <i class="fas fa-arrow-right text-[9px]"></i>
          </span>
        </div>
      </a>`;
      }).join('')}
    </div>

    <div class="text-center mt-10" data-aos="fade-up">
      <a href="news/index.html" class="btn-primary inline-flex items-center gap-2 px-8 py-4 rounded-full text-white font-semibold">
        <i class="fas fa-newspaper"></i> Explore All ${articles.length} Insights
      </a>
    </div>
  </div>
</section>
<!-- TRADEAURA_NEWS_SECTION_END -->

<script>
function hFilter(cat) {
  document.querySelectorAll('.hcat-btn').forEach(b => {
    const on = b.dataset.hcat === cat;
    b.classList.toggle('active', on);
    if (on) { const col = b.dataset.color||'#3B82F6'; b.style.borderColor=col; b.style.backgroundColor=col+'20'; b.style.color=col; }
    else    { b.style.borderColor=b.style.backgroundColor=b.style.color=''; }
  });
  document.querySelectorAll('#homeGrid > a[data-hcat]').forEach(c => {
    c.style.display = (cat === 'all' || c.dataset.hcat === cat) ? '' : 'none';
  });
}
</script>`;
}

// ── Sitemap Generator ─────────────────────────────────────────────────────

function updateSitemap(articles) {
  const today = new Date().toISOString().split('T')[0];

  // Static pages (preserve original)
  const staticPages = [
    { loc: `${SITE_URL}/`,                              lastmod: '2026-05-01', priority: '1.0' },
    { loc: `${SITE_URL}/news/index.html`,               lastmod: today,        priority: '0.9' },
    { loc: `${SITE_URL}/pages/services.html`,           lastmod: '2026-05-01', priority: '0.8' },
    { loc: `${SITE_URL}/pages/compare.html`,            lastmod: '2026-05-01', priority: '0.8' },
    { loc: `${SITE_URL}/pages/industries.html`,         lastmod: '2026-05-01', priority: '0.8' },
    { loc: `${SITE_URL}/pages/about.html`,              lastmod: '2026-05-01', priority: '0.7' },
    { loc: `${SITE_URL}/pages/contact.html`,            lastmod: '2026-05-01', priority: '0.7' },
    { loc: `${SITE_URL}/pages/join.html`,               lastmod: '2026-05-01', priority: '0.6' },
  ];

  const articleUrls = articles
    .filter(a => a.status === 'published')
    .map(a => ({
      loc:      `${SITE_URL}/news/${a.slug}.html`,
      lastmod:  isoDate(a.createdAt || a.publishedDate),
      priority: a.featured ? '0.8' : '0.7',
    }));

  const allUrls = [...staticPages, ...articleUrls];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">
${allUrls.map(u => `  <url>
    <loc>${u.loc}</loc>
    <lastmod>${u.lastmod}</lastmod>
    <priority>${u.priority}</priority>
  </url>`).join('\n')}
</urlset>`;

  fs.writeFileSync(SITEMAP, xml);
}

// ── Main Export ───────────────────────────────────────────────────────────

export async function generateAllPages(db) {
  const articles = (db.articles || []).filter(a => a.status !== 'draft');
  console.log(`\n📄 Generating static pages for ${articles.length} articles...`);
  fs.mkdirSync(NEWS_DIR, { recursive: true });

  // 1. Individual article pages
  let genCount = 0;
  for (const article of articles) {
    const related = articles
      .filter(a => a.id !== article.id && a.category === article.category)
      .slice(0, 3);
    try {
      fs.writeFileSync(
        path.join(NEWS_DIR, `${article.slug}.html`),
        buildArticlePage(article, related)
      );
      // Mark as sitemap-added
      article.sitemapAdded = true;
      genCount++;
    } catch (e) {
      console.warn(`  ✗ Could not write ${article.slug}.html: ${e.message}`);
    }
  }
  console.log(`  ✓ ${genCount} article pages`);

  // 2. News index
  if (articles.length > 0) {
    fs.writeFileSync(path.join(NEWS_DIR, 'index.html'), buildNewsIndex(articles));
  }
  console.log('  ✓ news/index.html');

  // 3. Homepage section
  if (fs.existsSync(INDEX_FILE) && articles.length > 0) {
    let html    = fs.readFileSync(INDEX_FILE, 'utf-8');
    const block = buildHomepageSection(articles);
    if (html.includes('<!-- TRADEAURA_NEWS_SECTION_START -->')) {
      html = html.replace(
        /<!-- TRADEAURA_NEWS_SECTION_START -->[\s\S]*?<!-- TRADEAURA_NEWS_SECTION_END -->/,
        block.trim()
      );
    } else {
      html = html.replace(
        /<!-- ═+\s*\n\s*CTA BANNER/,
        `${block}\n\n<!-- ═══════════════════════════════════════════\n     CTA BANNER`
      );
    }
    fs.writeFileSync(INDEX_FILE, html);
    console.log('  ✓ index.html homepage section');
  }

  // 4. Sitemap
  updateSitemap(articles);
  console.log(`  ✓ sitemap.xml (${articles.length + 8} URLs)`);

  console.log(`\n🌐 Live: ${SITE_URL}/news/\n`);
}

// CLI entry
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  import('dotenv/config').then(() => {
    const db = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
    generateAllPages(db).catch(console.error);
  });
}
