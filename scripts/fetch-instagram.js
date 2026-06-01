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

const PROFILE_FIELDS = [
  'id', 'username', 'name', 'biography',
  'followers_count', 'media_count', 'profile_picture_url',
].join(',');

const MEDIA_FIELDS = [
  'id', 'caption', 'media_type', 'media_url',
  'thumbnail_url', 'permalink', 'timestamp',
].join(',');

// ── Helpers ────────────────────────────────────────────────────────────────

/**
 * GET from the Instagram Graph API.
 * Returns the parsed JSON body (res.data from axios).
 */
async function igGet(urlPath, params = {}) {
  const url = `${IG_API}${urlPath}`;

  console.log(`[fetch-instagram] → GET ${IG_API}${urlPath}`);

  const res = await axios.get(url, {
    params:  { ...params, access_token: ACCESS_TOKEN },
    timeout: 15000,
  });

  // Log the raw response so we can diagnose structure issues in CI logs
  console.log('[fetch-instagram] Raw API response:');
  console.log(JSON.stringify(res.data, null, 2));

  if (res.data?.error) {
    const e       = res.data.error;
    const expired = e.code === 190 || e.code === 102;
    throw Object.assign(
      new Error(`Instagram API error (code ${e.code}): ${e.message}`),
      { expired }
    );
  }

  return res.data;
}

// ── Profile ────────────────────────────────────────────────────────────────

