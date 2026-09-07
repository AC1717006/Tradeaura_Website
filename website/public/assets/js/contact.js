/* TradeAura — contact form. Posts to the SAME Google Apps Script
   endpoint the current site uses. No new production API. */
(function () {
  'use strict';
  var form = document.getElementById('taContactForm');
  if (!form) return;
  var msg = document.getElementById('taFormMsg');
  var btn = document.getElementById('taSubmit');

  /* Shared international phone control — mounted before the staging guard so the field always renders. */
  var IPI = window.IntlPhoneInput, phoneCtl = null;
  if (IPI && document.getElementById('mobileHost')) {
    phoneCtl = IPI.mount(document.getElementById('mobileHost'), { name: 'mobile', country: 'IN', required: true, placeholder: 'Phone number', id: 'mobile' });
  }

  /* Staging guard: the build emits data-ta-staging and omits @action.
     Belt and braces — even if the attribute were removed, there is no
     action to POST to, so no request can reach production. */
  if (form.hasAttribute('data-ta-staging') || !form.getAttribute('action')) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      e.stopImmediatePropagation();
      if (msg) {
        msg.style.color = 'var(--ta-warn)';
        msg.textContent = 'Contact form is disabled on staging. Nothing was sent.';
      }
    });
    if (btn) { btn.disabled = true; }
    return;
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }
    if (phoneCtl && !phoneCtl.validate()) { phoneCtl.input.focus(); return; }
    var original = btn.textContent;
    btn.disabled = true;
    btn.textContent = 'Sending…';
    msg.textContent = '';
    msg.style.color = 'var(--ta-ink-3)';

    /* The Apps Script endpoint does JSON.parse(e.postData.contents) and
       cannot read multipart/form-data at all (e.postData is undefined for
       it), so every FormData submission was silently rejected. Send JSON.
       text/plain keeps the request "simple" — no CORS preflight — so it
       still works under mode:'no-cors'; the script only reads the body. */
    try { window.dispatchEvent(new CustomEvent('tradeaura:contact_form_submit', { detail: {} })); } catch (err) { /* analytics never breaks the form */ }

    var data = {};
    new FormData(form).forEach(function (value, key) { data[key] = value; });
    if (phoneCtl) { data.mobile = phoneCtl.getValue().e164 || phoneCtl.getValue().raw; data.country = phoneCtl.getCountry(); }   // canonical E.164 in the existing `mobile` column; `country` is an extra key the Sheet script ignores
    data.timestamp = new Date().toISOString();

    fetch(form.action, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify(data)
    })
      .then(function () {
        form.reset();
        msg.style.color = 'var(--ta-ok)';
        msg.textContent = 'Thanks — we have your message and will reply within one working day.';
      })
      .catch(function () {
        msg.style.color = 'var(--ta-crit)';
        msg.textContent = 'That did not send. Please email us or message us on WhatsApp instead.';
      })
      .finally(function () {
        btn.disabled = false;
        btn.textContent = original;
      });
  });
})();
