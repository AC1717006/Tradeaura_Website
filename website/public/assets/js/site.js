/* TradeAura — global UI. No dependencies. */
(function () {
  'use strict';
  var drawer = document.querySelector('[data-ta-drawer]');
  var openBtn = document.querySelector('[data-ta-menu-open]');
  function setOpen(on) {
    if (!drawer) return;
    drawer.setAttribute('data-open', on ? 'true' : 'false');
    if (openBtn) openBtn.setAttribute('aria-expanded', on ? 'true' : 'false');
    document.body.style.overflow = on ? 'hidden' : '';
  }
  if (openBtn) openBtn.addEventListener('click', function () { setOpen(true); });
  document.querySelectorAll('[data-ta-menu-close]').forEach(function (el) {
    el.addEventListener('click', function () { setOpen(false); });
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') setOpen(false);
  });
})();

/* Contact form — preselect the service when the visitor arrives from a
   solutions CTA (contact.html?service=…).
   Deliberately defensive: it only ever selects an option the form already
   renders, so an unknown, stale or hand-edited value simply leaves the
   dropdown on its default and `required` still forces a real choice.
   Nothing from the URL is ever written into the DOM. */
(function () {
  'use strict';
  var sel = document.getElementById('businessType');
  if (!sel || !window.location.search) return;
  var want;
  try { want = new URLSearchParams(window.location.search).get('service'); } catch (e) { return; }
  if (!want) return;
  for (var i = 0; i < sel.options.length; i++) {
    if (sel.options[i].value === want) { sel.selectedIndex = i; return; }
  }
})();
