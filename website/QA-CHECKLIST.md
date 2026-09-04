# TradeAura Phase 1 — Visual QA checklist

Preview: the published preview artifact, or open `dist/index.html` in a browser.
Nothing here is deployed. Production still serves the old site.

## Automated (already passing)

- [x] Build completes — 636 files, 326 ms, 0 errors
- [x] All 617 legacy routes present in `dist/` (0 missing)
- [x] 0 canonical URLs changed
- [x] 0 pages missing `<meta name="description">`
- [x] 622 HTML files, 0 unbalanced tags
- [x] All 19 JS/MJS sources pass `node --check`
- [x] `robots.txt` byte-identical to production

## Cross-browser / device

- [ ] Chrome, Safari, Firefox, Edge — desktop
- [ ] iOS Safari, Android Chrome
- [ ] 1440px · 1280px · 1024px · 768px · 390px · 360px
- [ ] No horizontal scroll at any width
- [ ] Sticky header stays put and stays legible while scrolling

## Layout

- [ ] Header sticky, backdrop blur reads cleanly over white and over the ticker
- [ ] Nav collapses to hamburger at ≤1080px; drawer opens, closes on scrim, on X, and on Escape
- [ ] Body scroll locks while the drawer is open
- [ ] Hero: headline does not wrap awkwardly at 1024px or 768px
- [ ] Product peek does not overflow its column
- [ ] Service grid 3→2→1 across breakpoints
- [ ] Footer collapses 5→2→1 columns
- [ ] Sticky mobile CTA does not cover the footer's last row
- [ ] Contact page has no sticky CTA (deliberate — it *is* the CTA)

## Typography & colour

- [ ] Outfit loads for headings; IBM Plex Sans for body; IBM Plex Mono for data
- [ ] Fallback stacks look acceptable with fonts blocked
- [ ] Body copy stays near 65 characters on wide screens
- [ ] Accent `#3D4EDB` used only for actions, links and emphasis
- [ ] No dark hero, no neon, no heavy gradient anywhere

## Accessibility

- [ ] Keyboard tab order is sane on every page
- [ ] Focus ring visible on every link, button and field
- [ ] Contrast ≥ 4.5:1 for body text, ≥ 3:1 for large text
- [ ] All interactive targets ≥ 44px on touch
- [ ] `aria-current="page"` on the active nav item
- [ ] Drawer has `role="dialog"` and `aria-modal`
- [ ] Form labels bound to inputs; errors announced via `aria-live`
- [ ] `prefers-reduced-motion` disables transitions

## Functionality

- [ ] Ticker fetches `api.auraautomation.site/api/market` and renders 7 symbols
- [ ] Ticker degrades to "Market data unavailable" without breaking layout
- [ ] IST clock updates
- [ ] Contact form validates before submitting
- [ ] Contact form posts to the **existing** Google Apps Script endpoint
- [ ] Success and failure messages both render
- [ ] Every internal link resolves (no 404s)

## SEO (re-verify after any change)

- [ ] `node scripts/verify-routes.mjs` exits 0
- [ ] Spot-check 10 random news URLs against production canonicals
- [ ] `sitemap.xml` parses as valid XML
- [ ] Article `og:image`, `og:title`, `twitter:*` survive on a sample of 10
- [ ] News index lists every article

## Content sign-off (needs you)

- [ ] Replace `[YOUR PRICE]` on `/pages/compare.html` — 2 occurrences
- [ ] Fill or remove the 3 placeholder project cards on `/pages/projects.html`
- [ ] Real privacy and terms copy for `/legal/*`
- [ ] Confirm `hello@auraautomation.site` is a monitored inbox
- [ ] Confirm the Instagram footer link, or remove it
- [ ] Supply a real logo to replace the TA monogram
