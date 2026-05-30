/* ══════════════════════════════════════════════
   Tradeaura Premium SaaS — Global Script
══════════════════════════════════════════════ */

document.addEventListener('DOMContentLoaded', () => {

  /* ── AOS Init ── */
  AOS.init({
    duration: 750,
    easing: 'ease-out-cubic',
    once: true,
    offset: 60,
  });

  /* ── Navbar Scroll Effect ── */
  const navbar = document.getElementById('navbar');
  if (navbar) {
    window.addEventListener('scroll', () => {
      if (window.scrollY > 60) {
        navbar.classList.add('nav-scrolled');
      } else {
        navbar.classList.remove('nav-scrolled');
      }
    }, { passive: true });
  }

  /* ── Mobile Menu ── */
  const menuBtn = document.getElementById('menuBtn');
  const mobileMenu = document.getElementById('mobileMenu');
  const menuIconOpen = document.getElementById('menuIconOpen');
  const menuIconClose = document.getElementById('menuIconClose');

  if (menuBtn && mobileMenu) {
    menuBtn.addEventListener('click', () => {
      const isOpen = !mobileMenu.classList.contains('hidden');
      mobileMenu.classList.toggle('hidden');
      if (menuIconOpen) menuIconOpen.classList.toggle('hidden', !isOpen);
      if (menuIconClose) menuIconClose.classList.toggle('hidden', isOpen);
    });

    mobileMenu.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        mobileMenu.classList.add('hidden');
        if (menuIconOpen)  menuIconOpen.classList.remove('hidden');
        if (menuIconClose) menuIconClose.classList.add('hidden');
      });
    });
  }

  /* ── Smooth Anchor Scroll ── */
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', e => {
      const target = document.querySelector(anchor.getAttribute('href'));
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });

  /* ── Animated Counters ── */
  const counters = document.querySelectorAll('[data-count]');
  if (counters.length) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting && !entry.target.dataset.animated) {
          entry.target.dataset.animated = 'true';
          animateCounter(entry.target);
        }
      });
    }, { threshold: 0.5 });

    counters.forEach(el => observer.observe(el));
  }

  /* ── Progress Bars ── */
  const progressBars = document.querySelectorAll('.progress-fill[data-width]');
  if (progressBars.length) {
    const barObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const el = entry.target;
          setTimeout(() => { el.style.width = el.dataset.width; }, 200);
          barObserver.unobserve(el);
        }
      });
    }, { threshold: 0.4 });
    progressBars.forEach(el => barObserver.observe(el));
  }

  /* ── Dashboard Tabs ── */
  initTabs('[data-dashboard-tab]', '[data-dashboard-panel]');

  /* ── Use Case Tabs ── */
  initTabs('[data-usecase-tab]', '[data-usecase-panel]');

  /* ── FAQ Accordions ── */
  document.querySelectorAll('.faq-question').forEach(btn => {
    btn.addEventListener('click', () => {
      const item = btn.closest('.faq-item');
      const isOpen = item.classList.contains('open');

      document.querySelectorAll('.faq-item.open').forEach(el => el.classList.remove('open'));
      if (!isOpen) item.classList.add('open');
    });
  });

  /* ── Floating CTA Visibility ── */
  const floatingCta = document.getElementById('floatingCta');
  if (floatingCta) {
    window.addEventListener('scroll', () => {
      if (window.scrollY > 500) {
        floatingCta.classList.add('visible');
      } else {
        floatingCta.classList.remove('visible');
      }
    }, { passive: true });
  }

  /* ── Exit Intent ── */
  initExitIntent();

});

/* ══════════════════════════════════════════════
   COUNTER ANIMATION
══════════════════════════════════════════════ */

function animateCounter(el) {
  const endVal  = parseFloat(el.dataset.count);
  const suffix  = el.dataset.suffix  || '';
  const prefix  = el.dataset.prefix  || '';
  const decimal = el.dataset.decimal === 'true';
  const duration = parseInt(el.dataset.duration || '2000', 10);

  const startTime = performance.now();

  function step(now) {
    const elapsed  = now - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const ease     = 1 - Math.pow(1 - progress, 3); // cubic ease-out
    const current  = endVal * ease;

    el.textContent = prefix + (decimal ? current.toFixed(1) : Math.round(current)) + suffix;

    if (progress < 1) requestAnimationFrame(step);
  }

  requestAnimationFrame(step);
}

/* ══════════════════════════════════════════════
   GENERIC TAB SYSTEM
══════════════════════════════════════════════ */

