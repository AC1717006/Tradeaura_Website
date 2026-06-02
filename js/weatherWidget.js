/**
 * weatherWidget.js — TradeAura Live Weather Widget
 *
 * Automatically detects the visitor's location and shows local weather.
 * No API key needed for any service used.
 *
 * Data flow:
 *  1. navigator.geolocation → lat/lon  (GPS, ~instant on mobile)
 *     ↓ (on denial/timeout)
 *  2. ipapi.co/json/         → lat/lon + city/region/country  (IP fallback)
 *
 *  After coords are known:
 *  3. Nominatim (OpenStreetMap) → city, state, country  (for GPS path only)
 *  4. Open-Meteo API            → temp, humidity, wind, weather code
 *  5. Render → cache in sessionStorage (5-min TTL)
 *
 * APIs used (all free, no API key):
 *  - Open-Meteo:  https://open-meteo.com/
 *  - Nominatim:   https://nominatim.openstreetmap.org/
 *  - ipapi.co:    https://ipapi.co/  (1000 req/day free)
 */

/* global WeatherWidget */

const WeatherWidget = (() => {
  'use strict';

  // ── Config ──────────────────────────────────────────────────────────────
  const CACHE_KEY    = 'tradeaura_weather_v1';
  const CACHE_TTL_MS = 5 * 60 * 1000;   // cache for 5 minutes
  const GPS_TIMEOUT  = 8000;             // 8 s for browser GPS request

  // ── WMO Weather Code → display data ──────────────────────────────────────
  // Full mapping from https://open-meteo.com/en/docs (WMO 4677 codes)
  const WMO = {
    0:  { label: 'Clear Sky',          icon: '☀️'  },
    1:  { label: 'Mainly Clear',       icon: '🌤️' },
    2:  { label: 'Partly Cloudy',      icon: '⛅'  },
    3:  { label: 'Overcast',           icon: '☁️'  },
    45: { label: 'Foggy',              icon: '🌫️' },
    48: { label: 'Icy Fog',            icon: '🌫️' },
    51: { label: 'Light Drizzle',      icon: '🌦️' },
    53: { label: 'Drizzle',            icon: '🌦️' },
    55: { label: 'Dense Drizzle',      icon: '🌦️' },
    56: { label: 'Freezing Drizzle',   icon: '🌨️' },
    57: { label: 'Heavy Drizzle',      icon: '🌨️' },
    61: { label: 'Light Rain',         icon: '🌧️' },
    63: { label: 'Rain',               icon: '🌧️' },
    65: { label: 'Heavy Rain',         icon: '🌧️' },
    66: { label: 'Freezing Rain',      icon: '🌨️' },
    67: { label: 'Heavy Freezing Rain',icon: '🌨️' },
    71: { label: 'Light Snow',         icon: '🌨️' },
    73: { label: 'Snow',               icon: '❄️'  },
    75: { label: 'Heavy Snow',         icon: '❄️'  },
    77: { label: 'Snow Grains',        icon: '🌨️' },
    80: { label: 'Rain Showers',       icon: '🌦️' },
    81: { label: 'Showers',            icon: '🌧️' },
    82: { label: 'Heavy Showers',      icon: '⛈️'  },
    85: { label: 'Snow Showers',       icon: '🌨️' },
    86: { label: 'Heavy Snow Showers', icon: '❄️'  },
    95: { label: 'Thunderstorm',       icon: '⛈️'  },
    96: { label: 'Thunderstorm',       icon: '⛈️'  },
    99: { label: 'Thunderstorm',       icon: '⛈️'  },
  };

  // ── DOM refs ──────────────────────────────────────────────────────────────
  let rootEl = null;
  let cardEl = null;
  let pillEl = null;
  let isOpen = false;

  // ── Fetch with timeout ────────────────────────────────────────────────────
  // Uses AbortController for broad browser support (safer than AbortSignal.timeout)
  function timedFetch(url, options = {}, ms = 9000) {
    const controller = new AbortController();
    const timer      = setTimeout(() => controller.abort(), ms);
    return fetch(url, { ...options, signal: controller.signal })
      .finally(() => clearTimeout(timer));
  }

  // ── sessionStorage cache ──────────────────────────────────────────────────

  function readCache() {
    try {
      const raw = sessionStorage.getItem(CACHE_KEY);
      if (!raw) return null;
      const item = JSON.parse(raw);
      if ((Date.now() - item.cachedAt) > CACHE_TTL_MS) {
        sessionStorage.removeItem(CACHE_KEY);
        return null;
      }
      return item;
    } catch (_) { return null; }
  }

  function writeCache(data) {
    try {
      sessionStorage.setItem(CACHE_KEY, JSON.stringify({ ...data, cachedAt: Date.now() }));
    } catch (_) { /* sessionStorage might be blocked (private mode on some browsers) */ }
  }

  // ── UI helpers ────────────────────────────────────────────────────────────

  function el(id) { return document.getElementById(id); }

  /** Switch the card between 'loading' | 'content' | 'error' states */
  function setCardState(state) {
    el('wwLoading').hidden = state !== 'loading';
    el('wwContent').hidden = state !== 'content';
    el('wwError').hidden   = state !== 'error';
  }

  /** Switch the pill between 'loading' | 'data' states */
  function setPillState(state) {
    el('wwPillLoading').hidden = state !== 'loading';
    el('wwPillData').hidden    = state !== 'data';
  }

  /** Open or close the expandable card */
  function setOpen(open) {
    isOpen = open;
    cardEl.classList.toggle('ww-card--open', open);
    pillEl.setAttribute('aria-expanded', String(open));
    pillEl.classList.toggle('ww-pill--active', open);
    el('wwChevron').classList.toggle('ww-chevron--up', open);
  }

  /** Human-readable "just now" / "3 mins ago" timestamp */
  function timeAgo(ms) {
    const mins = Math.round((Date.now() - ms) / 60000);
    if (mins < 1)  return 'just now';
    if (mins === 1) return '1 min ago';
    return `${mins} mins ago`;
  }

  // ── Render weather data into DOM ──────────────────────────────────────────

  function render(data) {
    const wmo = WMO[data.code] || { label: 'Unknown', icon: '🌡️' };

    // Pill (always visible summary)
    el('wwPillIcon').textContent = wmo.icon;
    el('wwPillTemp').textContent = `${data.temp}°C`;
    el('wwPillCity').textContent = data.city || '—';

    // Card — location
    el('wwCity').textContent   = data.city    || 'Unknown';
    el('wwRegion').textContent = [data.region, data.country]
      .filter(Boolean).join(', ') || '—';

    // Card — weather
    el('wwIcon').textContent      = wmo.icon;
    el('wwTemp').textContent      = `${data.temp}°C`;
    el('wwCondition').textContent = wmo.label;

    // Card — metrics
    el('wwHumidity').textContent = `${data.humidity}%`;
    el('wwWind').textContent     = `${data.wind} km/h`;

    // Card — timestamp
    const age = data.cachedAt || Date.now();
    el('wwUpdated').textContent = `Updated ${timeAgo(age)}`;

    // Reveal both states
    setCardState('content');
    setPillState('data');
  }

  // ── Location APIs ─────────────────────────────────────────────────────────

  /**
   * Browser Geolocation API — most accurate, requires user permission.
   * Returns { lat, lon }.
   */
  function getGPS() {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        return reject(new Error('Geolocation not supported by browser'));
      }
      navigator.geolocation.getCurrentPosition(
        pos => resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
        err => reject(err),
        {
          timeout:            GPS_TIMEOUT,
          maximumAge:         600000,      // accept a 10-min cached position
          enableHighAccuracy: false,       // no need for GPS precision
        }
      );
    });
  }

  /**
   * IP-based geolocation fallback via ipapi.co.
   * Returns { lat, lon, city, region, country } all in one call.
   * Free tier: 1000 req/day (well within limits with 5-min cache).
   */
  async function getIPLocation() {
    const res  = await timedFetch('https://ipapi.co/json/', {}, 8000);
    const data = await res.json();
    if (data.error) throw new Error(`ipapi.co: ${data.reason || 'unknown error'}`);
    return {
      lat:     parseFloat(data.latitude),
      lon:     parseFloat(data.longitude),
      city:    data.city          || '',
      region:  data.region        || '',
      country: data.country_name  || '',
    };
  }

  /**
   * Nominatim (OpenStreetMap) reverse geocoding — converts lat/lon to place names.
   * Only called when GPS is used (IP fallback already returns place names).
   * Rate-limited to 1 req/s by Nominatim — our 5-min cache keeps us well below that.
   */
  async function reverseGeocode(lat, lon) {
    const url  = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&zoom=10`;
    const res  = await timedFetch(url, { headers: { 'Accept': 'application/json' } }, 8000);
    const data = await res.json();
    const a    = data.address || {};
    return {
      // Prefer city, fall back to town → village → county
      city:    a.city || a.town || a.village || a.county || a.municipality || 'Unknown',
      region:  a.state || a.region || '',
      country: a.country || '',
    };
  }

  // ── Weather API ───────────────────────────────────────────────────────────

  /**
   * Open-Meteo — free weather API, no key required.
   * Docs: https://open-meteo.com/en/docs
   * Returns current temperature, humidity, wind speed, and WMO weather code.
   */
  async function fetchWeather(lat, lon) {
    const params = new URLSearchParams({
      latitude:        lat.toFixed(4),
      longitude:       lon.toFixed(4),
      current:         'temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m',
      wind_speed_unit: 'kmh',
      timezone:        'auto',            // Open-Meteo infers the local timezone
    });

    const res  = await timedFetch(
      `https://api.open-meteo.com/v1/forecast?${params}`, {}, 10000
    );
    const data = await res.json();

    const c = data.current;
    if (!c || c.temperature_2m == null) {
      throw new Error('Open-Meteo returned no current weather data');
    }

    return {
      temp:     Math.round(c.temperature_2m),
      humidity: c.relative_humidity_2m ?? null,
      wind:     Math.round(c.wind_speed_10m ?? 0),
      code:     c.weather_code ?? 0,
    };
  }

  // ── Main load sequence ────────────────────────────────────────────────────

  async function load() {
    // Serve from cache if still fresh (avoids redundant API calls on page reload)
    const cached = readCache();
    if (cached) {
      console.info('[WeatherWidget] Serving from cache');
      render(cached);
      return;
    }

    setCardState('loading');
    setPillState('loading');

    try {
      let lat, lon, city, region, country;

      // ── Step 1: get location ─────────────────────────────────────────────
      try {
        // GPS path — most accurate
        const gps = await getGPS();
        lat = gps.lat;
        lon = gps.lon;

        // Reverse geocode the GPS coords
        const place = await reverseGeocode(lat, lon);
        city    = place.city;
        region  = place.region;
        country = place.country;

        console.info(`[WeatherWidget] GPS → ${city}, ${country}`);

      } catch (gpsErr) {
        // GPS denied, timed out, or unavailable — fall back to IP
        console.info('[WeatherWidget] GPS unavailable:', gpsErr.message, '→ using IP geolocation');
        const ip = await getIPLocation();
        lat     = ip.lat;
        lon     = ip.lon;
        city    = ip.city;
        region  = ip.region;
        country = ip.country;

        console.info(`[WeatherWidget] IP → ${city}, ${country}`);
      }

      // ── Step 2: fetch weather ────────────────────────────────────────────
      const weather = await fetchWeather(lat, lon);

      // ── Step 3: assemble, cache, render ─────────────────────────────────
      const data = { ...weather, city, region, country };
      writeCache(data);
      render(data);

    } catch (err) {
      console.warn('[WeatherWidget] Load failed:', err.message);
      setCardState('error');
      setPillState('data');

      // Show a neutral pill so the widget doesn't look broken
      el('wwPillIcon').textContent = '🌡️';
      el('wwPillTemp').textContent = '—°C';
      el('wwPillCity').textContent = 'Weather';
    }
  }

  // ── Init ──────────────────────────────────────────────────────────────────

  function init() {
    rootEl = document.getElementById('weatherWidget');
    if (!rootEl) return;   // widget HTML not present on this page

    cardEl = document.getElementById('wwCard');
    pillEl = document.getElementById('wwPill');

    // Toggle card on pill click
    pillEl.addEventListener('click', (e) => {
      e.stopPropagation();
      setOpen(!isOpen);
    });

    // Retry button inside error state
    const retryBtn = document.getElementById('wwRetry');
    if (retryBtn) {
      retryBtn.addEventListener('click', () => {
        sessionStorage.removeItem(CACHE_KEY);
        load();
      });
    }

    // Close card when clicking anywhere outside the widget
    document.addEventListener('click', (e) => {
      if (isOpen && !rootEl.contains(e.target)) {
        setOpen(false);
      }
    });

    // Keyboard: Escape closes the card
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && isOpen) setOpen(false);
    });

    // Start loading weather immediately
    load();
  }

  // Public API
  return {
    init,
    /** Force a fresh reload (clears cache) — callable from browser console */
    reload() {
      sessionStorage.removeItem(CACHE_KEY);
      load();
    },
  };
})();

// Auto-boot when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => WeatherWidget.init());
} else {
  WeatherWidget.init();
}
