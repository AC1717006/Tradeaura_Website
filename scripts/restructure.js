'use strict';
/**
 * restructure.js
 * Restructures TradeAura index.html to the new layout:
 *   Login Bar → Ticker → Navbar → Hero Slider → Instagram Strip → (all original sections) → Footer
 *
 * Run once: node scripts/restructure.js
 */

const fs   = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');

// Normalise CRLF → LF for predictable string matching
let html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8').replace(/\r\n/g, '\n');

// ─── helpers ─────────────────────────────────────────────────────────────────
function findBlock(startStr, endStr) {
  const si = html.indexOf(startStr);
  if (si === -1) throw new Error('Block start not found:\n  ' + startStr.slice(0, 80));
  const ei = html.indexOf(endStr, si + startStr.length);
  if (ei === -1) throw new Error('Block end not found after:\n  ' + startStr.slice(0, 80));
  return html.substring(si, ei + endStr.length);
}

// ─── 1. Extract blocks that must move ────────────────────────────────────────

// Ticker: the outer <div id="stockTicker"> closes after the last child <div class="ticker-time">
const TICKER_START = '<!-- ════════════════════════════════════════════\n     LIVE STOCK TICKER\n════════════════════════════════════════════ -->';
const TICKER_END   = 'id="tickerTime"></div>\n</div>';   // unique — outer closing tag
const tickerBlock  = findBlock(TICKER_START, TICKER_END);
console.log('Ticker captured:', tickerBlock.length, 'chars, ends with:', JSON.stringify(tickerBlock.slice(-30)));

// Instagram: whole section comment + <section class="ig-section"…</section>
const IG_START = '<!-- ════════════════════════════════════════════\n     INSTAGRAM FEED SECTION\n════════════════════════════════════════════ -->';
const IG_END   = '</section>';
const igBlock  = findBlock(IG_START, IG_END);
console.log('Instagram captured:', igBlock.length, 'chars');

// Old hero: comment + <section id="home"…</section>
const HERO_START  = '<!-- ════════════════════════════════════════════\n     HERO SECTION\n════════════════════════════════════════════ -->';
const HERO_END    = '</section>';
const oldHeroBlock = findBlock(HERO_START, HERO_END);
console.log('Old hero captured:', oldHeroBlock.length, 'chars');

// ─── 2. Remove the three blocks ───────────────────────────────────────────────
// Use a marker string that includes a trailing newline so we don't leave blank lines
function removeBlock(block) {
  // try removing with two trailing newlines, then one, then just the block
  if (html.includes(block + '\n\n')) { html = html.replace(block + '\n\n', ''); return; }
  if (html.includes(block + '\n'))   { html = html.replace(block + '\n',   ''); return; }
  html = html.replace(block, '');
}
removeBlock(tickerBlock);
removeBlock(igBlock);
removeBlock(oldHeroBlock);
console.log('After removal — lines:', html.split('\n').length);

// ─── 3. New elements ─────────────────────────────────────────────────────────

const LOGIN_BAR = `<!-- ════════════════════════════════════════════
     LOGIN BAR — topmost fixed element (z:60, top:0, height:36px)
════════════════════════════════════════════ -->
<div id="loginBar" style="position:fixed;top:0;left:0;right:0;z-index:60;
     height:36px;background:rgba(11,15,25,0.95);backdrop-filter:blur(8px);
     -webkit-backdrop-filter:blur(8px);
     border-bottom:1px solid rgba(255,255,255,0.08);
     display:flex;align-items:center;justify-content:flex-end;padding:0 24px;gap:10px;">
  <button style="font-size:12px;color:rgba(255,255,255,0.7);background:rgba(255,255,255,0.06);
          border:1px solid rgba(255,255,255,0.12);border-radius:6px;
          padding:4px 14px;cursor:pointer;font-family:'Inter',sans-serif;transition:all 0.2s;"
          onmouseover="this.style.background='rgba(255,255,255,0.1)'"
          onmouseout="this.style.background='rgba(255,255,255,0.06)'">
    Login
  </button>
  <button style="font-size:12px;color:#fff;background:linear-gradient(135deg,#3B82F6,#8B5CF6);
          border:none;border-radius:6px;padding:4px 14px;cursor:pointer;
          font-family:'Inter',sans-serif;">
    Sign Up Free
  </button>
</div>

`;

// The ticker block already contains the comment; we reuse it verbatim
const TICKER_INSERTION = tickerBlock + '\n\n';

