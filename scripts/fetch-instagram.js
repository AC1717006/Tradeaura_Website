/**
 * scripts/fetch-instagram.js
 *
 * Run by GitHub Actions every hour (instagram-feed.yml).
 * Reads credentials from environment variables — never from source code.
 *
 * Writes: instagram-feed.json at the repository root.
 * The JSON is served as a static file from S3; the frontend reads it
 * with a plain fetch() — no token ever reaches the browser.
 *
 * Required env vars (set in GitHub Secrets):
 *   INSTAGRAM_ACCESS_TOKEN   Long-lived token (60-day, refreshable)
 *   INSTAGRAM_USER_ID        Numeric user ID  (17841443720230226)
 *
 * Local testing:
 *   Add both vars to .env then run:  node scripts/fetch-instagram.js
 */

'use strict';

// ── Windows / corporate-proxy TLS fix ─────────────────────────────────────
// Instagram CDN certificates cannot be verified by some Windows CA stores.
// process.env.CI is set to "true" automatically inside GitHub Actions,
// so this block only runs on local Windows machines — never in production CI.
if (!process.env.CI) {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
}

// Load .env when running locally; GitHub Actions injects vars directly.
try { require('dotenv').config(); } catch (_) { /* dotenv optional in CI */ }

const axios = require('axios');
const fs    = require('fs');
const path  = require('path');

// ── Config ─────────────────────────────────────────────────────────────────
const ACCESS_TOKEN = process.env.INSTAGRAM_ACCESS_TOKEN;
const USER_ID      = process.env.INSTAGRAM_USER_ID || '17841443720230226';
const OUTPUT_PATH  = path.join(__dirname, '..', 'instagram-feed.json');
const IG_API       = 'https://graph.instagram.com';
const FETCH_LIMIT  = 12;  // fetch 12, keep best 6
const KEEP_COUNT   = 6;

// Profile fields — requested in order from most to least permissive.
// If a restricted field causes a 400, we fall back to the next tier.
const PROFILE_TIERS = [
  // Tier 1 — full data (requires instagram_manage_insights or equivalent)
  'id,username,name,biography,followers_count,media_count,profile_picture_url',
  // Tier 2 — no picture (some apps don't expose profile_picture_url)
  'id,username,name,biography,followers_count,media_count',
  // Tier 3 — no engagement metrics (most restrictive permission level)
  'id,username,name,biography',
  // Tier 4 — bare minimum (always available)
  'id,username',
];

const MEDIA_FIELDS = [
  'id', 'caption', 'media_type', 'media_url',
  'thumbnail_url', 'permalink', 'timestamp',
].join(',');

// ── Helpers ────────────────────────────────────────────────────────────────

/**
 * GET from the Instagram Graph API.
 * Throws with err.expired = true when the token is invalid/expired.
 * Throws with err.statusCode = N for non-200 HTTP responses.
 */
async function igGet(urlPath, params = {}) {
  const url = `${IG_API}${urlPath}`;
  console.log(`[fetch-instagram] → GET ${urlPath.split('?')[0]}`);

  let res;
  try {
    res = await axios.get(url, {
      params:  { ...params, access_token: ACCESS_TOKEN },
      timeout: 15000,
      // Don't let axios throw on 4xx — we inspect the body ourselves
      validateStatus: () => true,
    });
  } catch (networkErr) {
    // Network-level failure (DNS, timeout, connection refused)
    throw Object.assign(
      new Error(`Network error calling Instagram API: ${networkErr.message}`),
      { network: true }
    );
  }

  // Instagram always returns JSON even on errors
  const body = res.data;

  if (body?.error) {
    const e       = body.error;
    const expired = e.code === 190 || e.code === 102;
    console.error(`[fetch-instagram] API error code=${e.code} type=${e.type}: ${e.message}`);
    throw Object.assign(
      new Error(`Instagram API (code ${e.code}): ${e.message}`),
      { expired, statusCode: res.status, apiCode: e.code }
    );
  }

  if (res.status !== 200) {
    throw Object.assign(
      new Error(`Instagram API returned HTTP ${res.status}`),
      { statusCode: res.status }
    );
  }

  return body;
}

