#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────
# smoke-test.sh — post-deploy verification against a live origin.
# Usage: ./smoke-test.sh https://staging.auraautomation.site
# Read-only: issues GET/HEAD requests only.
# ─────────────────────────────────────────────────────────────
set -uo pipefail

BASE="${1:?usage: smoke-test.sh <base-url>}"
FAIL=0
code() { curl -s -o /dev/null -w '%{http_code}' --max-time 20 "$1"; }
want() { # want <path> <expected>
  local c; c=$(code "$BASE$1")
  if [ "$c" = "$2" ]; then printf '  ✔ %-38s %s\n' "$1" "$c"
  else printf '  ✘ %-38s %s (expected %s)\n' "$1" "$c" "$2"; FAIL=1; fi
}
deny() { # must NOT be 200
  local c; c=$(code "$BASE$1")
  if [ "$c" = "200" ]; then printf '  ✘ %-38s 200 ← MUST NOT BE PUBLIC\n' "$1"; FAIL=1
  else printf '  ✔ %-38s %s (not public)\n' "$1" "$c"; fi
}

echo "── smoke test: $BASE ──"

echo ""
echo "Core pages"
for p in / /pages/solutions.html /pages/services.html /pages/projects.html \
         /pages/industries.html /pages/about.html /pages/contact.html \
         /pages/compare.html /pages/join.html /login.html \
         /legal/privacy.html /legal/terms.html /news/index.html; do
  want "$p" 200
done

echo ""
echo "Assets"
for p in /assets/css/tokens.css /assets/css/site.css /assets/css/chat.css /assets/js/site.js \
         /assets/js/ta-analytics.js /assets/js/chat.js /assets/js/contact.js /assets/favicon.svg \
         /robots.txt /sitemap.xml; do
  want "$p" 200
done

echo ""
echo "News sample (URL preservation)"
for p in /news/ai-agents.html /news/ai-update.html /news/openai-gpt.html \
         /news/ai-in-india.html /news/sec-review.html /news/ai-summit.html \
         /news/samsung-watch.html /news/global-x-etf.html \
         /news/match-group-q2.html /news/ai-investment-3.html; do
  want "$p" 200
done

echo ""
echo "Must NOT be public"
for p in /.env /.env.example /package.json /package-lock.json /CODEBASE.md \
         /server.js /vercel.json /.gitignore /build.mjs /assets/js/ticker.js \
         /scripts/fetch-news.js /scripts/marketFeed.js \
         /api/market.js /api/instagram.js /server/routes/market.js \
         /google_apps_script.js /.github/workflows/deploy.yml \
         /admin/index.html; do
  deny "$p"
done

echo ""
echo "Metadata spot-check"
H=$(curl -s --max-time 20 "$BASE/news/ai-agents.html")
for t in '<title>' 'name="description"' 'rel="canonical"' 'property="og:title"'; do
  if grep -q "$t" <<<"$H"; then printf '  ✔ %s present\n' "$t"
  else printf '  ✘ %s MISSING\n' "$t"; FAIL=1; fi
done
if grep -q 'href="https://www.auraautomation.site/news/ai-agents.html"' <<<"$H"; then
  echo "  ✔ canonical unchanged"
else
  echo "  ✘ canonical CHANGED"; FAIL=1
fi

echo ""
if [ "$FAIL" -ne 0 ]; then echo "── SMOKE TEST FAILED ──"; exit 1; fi
echo "── SMOKE TEST PASSED ──"