const NEW_HERO = `<!-- ════════════════════════════════════════════
     HERO SECTION — full-screen slider
     3 slides · 4s auto-advance · live news panel
════════════════════════════════════════════ -->
<section id="hero" style="position:relative;min-height:100vh;overflow:hidden;display:flex;align-items:center;">

  <!-- Slide backgrounds -->
  <div id="heroSlider" style="position:absolute;inset:0;">
    <div class="hs-slide" style="position:absolute;inset:0;opacity:1;transition:opacity 1s ease;
         background:linear-gradient(135deg,#0B0F19 0%,#1a0a2e 100%);"></div>
    <div class="hs-slide" style="position:absolute;inset:0;opacity:0;transition:opacity 1s ease;
         background:linear-gradient(135deg,#0B0F19 0%,#0a1628 100%);"></div>
    <div class="hs-slide" style="position:absolute;inset:0;opacity:0;transition:opacity 1s ease;
         background:linear-gradient(135deg,#0B0F19 0%,#1a0f1f 100%);"></div>
  </div>

  <!-- Grid pattern -->
  <div style="position:absolute;inset:0;z-index:1;pointer-events:none;
       background-image:linear-gradient(rgba(255,255,255,0.02) 1px,transparent 1px),
                        linear-gradient(90deg,rgba(255,255,255,0.02) 1px,transparent 1px);
       background-size:50px 50px;"></div>

  <!-- Ambient orbs -->
  <div style="position:absolute;top:20%;left:5%;width:400px;height:400px;background:rgba(139,92,246,0.12);
       border-radius:50%;filter:blur(100px);pointer-events:none;z-index:1;"></div>
  <div style="position:absolute;bottom:10%;right:10%;width:320px;height:320px;background:rgba(59,130,246,0.1);
       border-radius:50%;filter:blur(80px);pointer-events:none;z-index:1;"></div>

  <!-- Content row: LEFT text + RIGHT news panel -->
  <div style="position:relative;z-index:2;width:100%;max-width:1200px;margin:0 auto;
              padding:160px 24px 80px;display:flex;align-items:center;
              justify-content:space-between;gap:40px;">

    <!-- LEFT: Slide text -->
    <div style="max-width:55%;min-width:0;">
      <div id="heroBadge" style="display:inline-block;background:rgba(139,92,246,0.15);
           border:1px solid rgba(139,92,246,0.4);color:#a78bfa;font-size:13px;
           padding:6px 18px;border-radius:20px;margin-bottom:24px;font-family:'Inter',sans-serif;">
        AI &amp; Business Automation
      </div>
      <h1 id="heroTitle" style="font-family:'Outfit',sans-serif;font-size:clamp(32px,4.5vw,58px);
          font-weight:800;color:#fff;line-height:1.12;margin-bottom:20px;">
        Automate Your Business.<br>
        <span style="background:linear-gradient(135deg,#60A5FA,#A78BFA,#F472B6);
              -webkit-background-clip:text;-webkit-text-fill-color:transparent;
              background-clip:text;">Scale Without Limits.</span>
      </h1>
      <p id="heroSub" style="font-family:'Inter',sans-serif;font-size:18px;
         color:rgba(255,255,255,0.6);line-height:1.7;margin-bottom:36px;max-width:480px;">
        WhatsApp · CRM · AI Workflows · Custom SaaS Solutions
      </p>
      <div style="display:flex;gap:16px;flex-wrap:wrap;">
        <a href="pages/contact.html"
           style="display:inline-flex;align-items:center;gap:8px;padding:14px 28px;
                  background:linear-gradient(135deg,#3B82F6,#8B5CF6);color:#fff;
                  border-radius:10px;font-size:15px;font-weight:600;text-decoration:none;
                  font-family:'Inter',sans-serif;box-shadow:0 4px 20px rgba(59,130,246,0.4);
                  transition:transform 0.2s,box-shadow 0.2s;"
           onmouseover="this.style.transform='translateY(-2px)'"
           onmouseout="this.style.transform='translateY(0)'">
          <i class="fas fa-calendar-alt"></i> Book Free Consultation
        </a>
        <a href="pages/services.html"
           style="display:inline-flex;align-items:center;gap:8px;padding:14px 28px;
                  background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.15);
                  color:#fff;border-radius:10px;font-size:15px;font-weight:500;
                  text-decoration:none;font-family:'Inter',sans-serif;">
          View Solutions
        </a>
      </div>
    </div>

    <!-- RIGHT: Live news panel -->
    <div id="heroNewsCard" style="width:280px;flex-shrink:0;background:rgba(255,255,255,0.04);
                backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);
                border:1px solid rgba(255,255,255,0.1);border-radius:16px;padding:20px;">
      <div style="font-size:11px;color:#a78bfa;font-weight:700;letter-spacing:1.2px;
                  text-transform:uppercase;margin-bottom:14px;font-family:'Inter',sans-serif;
                  display:flex;align-items:center;gap:6px;">
        <span style="width:6px;height:6px;border-radius:50%;background:#10B981;
                     display:inline-block;animation:newsLivePulse 1.5s ease-in-out infinite;"></span>
        📰 Live Updates
      </div>
      <div id="heroNewsPanel" style="font-size:12px;color:rgba(255,255,255,0.35);
           font-family:'Inter',sans-serif;min-height:120px;">
        Loading news…
      </div>
      <a href="news/index.html"
         style="display:block;margin-top:14px;padding-top:10px;
                border-top:1px solid rgba(255,255,255,0.06);
                font-size:12px;color:#3B82F6;text-decoration:none;
                font-family:'Inter',sans-serif;">
        View all news →
      </a>
    </div>

  </div><!-- /content row -->

  <!-- Slide dots -->
  <div style="position:absolute;bottom:28px;left:50%;transform:translateX(-50%);
              display:flex;gap:8px;z-index:3;">
    <button class="hs-dot" onclick="goHeroSlide(0)"
            style="width:24px;height:6px;border-radius:3px;background:#fff;
                   border:none;cursor:pointer;transition:all 0.3s;padding:0;"></button>
    <button class="hs-dot" onclick="goHeroSlide(1)"
            style="width:8px;height:6px;border-radius:3px;background:rgba(255,255,255,0.3);
                   border:none;cursor:pointer;transition:all 0.3s;padding:0;"></button>
    <button class="hs-dot" onclick="goHeroSlide(2)"
            style="width:8px;height:6px;border-radius:3px;background:rgba(255,255,255,0.3);
                   border:none;cursor:pointer;transition:all 0.3s;padding:0;"></button>
  </div>

</section>

`;

