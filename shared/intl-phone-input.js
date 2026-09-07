/**
 * shared/intl-phone-input.js — the ONE reusable international phone input + country selector.
 * Depends on shared/intl-contact.js (window.IntlContact). No framework, no innerHTML with data.
 *
 *   IntlPhoneInput.mount(host, { name: 'phone', country: 'IN', value: '+919876543210', required: true,
 *                                placeholder: 'Phone number', large: true, onChange: fn })
 *     → renders  [ 🇮🇳 +91 ▾ ] [ 98765 43210 ]  inside host and keeps two hidden inputs in sync:
 *         <input type="hidden" name="phone">        E.164 or '' (what the API receives)
 *         <input type="hidden" name="phoneCountry"> ISO2 of the selected country (context for local numbers)
 *     returns { getValue() → {raw, e164, country, valid, reason}, setValue(e164|raw), setCountry(cc),
 *               validate() → boolean (marks aria-invalid), input, countryButton, el }
 *
 *   IntlPhoneInput.countrySelect(host, { name: 'country', value: 'IN', required, large, onChange })
 *     → searchable country field (flag + name), hidden input <name> = ISO2 ('' when none).
 *
 * The selector is a searchable popover (type to filter by name, code or dial code), keyboard
 * navigable (↑ ↓ Enter Esc), sized to its container so it never overflows small screens, and
 * never uses geolocation: the initial country is whatever the caller passes (a page-level
 * convenience default the user can always change). Styling: shared/intl-phone-input.css.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./intl-contact'));
  else root.IntlPhoneInput = factory(root.IntlContact);
}(typeof self !== 'undefined' ? self : this, function (IC) {
  'use strict';
  function h(tag, attrs) {
    var el = document.createElement(tag), k, i;
    if (attrs) for (k in attrs) {
      if (k === 'class') el.className = attrs[k];
      else if (k === 'text') el.textContent = attrs[k];
      else if (k === 'on') { for (var ev in attrs.on) el.addEventListener(ev, attrs.on[ev]); }
      else if (attrs[k] !== null && attrs[k] !== undefined && attrs[k] !== false) el.setAttribute(k, attrs[k] === true ? '' : attrs[k]);
    }
    for (i = 2; i < arguments.length; i++) { var c = arguments[i]; if (c === null || c === undefined || c === false) continue; el.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); }
    return el;
  }
  var LIST = null; function list() { return LIST || (LIST = IC.list()); }
  var uid = 0;

  /* ── searchable country popover (shared by both controls) ── */
  function popover(opts) {
    var id = 'ipi-pop-' + (++uid);
    var search = h('input', { class: 'ipi__search', type: 'search', placeholder: 'Search country or code…', autocomplete: 'off', 'aria-label': 'Search country', 'aria-controls': id });
    var ul = h('ul', { class: 'ipi__list', role: 'listbox', id: id });
    var pop = h('div', { class: 'ipi__pop', hidden: true }, search, ul);
    var items = [], active = -1, open = false;
    function render(q) {
      while (ul.firstChild) ul.removeChild(ul.firstChild);
      items = []; active = -1;
      var needle = String(q || '').trim().toLowerCase().replace(/^\+/, '');
      list().forEach(function (c) {
        if (needle && c.name.toLowerCase().indexOf(needle) < 0 && c.code.toLowerCase() !== needle && String(c.dial).indexOf(needle) !== 0) return;
        var li = h('li', { class: 'ipi__item' + (c.code === opts.current() ? ' is-selected' : ''), role: 'option', 'data-code': c.code, 'aria-selected': c.code === opts.current() ? 'true' : 'false' },
          h('span', { class: 'ipi__flag', text: c.flag, 'aria-hidden': 'true' }), h('span', { class: 'ipi__name', text: c.name }), h('span', { class: 'ipi__dial', text: '+' + c.dial }));
        li.addEventListener('mousedown', function (e) { e.preventDefault(); choose(c.code); });
        ul.appendChild(li); items.push(li);
      });
      if (!items.length) ul.appendChild(h('li', { class: 'ipi__empty', text: 'No matching country' }));
    }
    function setActive(i) { items.forEach(function (li, k) { li.classList.toggle('is-active', k === i); }); active = i; if (items[i]) items[i].scrollIntoView({ block: 'nearest' }); }
    function choose(code) { close(); opts.onChoose(code); }
    function show() { if (open) return; open = true; pop.hidden = false; search.value = ''; render(''); var sel = items.findIndex(function (li) { return li.classList.contains('is-selected'); }); if (sel >= 0) setActive(sel); opts.anchor.setAttribute('aria-expanded', 'true'); setTimeout(function () { search.focus(); }, 0); document.addEventListener('mousedown', onDoc, true); document.addEventListener('keydown', onKey, true); }
    function close() { if (!open) return; open = false; pop.hidden = true; opts.anchor.setAttribute('aria-expanded', 'false'); document.removeEventListener('mousedown', onDoc, true); document.removeEventListener('keydown', onKey, true); }
    function onDoc(e) { if (!pop.contains(e.target) && e.target !== opts.anchor && !opts.anchor.contains(e.target)) close(); }
    function onKey(e) {
      if (e.key === 'Escape') { e.preventDefault(); close(); opts.anchor.focus(); }
      else if (e.key === 'ArrowDown') { e.preventDefault(); setActive(Math.min(items.length - 1, active + 1)); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(Math.max(0, active - 1)); }
      else if (e.key === 'Enter') { if (items[active]) { e.preventDefault(); choose(items[active].getAttribute('data-code')); } }
    }
    search.addEventListener('input', function () { render(search.value); if (items.length) setActive(0); });
    return { el: pop, show: show, close: close, toggle: function () { open ? close() : show(); }, isOpen: function () { return open; } };
  }

  function mount(host, o) {
    o = o || {}; var name = o.name || 'phone';
    var country = IC.isCountry(o.country) ? String(o.country).toUpperCase() : '';
    var wrap = h('div', { class: 'ipi' + (o.large ? ' ipi--lg' : '') });
    var flag = h('span', { class: 'ipi__flag', 'aria-hidden': 'true' }), dial = h('span', { class: 'ipi__cc', text: '' });
    var btn = h('button', { class: 'ipi__btn', type: 'button', 'aria-haspopup': 'listbox', 'aria-expanded': 'false', 'aria-label': 'Country code' }, flag, dial, h('span', { class: 'ipi__caret', 'aria-hidden': 'true', text: '▾' }));
    var input = h('input', { class: 'ipi__num', type: 'tel', inputmode: 'tel', autocomplete: o.autocomplete || 'tel-national', placeholder: o.placeholder || 'Phone number', required: !!o.required, 'aria-label': o.label || 'Phone number', maxlength: '24' });
    var hidden = h('input', { type: 'hidden', name: name }), hiddenCc = h('input', { type: 'hidden', name: name + 'Country' });
    var err = h('span', { class: 'ipi__err', role: 'alert', hidden: true });
    var pop = popover({ anchor: btn, current: function () { return country; }, onChoose: function (code) { setCountry(code); input.focus(); sync(); } });
    function paint() { var c = IC.country(country); flag.textContent = c ? IC.flag(c.code) : '🌐'; dial.textContent = c ? '+' + c.dial : '+…'; hiddenCc.value = country; btn.title = c ? c.name + ' (+' + c.dial + ')' : 'Choose country'; }
    function parse() { var raw = input.value; var r = IC.parsePhone(raw, country ? { country: country } : {}); return { raw: raw, e164: r.ok ? r.e164 : null, country: r.ok ? r.country : country, valid: r.ok, reason: r.reason }; }
    function sync() {
      var v = parse();
      if (v.valid && v.country !== country) { country = v.country; paint(); }   // user typed +44… under a different flag
      hidden.value = v.e164 || '';
      if (o.onChange) o.onChange(v);
      return v;
    }
    function setCountry(code) { if (IC.isCountry(code)) { country = String(code).toUpperCase(); paint(); sync(); } }
    function setValue(val) { var r = IC.parsePhone(val, country ? { country: country } : {}); if (r.ok) { country = r.country; paint(); input.value = r.national; } else input.value = val ? String(val) : ''; sync(); }
    var MSG = { empty: 'Enter a phone number.', country_required: 'Choose a country.', length: 'That number has the wrong number of digits for ' + '{c}' + '.', leading_zero: 'Drop the leading 0 after the country code.', invalid_for_country: 'That does not look like a valid number for ' + '{c}' + '.', bad_country_code: 'Unknown country code.', too_long: 'Too long.' };
    function validate() {
      var v = parse(); var must = !!o.required || !!input.value.trim();
      var bad = must && !v.valid;
      input.setAttribute('aria-invalid', bad ? 'true' : 'false'); wrap.classList.toggle('is-invalid', bad);
      err.hidden = !bad; err.textContent = bad ? (MSG[v.reason] || 'Please check the phone number.').replace('{c}', IC.countryName(country) || 'this country') : '';
      return !bad;
    }
    btn.addEventListener('click', function () { pop.toggle(); });
    btn.addEventListener('keydown', function (e) { if (e.key === 'ArrowDown' || e.key === ' ') { e.preventDefault(); pop.show(); } });
    input.addEventListener('input', function () { sync(); if (wrap.classList.contains('is-invalid')) validate(); });
    input.addEventListener('blur', function () { if (input.value.trim()) validate(); });
    wrap.appendChild(h('div', { class: 'ipi__row' }, btn, input)); wrap.appendChild(pop.el); wrap.appendChild(err); wrap.appendChild(hidden); wrap.appendChild(hiddenCc);
    if (o.id) { input.id = o.id; }
    paint(); if (o.value) setValue(o.value); else sync();
    if (host) host.appendChild(wrap);
    return { el: wrap, input: input, countryButton: btn, hidden: hidden, getValue: parse, setValue: setValue, setCountry: setCountry, validate: validate, getCountry: function () { return country; } };
  }

  function countrySelect(host, o) {
    o = o || {}; var name = o.name || 'country';
    var value = IC.isCountry(o.value) ? String(o.value).toUpperCase() : '';
    var wrap = h('div', { class: 'ipi ipi--country' + (o.large ? ' ipi--lg' : '') });
    var flag = h('span', { class: 'ipi__flag', 'aria-hidden': 'true' }), label = h('span', { class: 'ipi__cname' });
    var btn = h('button', { class: 'ipi__btn ipi__btn--wide', type: 'button', 'aria-haspopup': 'listbox', 'aria-expanded': 'false', 'aria-label': o.label || 'Country' }, flag, label, h('span', { class: 'ipi__caret', 'aria-hidden': 'true', text: '▾' }));
    var hidden = h('input', { type: 'hidden', name: name, value: value });
    var err = h('span', { class: 'ipi__err', role: 'alert', hidden: true });
    if (o.id) btn.id = o.id;
    var pop = popover({ anchor: btn, current: function () { return value; }, onChoose: function (code) { set(code); btn.focus(); } });
    function paint() { var c = IC.country(value); flag.textContent = c ? IC.flag(c.code) : '🌐'; label.textContent = c ? c.name : (o.placeholder || 'Choose country'); hidden.value = value; wrap.classList.toggle('is-empty', !c); }
    function set(code) { value = IC.isCountry(code) ? String(code).toUpperCase() : ''; paint(); if (o.onChange) o.onChange(value); validate(true); }
    function validate(soft) { var bad = !!o.required && !value; if (soft && !bad) { wrap.classList.remove('is-invalid'); err.hidden = true; btn.setAttribute('aria-invalid', 'false'); return true; } btn.setAttribute('aria-invalid', bad ? 'true' : 'false'); wrap.classList.toggle('is-invalid', bad); err.hidden = !bad; err.textContent = bad ? 'Choose a country.' : ''; return !bad; }
    btn.addEventListener('click', function () { pop.toggle(); });
    btn.addEventListener('keydown', function (e) { if (e.key === 'ArrowDown' || e.key === ' ') { e.preventDefault(); pop.show(); } });
    wrap.appendChild(h('div', { class: 'ipi__row' }, btn)); wrap.appendChild(pop.el); wrap.appendChild(err); wrap.appendChild(hidden);
    paint(); if (host) host.appendChild(wrap);
    return { el: wrap, button: btn, hidden: hidden, getValue: function () { return value; }, setValue: set, validate: function () { return validate(false); } };
  }

  return { mount: mount, countrySelect: countrySelect };
}));
