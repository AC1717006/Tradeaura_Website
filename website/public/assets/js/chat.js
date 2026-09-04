/* ─────────────────────────────────────────────────────────────
   TradeAura AI — chat client.

   Zero dependencies, matching site.js conventions (IIFE, 'use strict',
   ES5-compatible syntax, no build step).

   SECURITY: every piece of dynamic text is inserted with textContent.
   There is no innerHTML anywhere in this file, so a hostile API reply
   cannot inject markup. No secret ever reaches this file — the widget
   only knows the public API URL and the public WhatsApp number.

   PERFORMANCE: loaded with `defer`, and nothing but the launcher is
   touched until the visitor actually opens the panel.
   ───────────────────────────────────────────────────────────── */
(function () {
  'use strict';

  var root = document.querySelector('[data-ta-chat]');
  if (!root) return;

  var API = root.getAttribute('data-api') || '';
  if (!API) return;

  var panel   = root.querySelector('[data-ta-chat-panel]') || root.querySelector('.ta-chat__panel');
  var log     = root.querySelector('[data-ta-chat-log]');
  var quick   = root.querySelector('[data-ta-chat-quick]');
  var form    = root.querySelector('[data-ta-chat-form]');
  var input   = root.querySelector('[data-ta-chat-input]');
  var sendBtn = root.querySelector('[data-ta-chat-send]');
  var openBtn = root.querySelector('[data-ta-chat-open]');
  var typing  = root.querySelector('.ta-chat__typing');

  var conversationId = null;
  var busy = false;
  var opened = false;
  var lastMessage = null;   // for retry
  var submitting = false;
  var leadSubmitted = false;
  var STORE_KEY = 'ta-chat-id';

  /* ── Analytics ────────────────────────────────────────────────
     No analytics library exists on this site. Rather than add one,
     emit a DOM CustomEvent and push to dataLayer if GTM ever lands.
     Costs nothing when nobody is listening. */
  function track(name, detail) {
    var payload = detail || {};
    try {
      window.dispatchEvent(new CustomEvent('tradeaura:' + name, { detail: payload }));
      if (Array.isArray(window.dataLayer)) {
        window.dataLayer.push(Object.assign({ event: 'ta_' + name }, payload));
      }
    } catch (e) { /* analytics must never break the widget */ }
  }

  /* ── Time ─────────────────────────────────────────────────── */
  function stamp() {
    var d = new Date();
    var h = d.getHours(), m = d.getMinutes();
    var ap = h >= 12 ? 'pm' : 'am';
    h = h % 12; if (h === 0) h = 12;
    return h + ':' + (m < 10 ? '0' : '') + m + ' ' + ap;
  }

  /* ── Rendering — textContent only, never innerHTML ────────── */
  function addMessage(who, text, opts) {
    var o = opts || {};
    var wrap = document.createElement('div');
    wrap.className = 'ta-chat__msg ta-chat__msg--' + who + (o.error ? ' ta-chat__msg--error' : '');

    var bubble = document.createElement('div');
    bubble.className = 'ta-chat__bubble';
    bubble.textContent = text;                    // <- no markup can enter
    wrap.appendChild(bubble);

    var time = document.createElement('span');
    time.className = 'ta-chat__time';
    time.textContent = stamp();
    wrap.appendChild(time);

    if (o.retry) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'ta-chat__retry';
      btn.textContent = 'Try again';
      btn.addEventListener('click', function () {
        wrap.parentNode && wrap.parentNode.removeChild(wrap);
        if (lastMessage) send(lastMessage, true);
      });
      wrap.appendChild(btn);
    }

    log.insertBefore(wrap, typing);
    scrollDown();
    return wrap;
  }

  function scrollDown() {
    // rAF so the browser has laid the new node out before we measure.
    window.requestAnimationFrame(function () { log.scrollTop = log.scrollHeight; });
  }

  function setTyping(on) {
    root.setAttribute('data-typing', on ? 'true' : 'false');
    if (on) scrollDown();
  }

  function setBusy(on) {
    busy = on;
    if (sendBtn) sendBtn.disabled = on;
    if (input) input.disabled = on;
  }

  /* ── Quick actions ────────────────────────────────────────── */
  function clearQuick() { while (quick && quick.firstChild) quick.removeChild(quick.firstChild); }

  function addWhatsAppCta(url) {
    if (!quick || !url) return;
    if (quick.querySelector('.ta-chat__wa')) return;
    var a = document.createElement('a');
    a.className = 'ta-chat__wa';
    a.href = url;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.textContent = 'Continue on WhatsApp';
    a.addEventListener('click', function () { track('whatsapp_clicked', { conversationId: conversationId }); });
    quick.appendChild(a);
  }

  function addHumanChip() {
    if (!quick || quick.querySelector('[data-ta-human]')) return;
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'ta-chat__chip';
    b.setAttribute('data-ta-human', '');
    b.textContent = 'Talk to a human';
    b.addEventListener('click', handoff);
    quick.appendChild(b);
  }

  /* ── Enquiry confirmation card ────────────────────────────────
     The lead is created ONLY when the visitor presses this button.
     Nothing is submitted automatically. */
  function addEnquiryCard(summary) {
    if (!quick) return;
    if (quick.querySelector('[data-ta-enquiry]')) return;

    var card = document.createElement('div');
    card.className = 'ta-chat__enquiry';
    card.setAttribute('data-ta-enquiry', '');

    var heading = document.createElement('p');
    heading.className = 'ta-chat__enquiry-title';
    heading.textContent = "Here’s what I’ve understood — check it, then send it to the team:";
    card.appendChild(heading);

    if (summary && Object.keys(summary).length) {
      var dl = document.createElement('dl');
      dl.className = 'ta-chat__enquiry-list';
      var LABELS = {
        name: 'Name', company: 'Company', phone: 'Phone', email: 'Email',
        requirement: 'Requirement', timeline: 'Timeline', services: 'Services'
      };
      Object.keys(LABELS).forEach(function (k) {
        if (!summary[k]) return;
        var dt = document.createElement('dt'); dt.textContent = LABELS[k];
        var dd = document.createElement('dd');
        dd.textContent = Array.isArray(summary[k]) ? summary[k].join(', ') : summary[k];
        dl.appendChild(dt); dl.appendChild(dd);
      });
      if (dl.children.length) card.appendChild(dl);
    }

    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'ta-chat__enquiry-send';
    btn.textContent = 'Send Enquiry';
    btn.addEventListener('click', function () { submitEnquiry(btn, card); });
    card.appendChild(btn);
    quick.appendChild(card);
    scrollDown();
  }

  function submitEnquiry(btn, card) {
    if (busy || submitting || !conversationId) return;
    submitting = true;
    track('chat_enquiry_submit', { conversationId: conversationId });
    btn.disabled = true;
    btn.textContent = 'Sending…';

    post('/submit', { conversationId: conversationId }).then(function (r) {
      var d = r.data || {};

      if (r.status === 422) {
        submitting = false;
        btn.disabled = false;
        btn.textContent = 'Send Enquiry';
        addMessage('ai', d.reply || 'I need a little more before I can send this.');
        return;
      }
      if (!r.ok || !d.ok) {
        submitting = false;
        btn.disabled = false;
        btn.textContent = 'Send Enquiry';
        addMessage('ai', d.reply || 'I could not send that just now. Please try again.', { error: true });
        if (d.whatsappUrl) addWhatsAppCta(d.whatsappUrl);
        return;
      }

      /* Success — the card becomes a receipt so it cannot be pressed twice. */
      leadSubmitted = true;
      if (card && card.parentNode) card.parentNode.removeChild(card);
      addMessage('ai', d.reply);
      if (d.leadId) {
        var ref = document.createElement('p');
        ref.className = 'ta-chat__ref';
        ref.textContent = 'Reference: ' + d.leadId;
        log.insertBefore(ref, typing);
      }
      track('chat_enquiry_success', { conversationId: conversationId, leadId: d.leadId });
      if (d.whatsappUrl) addWhatsAppCta(d.whatsappUrl);
      scrollDown();
    }).catch(function () {
      submitting = false;
      btn.disabled = false;
      btn.textContent = 'Send Enquiry';
      addMessage('ai', 'I could not reach the server. Please try again.', { error: true });
    });
  }

  /* ── Network ──────────────────────────────────────────────── */
  /* The server gives Gemini up to 45s. If nothing comes back in 60s the
     network itself has stalled — abort so the UI never looks frozen and
     the visitor gets a retry, instead of a typing indicator forever. */
  var REQUEST_TIMEOUT_MS = 60000;

  function post(path, payload) {
    var ctrl = typeof AbortController === 'function' ? new AbortController() : null;
    var timer = ctrl ? window.setTimeout(function () { ctrl.abort(); }, REQUEST_TIMEOUT_MS) : null;
    return fetch(API + path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      credentials: 'omit',
      mode: 'cors',
      signal: ctrl ? ctrl.signal : undefined
    }).then(function (res) {
      return res.json().catch(function () { return {}; }).then(function (data) {
        return { ok: res.ok, status: res.status, data: data };
      });
    }).finally(function () {
      if (timer) window.clearTimeout(timer);
    });
  }

  function send(text, isRetry) {
    if (busy || !text) return;
    lastMessage = text;

    if (!isRetry) {
      addMessage('me', text);
      track('chat_message', { conversationId: conversationId });
    }
    clearQuick();
    setBusy(true);
    setTyping(true);

    var payload = { message: text };
    if (conversationId) payload.conversationId = conversationId;
    else {
      payload.pageUrl = String(location.href).slice(0, 300);
      if (document.referrer) payload.referrer = String(document.referrer).slice(0, 300);
      if (window.taAnalytics) { payload.visitorId = window.taAnalytics.vid; payload.sessionId = window.taAnalytics.sid; }
    }

    post('', payload).then(function (r) {
      setTyping(false);
      setBusy(false);
      var d = r.data || {};

      if (d.conversationId && d.conversationId !== conversationId) {
        conversationId = d.conversationId;
        try { sessionStorage.setItem(STORE_KEY, conversationId); } catch (e) {}
      }

      if (r.status === 429) {
        addMessage('ai', 'You are sending messages a little quickly. Give it a moment and try again.', { error: true, retry: true });
        return;
      }
      if (r.status === 409) {
        conversationId = null;
        try { sessionStorage.removeItem(STORE_KEY); } catch (e) {}
        addMessage('ai', 'That conversation timed out. Send your message again and I will start a fresh one.', { error: true, retry: true });
        return;
      }
      if (!d.reply) {
        addMessage('ai', 'Something went wrong at our end. Please try again.', { error: true, retry: true });
        if (d.whatsappUrl) addWhatsAppCta(d.whatsappUrl);
        return;
      }

      addMessage('ai', d.reply, { error: Boolean(d.degraded) });

      if (d.leadReady && !leadSubmitted) {
        track('chat_lead_ready', { conversationId: conversationId });
        addEnquiryCard(d.enquirySummary);
      }
      if (d.leadCaptured) leadSubmitted = true;

      if (d.whatsappUrl) addWhatsAppCta(d.whatsappUrl);
      if (d.conversationEnded) { setBusy(true); if (input) input.placeholder = 'Conversation ended'; }
      else addHumanChip();

    }).catch(function () {
      setTyping(false);
      setBusy(false);
      addMessage('ai', 'I could not reach the server. Check your connection and try again.', { error: true, retry: true });
    });
  }

  /* ── Human handoff ────────────────────────────────────────── */
  function handoff() {
    if (busy || !conversationId) {
      addMessage('ai', 'Tell me a little about what you need first, then I can pass it to the team.');
      return;
    }
    setBusy(true); setTyping(true);
    post('/handoff', { conversationId: conversationId }).then(function (r) {
      setTyping(false); setBusy(false);
      var d = r.data || {};
      addMessage('ai', d.reply || 'I have let the team know.');
      track('chat_handoff', { conversationId: conversationId });
      if (d.whatsappUrl) addWhatsAppCta(d.whatsappUrl);
    }).catch(function () {
      setTyping(false); setBusy(false);
      addMessage('ai', 'I could not reach the team just now. Please try WhatsApp or the contact page.', { error: true });
    });
  }

  /* ── Open / close ─────────────────────────────────────────── */
  function open() {
    root.setAttribute('data-open', 'true');
    if (openBtn) openBtn.setAttribute('aria-expanded', 'true');
    var ping = root.querySelector('.ta-chat__ping');
    if (ping && ping.parentNode) ping.parentNode.removeChild(ping);

    if (!opened) {
      opened = true;
      track('chat_open', { pageUrl: location.pathname });
      try {
        var saved = sessionStorage.getItem(STORE_KEY);
        if (saved && /^TA-CHAT-[0-9A-F]{8}$/.test(saved)) conversationId = saved;
      } catch (e) {}
    }
    // Only steal focus on a pointer-sized viewport; on phones this would
    // pop the keyboard over the conversation the visitor came to read.
    if (window.matchMedia('(min-width: 561px)').matches && input) {
      window.setTimeout(function () { input.focus(); }, 60);
    }
    fitToViewport();
    scrollDown();
  }

  function close() {
    root.setAttribute('data-open', 'false');
    if (panel) panel.style.height = '';
    if (openBtn) { openBtn.setAttribute('aria-expanded', 'false'); openBtn.focus(); }
  }

  /* ── Wiring ───────────────────────────────────────────────── */
  if (openBtn) openBtn.addEventListener('click', open);

  var closeBtn = root.querySelector('[data-ta-chat-close]');
  if (closeBtn) closeBtn.addEventListener('click', close);

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && root.getAttribute('data-open') === 'true') close();
  });

  if (quick) {
    quick.addEventListener('click', function (e) {
      var chip = e.target.closest ? e.target.closest('[data-ta-chat-chip]') : null;
      if (!chip) return;
      var label = chip.getAttribute('data-ta-chat-chip');
      if (!opened) track('chat_started', {});
      track('service_selected', { service: label });
      send(label);
    });
  }

  if (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var text = (input.value || '').trim();
      if (!text) return;
      input.value = '';
      autosize();
      send(text);
    });
  }

  if (input) {
    // Enter sends, Shift+Enter makes a new line.
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        if (form.requestSubmit) form.requestSubmit();
        else form.dispatchEvent(new Event('submit', { cancelable: true }));
      }
    });
    input.addEventListener('input', autosize);
  }

  /* MOBILE KEYBOARD: on iOS/Android the on-screen keyboard shrinks the
     visual viewport without resizing the layout viewport, so a fixed
     panel keeps its full height and the composer ends up underneath the
     keyboard. Track visualViewport and shorten the panel to match. */
  function fitToViewport() {
    var vv = window.visualViewport;
    if (!vv || !panel) return;
    if (!window.matchMedia('(max-width: 560px)').matches) {
      panel.style.height = '';
      return;
    }
    var h = Math.round(vv.height - Math.max(0, vv.offsetTop));
    panel.style.height = h + 'px';
    scrollDown();
  }

  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', fitToViewport);
    window.visualViewport.addEventListener('scroll', fitToViewport);
  }

  function autosize() {
    if (!input) return;
    input.style.height = 'auto';
    input.style.height = Math.min(input.scrollHeight, 108) + 'px';
  }
})();