async function fetchProfile() {
  // Try with profile_picture_url; not all app configurations expose it.
  try {
    return await igGet(`/${USER_ID}`, { fields: PROFILE_FIELDS });
  } catch (err) {
    if (err.expired) throw err;
    console.warn('[fetch-instagram] profile_picture_url not available, retrying without it.');
    const basicFields = PROFILE_FIELDS.split(',')
      .filter(f => f !== 'profile_picture_url')
      .join(',');
    return igGet(`/${USER_ID}`, { fields: basicFields });
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

/**
 * Normalise raw media items from the Instagram API into frontend-safe objects.
 *
 * ── BUG FIX ──────────────────────────────────────────────────────────────
 * Previous version filtered on `item.media_url || item.thumbnail_url`.
 * The Instagram Graph API for Business accounts frequently omits media_url
 * and/or thumbnail_url for VIDEO (Reel) posts — causing every Reel to be
 * silently dropped and resulting in media: [].
 *
 * Fix: filter only on `item.id && item.permalink` (always present).
 * The frontend shows a gradient placeholder when no image URL is available.
 */
function normaliseMedia(items) {
  return (items || [])
    // Only skip items that have no ID or no permalink (can't be displayed at all)
    .filter(item => item.id && item.permalink)
    .slice(0, KEEP_COUNT)
    .map(item => ({
      id:           item.id,
      mediaType:    item.media_type   || 'IMAGE',
      mediaUrl:     item.media_url    || null,
      // thumbnail_url is the static preview for VIDEO/Reel; fall back to media_url for images
      thumbnailUrl: item.thumbnail_url || item.media_url || null,
      permalink:    item.permalink,
      caption:      (item.caption || '').replace(/\n+/g, ' ').trim().substring(0, 150),
      timestamp:    item.timestamp    || null,
      isReel:       item.media_type === 'VIDEO',
      isCarousel:   item.media_type === 'CAROUSEL_ALBUM',
    }));
}

/**
 * Extract the items array from the API response.
 * The Instagram Graph API always returns: { "data": [...], "paging": {...} }
 * Guard against edge cases where the wrapper is missing.
 */
function extractItems(apiResponse) {
  // Normal case: { data: [...] }
  if (Array.isArray(apiResponse?.data)) {
    console.log(`[fetch-instagram] Response structure: { data: Array(${apiResponse.data.length}) }`);
    return apiResponse.data;
  }

  // Unexpected: response itself is an array
  if (Array.isArray(apiResponse)) {
    console.log(`[fetch-instagram] Response structure: Array(${apiResponse.length}) (no wrapper)`);
    return apiResponse;
  }

  // Nothing usable
  console.warn('[fetch-instagram] ⚠ Unexpected response shape — no items array found.');
  console.warn('[fetch-instagram]   Keys present:', Object.keys(apiResponse || {}));
  return [];
}

// ── Load existing feed (fallback on error) ─────────────────────────────────

function loadExistingFeed() {
  try {
    return JSON.parse(fs.readFileSync(OUTPUT_PATH, 'utf8'));
  } catch (_) {
    return null;
  }
}

// ── Main ───────────────────────────────────────────────────────────────────

async function main() {
  // ── Credential checks ────────────────────────────────────────────────────
  console.log('');
  console.log('[fetch-instagram] ══════════════════════════════════');
  console.log('[fetch-instagram]  TradeAura Instagram Feed Refresh');
  console.log('[fetch-instagram] ══════════════════════════════════');

  if (!ACCESS_TOKEN) {
    console.error('[fetch-instagram] ✗ INSTAGRAM_ACCESS_TOKEN is not set.');
    console.error('                    Add it to GitHub Secrets (repo Settings → Secrets).');
    process.exit(1);
  }
  console.log('[fetch-instagram] ✓ Token loaded (length:', ACCESS_TOKEN.length, 'chars)');

  if (!USER_ID) {
    console.error('[fetch-instagram] ✗ INSTAGRAM_USER_ID is not set.');
    process.exit(1);
  }
  console.log('[fetch-instagram] ✓ User ID loaded:', USER_ID);

  // ── API calls ────────────────────────────────────────────────────────────
  try {
    console.log('[fetch-instagram] Fetching profile and media in parallel…');

    const [profileRaw, mediaRaw] = await Promise.all([
      fetchProfile(),
      fetchMedia(),
    ]);

    console.log('[fetch-instagram] ✓ API requests succeeded');

    // ── Extract items array from response ──────────────────────────────────
    const rawItems = extractItems(mediaRaw);

    console.log(`[fetch-instagram] Items returned by API: ${rawItems.length}`);
    rawItems.forEach((item, i) => {
      console.log(
        `  ${i + 1}. id=${item.id}` +
        `  type=${item.media_type || 'UNKNOWN'}` +
        `  has_media_url=${!!item.media_url}` +
        `  has_thumbnail=${!!item.thumbnail_url}` +
        `  permalink=${item.permalink}`
      );
    });

    // ── Normalise ──────────────────────────────────────────────────────────
    const profile = normaliseProfile(profileRaw);
    const media   = normaliseMedia(rawItems);

    console.log(`[fetch-instagram] Media count: ${media.length}`);

    // ── Hard-fail if API returned data but normalisation produced nothing ──
    if (rawItems.length > 0 && media.length === 0) {
      throw new Error(
        `normaliseMedia() returned 0 items from ${rawItems.length} API results. ` +
        'Check the filter logic — items may be missing required fields.'
      );
    }

    // ── Fail if the API itself returned no posts ───────────────────────────
    if (media.length === 0) {
      throw new Error('Instagram API returned 0 media items. Account may have no posts yet.');
    }

    // ── Write JSON ─────────────────────────────────────────────────────────
    const feed = {
      updatedAt: new Date().toISOString(),
      profile,
      media,
    };

    fs.writeFileSync(OUTPUT_PATH, JSON.stringify(feed, null, 2), 'utf8');

    console.log('');
    console.log(`[fetch-instagram] ✓ @${profile.username} · followers: ${profile.followersCount ?? '(not returned)'}`);
    console.log(`[fetch-instagram] ✓ JSON written: ${media.length} posts → instagram-feed.json`);
    media.forEach((m, i) =>
      console.log(`  ${i + 1}. [${(m.mediaType || 'UNKNOWN').padEnd(15)}] ${m.permalink}`)
    );
    console.log('');

  } catch (err) {
    console.error('');
    console.error('[fetch-instagram] ✗ Error:', err.message);

    if (err.expired) {
      console.error('[fetch-instagram]   The access token is expired or invalid.');
      console.error('[fetch-instagram]   Refresh it with:');
      console.error('[fetch-instagram]     curl "https://graph.instagram.com/refresh_access_token');
      console.error('[fetch-instagram]          ?grant_type=ig_refresh_token&access_token=YOUR_TOKEN"');
      console.error('[fetch-instagram]   Then update INSTAGRAM_ACCESS_TOKEN in GitHub Secrets.');
    }

    // Do NOT silently preserve an existing empty feed — fail loudly so the
    // workflow is marked failed and the developer is notified via GitHub.
    console.error('[fetch-instagram] ✗ Workflow will exit with code 1 — no JSON written.');
    process.exit(1);
  }
}

main();