// Instagram block is reused verbatim (captured above)
const IG_INSERTION = igBlock + '\n\n';

// ─── 4. Projects dropdown HTML for navbar ─────────────────────────────────────
const PROJECTS_DROPDOWN = `
        <!-- Projects Dropdown -->
        <div class="nav-dropdown-wrapper" style="position:relative;">
          <button id="projectsBtn" style="background:none;border:none;cursor:pointer;color:rgba(255,255,255,0.8);font-size:14px;font-family:'Inter',sans-serif;display:flex;align-items:center;gap:4px;padding:8px 12px;border-radius:8px;transition:color 0.2s,background 0.2s;"
                  onmouseover="this.style.color='#fff';this.style.background='rgba(255,255,255,0.05)'"
                  onmouseout="this.style.color='rgba(255,255,255,0.8)';this.style.background='transparent'">
            Projects <i class="fas fa-chevron-down" style="font-size:10px;"></i>
          </button>
          <div id="projectsDropdown" style="display:none;position:absolute;top:calc(100% + 8px);left:0;min-width:260px;
               background:rgba(11,15,25,0.97);backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);
               border:1px solid rgba(255,255,255,0.1);border-radius:14px;padding:8px;z-index:300;
               box-shadow:0 20px 60px rgba(0,0,0,0.5);">
            <a href="#solutions" onclick="document.getElementById('projectsDropdown').style.display='none'" style="display:flex;align-items:center;gap:12px;padding:10px 12px;border-radius:8px;color:rgba(255,255,255,0.85);text-decoration:none;font-size:13px;font-family:'Inter',sans-serif;transition:background 0.2s;"
               onmouseover="this.style.background='rgba(139,92,246,0.15)'" onmouseout="this.style.background='transparent'">
              <i class="fas fa-th-large" style="color:#8B5CF6;width:16px;font-size:14px;"></i>
              <div><div style="font-weight:500;">Solutions Explorer</div><div style="font-size:11px;color:rgba(255,255,255,0.4);margin-top:2px;">All 8 automation services</div></div>
            </a>
            <a href="#dashboard" onclick="document.getElementById('projectsDropdown').style.display='none'" style="display:flex;align-items:center;gap:12px;padding:10px 12px;border-radius:8px;color:rgba(255,255,255,0.85);text-decoration:none;font-size:13px;font-family:'Inter',sans-serif;transition:background 0.2s;"
               onmouseover="this.style.background='rgba(59,130,246,0.15)'" onmouseout="this.style.background='transparent'">
              <i class="fas fa-chart-bar" style="color:#3B82F6;width:16px;font-size:14px;"></i>
              <div><div style="font-weight:500;">Live Dashboard Preview</div><div style="font-size:11px;color:rgba(255,255,255,0.4);margin-top:2px;">CRM, WhatsApp &amp; Revenue tabs</div></div>
            </a>
            <a href="#process" onclick="document.getElementById('projectsDropdown').style.display='none'" style="display:flex;align-items:center;gap:12px;padding:10px 12px;border-radius:8px;color:rgba(255,255,255,0.85);text-decoration:none;font-size:13px;font-family:'Inter',sans-serif;transition:background 0.2s;"
               onmouseover="this.style.background='rgba(236,72,153,0.15)'" onmouseout="this.style.background='transparent'">
              <i class="fas fa-rocket" style="color:#EC4899;width:16px;font-size:14px;"></i>
              <div><div style="font-weight:500;">How It Works</div><div style="font-size:11px;color:rgba(255,255,255,0.4);margin-top:2px;">Discovery to launch in days</div></div>
            </a>
            <a href="#featured-project" onclick="document.getElementById('projectsDropdown').style.display='none'" style="display:flex;align-items:center;gap:12px;padding:10px 12px;border-radius:8px;color:rgba(255,255,255,0.85);text-decoration:none;font-size:13px;font-family:'Inter',sans-serif;transition:background 0.2s;"
               onmouseover="this.style.background='rgba(245,158,11,0.15)'" onmouseout="this.style.background='transparent'">
              <i class="fas fa-star" style="color:#F59E0B;width:16px;font-size:14px;"></i>
              <div><div style="font-weight:500;">12-Week Dashboard</div><div style="font-size:11px;color:rgba(255,255,255,0.4);margin-top:2px;">Featured execution system</div></div>
            </a>
          </div>
        </div>
`;

