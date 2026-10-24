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

/* ── videos: chip filters + lite YouTube embed (progressive — the page is complete without JS) ── */
(function () {
  var chips = document.querySelectorAll('[data-vfilter]');
  if (chips.length) {
    var cards = document.querySelectorAll('[data-vlist] [data-kind]');
    var main = document.querySelector('[data-vmain]'), shorts = document.querySelector('[data-vshorts]');
    chips.forEach(function (c) {
      c.addEventListener('click', function () {
        var f = c.getAttribute('data-vfilter');
        chips.forEach(function (x) { var on = x === c; x.classList.toggle('is-on', on); x.setAttribute('aria-pressed', on ? 'true' : 'false'); });
        cards.forEach(function (k) { k.hidden = f !== 'all' && f !== 'short' && k.getAttribute('data-service') !== f; });
        if (main) main.hidden = f === 'short';
        if (shorts) shorts.hidden = f !== 'all' && f !== 'short';
      });
    });
  }
  document.querySelectorAll('.ta-embed[data-yt]').forEach(function (box) {
    var id = box.getAttribute('data-yt');
    if (!/^[A-Za-z0-9_-]{11}$/.test(id)) return;
    var play = function (e) {
      if (e.target && e.target.closest && e.target.closest('a')) return;   // "Watch on YouTube" keeps working
      if (e.type === 'keydown' && e.key !== 'Enter' && e.key !== ' ') return;
      e.preventDefault();
      var f = document.createElement('iframe');
      f.src = 'https://www.youtube-nocookie.com/embed/' + id + '?autoplay=1&rel=0';
      f.title = box.getAttribute('data-title') || 'YouTube video';
      f.allow = 'accelerometer; autoplay; encrypted-media; picture-in-picture; web-share';
      f.allowFullscreen = true;
      box.replaceChildren(f);
      box.removeAttribute('role'); box.removeAttribute('tabindex'); box.style.cursor = 'default';
    };
    box.addEventListener('click', play); box.addEventListener('keydown', play);
  });
})();
