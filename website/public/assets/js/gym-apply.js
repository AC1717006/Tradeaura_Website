/* TradeAura GYM Dashboard — demo application form. Posts JSON to the
   TradeAura API (same origin allowlist as the chat widget). No secrets,
   no third-party calls. Analytics via the existing first-party tracker. */
(function () {
  'use strict';
  var form = document.getElementById('taGymForm');
  if (!form) return;
  var API = 'https://api.auraautomation.site/api/gym/apply';
  var msg = document.getElementById('taGymMsg');
  var btn = document.getElementById('taGymSubmit');
  var success = document.getElementById('taGymSuccess');

  function track(name, detail) {
    try {
      if (window.taAnalytics) window.taAnalytics.track(name, detail || {});
      window.dispatchEvent(new CustomEvent('tradeaura:' + name, { detail: detail || {} }));
    } catch (e) { /* analytics never breaks the form */ }
  }
  track('gym_landing_view');

  /* The browser jumps to #gym-demo-form while the page is still growing
     (font swap and late layout), leaving the viewport hundreds of pixels
     above the section. Re-anchor once, instantly, after layout settles. */
  function reanchor() {
    var target = location.hash && document.getElementById(location.hash.slice(1));
    if (!target) return;
    var off = target.getBoundingClientRect().top;
    /* 'instant' (not 'auto') so this snap overrides scroll-behavior:smooth and
       cannot be cancelled by the browser's own competing fragment scroll. */
    if (Math.abs(off - 84) > 40) target.scrollIntoView({ behavior: 'instant', block: 'start' });
  }
  window.addEventListener('load', function () {
    /* After load the browser performs its own (stale, smooth) fragment scroll;
       correct twice, after it has finished. Both calls are no-ops when the
       viewport is already right. */
    setTimeout(reanchor, 400);
    setTimeout(reanchor, 1400);
  });

  document.querySelectorAll('a[href="#gym-demo-form"]').forEach(function (a) {
    a.addEventListener('click', function () { track('gym_demo_cta_click'); });
  });
  var started = false;
  form.addEventListener('input', function () { if (!started) { started = true; track('gym_demo_form_start'); } });

  /* Shared international phone/country controls (assets/js/intl-phone-input.js). The country is a
     convenience default only — the visitor can change it; nothing is inferred from location. */
  /* The short form carries only the phone host. The country select and the
     separate WhatsApp number were removed, so every control here is mounted
     only if its host element actually exists — this file is also loaded by
     any future longer variant of the form. */
  var IPI = window.IntlPhoneInput, phoneCtl = null, waCtl = null, countryCtl = null;
  var host = function (id) { return document.getElementById(id); };
  if (IPI) {
    if (host('gCountryHost')) countryCtl = IPI.countrySelect(host('gCountryHost'), { name: 'country', value: 'IN', label: 'Country' });
    if (host('gPhoneHost')) phoneCtl = IPI.mount(host('gPhoneHost'), { name: 'phone', country: 'IN', required: true, placeholder: 'Phone number', id: 'gPhone' });
    if (host('gWaHost')) waCtl = IPI.mount(host('gWaHost'), { name: 'whatsapp', country: 'IN', placeholder: 'Same as phone if blank', id: 'gWa' });
    if (countryCtl) {
      var syncCountry = function (cc) {
        if (cc && phoneCtl && !phoneCtl.input.value.trim()) phoneCtl.setCountry(cc);
        if (cc && waCtl && !waCtl.input.value.trim()) waCtl.setCountry(cc);
      };
      countryCtl.setValue = (function (orig) { return function (cc) { orig(cc); syncCountry(cc); }; })(countryCtl.setValue);
      host('gCountryHost').addEventListener('click', function () { setTimeout(function () { syncCountry(countryCtl.getValue()); }, 0); });
      countryCtl.button.id = 'gCountry';
    }
  }
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (!form.checkValidity()) { form.reportValidity(); return; }
    if (phoneCtl && !phoneCtl.validate()) { phoneCtl.input.focus(); return; }
    if (waCtl && !waCtl.validate()) { waCtl.input.focus(); return; }
    var features = [];
    form.querySelectorAll('input[name="feature"]:checked').forEach(function (c) { features.push(c.value); });
    /* Every field below the first three is optional in the form AND on the
       server (all those columns are nullable), so each one is read through a
       guard: a control the short form does not render simply sends ''. */
    var val = function (name) { return form[name] ? form[name].value : ''; };
    var payload = {
      ownerName: form.ownerName.value, gymName: form.gymName.value,
      phone: phoneCtl ? (phoneCtl.getValue().e164 || phoneCtl.getValue().raw) : val('phone'), phoneCountry: phoneCtl ? phoneCtl.getCountry() : '',
      whatsapp: waCtl ? (waCtl.getValue().e164 || waCtl.getValue().raw) : val('whatsapp'), whatsappCountry: waCtl ? waCtl.getCountry() : '',
      country: countryCtl ? (countryCtl.getValue() || (phoneCtl && phoneCtl.getCountry())) : (phoneCtl ? phoneCtl.getCountry() : ''),
      state: val('state'), postalCode: val('postalCode'),
      email: val('email'),
      city: val('city'), memberCount: val('memberCount'), currentMethod: val('currentMethod'),
      /* preferredContact gates the LIVE WhatsApp onboarding message on the server
         (consents() requires preferred_contact === 'whatsapp'). The removed select
         was pre-selected to "WhatsApp", so sending that same default when the
         control is absent keeps the existing behaviour instead of silently
         switching every new application to no-WhatsApp. */
      interestedFeatures: features, preferredContact: val('preferredContact') || 'whatsapp',
      websiteInstagram: val('websiteInstagram'), consent: document.getElementById('gConsent').checked
    };
    var original = btn.textContent;
    btn.disabled = true; btn.textContent = 'Sending…';
    msg.style.color = 'var(--ta-ink-3)'; msg.textContent = '';
    track('gym_demo_application_submit');

    fetch(API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      .then(function (r) { return r.json().then(function (d) { return { status: r.status, d: d }; }); })
      .then(function (r) {
        if (r.d && r.d.ok) {
          track('gym_demo_application_success');
          document.getElementById('taGymAppId').textContent = r.d.applicationId || '';
          form.style.display = 'none'; success.hidden = false;
          success.scrollIntoView({ behavior: 'smooth', block: 'center' });
          return;
        }
        track('gym_demo_application_error');
        var friendly = {
          invalid_phone: 'Please check the phone number — choose the country, then enter the number without the country code.',
          invalid_country: 'Please choose your country.',
          invalid_postal: 'Please check the postal code.',
          invalid_email: 'Please check the email address.',
          consent_required: 'Please tick the consent box so we can contact you.',
          missing_fields: 'Please fill your name and the gym name.',
          rate_limited: 'Too many attempts — please wait a few minutes and try again.'
        };
        msg.style.color = 'var(--ta-crit)';
        msg.textContent = (r.d && friendly[r.d.error]) || 'That did not send. Please try again, or message us on WhatsApp.';
        btn.disabled = false; btn.textContent = original;
      })
      .catch(function () {
        track('gym_demo_application_error');
        msg.style.color = 'var(--ta-crit)';
        msg.textContent = 'Network problem — please try again, or message us on WhatsApp.';
        btn.disabled = false; btn.textContent = original;
      });
  });
})();