// ── Profile — progressive field fallback ───────────────────────────────────

async function fetchProfile() {
  for (let tier = 0; tier < PROFILE_TIERS.length; tier++) {
    const fields = PROFILE_TIERS[tier];
    try {
      const data = await igGet(`/${USER_ID}`, { fields });
      if (tier > 0) {
        console.log(`[fetch-instagram] Profile fetched at tier ${tier + 1} (fields: ${fields})`);
      }
      return data;
    } catch (err) {
      // If token is expired, stop immediately — no point retrying with fewer fields
      if (err.expired) throw err;

      // 400 with code 100 = field not available — try next tier
      const fieldError = err.statusCode === 400 ||
                         err.apiCode   === 100   ||
                         err.apiCode   === 200;

      if (fieldError && tier < PROFILE_TIERS.length - 1) {
        console.warn(`[fetch-instagram] Tier ${tier + 1} fields not available, trying fewer fields…`);
        continue;
      }

      // Last tier also failed or non-field error
      throw err;
    }
  }
}

// ── Media ──────────────────────────────────────────────────────────────────

async function fetchMedia() {
  return igGet(`/${USER_ID}/media`, {
    fields: MEDIA_FIELDS,
    limit:  String(FETCH_LIMIT),
  });
}

// ── Normalise ──────────────────────────────────────────────────────────────

function normaliseProfile(raw) {
  return {
    username:          raw.username            || 'tradeauradigitalsolutions',
    name:              raw.name                || 'TradeAura Digital Solutions',
    biography:         raw.biography           || '',
    followersCount:    raw.followers_count     ?? null,
    mediaCount:        raw.media_count         ?? null,
    profilePictureUrl: raw.profile_picture_url || null,
    profileUrl:        'https://www.instagram.com/tradeauradigitalsolutions/',
  };
}

function normaliseMedia(items) {
  return (items || [])
    // id + permalink are always present — only skip completely broken items
    .filter(item => item.id && item.permalink)
    .slice(0, KEEP_COUNT)
    .map(item => ({
      id:           item.id,
      mediaType:    item.media_type    || 'IMAGE',
      mediaUrl:     item.media_url     || null,
      thumbnailUrl: item.thumbnail_url || item.media_url || null,
      permalink:    item.permalink,
      caption:      (item.caption || '').replace(/\n+/g, ' ').trim().substring(0, 150),
      timestamp:    item.timestamp     || null,
      isReel:       item.media_type === 'VIDEO',
      isCarousel:   item.media_type === 'CAROUSEL_ALBUM',
    }));
}

function extractItems(apiResponse) {
  if (Array.isArray(apiResponse?.data)) {
    console.log(`[fetch-instagram] Media response: { data: Array(${apiResponse.data.length}) }`);
    return apiResponse.data;
  }
  if (Array.isArray(apiResponse)) {
    console.log(`[fetch-instagram] Media response: bare Array(${apiResponse.length})`);
    return apiResponse;
  }
  console.warn('[fetch-instagram] ⚠  Unexpected response shape. Keys:', Object.keys(apiResponse || {}));
  return [];
}

// ── Main ───────────────────────────────────────────────────────────────────

