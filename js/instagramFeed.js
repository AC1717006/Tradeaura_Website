/**
 * instagramFeed.js — TradeAura Instagram Feed Component
 *
 * Fetches /api/instagram (backend proxy — never calls Instagram directly),
 * renders the profile card + post grid, and handles all UI states.
 *
 * API URL follows the same resolution pattern as stockTicker.js:
 *  - localhost/127.0.0.1  → http://localhost:3001
 *  - production           → reads data-api attribute on #igFeedRoot
 */

/* global fetch */

const InstagramFeed = (() => {
  // ── Config ───────────────────────────────────────────────────────────────
  const API_PATH   = '/api/instagram';
  const LOCAL_HOST = 'http://localhost:3001';
  const IG_PROFILE = 'https://www.instagram.com/tradeauradigitalsolutions/';

  // ── State ─────────────────────────────────────────────────────────────────
  let root        = null;   // #igFeedRoot element
  let currentTab  = 'all';  // 'all' | 'posts' | 'reels'
  let allMedia    = [];     // full media array from API

  // ── URL Resolution ────────────────────────────────────────────────────────

  function resolveApiBase() {
    const host = window.location.hostname;
    if (host === 'localhost' || host === '127.0.0.1') return LOCAL_HOST;
    const attr = root?.dataset?.api?.trim();
    return attr || 'https://tradeaura.vercel.app';
  }

  // ── Number formatting (1200 → 1.2K) ──────────────────────────────────────

  function fmtNum(n) {
    if (n == null) return '—';
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
    if (n >= 1_000)     return (n / 1_000).toFixed(1).replace(/\.0$/, '') + 'K';
    return String(n);
  }

  function timeAgo(iso) {
    const diff = Date.now() - new Date(iso).getTime();
    const d = Math.floor(diff / 86400000);
    if (d === 0) return 'Today';
    if (d === 1) return '1d ago';
    if (d < 7)   return `${d}d ago`;
    if (d < 30)  return `${Math.floor(d / 7)}w ago`;
    if (d < 365) return `${Math.floor(d / 30)}mo ago`;
    return `${Math.floor(d / 365)}y ago`;
  }

  // ── Skeleton loading state ────────────────────────────────────────────────

  function renderSkeleton() {
    const grid = root?.querySelector('#igGrid');
    const prof = root?.querySelector('#igProfileArea');
    if (!grid || !prof) return;

    prof.innerHTML = `
      <div class="ig-profile-card">
        <div class="ig-avatar-skeleton" style="margin:0 auto 16px;"></div>
        <div style="height:16px;border-radius:8px;background:rgba(255,255,255,0.06);margin-bottom:8px;width:60%;margin-left:auto;margin-right:auto;"></div>
        <div style="height:11px;border-radius:6px;background:rgba(255,255,255,0.04);margin-bottom:20px;width:40%;margin-left:auto;margin-right:auto;"></div>
        <div style="height:44px;border-radius:14px;background:rgba(228,64,95,0.18);"></div>
      </div>`;

    grid.innerHTML = Array(6).fill('<div class="ig-post-skeleton"></div>').join('');
  }

  // ── Profile card ──────────────────────────────────────────────────────────

  function renderProfile(profile) {
    const area = root?.querySelector('#igProfileArea');
    if (!area) return;

    const avatarHtml = profile.profilePictureUrl
      ? `<div class="ig-avatar-ring">
           <img class="ig-avatar"
                src="${profile.profilePictureUrl}"
                alt="${profile.username} profile picture"
                loading="lazy"
                width="84" height="84"
                onerror="this.parentElement.innerHTML='<div style=\'width:84px;height:84px;border-radius:50%;background:linear-gradient(135deg,#E1306C,#833AB4,#405DE6);display:flex;align-items:center;justify-content:center;font-size:28px;\'>📸</div>'">
         </div>`
      : `<div class="ig-avatar-ring">
           <div style="width:84px;height:84px;border-radius:50%;background:linear-gradient(135deg,#E1306C,#833AB4,#405DE6);display:flex;align-items:center;justify-content:center;font-size:28px;border:3px solid #0B0F19;">📸</div>
         </div>`;

    area.innerHTML = `
      <div class="ig-profile-card">
        <div class="ig-avatar-wrap">
          ${avatarHtml}
          <div class="ig-avatar-verified" title="Instagram">
            <i class="fab fa-instagram" style="font-size:11px;"></i>
          </div>
        </div>

        <div class="ig-username">${profile.name || 'TradeAura Digital Solutions'}</div>
        <div class="ig-handle">@${profile.username}</div>
        ${profile.biography
          ? `<p class="ig-bio">${profile.biography}</p>`
          : `<p class="ig-bio">AI & Business Automation Agency · WhatsApp · CRM · SaaS</p>`}

        <div class="ig-stats">
          <div class="ig-stat">
            <span class="ig-stat-value">${fmtNum(profile.mediaCount)}</span>
            <span class="ig-stat-label">Posts</span>
          </div>
          <div class="ig-stat">
            <span class="ig-stat-value">${fmtNum(profile.followersCount)}</span>
            <span class="ig-stat-label">Followers</span>
          </div>
        </div>

        <a href="${IG_PROFILE}" target="_blank" rel="noopener noreferrer"
           class="ig-follow-btn">
          <i class="fab fa-instagram"></i> Follow on Instagram
        </a>
        <a href="${IG_PROFILE}" target="_blank" rel="noopener noreferrer"
           class="ig-view-profile">
          View full profile <i class="fas fa-external-link-alt" style="font-size:9px;"></i>
        </a>
      </div>`;
  }

  // ── Individual post card ──────────────────────────────────────────────────

  function buildPostCard(post) {
    const imgSrc   = post.thumbnailUrl || post.mediaUrl || '';
    const caption  = post.caption ? `<p class="ig-post-caption">${post.caption}</p>` : '';
    const reelBadge = post.isReel
      ? `<div class="ig-post-type" title="Reel"><i class="fas fa-film"></i></div>
         <div class="ig-play-btn"><i class="fas fa-play" style="margin-left:3px;"></i></div>`
      : '';
    const carouselBadge = post.isCarousel
      ? `<div class="ig-post-carousel" title="Carousel"><i class="fas fa-images"></i></div>`
      : '';

    // Accessibility-friendly — keyboard navigable
    return `
      <a class="ig-post"
         href="${post.permalink}"
         target="_blank"
         rel="noopener noreferrer"
         aria-label="${post.isReel ? 'Instagram Reel' : 'Instagram post'}${post.caption ? ': ' + post.caption.substring(0, 60) : ''}"
         data-type="${post.mediaType}">

        <img class="ig-post-img"
             src="${imgSrc}"
             alt="${post.isReel ? 'Reel' : 'Post'} — ${timeAgo(post.timestamp)}"
             loading="lazy"
             decoding="async"
             width="300" height="300"
             onerror="this.style.display='none'">

        ${reelBadge}
        ${carouselBadge}

        <div class="ig-post-overlay">
          ${caption}
        </div>
      </a>`;
  }

  // ── Grid render ───────────────────────────────────────────────────────────

  function renderGrid(media) {
    const grid = root?.querySelector('#igGrid');
    if (!grid) return;

    const filtered = currentTab === 'all'   ? media
                   : currentTab === 'reels' ? media.filter(m => m.isReel)
                   :                          media.filter(m => !m.isReel);

    if (filtered.length === 0) {
      grid.innerHTML = `
        <div class="ig-error">
          <i class="fab fa-instagram" style="font-size:32px;color:rgba(255,255,255,0.15);display:block;margin-bottom:12px;"></i>
          No ${currentTab === 'reels' ? 'reels' : 'posts'} to display yet.
          <br><a href="${IG_PROFILE}" target="_blank" rel="noopener">Visit our Instagram →</a>
        </div>`;
      return;
    }

    grid.innerHTML = filtered.map(buildPostCard).join('');
  }

  // ── Tab switching ─────────────────────────────────────────────────────────

  function initTabs() {
    root?.querySelectorAll('.ig-tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        currentTab = btn.dataset.tab;
        root.querySelectorAll('.ig-tab-btn').forEach(b => b.classList.toggle('active', b === btn));
        renderGrid(allMedia);
      });
    });
  }

  // ── Error state ───────────────────────────────────────────────────────────

  function renderError(msg) {
    const grid = root?.querySelector('#igGrid');
    const prof = root?.querySelector('#igProfileArea');

    if (prof) prof.innerHTML = `
      <div class="ig-profile-card" style="text-align:center;">
        <div style="font-size:40px;margin-bottom:12px;">📸</div>
        <div class="ig-username">TradeAura</div>
        <div class="ig-handle">@tradeauradigitalsolutions</div>
        <a href="${IG_PROFILE}" target="_blank" rel="noopener noreferrer"
           class="ig-follow-btn" style="margin-top:20px;">
          <i class="fab fa-instagram"></i> Follow on Instagram
        </a>
      </div>`;

    if (grid) grid.innerHTML = `
      <div class="ig-error">
        <i class="fab fa-instagram" style="font-size:36px;color:rgba(255,255,255,0.12);display:block;margin-bottom:12px;"></i>
        Feed loading… <a href="${IG_PROFILE}" target="_blank" rel="noopener">Visit Instagram directly →</a>
      </div>`;
  }

  // ── Main fetch & render ───────────────────────────────────────────────────

  async function load() {
    const apiBase = resolveApiBase();
    const url     = `${apiBase}${API_PATH}`;

    try {
      const res  = await fetch(url, { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const json = await res.json();
      if (json.error) throw new Error(json.error);

      allMedia = json.media || [];
      renderProfile(json.profile || {});
      renderGrid(allMedia);

    } catch (err) {
      console.warn('[InstagramFeed] Load failed:', err.message);
      renderError(err.message);
    }
  }

  // ── Init ──────────────────────────────────────────────────────────────────

  function init() {
    root = document.getElementById('igFeedRoot');
    if (!root) return; // section not present on this page

    renderSkeleton();
    initTabs();
    load();
  }

  return { init };
})();

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => InstagramFeed.init());
} else {
  InstagramFeed.init();
}
