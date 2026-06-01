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
 * Required env vars:
 *   INSTAGRAM_ACCESS_TOKEN   Long-lived token (60-day, refreshable)
 *   INSTAGRAM_USER_ID        Numeric user ID  (17841443720230226)
 *
 * Local testing:
 *   Add both vars to .env then run:  node scripts/fetch-instagram.js
 */

'use strict';

// Load .env when running locally; GitHub Actions injects vars directly
try { require('dotenv').config(); } catch (_) { /* dotenv optional */ }

const axios = require('axios');
const fs    = require('fs');
const path  = require('path');

// ── Config ────────────────────────────────────────────────────────────────
const ACCESS_TOKEN = process.env.INSTAGRAM_ACCESS_TOKEN;
const USER_ID      = process.env.INSTAGRAM_USER_ID || '17841443720230226';
const OUTPUT_PATH  = path.join(__dirname, '..', 'instagram-feed.json');
const IG_API       = 'https://graph.instagram.com';
const FETCH_LIMIT  = 12;   // fetch 12, keep 6 — room for filtered/bad items
const KEEP_COUNT   = 6;    // posts shown in the feed

// Fields fetched from the API — nothing sensitive, purely display data
const PROFILE_FIELDS = [
  'id', 'username', 'name', 'biography',
  'followers_count', 'media_count', 'profile_picture_url',
].join(',');

const MEDIA_FIELDS = [
  'id', 'caption', 'media_type', 'media_url',
  'thumbnail_url', 'permalink', 'timestamp',
].join(',');

// ── Helpers ───────────────────────────────────────────────────────────────

async function igGet(path, params = {}) {
  const url = `${IG_API}${path}`;
  const res  = await axios.get(url, {
    params: { ...params, access_token: ACCESS_TOKEN },
    timeout: 15000,
  });

  if (res.data?.error) {
    const e = res.data.error;
    // Code 190 / 102 = expired or invalid token
    const expired = e.code === 190 || e.code === 102;
    throw Object.assign(
      new Error(`Instagram API (code ${e.code}): ${e.message}`),
      { expired }
    );
  }

  return res.data;
}

// ── Profile fetch (with profile_picture_url fallback) ─────────────────────

async function fetchProfile() {
  // Try with profile picture first; some apps don't have that permission
  try {
    return await igGet(`/${USER_ID}`, { fields: PROFILE_FIELDS });
  } catch (err) {
    if (err.expired) throw err; // propagate token errors immediately
    console.warn('[fetch-instagram] profile_picture_url unavailable, retrying without it.');
    const basicFields = PROFILE_FIELDS.split(',').filter(f => f !== 'profile_picture_url').join(',');
    return igGet(`/${USER_ID}`, { fields: basicFields });
  }
}

// ── Media fetch ───────────────────────────────────────────────────────────

async function fetchMedia() {
  return igGet(`/${USER_ID}/media`, {
    fields: MEDIA_FIELDS,
    limit:  String(FETCH_LIMIT),
  });
}

// ── Normalise ─────────────────────────────────────────────────────────────

function normaliseProfile(raw) {
  return {
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
  return (items || [])
    .filter(item => item.media_url || item.thumbnail_url) // skip items with no image
    .slice(0, KEEP_COUNT)
    .map(item => ({
      id:           item.id,
      mediaType:    item.media_type,
      // For VIDEO (Reels): thumbnail_url is the static preview; media_url is the video file
      // For IMAGE / CAROUSEL_ALBUM: media_url is the image
      mediaUrl:     item.media_url     || null,
      thumbnailUrl: item.thumbnail_url || item.media_url || null,
      permalink:    item.permalink,
      caption:      (item.caption || '').replace(/\n+/g, ' ').trim().substring(0, 150),
      timestamp:    item.timestamp,
      isReel:       item.media_type === 'VIDEO',
      isCarousel:   item.media_type === 'CAROUSEL_ALBUM',
    }));
}

// ── Load existing feed (used as fallback on error) ────────────────────────

function loadExistingFeed() {
  try {
    return JSON.parse(fs.readFileSync(OUTPUT_PATH, 'utf8'));
  } catch (_) {
    return null;
  }
}

// ── Main ──────────────────────────────────────────────────────────────────

async function main() {
  // Guard: must have credentials
  if (!ACCESS_TOKEN) {
    console.error('[fetch-instagram] ✗ INSTAGRAM_ACCESS_TOKEN is not set.');
    console.error('                    Add it to GitHub Secrets (or .env for local dev).');
    process.exit(1);
  }

  console.log(`[fetch-instagram] Fetching data for user ID: ${USER_ID}`);

  try {
    // Fetch profile and media in parallel
    const [profileRaw, mediaRaw] = await Promise.all([
      fetchProfile(),
      fetchMedia(),
    ]);

    const profile = normaliseProfile(profileRaw);
    const media   = normaliseMedia(mediaRaw.data || []);

    const feed = {
      updatedAt: new Date().toISOString(),
      profile,
      media,
    };

    fs.writeFileSync(OUTPUT_PATH, JSON.stringify(feed, null, 2), 'utf8');

    console.log(`[fetch-instagram] ✓ @${profile.username} · ${profile.followersCount ?? '?'} followers`);
    console.log(`[fetch-instagram] ✓ Saved ${media.length} posts to instagram-feed.json`);
    media.forEach((m, i) =>
      console.log(`  ${i + 1}. [${m.mediaType.padEnd(15)}] ${m.permalink}`)
    );

  } catch (err) {
    console.error('[fetch-instagram] ✗ Error:', err.message);

    if (err.expired) {
      console.error('[fetch-instagram]   Token is expired or invalid.');
      console.error('[fetch-instagram]   Refresh it at:');
      console.error(`[fetch-instagram]   https://graph.instagram.com/refresh_access_token`);
      console.error(`[fetch-instagram]   ?grant_type=ig_refresh_token&access_token=YOUR_TOKEN`);
      console.error('[fetch-instagram]   Then update INSTAGRAM_ACCESS_TOKEN in GitHub Secrets.');
    }

    // Preserve the last good feed rather than writing an empty/broken one
    const existing = loadExistingFeed();
    if (existing) {
      console.log('[fetch-instagram] ⚠  Keeping previous instagram-feed.json unchanged.');
    } else {
      // Write a safe empty scaffold so the frontend shows the fallback UI
      const empty = {
        updatedAt: null,
        profile: {
          username: 'tradeauradigitalsolutions',
          name: 'TradeAura Digital Solutions',
          biography: '',
          followersCount: null,
          mediaCount: null,
          profilePictureUrl: null,
          profileUrl: 'https://www.instagram.com/tradeauradigitalsolutions/',
        },
        media: [],
      };
      fs.writeFileSync(OUTPUT_PATH, JSON.stringify(empty, null, 2), 'utf8');
      console.log('[fetch-instagram] ⚠  Wrote empty scaffold to instagram-feed.json.');
    }

    process.exit(1);
  }
}

main();