// ─── 5. All new JS + CSS injected before </body> ──────────────────────────────
const INJECTED = `
<style>
  /* Scroll offset so fixed header stack doesn't overlap anchor targets */
  #solutions, #dashboard, #process, #featured-project { scroll-margin-top: 170px; }

  /* Hero live-dot pulse */
  @keyframes newsLivePulse { 0%,100%{opacity:1} 50%{opacity:0.3} }

  /* Instagram horizontal strip */
  #igGrid {
    display: flex !important;
    flex-direction: row !important;
    flex-wrap: nowrap !important;
    overflow: hidden !important;
    gap: 14px !important;
    animation: igHorizScroll linear infinite 24s;
  }
  #igGrid:hover { animation-play-state: paused; }
  #igGrid .ig-post,
  #igGrid .ig-post-skeleton {
    flex: 0 0 185px !important;
    min-width: 185px !important;
    height: 185px !important;
    border-radius: 12px !important;
  }
  @keyframes igHorizScroll {
    from { transform: translateX(0); }
    to   { transform: translateX(-50%); }
  }
  /* Mobile responsive */
  @media (max-width: 900px) {
    #heroNewsCard { display: none !important; }
    #hero > div > div:first-child { max-width: 100% !important; }
  }
  @media (max-width: 600px) {
    #heroTitle { font-size: 28px !important; }
    #heroSub   { font-size: 15px !important; }
  }
</style>

<script>
/* ── Hero Slider ──────────────────────────────────────────────────────────── */
(function () {
  'use strict';
  var GRAD = 'background:linear-gradient(135deg,#60A5FA,#A78BFA,#F472B6);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;';
  var slides = [
    { badge:'AI & Business Automation',
      title:'Automate Your Business.<br><span style="'+GRAD+'">Scale Without Limits.</span>',
      sub:'WhatsApp · CRM · AI Workflows · Custom SaaS Solutions' },
    { badge:'WhatsApp Automation',
      title:'Engage Customers 24/7<br><span style="'+GRAD+'">Without Any Staff.</span>',
      sub:'Smart Chatbots · Broadcasts · Lead Follow-ups · CRM Integration' },
    { badge:'Custom SaaS Dashboards',
      title:'Your Business Dashboard,<br><span style="'+GRAD+'">Built in 7 Days.</span>',
      sub:'CRM · Lead Tracking · Revenue Intelligence · Real-time Reports' }
  ];
  var cur = 0;

  window.goHeroSlide = function (n) {
    document.querySelectorAll('#heroSlider .hs-slide').forEach(function (s, i) {
      s.style.opacity = i === n ? '1' : '0';
    });
    document.querySelectorAll('.hs-dot').forEach(function (d, i) {
      d.style.width      = i === n ? '24px' : '8px';
      d.style.background = i === n ? '#fff' : 'rgba(255,255,255,0.3)';
    });
    var el = function(id){ return document.getElementById(id); };
    if (el('heroBadge')) el('heroBadge').textContent = slides[n].badge;
    if (el('heroTitle')) el('heroTitle').innerHTML   = slides[n].title;
    if (el('heroSub'))   el('heroSub').textContent   = slides[n].sub;
    cur = n;
  };

  setInterval(function () { goHeroSlide((cur + 1) % 3); }, 4000);
})();

/* ── Hero News Panel ─────────────────────────────────────────────────────── */
(function () {
  'use strict';
  var panel = document.getElementById('heroNewsPanel');
  if (!panel) return;
  var COLORS = {
    'AI & Automation':'#8B5CF6','SaaS & Software':'#3B82F6',
    'Business Tools':'#10B981','Digital Transformation':'#F59E0B',
    'MarTech':'#EC4899','CRM & Sales':'#06B6D4','WhatsApp Business':'#22C55E',
    'Meta & Advertising':'#EC4899','Google & Marketing':'#EF4444'
  };
  function render(items) {
    panel.style.opacity = '0';
    setTimeout(function () {
      panel.innerHTML = items.map(function (a) {
        var c   = COLORS[a.category] || '#3B82F6';
        var url = a.slug ? 'news/' + a.slug + '.html' : 'news/index.html';
        return '<a href="' + url + '" style="display:block;padding:9px 0;border-bottom:1px solid rgba(255,255,255,0.05);text-decoration:none;">'
             + '<span style="font-size:10px;padding:2px 8px;border-radius:10px;background:' + c + '22;color:' + c + ';font-family:Inter,sans-serif;">' + (a.category || 'News') + '</span>'
             + '<p style="font-size:12px;color:rgba(255,255,255,0.8);margin:5px 0 0;line-height:1.5;font-family:Inter,sans-serif;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;">' + a.title + '</p>'
             + '</a>';
      }).join('');
      panel.style.opacity = '1';
      panel.style.transition = 'opacity 0.3s';
    }, 200);
  }
  fetch('data/news.json').then(function (r) { return r.json(); }).then(function (raw) {
    var list = (Array.isArray(raw) ? raw : (raw.articles || []))
      .filter(function (a) { return (a.status === 'published' || !a.status) && a.title; })
      .sort(function (a, b) { return new Date(b.createdAt) - new Date(a.createdAt); });
    if (!list.length) return;
    var idx = 0;
    render(list.slice(0, 3));
    setInterval(function () {
      idx = (idx + 3) % list.length;
      render(list.slice(idx, idx + 3).concat(list).slice(0, 3));
    }, 3000);
  }).catch(function () {
    panel.innerHTML = '<span style="color:rgba(255,255,255,0.3);font-size:12px;">News unavailable</span>';
  });
})();

/* ── Instagram Horizontal Strip — duplicate items for CSS loop ────────────── */
(function () {
  'use strict';
  var grid = document.getElementById('igGrid');
  if (!grid) return;
  var ready = false;
  var obs = new MutationObserver(function () {
    if (ready) return;
    var posts = grid.querySelectorAll('a.ig-post');
    if (posts.length < 3) return;
    ready = true;
    obs.disconnect();
    Array.from(posts).forEach(function (p) { grid.appendChild(p.cloneNode(true)); });
    var dur = Math.max(12, posts.length * 199 / 40);
    grid.style.animationDuration = dur + 's';
  });
  obs.observe(grid, { childList: true });
})();

/* ── Projects Dropdown Toggle ─────────────────────────────────────────────── */
(function () {
  'use strict';
  var btn = document.getElementById('projectsBtn');
  var dd  = document.getElementById('projectsDropdown');
  if (!btn || !dd) return;
  btn.addEventListener('click', function (e) {
    e.stopPropagation();
    dd.style.display = dd.style.display === 'block' ? 'none' : 'block';
  });
  document.addEventListener('click', function () { dd.style.display = 'none'; });
})();
</script>`;

