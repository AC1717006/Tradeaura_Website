/**
 * instagramFeed.js — TradeAura Instagram Feed
 *
 * Reads instagram-feed.json (generated hourly by GitHub Actions,
 * served as a static file from S3 — no API token ever touches the browser).
 *
 * Data flow:
 *   GitHub Actions (every 1h)
 *     → scripts/fetch-instagram.js   (reads INSTAGRAM_ACCESS_TOKEN from GitHub Secrets)
 *     → instagram-feed.json          (committed to repo)
 *     → deploy.yml                   (pushed → S3 sync)
 *     → this file reads it with fetch()
 */

/* global fetch */

const InstagramFeed = (() => {
  // ── Config ───────────────────────────────────────────────────────────────
  // Static JSON served from the same S3 origin as the site (or local Express).
  // No API URL, no token, no environment detection needed.
  const FEED_URL   = 'instagram-feed.json';
  const IG_PROFILE = 'https://www.instagram.com/tradeauradigitalsolutions/';

  // ── State ─────────────────────────────────────────────────────────────────
  let root       = null;
  let currentTab = 'all';   // 'all' | 'posts' | 'reels'
  let allMedia   = [];

  // ── Formatters ────────────────────────────────────────────────────────────

  function fmtNum(n) {
    if (n == null) return '—';
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
    if (n >= 1_000)     return (n / 1_000).toFixed(1).replace(/\.0$/, '') + 'K';
    return String(n);
  }

  function timeAgo(iso) {
    if (!iso) return '';
    const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
    if (d === 0)  return 'Today';
    if (d === 1)  return '1d ago';
    if (d < 7)   return `${d}d ago`;
    if (d < 30)  return `${Math.floor(d / 7)}w ago`;
    if (d < 365) return `${Math.floor(d / 30)}mo ago`;
    return `${Math.floor(d / 365)}y ago`;
  }

  // ── Skeleton (shown immediately, prevents layout shift) ───────────────────

  function renderSkeleton() {
    const prof = root?.querySelector('#igProfileArea');
    const grid = root?.querySelector('#igGrid');
    if (!prof || !grid) return;

    prof.innerHTML = `
      <div class="ig-profile-card">
        <div class="ig-avatar-skeleton" style="margin:0 auto 16px;"></div>
        <div style="height:16px;border-radius:8px;background:rgba(255,255,255,0.06);
                    margin:0 auto 8px;width:60%;"></div>
        <div style="height:11px;border-radius:6px;background:rgba(255,255,255,0.04);
                    margin:0 auto 20px;width:40%;"></div>
        <div style="height:44px;border-radius:14px;background:rgba(228,64,95,0.15);"></div>
      </div>`;

    grid.innerHTML = Array.from({ length: 6 }, (_, i) =>
      `<div class="ig-post-skeleton" style="animation-delay:${i * 0.08}s"></div>`
    ).join('');
  }

  // ── Profile card ──────────────────────────────────────────────────────────

  function renderProfile(profile) {
    const area = root?.querySelector('#igProfileArea');
    if (!area) return;

    const avatarHtml = profile.profilePictureUrl
      ? `<div class="ig-avatar-ring">
           <img class="ig-avatar"
                src="${profile.profilePictureUrl}"
                alt="@${profile.username} profile picture"
                loading="lazy"
                width="84" height="84"
                onerror="this.closest('.ig-avatar-ring').innerHTML='<div class=ig-avatar-placeholder>📸</div>'">
         </div>`
      : `<div class="ig-avatar-ring">
           <div class="ig-avatar-placeholder">📸</div>
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
        <div class="ig-handle">@${profile.username || 'tradeauradigitalsolutions'}</div>
        <p class="ig-bio">${profile.biography || 'AI &amp; Business Automation Agency · WhatsApp · CRM · SaaS'}</p>

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

        <a href="${IG_PROFILE}"
           target="_blank" rel="noopener noreferrer"
           class="ig-follow-btn">
          <i class="fab fa-instagram"></i> Follow on Instagram
        </a>
        <a href="${IG_PROFILE}"
           target="_blank" rel="noopener noreferrer"
           class="ig-view-profile">
          View full profile
          <i class="fas fa-external-link-alt" style="font-size:9px;"></i>
        </a>
      </div>`;
  }

  // ── Post card ─────────────────────────────────────────────────────────────

  function buildPostCard(post) {
    const imgSrc        = post.thumbnailUrl || post.mediaUrl || '';
    const captionEl     = post.caption
      ? `<p class="ig-post-caption">${post.caption}</p>`
      : '';
    const reelBadge     = post.isReel
      ? `<div class="ig-post-type" title="Reel"><i class="fas fa-film"></i></div>
         <div class="ig-play-btn">
           <i class="fas fa-play" style="margin-left:3px;"></i>
         </div>`
      : '';
    const carouselBadge = post.isCarousel
      ? `<div class="ig-post-carousel" title="Album">
           <i class="fas fa-images"></i>
         </div>`
      : '';
    const ariaLabel = [
      post.isReel ? 'Reel' : (post.isCarousel ? 'Album' : 'Post'),
      timeAgo(post.timestamp),
      post.caption ? '— ' + post.caption.substring(0, 60) : '',
    ].filter(Boolean).join(' ');

    return `
      <a class="ig-post"
         href="${post.permalink}"
         target="_blank"
         rel="noopener noreferrer"
         aria-label="${ariaLabel}"
         data-type="${post.mediaType}">

        <img class="ig-post-img"
             src="${imgSrc}"
             alt="${ariaLabel}"
             loading="lazy"
             decoding="async"
             width="300" height="300"
             onerror="this.closest('.ig-post').style.display='none'">

        ${reelBadge}
        ${carouselBadge}

        <div class="ig-post-overlay">${captionEl}</div>
      </a>`;
  }

  // ── Grid ──────────────────────────────────────────────────────────────────

  function renderGrid(media) {
    const grid = root?.querySelector('#igGrid');
    if (!grid) return;

    const filtered = currentTab === 'all'   ? media
                   : currentTab === 'reels' ? media.filter(m => m.isReel)
                   :                          media.filter(m => !m.isReel);

    if (filtered.length === 0) {
      grid.innerHTML = `
        <div class="ig-error">
          <i class="fab fa-instagram"
             style="font-size:32px;color:rgba(255,255,255,0.15);
                    display:block;margin-bottom:12px;"></i>
          No ${currentTab === 'reels' ? 'reels' : 'posts'} to show yet.
          <br>
          <a href="${IG_PROFILE}" target="_blank" rel="noopener">
            Visit Instagram →
          </a>
        </div>`;
      return;
    }

    grid.innerHTML = filtered.map(buildPostCard).join('');
  }

  // ── Tabs ──────────────────────────────────────────────────────────────────

  function initTabs() {
    root?.querySelectorAll('.ig-tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        currentTab = btn.dataset.tab;
        root.querySelectorAll('.ig-tab-btn')
            .forEach(b => b.classList.toggle('active', b === btn));
        renderGrid(allMedia);
      });
    });
  }

  // ── Fallback UI (shown when JSON is empty or fetch fails) ─────────────────

  function renderFallback() {
    const prof = root?.querySelector('#igProfileArea');
    const grid = root?.querySelector('#igGrid');

    if (prof) prof.innerHTML = `
      <div class="ig-profile-card" style="text-align:center;">
        <div class="ig-avatar-ring" style="margin:0 auto 16px;">
          <div class="ig-avatar-placeholder">📸</div>
        </div>
        <div class="ig-username">TradeAura Digital Solutions</div>
        <div class="ig-handle">@tradeauradigitalsolutions</div>
        <p class="ig-bio">AI &amp; Business Automation Agency</p>
        <a href="${IG_PROFILE}" target="_blank" rel="noopener noreferrer"
           class="ig-follow-btn" style="margin-top:20px;">
          <i class="fab fa-instagram"></i> Follow on Instagram
        </a>
      </div>`;

    if (grid) grid.innerHTML = `
      <div class="ig-error">
        <i class="fab fa-instagram"
           style="font-size:36px;color:rgba(255,255,255,0.12);
                  display:block;margin-bottom:12px;"></i>
        Feed updating — check back soon or
        <a href="${IG_PROFILE}" target="_blank" rel="noopener">
          visit us on Instagram
        </a>
      </div>`;
  }

  // ── Main load ─────────────────────────────────────────────────────────────

  async function load() {
    try {
      const res = await fetch(FEED_URL);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const feed = await res.json();

      // Empty media = first deploy, before GitHub Actions has run
      if (!feed.media || feed.media.length === 0) {
        renderProfile(feed.profile || {});
        renderFallback();
        return;
      }

      allMedia = feed.media;
      renderProfile(feed.profile || {});
      renderGrid(allMedia);

    } catch (err) {
      console.warn('[InstagramFeed] Failed to load instagram-feed.json:', err.message);
      renderFallback();
    }
  }

  // ── Init ──────────────────────────────────────────────────────────────────

  function init() {
    root = document.getElementById('igFeedRoot');
    if (!root) return;   // section not present on this page

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
