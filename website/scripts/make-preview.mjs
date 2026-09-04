#!/usr/bin/env node
/* Builds a single self-contained preview page from dist/ so the
   redesign can be reviewed without deploying anything. */
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const DIST = join(HERE, '..', 'dist');
const OUT = process.argv[2] || join(HERE, '..', 'preview.html');

const css =
  readFileSync(join(DIST, 'assets/css/tokens.css'), 'utf8') +
  '\n' +
  readFileSync(join(DIST, 'assets/css/site.css'), 'utf8');

const VIEWS = [
  ['Home', 'index.html'],
  ['Solutions', 'pages/solutions.html'],
  ['Services', 'pages/services.html'],
  ['Projects', 'pages/projects.html'],
  ['Industries', 'pages/industries.html'],
  ['About', 'pages/about.html'],
  ['Contact', 'pages/contact.html'],
  ['News index', 'news/index.html'],
  ['News article', 'news/ai-agents.html'],
];

const bodyOf = (rel) => {
  const h = readFileSync(join(DIST, rel), 'utf8');
  const m = h.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  let b = m ? m[1] : '';
  return b
    .replace(/<script[\s\S]*?<\/script>/gi, '')          // no external JS in preview
    .replace(/\shref="(?!http|mailto|#)[^"]*"/g, ' href="#"'); // keep navigation inert
};

const panes = VIEWS.map(([label, rel], i) => {
  let b = '';
  try { b = bodyOf(rel); } catch { b = `<p style="padding:40px">Missing: ${rel}</p>`; }
  return `<section class="pv-pane" data-pane="${i}"${i ? ' hidden' : ''}>${b}</section>`;
}).join('\n');

const tabs = VIEWS.map(
  ([label], i) => `<button class="pv-tab${i ? '' : ' is-on'}" data-tab="${i}" type="button">${label}</button>`
).join('');

const html = `<title>TradeAura Site Preview</title>
<style>
${css}

/* preview chrome only — not part of the site */
.pv-bar{position:sticky;top:0;z-index:200;display:flex;align-items:center;gap:14px;flex-wrap:wrap;
  padding:10px 16px;background:#16181F;color:#fff;font-family:"IBM Plex Mono",monospace;font-size:11px}
.pv-bar b{font-family:Outfit,sans-serif;font-size:12.5px;letter-spacing:.02em}
.pv-tabs{display:flex;gap:4px;flex-wrap:wrap;flex:1}
.pv-tab{font-family:"IBM Plex Mono",monospace;font-size:11px;color:#C3C7D6;background:transparent;
  border:1px solid #3A3F52;border-radius:6px;padding:4px 10px;cursor:pointer}
.pv-tab:hover{color:#fff;border-color:#5A6076}
.pv-tab.is-on{background:#3D4EDB;border-color:#3D4EDB;color:#fff}
.pv-note{color:#9BA1B4}
.pv-frame{border-top:1px solid #E3E6F0}
.ta-header{top:41px}
.ta-sticky-cta{display:none !important}
body{padding-bottom:0 !important}
</style>

<div class="pv-bar">
  <b>TradeAura — Phase 1 preview</b>
  <div class="pv-tabs">${tabs}</div>
  <span class="pv-note">Not deployed · links inert · resize to test responsive</span>
</div>
<div class="pv-frame">
${panes}
</div>

<script>
(function(){
  var tabs=[].slice.call(document.querySelectorAll('.pv-tab'));
  var panes=[].slice.call(document.querySelectorAll('.pv-pane'));
  tabs.forEach(function(t){
    t.addEventListener('click',function(){
      tabs.forEach(function(x){x.classList.remove('is-on');});
      t.classList.add('is-on');
      panes.forEach(function(p){p.hidden = p.dataset.pane !== t.dataset.tab;});
      window.scrollTo({top:0,behavior:'instant'});
    });
  });
  // static ticker values so the bar renders in preview
  var track=document.getElementById('tickerTrack');
  if(track){
    [['NIFTY 50','24,252.00','+0.08%',1],['BANKNIFTY','57,761.95','+0.46%',1],
     ['RELIANCE','1,316.00','+0.21%',1],['TCS','2,302.00','+0.17%',1],
     ['INFY','1,121.00','-0.79%',0],['HDFCBANK','1,642.30','+0.32%',1]]
    .forEach(function(r){
      var s=document.createElement('span');s.className='ta-ticker__item';
      s.innerHTML='<span class="ta-ticker__sym"></span><span class="ta-ticker__px"></span><span class="'+(r[3]?'ta-ticker__up':'ta-ticker__down')+'"></span>';
      s.children[0].textContent=r[0];s.children[1].textContent=r[1];s.children[2].textContent=r[2];
      track.appendChild(s);
    });
  }
  var clk=document.getElementById('tickerTime'); if(clk) clk.textContent='15:30 IST';
})();
</script>`;

writeFileSync(OUT, html, 'utf8');
console.log(`preview → ${OUT} (${(Buffer.byteLength(html) / 1024).toFixed(0)} KB, ${VIEWS.length} views)`);
