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