async function main() {
  console.log('');
  console.log('[fetch-instagram] ══════════════════════════════════');
  console.log('[fetch-instagram]  TradeAura Instagram Feed Refresh');
  console.log('[fetch-instagram] ══════════════════════════════════');
  console.log('[fetch-instagram] Environment:', process.env.CI ? 'GitHub Actions (CI)' : 'Local dev');

  // ── Guard: credentials ────────────────────────────────────────────────────
  if (!ACCESS_TOKEN) {
    console.error('[fetch-instagram] ✗ INSTAGRAM_ACCESS_TOKEN is not set.');
    console.error('                    → GitHub: repo Settings → Secrets → INSTAGRAM_ACCESS_TOKEN');
    console.error('                    → Local:  add to .env file');
    process.exit(1);
  }
  console.log(`[fetch-instagram] ✓ Token loaded (${ACCESS_TOKEN.length} chars)`);
  console.log(`[fetch-instagram] ✓ User ID: ${USER_ID}`);

  try {
    // ── Fetch in parallel — profile failure is non-fatal for media ───────────
    console.log('[fetch-instagram] Fetching profile + media…');
    const [profileResult, mediaResult] = await Promise.allSettled([
      fetchProfile(),
      fetchMedia(),
    ]);

    // ── Token expired check ───────────────────────────────────────────────────
    // If both fail with token error, surface that immediately
    const tokenExpired = [profileResult, mediaResult].some(
      r => r.status === 'rejected' && r.reason?.expired
    );
    if (tokenExpired) {
      console.error('[fetch-instagram] ✗ ACCESS TOKEN IS EXPIRED OR INVALID.');
      console.error('[fetch-instagram]   Refresh it:');
      console.error('[fetch-instagram]   1. curl "https://graph.instagram.com/refresh_access_token');
      console.error('[fetch-instagram]              ?grant_type=ig_refresh_token&access_token=YOUR_TOKEN"');
      console.error('[fetch-instagram]   2. Update INSTAGRAM_ACCESS_TOKEN in GitHub Secrets.');
      process.exit(1);
    }

    // ── Media is mandatory — fail if it didn't come back ─────────────────────
    if (mediaResult.status === 'rejected') {
      console.error('[fetch-instagram] ✗ Media fetch failed:', mediaResult.reason.message);
      process.exit(1);
    }

    // ── Profile is best-effort — use defaults if it failed ───────────────────
    let profileRaw = {};
    if (profileResult.status === 'fulfilled') {
      profileRaw = profileResult.value;
      console.log(`[fetch-instagram] ✓ Profile: @${profileRaw.username}`);
    } else {
      console.warn('[fetch-instagram] ⚠  Profile fetch failed (non-fatal):', profileResult.reason.message);
      console.warn('[fetch-instagram]    Using default profile values.');
    }

    // ── Extract + normalise ───────────────────────────────────────────────────
    const rawItems = extractItems(mediaResult.value);
    console.log(`[fetch-instagram] Items from API: ${rawItems.length}`);
    rawItems.forEach((item, i) =>
      console.log(
        `  ${i + 1}. ${item.media_type?.padEnd(15)} ` +
        `media_url=${!!item.media_url} ` +
        `thumb=${!!item.thumbnail_url} ` +
        `${item.permalink}`
      )
    );

    const profile = normaliseProfile(profileRaw);
    const media   = normaliseMedia(rawItems);
    console.log(`[fetch-instagram] Media count: ${media.length}`);

    // ── Fail if normalisation produced nothing from a non-empty API response ──
    if (rawItems.length > 0 && media.length === 0) {
      throw new Error(
        `normaliseMedia() returned 0 from ${rawItems.length} API items — check filter logic.`
      );
    }
    if (media.length === 0) {
      throw new Error('Instagram API returned 0 media items. Account may have no public posts.');
    }

    // ── Write JSON ────────────────────────────────────────────────────────────
    const feed = { updatedAt: new Date().toISOString(), profile, media };
    fs.writeFileSync(OUTPUT_PATH, JSON.stringify(feed, null, 2), 'utf8');

    console.log('');
    console.log(`[fetch-instagram] ✓ Written: ${media.length} posts → instagram-feed.json`);
    console.log(`[fetch-instagram] ✓ updatedAt: ${feed.updatedAt}`);
    media.forEach((m, i) =>
      console.log(`  ${i + 1}. [${(m.mediaType || '?').padEnd(15)}] ${m.permalink}`)
    );
    console.log('');

  } catch (err) {
    console.error('');
    console.error('[fetch-instagram] ✗ Fatal error:', err.message);
    console.error('[fetch-instagram] ✗ Exiting with code 1 — JSON not written.');
    process.exit(1);
  }
}

main();
