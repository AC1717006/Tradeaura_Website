/**
 * shared/intl-contact.js — ONE international contact/location standard for the whole platform.
 *
 * Runs unchanged in Node (CommonJS) and in the browser (window.IntlContact). No dependencies.
 * Served to browsers as /gym/assets/intl-contact.js and copied into the website build; the
 * SERVER is authoritative — browser use is UX assistance only.
 *
 * Canonical representations
 *   phone   : E.164 with leading '+'  (+919876543210, +14155551234, +447700900123)
 *   country : ISO 3166-1 alpha-2      (IN, US, GB, AE, CA, AU)
 *   Meta / WhatsApp Cloud API boundary uses the same digits WITHOUT '+' (wa_id form):
 *     toMeta('+919876543210') === '919876543210', fromMeta('919876543210') === '+919876543210'
 *
 * Parsing rules (country context is REQUIRED for local numbers; never guessed from geolocation)
 *   '+<cc><nsn>' / '00<cc><nsn>'  → international, country derived from the calling code
 *   otherwise                     → national number of the supplied country (trunk '0' stripped
 *                                   where that country uses one); if no country is supplied the
 *                                   number is rejected unless it is already international.
 *   Legacy tolerance: a bare 10-digit Indian mobile (6–9xxxxxxxxx) is accepted ONLY when the
 *   caller passes country 'IN' (or legacyIndia:true) — this keeps every existing production
 *   record and old client valid without making India a global default.
 *
 * Validation: E.164 length ≤ 15 digits, national significant number within the per-country
 * min/max (table below; ITU fallback 4–14), no leading zero in the NSN after trunk removal.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.IntlContact = factory();
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /* ── Country table: [iso2, name, dial, nsnMin, nsnMax, trunk0]
        trunk0 = 1 when a leading domestic '0' is dialled nationally (stripped on parse). */
  var T = [
    ['AF','Afghanistan',93,9,9,1],['AL','Albania',355,9,9,1],['DZ','Algeria',213,9,9,1],['AS','American Samoa',1,10,10,0],['AD','Andorra',376,6,9,0],['AO','Angola',244,9,9,0],['AI','Anguilla',1,10,10,0],['AG','Antigua and Barbuda',1,10,10,0],['AR','Argentina',54,10,11,1],['AM','Armenia',374,8,8,1],['AW','Aruba',297,7,7,0],['AU','Australia',61,9,9,1],['AT','Austria',43,7,13,1],['AZ','Azerbaijan',994,9,9,1],
    ['BS','Bahamas',1,10,10,0],['BH','Bahrain',973,8,8,0],['BD','Bangladesh',880,10,10,1],['BB','Barbados',1,10,10,0],['BY','Belarus',375,9,9,1],['BE','Belgium',32,8,9,1],['BZ','Belize',501,7,7,0],['BJ','Benin',229,8,10,0],['BM','Bermuda',1,10,10,0],['BT','Bhutan',975,7,8,0],['BO','Bolivia',591,8,8,0],['BA','Bosnia and Herzegovina',387,8,9,1],['BW','Botswana',267,7,8,0],['BR','Brazil',55,10,11,1],['VG','British Virgin Islands',1,10,10,0],['BN','Brunei',673,7,7,0],['BG','Bulgaria',359,8,9,1],['BF','Burkina Faso',226,8,8,0],['BI','Burundi',257,8,8,0],
    ['KH','Cambodia',855,8,9,1],['CM','Cameroon',237,9,9,0],['CA','Canada',1,10,10,0],['CV','Cape Verde',238,7,7,0],['KY','Cayman Islands',1,10,10,0],['CF','Central African Republic',236,8,8,0],['TD','Chad',235,8,8,0],['CL','Chile',56,9,9,0],['CN','China',86,11,11,1],['CO','Colombia',57,10,10,0],['KM','Comoros',269,7,7,0],['CG','Congo',242,9,9,0],['CD','Congo (DRC)',243,9,9,1],['CK','Cook Islands',682,5,5,0],['CR','Costa Rica',506,8,8,0],['CI','Côte d’Ivoire',225,10,10,0],['HR','Croatia',385,8,9,1],['CU','Cuba',53,8,8,1],['CW','Curaçao',599,7,8,0],['CY','Cyprus',357,8,8,0],['CZ','Czechia',420,9,9,0],
    ['DK','Denmark',45,8,8,0],['DJ','Djibouti',253,8,8,0],['DM','Dominica',1,10,10,0],['DO','Dominican Republic',1,10,10,0],
    ['EC','Ecuador',593,9,9,1],['EG','Egypt',20,10,10,1],['SV','El Salvador',503,8,8,0],['GQ','Equatorial Guinea',240,9,9,0],['ER','Eritrea',291,7,7,1],['EE','Estonia',372,7,8,0],['SZ','Eswatini',268,8,8,0],['ET','Ethiopia',251,9,9,1],
    ['FJ','Fiji',679,7,7,0],['FI','Finland',358,5,12,1],['FR','France',33,9,9,1],['GF','French Guiana',594,9,9,1],['PF','French Polynesia',689,8,8,0],
    ['GA','Gabon',241,7,8,0],['GM','Gambia',220,7,7,0],['GE','Georgia',995,9,9,1],['DE','Germany',49,7,13,1],['GH','Ghana',233,9,9,1],['GI','Gibraltar',350,8,8,0],['GR','Greece',30,10,10,0],['GL','Greenland',299,6,6,0],['GD','Grenada',1,10,10,0],['GP','Guadeloupe',590,9,9,1],['GU','Guam',1,10,10,0],['GT','Guatemala',502,8,8,0],['GN','Guinea',224,9,9,0],['GW','Guinea-Bissau',245,9,9,0],['GY','Guyana',592,7,7,0],
    ['HT','Haiti',509,8,8,0],['HN','Honduras',504,8,8,0],['HK','Hong Kong',852,8,8,0],['HU','Hungary',36,8,9,1],
    ['IS','Iceland',354,7,7,0],['IN','India',91,10,10,1],['ID','Indonesia',62,8,12,1],['IR','Iran',98,10,10,1],['IQ','Iraq',964,10,10,1],['IE','Ireland',353,7,9,1],['IL','Israel',972,8,9,1],['IT','Italy',39,6,11,0],
    ['JM','Jamaica',1,10,10,0],['JP','Japan',81,9,10,1],['JO','Jordan',962,8,9,1],
    ['KZ','Kazakhstan',7,10,10,1],['KE','Kenya',254,9,9,1],['KI','Kiribati',686,5,8,0],['XK','Kosovo',383,8,9,1],['KW','Kuwait',965,7,8,0],['KG','Kyrgyzstan',996,9,9,1],
    ['LA','Laos',856,8,10,1],['LV','Latvia',371,8,8,0],['LB','Lebanon',961,7,8,1],['LS','Lesotho',266,8,8,0],['LR','Liberia',231,7,9,1],['LY','Libya',218,9,9,1],['LI','Liechtenstein',423,7,9,0],['LT','Lithuania',370,8,8,1],['LU','Luxembourg',352,4,11,0],
    ['MO','Macao',853,8,8,0],['MG','Madagascar',261,9,9,1],['MW','Malawi',265,7,9,1],['MY','Malaysia',60,9,10,1],['MV','Maldives',960,7,7,0],['ML','Mali',223,8,8,0],['MT','Malta',356,8,8,0],['MH','Marshall Islands',692,7,7,0],['MQ','Martinique',596,9,9,1],['MR','Mauritania',222,8,8,0],['MU','Mauritius',230,7,8,0],['MX','Mexico',52,10,10,0],['FM','Micronesia',691,7,7,0],['MD','Moldova',373,8,8,1],['MC','Monaco',377,8,9,0],['MN','Mongolia',976,8,8,0],['ME','Montenegro',382,8,9,1],['MS','Montserrat',1,10,10,0],['MA','Morocco',212,9,9,1],['MZ','Mozambique',258,9,9,0],['MM','Myanmar',95,8,10,1],
    ['NA','Namibia',264,9,9,1],['NR','Nauru',674,7,7,0],['NP','Nepal',977,10,10,1],['NL','Netherlands',31,9,9,1],['NC','New Caledonia',687,6,6,0],['NZ','New Zealand',64,8,10,1],['NI','Nicaragua',505,8,8,0],['NE','Niger',227,8,8,0],['NG','Nigeria',234,10,10,1],['NU','Niue',683,4,4,0],['MK','North Macedonia',389,8,8,1],['MP','Northern Mariana Islands',1,10,10,0],['NO','Norway',47,8,8,0],
    ['OM','Oman',968,8,8,0],
    ['PK','Pakistan',92,10,10,1],['PW','Palau',680,7,7,0],['PS','Palestine',970,9,9,1],['PA','Panama',507,7,8,0],['PG','Papua New Guinea',675,7,8,0],['PY','Paraguay',595,9,9,1],['PE','Peru',51,9,9,1],['PH','Philippines',63,10,10,1],['PL','Poland',48,9,9,0],['PT','Portugal',351,9,9,0],['PR','Puerto Rico',1,10,10,0],
    ['QA','Qatar',974,8,8,0],
    ['RE','Réunion',262,9,9,1],['RO','Romania',40,9,9,1],['RU','Russia',7,10,10,1],['RW','Rwanda',250,9,9,0],
    ['KN','Saint Kitts and Nevis',1,10,10,0],['LC','Saint Lucia',1,10,10,0],['VC','Saint Vincent and the Grenadines',1,10,10,0],['WS','Samoa',685,5,7,0],['SM','San Marino',378,6,10,0],['ST','São Tomé and Príncipe',239,7,7,0],['SA','Saudi Arabia',966,9,9,1],['SN','Senegal',221,9,9,0],['RS','Serbia',381,8,9,1],['SC','Seychelles',248,7,7,0],['SL','Sierra Leone',232,8,8,1],['SG','Singapore',65,8,8,0],['SX','Sint Maarten',1,10,10,0],['SK','Slovakia',421,9,9,1],['SI','Slovenia',386,8,8,1],['SB','Solomon Islands',677,5,7,0],['SO','Somalia',252,7,9,1],['ZA','South Africa',27,9,9,1],['KR','South Korea',82,9,10,1],['SS','South Sudan',211,9,9,1],['ES','Spain',34,9,9,0],['LK','Sri Lanka',94,9,9,1],['SD','Sudan',249,9,9,1],['SR','Suriname',597,6,7,0],['SE','Sweden',46,7,10,1],['CH','Switzerland',41,9,9,1],['SY','Syria',963,9,9,1],
    ['TW','Taiwan',886,9,9,1],['TJ','Tajikistan',992,9,9,0],['TZ','Tanzania',255,9,9,1],['TH','Thailand',66,8,9,1],['TL','Timor-Leste',670,7,8,0],['TG','Togo',228,8,8,0],['TO','Tonga',676,5,7,0],['TT','Trinidad and Tobago',1,10,10,0],['TN','Tunisia',216,8,8,0],['TR','Türkiye',90,10,10,1],['TM','Turkmenistan',993,8,8,1],['TC','Turks and Caicos Islands',1,10,10,0],['TV','Tuvalu',688,5,6,0],
    ['UG','Uganda',256,9,9,1],['UA','Ukraine',380,9,9,1],['AE','United Arab Emirates',971,8,9,1],['GB','United Kingdom',44,9,10,1],['US','United States',1,10,10,0],['UY','Uruguay',598,8,8,1],['UZ','Uzbekistan',998,9,9,1],
    ['VU','Vanuatu',678,5,7,0],['VA','Vatican City',39,6,11,0],['VE','Venezuela',58,10,10,1],['VN','Vietnam',84,9,9,1],['VI','U.S. Virgin Islands',1,10,10,0],
    ['YE','Yemen',967,9,9,1],['ZM','Zambia',260,9,9,1],['ZW','Zimbabwe',263,9,9,1]
  ];
  var COUNTRIES = T.map(function (r) { return { code: r[0], name: r[1], dial: r[2], nsnMin: r[3], nsnMax: r[4], trunk0: !!r[5] }; });
  var BY_CODE = {}; COUNTRIES.forEach(function (c) { BY_CODE[c.code] = c; });
  /* Representative country per shared calling code when the caller gives no country context. */
  var SHARED_DEFAULT = { 1: 'US', 7: 'RU', 39: 'IT', 44: 'GB', 47: 'NO', 61: 'AU', 599: 'CW', 262: 'RE', 590: 'GP' };
  /* NANP (+1) area codes that belong to Canada — lets '+1 416 …' resolve to CA without a user hint. */
  var CA_AREA = '204 226 236 249 250 257 263 289 306 343 354 365 367 368 382 403 416 418 428 431 437 438 450 460 468 474 506 514 519 548 579 581 584 587 604 613 639 647 672 683 705 709 742 753 778 780 782 807 819 825 867 873 879 902 905'.split(' ');
  var DIALS = []; COUNTRIES.forEach(function (c) { if (DIALS.indexOf(c.dial) < 0) DIALS.push(c.dial); }); DIALS.sort(function (a, b) { return String(b).length - String(a).length; });

  /* Preferred national display grouping per country (digits after the country code). */
  var GROUPS = { IN: [5, 5], US: [3, 3, 4], CA: [3, 3, 4], GB: [4, 6], AE: [2, 3, 4], AU: [3, 3, 3], DE: [3, 4, 4], FR: [1, 2, 2, 2, 2], SG: [4, 4], PK: [3, 7], BD: [4, 6], NP: [3, 7], LK: [2, 7], SA: [2, 3, 4], QA: [4, 4], KW: [4, 4], OM: [4, 4], BH: [4, 4], MY: [2, 4, 4], NZ: [2, 3, 4], ZA: [2, 3, 4], IE: [2, 3, 4], NL: [1, 8], IT: [3, 7], ES: [3, 3, 3], BR: [2, 5, 4], MX: [2, 4, 4], JP: [2, 4, 4], CN: [3, 4, 4], ID: [3, 4, 4], PH: [3, 3, 4], NG: [3, 3, 4], KE: [3, 6], EG: [2, 4, 4], TR: [3, 3, 4], RU: [3, 3, 4] };

  function flag(code) {
    if (!/^[A-Z]{2}$/.test(code || '')) return '';
    return String.fromCodePoint(0x1F1E6 + code.charCodeAt(0) - 65, 0x1F1E6 + code.charCodeAt(1) - 65);
  }
  function country(code) { return BY_CODE[String(code || '').toUpperCase()] || null; }
  function isCountry(code) { return !!country(code); }
  function countryName(code) { var c = country(code); return c ? c.name : ''; }

  function resolveCountry(dial, nsn, hint) {
    var cands = COUNTRIES.filter(function (c) { return c.dial === dial; });
    if (!cands.length) return null;
    if (hint) { var h = String(hint).toUpperCase(); for (var i = 0; i < cands.length; i++) if (cands[i].code === h) return cands[i]; }
    if (dial === 1 && nsn && CA_AREA.indexOf(nsn.slice(0, 3)) >= 0) return BY_CODE.CA;
    if (dial === 1 && nsn && cands.length) { /* other NANP territories are only picked by explicit hint */ }
    var d = SHARED_DEFAULT[dial]; if (d && BY_CODE[d]) return BY_CODE[d];
    return cands[0];
  }

  /**
   * parsePhone(raw, opts) → { ok, e164, country, dial, national, reason }
   *   opts.country      ISO2 context for local numbers (from the selector); required for local input
   *   opts.legacyIndia  accept bare 10-digit 6–9… as India when no country is supplied (server compatibility)
   */
  function parsePhone(raw, opts) {
    opts = opts || {}; if (typeof opts === 'string') opts = { country: opts };
    var fail = function (reason) { return { ok: false, e164: null, country: null, dial: null, national: null, reason: reason }; };
    if (raw === null || raw === undefined) return fail('empty');
    var s = String(raw).trim();
    if (!s) return fail('empty');
    if (s.length > 40) return fail('too_long');
    /* keep digits and a single leading plus; tolerate spaces, dots, dashes, brackets, unicode digits are NOT converted (kept strict) */
    var intl = /^\s*(\+|00)/.test(s);
    var digits = s.replace(/\D/g, '');
    if (!digits) return fail('empty');
    var hint = opts.country ? String(opts.country).toUpperCase() : null;
    if (hint && !BY_CODE[hint]) return fail('bad_country');
    var c = null, nsn = null;
    if (intl) {
      if (s.indexOf('00') === 0) digits = digits.slice(2);
      if (digits.length > 15 || digits.length < 5) return fail('length');
      var dial = null;
      for (var i = 0; i < DIALS.length; i++) { var ds = String(DIALS[i]); if (digits.indexOf(ds) === 0) { dial = DIALS[i]; break; } }
      if (dial === null) return fail('bad_country_code');
      nsn = digits.slice(String(dial).length);
      c = resolveCountry(dial, nsn, hint);
      if (!c) return fail('bad_country_code');
    } else if (hint) {
      c = BY_CODE[hint]; nsn = digits;
      /* legacy tolerance: a national number that already carries this country's dial code (e.g. 91xxxxxxxxxx for IN) */
      var dl = String(c.dial);
      if (nsn.length > c.nsnMax && nsn.indexOf(dl) === 0 && nsn.length - dl.length >= c.nsnMin && nsn.length - dl.length <= c.nsnMax) nsn = nsn.slice(dl.length);
      else if (c.trunk0 && nsn.charAt(0) === '0') nsn = nsn.slice(1);   // domestic trunk prefix
    } else if (opts.legacyIndia && /^[6-9]\d{9}$/.test(digits)) {
      c = BY_CODE.IN; nsn = digits;
    } else if (opts.legacyIndia && /^91[6-9]\d{9}$/.test(digits)) {
      c = BY_CODE.IN; nsn = digits.slice(2);
    } else {
      return fail('country_required');
    }
    if (!/^\d+$/.test(nsn) || nsn.length < c.nsnMin || nsn.length > c.nsnMax) return fail('length');
    if (nsn.charAt(0) === '0') return fail('leading_zero');
    if (c.code === 'IN' && !/^[6-9]/.test(nsn)) return fail('invalid_for_country');
    if ((c.dial === 1) && !/^[2-9]\d{2}[2-9]/.test(nsn)) return fail('invalid_for_country');
    var e164 = '+' + c.dial + nsn;
    if (e164.length > 16) return fail('length');
    return { ok: true, e164: e164, country: c.code, dial: c.dial, national: nsn, reason: null };
  }

  /** Strict server-side normaliser: returns E.164 or null. */
  function normalizePhone(raw, opts) { var r = parsePhone(raw, opts); return r.ok ? r.e164 : null; }

  /** Country of an E.164 / wa_id value (no context needed). */
  function countryOf(value) { var r = parsePhone(value && String(value).charAt(0) === '+' ? value : '+' + String(value || '').replace(/\D/g, '')); return r.ok ? r.country : null; }

  /** Display: '+91 98765 43210', '+1 415 555 1234', '+44 7700 900123'. Unknown → grouped by 3s. */
  function formatPhone(value, opts) {
    opts = opts || {};
    var r = parsePhone(value && String(value).charAt(0) === '+' ? value : '+' + String(value || '').replace(/\D/g, ''));
    if (!r.ok) return value ? String(value) : '';
    var g = GROUPS[r.country], parts = [], n = r.national, i = 0;
    if (g) { for (var k = 0; k < g.length && i < n.length; k++) { parts.push(n.slice(i, i + g[k])); i += g[k]; } if (i < n.length) parts.push(n.slice(i)); }
    else { while (i < n.length) { parts.push(n.slice(i, i + 3)); i += 3; } }
    var out = '+' + r.dial + ' ' + parts.join(' ');
    return opts.flag ? flag(r.country) + ' ' + out : out;
  }

  /* WhatsApp / Meta Cloud API boundary (wa_id = E.164 digits without '+') */
  function toMeta(e164) { return String(e164 || '').replace(/\D/g, ''); }
  function fromMeta(waId) { var d = String(waId || '').replace(/\D/g, ''); return d ? '+' + d : null; }
  function samePhone(a, b) { return !!a && !!b && toMeta(a) === toMeta(b); }

  /* Location — country code canonical; state/postal optional everywhere; postal is free-form (2–12 chars). */
  function normalizePostal(raw) {
    if (raw === null || raw === undefined) return null;
    var s = String(raw).trim().toUpperCase().replace(/\s+/g, ' ');
    if (!s) return null;
    if (s.length < 2 || s.length > 12 || !/^[A-Z0-9][A-Z0-9 \-]*[A-Z0-9]$/.test(s)) return false;   // false = invalid, null = empty
    return s;
  }
  function normalizeCountry(raw) { if (!raw) return null; var c = String(raw).trim().toUpperCase(); return BY_CODE[c] ? c : false; }
  function formatLocation(loc) {
    loc = loc || {};
    return [loc.city, loc.state, loc.country ? countryName(loc.country) || loc.country : null].filter(function (x) { return x && String(x).trim(); }).join(', ');
  }
  /* Convenience default timezone per country for a NEW record; the user can always change it. */
  var TZ = { IN: 'Asia/Kolkata', US: 'America/New_York', CA: 'America/Toronto', GB: 'Europe/London', AE: 'Asia/Dubai', AU: 'Australia/Sydney', SG: 'Asia/Singapore', PK: 'Asia/Karachi', BD: 'Asia/Dhaka', NP: 'Asia/Kathmandu', LK: 'Asia/Colombo', SA: 'Asia/Riyadh', QA: 'Asia/Qatar', KW: 'Asia/Kuwait', OM: 'Asia/Muscat', BH: 'Asia/Bahrain', MY: 'Asia/Kuala_Lumpur', NZ: 'Pacific/Auckland', ZA: 'Africa/Johannesburg', DE: 'Europe/Berlin', FR: 'Europe/Paris', IE: 'Europe/Dublin', NL: 'Europe/Amsterdam', ES: 'Europe/Madrid', IT: 'Europe/Rome', JP: 'Asia/Tokyo', CN: 'Asia/Shanghai', HK: 'Asia/Hong_Kong', ID: 'Asia/Jakarta', PH: 'Asia/Manila', TH: 'Asia/Bangkok', VN: 'Asia/Ho_Chi_Minh', NG: 'Africa/Lagos', KE: 'Africa/Nairobi', EG: 'Africa/Cairo', TR: 'Europe/Istanbul', BR: 'America/Sao_Paulo', MX: 'America/Mexico_City', RU: 'Europe/Moscow' };
  function defaultTimezone(code) { return TZ[String(code || '').toUpperCase()] || 'UTC'; }

  /* Searchable list for selectors: sorted by name, with flag + dial. */
  function list() { return COUNTRIES.slice().sort(function (a, b) { return a.name.localeCompare(b.name); }).map(function (c) { return { code: c.code, name: c.name, dial: c.dial, flag: flag(c.code) }; }); }

  return { COUNTRIES: COUNTRIES, country: country, isCountry: isCountry, countryName: countryName, flag: flag, list: list,
    parsePhone: parsePhone, normalizePhone: normalizePhone, countryOf: countryOf, formatPhone: formatPhone,
    toMeta: toMeta, fromMeta: fromMeta, samePhone: samePhone,
    normalizePostal: normalizePostal, normalizeCountry: normalizeCountry, formatLocation: formatLocation, defaultTimezone: defaultTimezone };
}));
