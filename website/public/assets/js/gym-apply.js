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
  var IPI = window.IntlPhoneInput, phoneCtl = null, waCtl = null, countryCtl = null;
  if (IPI) {
    countryCtl = IPI.countrySelect(document.getElementById('gCountryHost'), { name: 'country', value: 'IN', label: 'Country' });
    phoneCtl = IPI.mount(document.getElementById('gPhoneHost'), { name: 'phone', country: 'IN', required: true, placeholder: 'Phone number', id: 'gPhone' });
    waCtl = IPI.mount(document.getElementById('gWaHost'), { name: 'whatsapp', country: 'IN', placeholder: 'Same as phone if blank', id: 'gWa' });
    var syncCountry = function (cc) { if (cc && !phoneCtl.input.value.trim()) phoneCtl.setCountry(cc); if (cc && !waCtl.input.value.trim()) waCtl.setCountry(cc); };
    countryCtl.setValue = (function (orig) { return function (cc) { orig(cc); syncCountry(cc); }; })(countryCtl.setValue);
    document.getElementById('gCountryHost').addEventListener('click', function () { setTimeout(function () { syncCountry(countryCtl.getValue()); }, 0); });
    countryCtl.button.id = 'gCountry';
  }
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (!form.checkValidity()) { form.reportValidity(); return; }
    if (phoneCtl && (!phoneCtl.validate() || !waCtl.validate())) { (phoneCtl.validate() ? waCtl : phoneCtl).input.focus(); return; }
    var features = [];
    form.querySelectorAll('input[name="feature"]:checked').forEach(function (c) { features.push(c.value); });
    var payload = {
      ownerName: form.ownerName.value, gymName: form.gymName.value,
      phone: phoneCtl ? (phoneCtl.getValue().e164 || phoneCtl.getValue().raw) : form.phone.value, phoneCountry: phoneCtl ? phoneCtl.getCountry() : '',
      whatsapp: waCtl ? (waCtl.getValue().e164 || waCtl.getValue().raw) : form.whatsapp.value, whatsappCountry: waCtl ? waCtl.getCountry() : '',
      country: countryCtl ? (countryCtl.getValue() || (phoneCtl && phoneCtl.getCountry())) : '', state: form.state.value, postalCode: form.postalCode.value,
      email: form.email.value,
      city: form.city.value, memberCount: form.memberCount.value, currentMethod: form.currentMethod.value,
      interestedFeatures: features, preferredContact: form.preferredContact.value,
      websiteInstagram: form.websiteInstagram.value, consent: document.getElementById('gConsent').checked
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
