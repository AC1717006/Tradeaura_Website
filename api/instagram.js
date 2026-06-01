/**
 * api/instagram.js — Vercel Serverless Function
 *
 * GET /api/instagram               → profile + latest 6 posts/reels (1h cache)
 * GET /api/instagram?action=refresh → refreshes the long-lived access token
 *
 * Environment variables (set in Vercel dashboard + local .env):
 *   INSTAGRAM_ACCESS_TOKEN   Long-lived token (60-day, see refresh below)
 *   INSTAGRAM_USER_ID        Numeric Instagram user ID  (17841443720230226)
 *
 * Token refresh (run every ~50 days or call ?action=refresh):
 *   curl "https://graph.instagram.com/refresh_access_token
 *          ?grant_type=ig_refresh_token&access_token=YOUR_TOKEN"
 *
 * Security: this function is the ONLY place the token is used.
 *           No token is ever sent to the browser.
 */

'use strict';

// ── Constants ──────────────────────────────────────────────────────────────
const IG_API          = 'https://graph.instagram.com';
const CACHE_TTL_MS    = 60 * 60 * 1000;   // 1 hour
const MEDIA_LIMIT     = 6;
const DEFAULT_USER_ID = '17841443720230226';

// Fields requested for the user profile.
// profile_picture_url requires the instagram_profile_picture permission;
// the fetch degrades gracefully if it is unavailable (see fetchProfile).
const PROFILE_FIELDS_FULL  = 'id,username,name,biography,followers_count,media_count,profile_picture_url';
const PROFILE_FIELDS_BASIC = 'id,username,name,biography,followers_count,media_count';

const MEDIA_FIELDS = [
  'id', 'caption', 'media_type', 'media_url',
  'thumbnail_url', 'permalink', 'timestamp',
].join(',');

// ── Module-level cache (shared across warm Vercel invocations) ─────────────
let cache = { data: null, fetchedAt: 0 };

// ── Helpers ────────────────────────────────────────────────────────────────

/**
 * Build an Instagram Graph API URL safely using URLSearchParams.
 * @param {string} path  e.g. "/17841443720230226/media"
 * @param {object} params  query params (access_token injected here, never in frontend)
 */
function igUrl(path, params) {
  const qs = new URLSearchParams(params).toString();
  return `${IG_API}${path}?${qs}`;
}

/**
 * Fetch from the Instagram Graph API and throw a descriptive error on failure.
 * Returns parsed JSON on success.
 */
async function igFetch(url) {
  const res  = await fetch(url);
  const json = await res.json().catch(() => ({}));

  if (!res.ok || json.error) {
    const errCode = json.error?.code;
    const errMsg  = json.error?.message || `HTTP ${res.status}`;

    // 190 = token invalid/expired, 102 = session expired
    if (res.status === 401 || errCode === 190 || errCode === 102) {
      throw Object.assign(
        new Error(`Instagram token expired or invalid — regenerate INSTAGRAM_ACCESS_TOKEN. (${errMsg})`),
        { code: 'TOKEN_EXPIRED' }
      );
    }

    throw new Error(errMsg);
  }

  return json;
}

// ── Profile fetch (with profile_picture_url fallback) ──────────────────────

async function fetchProfile(userId, token) {
  // Attempt full fetch (with profile picture)
  try {
    return await igFetch(igUrl(`/${userId}`, {
      fields:       PROFILE_FIELDS_FULL,
      access_token: token,
    }));
  } catch (err) {
    // If only the profile_picture_url field failed (permission not granted),
    // retry without it rather than failing the whole request.
    if (err.code !== 'TOKEN_EXPIRED' && !err.message.includes('profile_picture')) {
      // Some other field is causing the issue — try basic fields
      console.warn('[Instagram] Full profile fetch failed, retrying with basic fields:', err.message);
    }
    return igFetch(igUrl(`/${userId}`, {
      fields:       PROFILE_FIELDS_BASIC,
      access_token: token,
    }));
  }
}

// ── Media fetch ────────────────────────────────────────────────────────────

async function fetchMedia(userId, token) {
  return igFetch(igUrl(`/${userId}/media`, {
    fields:       MEDIA_FIELDS,
    limit:        String(MEDIA_LIMIT),
    access_token: token,
  }));
}

// ── Normalise raw API data into clean frontend-safe objects ────────────────

function normaliseProfile(raw) {
  return {
    id:                raw.id,
    username:          raw.username           || 'tradeauradigitalsolutions',
    name:              raw.name               || 'TradeAura Digital Solutions',
    biography:         raw.biography          || '',
    followersCount:    raw.followers_count    ?? null,
    mediaCount:        raw.media_count        ?? null,
    profilePictureUrl: raw.profile_picture_url || null,
    profileUrl:        'https://www.instagram.com/tradeauradigitalsolutions/',
  };
}

