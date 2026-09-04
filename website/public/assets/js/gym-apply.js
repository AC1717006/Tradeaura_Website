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

  document.querySelectorAll('a[href="#gym-demo-form"]').forEach(function (a) {
    a.addEventListener('click', function () { track('gym_demo_cta_click'); });
  });
  var started = false;
  form.addEventListener('input', function () { if (!started) { started = true; track('gym_demo_form_start'); } });

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (!form.checkValidity()) { form.reportValidity(); return; }
    var features = [];
    form.querySelectorAll('input[name="feature"]:checked').forEach(function (c) { features.push(c.value); });
    var payload = {
      ownerName: form.ownerName.value, gymName: form.gymName.value,
      phone: form.phone.value, whatsapp: form.whatsapp.value, email: form.email.value,
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
          invalid_phone: 'Please check the mobile number.',
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