// ─── 6. Apply all changes to the HTML ────────────────────────────────────────

// 6a. Login bar before ambient background
const AMBIENT = '<!-- ════════════════════════════════════════════\n     AMBIENT BACKGROUND';
if (!html.includes(AMBIENT)) throw new Error('Ambient comment not found');
html = html.replace(AMBIENT, LOGIN_BAR + AMBIENT);

// 6b. Ticker before navigation comment
const NAV_CMT = '<!-- ════════════════════════════════════════════\n     NAVIGATION';
if (!html.includes(NAV_CMT)) throw new Error('Navigation comment not found');
html = html.replace(NAV_CMT, TICKER_INSERTION + NAV_CMT);

// 6c. Projects dropdown in desktop nav: insert between Industries link and About link
const IND_LINK = '<a href="pages/industries.html" class="px-4 py-2 rounded-lg text-sm font-medium text-gray-300 hover:text-white hover:bg-white/5 transition-all">Industries</a>';
const ABT_LINK = '\n        <a href="pages/about.html"';
if (!html.includes(IND_LINK)) throw new Error('Industries link not found');
html = html.replace(IND_LINK + ABT_LINK, IND_LINK + PROJECTS_DROPDOWN + ABT_LINK);

// 6d. Projects link in mobile menu (between Industries and About)
const MOB_IND = '<a href="pages/industries.html" class="block px-4 py-3 rounded-xl text-sm font-medium text-gray-300 hover:text-white hover:bg-white/5 transition-all">Industries</a>';
const MOB_ABT = '\n      <a href="pages/about.html" class="block';
if (html.includes(MOB_IND + MOB_ABT)) {
  const MOB_PROJ = `
      <div style="padding:4px 16px 8px;">
        <div style="font-size:10px;font-weight:700;color:rgba(255,255,255,0.3);letter-spacing:1px;text-transform:uppercase;margin-bottom:4px;">Projects</div>
        <a href="#solutions" style="display:flex;align-items:center;gap:8px;padding:6px 0;font-size:13px;color:rgba(255,255,255,0.65);text-decoration:none;font-family:'Inter',sans-serif;"><i class="fas fa-th-large" style="color:#8B5CF6;width:14px;font-size:12px;"></i>Solutions Explorer</a>
        <a href="#dashboard" style="display:flex;align-items:center;gap:8px;padding:6px 0;font-size:13px;color:rgba(255,255,255,0.65);text-decoration:none;font-family:'Inter',sans-serif;"><i class="fas fa-chart-bar" style="color:#3B82F6;width:14px;font-size:12px;"></i>Live Dashboard</a>
        <a href="#process"   style="display:flex;align-items:center;gap:8px;padding:6px 0;font-size:13px;color:rgba(255,255,255,0.65);text-decoration:none;font-family:'Inter',sans-serif;"><i class="fas fa-rocket" style="color:#EC4899;width:14px;font-size:12px;"></i>How It Works</a>
        <a href="#featured-project" style="display:flex;align-items:center;gap:8px;padding:6px 0;font-size:13px;color:rgba(255,255,255,0.65);text-decoration:none;font-family:'Inter',sans-serif;"><i class="fas fa-star" style="color:#F59E0B;width:14px;font-size:12px;"></i>12-Week Dashboard</a>
      </div>`;
  html = html.replace(MOB_IND + MOB_ABT, MOB_IND + MOB_PROJ + MOB_ABT);
}

// 6e. New hero + Instagram before Trust Stats
const TRUST = '<!-- ════════════════════════════════════════════\n     TRUST STATS SECTION';
if (!html.includes(TRUST)) throw new Error('Trust stats comment not found');
html = html.replace(TRUST, NEW_HERO + IG_INSERTION + TRUST);

// 6f. Inject styles + JS before </body>
if (!html.includes('\n</body>')) throw new Error('</body> not found');
html = html.replace('\n</body>', '\n' + INJECTED + '\n</body>');

// ─── 7. Write ─────────────────────────────────────────────────────────────────
fs.writeFileSync(path.join(ROOT, 'index.html'), html, 'utf8');
console.log('Done! Lines:', html.split('\n').length);
