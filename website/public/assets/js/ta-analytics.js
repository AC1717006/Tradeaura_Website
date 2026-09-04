/* TradeAura first-party analytics — 2.9 KB, no dependencies, no cookies.
   Sends anonymous page views and the chat widget's existing events to the
   TradeAura API. Nothing personal: random ids, path only, referrer only.
   Honours Global Privacy Control / Do Not Track (no persistent id) and
   <meta name="ta-analytics" content="off">. Never blocks rendering. */
(function () {
  'use strict';
  var meta = document.querySelector('meta[name="ta-analytics"]');
  var ep = meta ? meta.getAttribute('content') : '';
  if (!ep || ep === 'off' || !/^https?:\/\//.test(ep)) return;

  var noTrack = navigator.globalPrivacyControl === true || navigator.doNotTrack === '1' || window.doNotTrack === '1';
  function rid(n) {
    var a = new Uint8Array(n), i;
    if (window.crypto && crypto.getRandomValues) crypto.getRandomValues(a);
    else for (i = 0; i < n; i++) a[i] = Math.floor(Math.random() * 256);
    var s = ''; for (i = 0; i < n; i++) s += ('0' + a[i].toString(16)).slice(-2);
    return s;
  }
  function get(st, k) { try { return st.getItem(k); } catch (e) { return null; } }
  function set(st, k, v) { try { st.setItem(k, v); } catch (e) {} }

  var now = Date.now();
  var vid = noTrack ? null : get(localStorage, 'ta_vid');
  if (!vid || !/^[a-f0-9]{32}$/.test(vid)) { vid = rid(16); if (!noTrack) set(localStorage, 'ta_vid', vid); }
  var sid = get(sessionStorage, 'ta_sid'), last = +get(sessionStorage, 'ta_sid_t') || 0, sidStart = +get(sessionStorage, 'ta_sid_s') || 0;
  if (!sid || !/^[a-f0-9]{32}$/.test(sid) || now - last > 30 * 60 * 1000) { sid = rid(16); sidStart = now; set(sessionStorage, 'ta_sid_s', String(now)); set(sessionStorage, 'ta_ref', document.referrer || ''); set(sessionStorage, 'ta_utm', ''); }
  set(sessionStorage, 'ta_sid', sid); set(sessionStorage, 'ta_sid_t', String(now));

  var utm = {};
  try {
    var p = new URLSearchParams(location.search);
    [['s', 'utm_source'], ['m', 'utm_medium'], ['c', 'utm_campaign'], ['ct', 'utm_content'], ['t', 'utm_term']].forEach(function (x) { var v = p.get(x[1]); if (v) utm[x[0]] = v.slice(0, 150); });
    if (Object.keys(utm).length) set(sessionStorage, 'ta_utm', JSON.stringify(utm));
    else { var stored = get(sessionStorage, 'ta_utm'); if (stored) utm = JSON.parse(stored); }
  } catch (e) { utm = {}; }
  var ref = get(sessionStorage, 'ta_ref'); if (ref === null) ref = document.referrer || '';
  var tz = ''; try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone || ''; } catch (e) {}

  var queue = [], timer = null;
  function flush() {
    if (!queue.length) return;
    var batch = queue.splice(0, 20);
    var body = JSON.stringify({ vid: vid, sid: sid, lang: navigator.language, tz: tz, ref: ref, utm: utm, events: batch });
    set(sessionStorage, 'ta_sid_t', String(Date.now()));
    var sent = false;
    if (navigator.sendBeacon) { try { sent = navigator.sendBeacon(ep, new Blob([body], { type: 'text/plain' })); } catch (e) {} }
    if (!sent) { try { fetch(ep, { method: 'POST', body: body, headers: { 'Content-Type': 'text/plain' }, keepalive: true, mode: 'cors', credentials: 'omit' }).catch(function () {}); } catch (e) {} }
    if (queue.length) flush();
  }
  function track(name, data) {
    if (typeof name !== 'string') return;
    queue.push({ n: name, p: location.pathname, t: Date.now(), id: rid(8), d: data || undefined });
    if (queue.length >= 10) { if (timer) { clearTimeout(timer); timer = null; } flush(); }
    else if (!timer) timer = setTimeout(function () { timer = null; flush(); }, 1500);
  }
  function pick(d) {
    var out = {}, k, keys = ['conversationId', 'leadId', 'service', 'label'];
    for (k = 0; k < keys.length; k++) if (d && d[keys[k]] != null) out[keys[k]] = String(d[keys[k]]).slice(0, 80);
    return out;
  }

  track('page_view');
  ['chat_open', 'chat_started', 'chat_message', 'chat_lead_ready', 'chat_enquiry_submit', 'chat_enquiry_success',
   'chat_handoff', 'service_selected', 'whatsapp_clicked', 'contact_form_submit'].forEach(function (n) {
    window.addEventListener('tradeaura:' + n, function (e) { track(n, pick(e && e.detail)); });
  });
  var ended = false;
  function end() { if (ended) return; ended = true; track('session_end', { duration: Math.round((Date.now() - sidStart) / 1000) }); if (timer) { clearTimeout(timer); timer = null; } flush(); }
  window.addEventListener('pagehide', end);
  document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'hidden') { if (timer) { clearTimeout(timer); timer = null; } flush(); } });

  window.taAnalytics = { vid: vid, sid: sid, track: track };
})();