function initTabs(tabSelector, panelSelector) {
  const tabs   = document.querySelectorAll(tabSelector);
  const panels = document.querySelectorAll(panelSelector);

  if (!tabs.length) return;

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const target = tab.dataset.target || tab.dataset.dashboardTab || tab.dataset.usecaseTab;

      tabs.forEach(t => t.classList.remove('active'));
      panels.forEach(p => p.classList.remove('active'));

      tab.classList.add('active');
      const panel = document.querySelector(`[data-panel="${target}"], [data-dashboard-panel="${target}"], [data-usecase-panel="${target}"]`);
      if (panel) panel.classList.add('active');
    });
  });
}

/* ══════════════════════════════════════════════
   EXIT INTENT
══════════════════════════════════════════════ */

function initExitIntent() {
  const overlay = document.getElementById('exitIntent');
  if (!overlay) return;

  let fired = false;

  document.addEventListener('mouseleave', e => {
    if (e.clientY <= 0 && !fired && !sessionStorage.getItem('exitIntentShown')) {
      fired = true;
      sessionStorage.setItem('exitIntentShown', '1');
      overlay.classList.add('active');
    }
  });

  const closeBtn = document.getElementById('exitIntentClose');
  if (closeBtn) closeBtn.addEventListener('click', () => overlay.classList.remove('active'));

  overlay.addEventListener('click', e => {
    if (e.target === overlay) overlay.classList.remove('active');
  });
}

/* ══════════════════════════════════════════════
   VIDEO DEMO MODAL
══════════════════════════════════════════════ */

function openDemoModal() {
  const modal = document.getElementById('demoModal');
  if (!modal) return;
  document.body.style.overflow = 'hidden';
  requestAnimationFrame(() => modal.classList.add('modal-visible'));
  const video = document.getElementById('demoVideo');
  if (video) video.play().catch(() => {});
}

function closeDemoModal() {
  const modal = document.getElementById('demoModal');
  if (!modal) return;
  modal.classList.remove('modal-visible');
  const video = document.getElementById('demoVideo');
  if (video) { video.pause(); video.currentTime = 0; }
  setTimeout(() => { document.body.style.overflow = ''; }, 300);
}

document.addEventListener('keydown', e => { if (e.key === 'Escape') closeDemoModal(); });

/* ══════════════════════════════════════════════
   FORM HANDLERS
══════════════════════════════════════════════ */

async function handleRegistration(event) {
  event.preventDefault();

  const form       = document.getElementById('registrationForm');
  const submitBtn  = document.getElementById('submitBtn');
  const spinner    = document.getElementById('submitSpinner');
  const successMsg = document.getElementById('successMessage');

  submitBtn.disabled = true;
  if (spinner) spinner.classList.remove('hidden');

  const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbx3kR0UO-5-2U9hyzgdgsRoVH3Rek2OoHl2dewrzrDkpm50DSy6AxcVR7RG53As2YK1JA/exec';

  try {
    const formData = new FormData(form);
    const painPoints = formData.getAll('painPoints');
    formData.delete('painPoints');
    formData.append('painPoints', painPoints.join(', '));

    await fetch(SCRIPT_URL, { method: 'POST', mode: 'no-cors', body: formData });

    if (form) form.classList.add('hidden');
    if (successMsg) { successMsg.classList.remove('hidden'); }

  } catch (error) {
    console.error('Submission error:', error);
    alert('There was an error. Please try again or contact us on WhatsApp.');
  } finally {
    submitBtn.disabled = false;
    if (spinner) spinner.classList.add('hidden');
  }
}

function resetForm() {
  const form = document.getElementById('registrationForm');
  const successMsg = document.getElementById('successMessage');
  if (form) { form.reset(); form.classList.remove('hidden'); }
  if (successMsg) successMsg.classList.add('hidden');
}

/* ══════════════════════════════════════════════
   CONTACT FORM (PAGES/CONTACT)
══════════════════════════════════════════════ */

async function handleContactForm(event) {
  event.preventDefault();
  const form = event.target;
  const btn  = form.querySelector('[type=submit]');
  const orig = btn.textContent;

  btn.textContent = 'Sending…';
  btn.disabled = true;

  const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbx3kR0UO-5-2U9hyzgdgsRoVH3Rek2OoHl2dewrzrDkpm50DSy6AxcVR7RG53As2YK1JA/exec';

  try {
    await fetch(SCRIPT_URL, { method: 'POST', mode: 'no-cors', body: new FormData(form) });
    btn.textContent = '✓ Sent!';
    btn.style.background = 'linear-gradient(135deg,#22c55e,#16a34a)';
    form.reset();
    setTimeout(() => { btn.textContent = orig; btn.style.background = ''; btn.disabled = false; }, 4000);
  } catch {
    btn.textContent = 'Error — try WhatsApp';
    btn.disabled = false;
  }
}