function normaliseMedia(items) {
  return (items || []).slice(0, MEDIA_LIMIT).map(item => ({
    id:           item.id,
    mediaType:    item.media_type,                            // IMAGE | VIDEO | CAROUSEL_ALBUM
    mediaUrl:     item.media_url     || null,
    thumbnailUrl: item.thumbnail_url || item.media_url || null, // thumbnail_url set for VIDEO
    permalink:    item.permalink,
    caption:      (item.caption || '').replace(/\n+/g, ' ').substring(0, 140),
    timestamp:    item.timestamp,
    isReel:       item.media_type === 'VIDEO',
    isCarousel:   item.media_type === 'CAROUSEL_ALBUM',
  }));
}

// ── Core feed fetch ────────────────────────────────────────────────────────

async function fetchFeed() {
  const token  = process.env.INSTAGRAM_ACCESS_TOKEN;
  const userId = process.env.INSTAGRAM_USER_ID || DEFAULT_USER_ID;

  if (!token) {
    throw Object.assign(
      new Error('INSTAGRAM_ACCESS_TOKEN is not set. Add it to Vercel environment variables.'),
      { code: 'NO_TOKEN' }
    );
  }

  // Fetch profile and media in parallel; if profile fetch fails, media still shows
  const [profileResult, mediaResult] = await Promise.allSettled([
    fetchProfile(userId, token),
    fetchMedia(userId, token),
  ]);

  // If the token is expired, both will fail — surface that as the primary error
  if (profileResult.status === 'rejected' && profileResult.reason?.code === 'TOKEN_EXPIRED') {
    throw profileResult.reason;
  }
  if (mediaResult.status === 'rejected' && mediaResult.reason?.code === 'TOKEN_EXPIRED') {
    throw mediaResult.reason;
  }

  const profile = profileResult.status === 'fulfilled'
    ? normaliseProfile(profileResult.value)
    : { username: 'tradeauradigitalsolutions', name: 'TradeAura Digital Solutions',
        biography: '', followersCount: null, mediaCount: null,
        profilePictureUrl: null,
        profileUrl: 'https://www.instagram.com/tradeauradigitalsolutions/' };

  const media = mediaResult.status === 'fulfilled'
    ? normaliseMedia(mediaResult.value.data)
    : [];

  if (mediaResult.status === 'rejected') {
    console.error('[Instagram] Media fetch failed:', mediaResult.reason.message);
  }

  return { profile, media, fetchedAt: new Date().toISOString() };
}

// ── Token refresh action ───────────────────────────────────────────────────

async function handleTokenRefresh(res) {
  const token = process.env.INSTAGRAM_ACCESS_TOKEN;
  if (!token) {
    return res.status(400).json({ error: 'No token to refresh — INSTAGRAM_ACCESS_TOKEN not set.' });
  }

  try {
    const data = await igFetch(
      `${IG_API}/refresh_access_token?grant_type=ig_refresh_token&access_token=${token}`
    );
    // data.access_token is the refreshed token; data.expires_in is seconds remaining
    console.log('[Instagram] Token refreshed. New expiry in', Math.round(data.expires_in / 86400), 'days.');
    return res.json({
      success:    true,
      expiresIn:  data.expires_in,
      expiryDays: Math.round(data.expires_in / 86400),
      note:       'Update INSTAGRAM_ACCESS_TOKEN in Vercel with: ' + data.access_token,
    });
  } catch (err) {
    return res.status(500).json({ error: 'Token refresh failed: ' + err.message });
  }
}

// ── Main handler ───────────────────────────────────────────────────────────

module.exports = async (req, res) => {
  // CORS — the frontend is served from a different origin (S3 / localhost)
  res.setHeader('Access-Control-Allow-Origin',  '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET')    return res.status(405).json({ error: 'Method not allowed' });

  // Token refresh action: GET /api/instagram?action=refresh
  const action = req.query?.action || new URL(req.url || '', 'http://x').searchParams.get('action');
  if (action === 'refresh') return handleTokenRefresh(res);

  const now = Date.now();

  // Serve from cache if still fresh
  if (cache.data && (now - cache.fetchedAt) < CACHE_TTL_MS) {
    res.setHeader('Cache-Control', 'public, max-age=3600');
    return res.json(cache.data);
  }

  try {
    const data = await fetchFeed();
    cache = { data, fetchedAt: now };

    res.setHeader('Cache-Control', 'public, max-age=3600');
    return res.json(data);

  } catch (err) {
    console.error('[Instagram API]', err.code || '', err.message);

    // Serve stale cache on transient failures — visitors still see something
    if (cache.data) {
      console.log('[Instagram] Serving stale cache due to error.');
      res.setHeader('Cache-Control', 'public, max-age=300');
      return res.json({ ...cache.data, stale: true });
    }

    const status = err.code === 'TOKEN_EXPIRED' ? 401
                 : err.code === 'NO_TOKEN'      ? 503
                 :                                503;

    return res.status(status).json({
      error:   'Instagram feed temporarily unavailable.',
      code:    err.code || 'UNKNOWN',
      message: err.message,
    });
  }
};
