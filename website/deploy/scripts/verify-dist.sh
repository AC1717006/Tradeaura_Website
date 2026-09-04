#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────
# verify-dist.sh — deployment gate.
# Exits non-zero if dist/ contains anything that must never be
# published. Runs BEFORE any S3 sync, in both staging and prod jobs.
#
# Usage: ./verify-dist.sh [dist-dir]
# ─────────────────────────────────────────────────────────────
set -euo pipefail

DIST="${1:-dist}"
FAIL=0
say() { printf '%s\n' "$*"; }
bad() { printf '  ✘ %s\n' "$*"; FAIL=1; }
ok()  { printf '  ✔ %s\n' "$*"; }

say "── verify-dist: ${DIST} ──"

[ -d "$DIST" ] || { say "FATAL: ${DIST} does not exist — did the build run?"; exit 2; }

# ── 1. forbidden filenames ───────────────────────────────────
say ""
say "1. Forbidden files"
FORBIDDEN=(
  '.env' '.env.*' '*.pem' '*.key' '*.p12' '*.pfx' '*.jks'
  'id_rsa*' 'id_dsa*' 'id_ecdsa*' 'id_ed25519*' '*.ppk'
  '.npmrc' '.netrc' '.git-credentials' 'credentials' 'secrets'
  '*.keystore' 'service-account*.json' '*.crt'
)
for pat in "${FORBIDDEN[@]}"; do
  hits=$(find "$DIST" -name "$pat" -type f 2>/dev/null || true)
  if [ -n "$hits" ]; then bad "matched '$pat':"; printf '      %s\n' $hits; fi
done
[ "$FAIL" -eq 0 ] && ok "no forbidden filenames"

# ── 2. forbidden directories ─────────────────────────────────
say ""
say "2. Forbidden directories"
D_FAIL=0
for d in .git .github node_modules scripts api server cloudflare-worker src; do
  if [ -e "$DIST/$d" ]; then bad "directory present: $d/"; D_FAIL=1; fi
done
[ "$D_FAIL" -eq 0 ] && ok "no source/VCS directories"

# ── 3. forbidden extensions at any depth ─────────────────────
say ""
say "3. Source-file extensions"
E_FAIL=0
while IFS= read -r f; do
  case "$f" in
    "$DIST"/assets/js/*) : ;;                 # our own shipped JS is fine
    *.mjs|*.ts|*.jsx|*.tsx|*.py|*.rb|*.php|*.sh)
      bad "source file: ${f#$DIST/}"; E_FAIL=1 ;;
  esac
done < <(find "$DIST" -type f \( -name '*.mjs' -o -name '*.ts' -o -name '*.jsx' \
          -o -name '*.tsx' -o -name '*.py' -o -name '*.rb' -o -name '*.php' -o -name '*.sh' \) 2>/dev/null || true)
for f in package.json package-lock.json yarn.lock pnpm-lock.yaml tsconfig.json \
         vercel.json ecosystem.config.js CODEBASE.md README.md build.mjs Dockerfile Makefile; do
  [ -f "$DIST/$f" ] && { bad "build/config file: $f"; E_FAIL=1; }
done
[ "$E_FAIL" -eq 0 ] && ok "no source or build-config files"

# ── 4. credential-pattern scan ───────────────────────────────
say ""
say "4. Credential-pattern scan"
if command -v python3 >/dev/null 2>&1; then
  python3 - "$DIST" <<'PY' || FAIL=1
import os, re, sys
DIST = sys.argv[1]
PAT = [
    ('AWS access key id',   r'AKIA[0-9A-Z]{16}'),
    ('AWS secret key',      r'(?i)aws.{0,20}secret.{0,20}[:=]\s*["\']?[A-Za-z0-9/+=]{40}'),
    ('Groq key',            r'gsk_[A-Za-z0-9]{20,}'),
    ('NewsData key',        r'pub_[A-Za-z0-9]{20,}'),
    ('Instagram token',     r'IGAA[A-Za-z0-9]{20,}'),
    ('Google API key',      r'AIza[0-9A-Za-z_\-]{35}'),
    ('GitHub token',        r'gh[pousr]_[A-Za-z0-9]{36,}'),
    ('Slack token',         r'xox[abpsr]-[A-Za-z0-9-]{10,}'),
    ('Stripe key',          r'sk_(live|test)_[A-Za-z0-9]{16,}'),
    ('Private key block',   r'-----BEGIN [A-Z ]*PRIVATE KEY-----'),
    ('JWT',                 r'eyJ[A-Za-z0-9_\-]{10,}\.[A-Za-z0-9_\-]{10,}\.[A-Za-z0-9_\-]{10,}'),
    ('Secret assignment',   r'(?i)\b(api[_-]?key|secret|password|passwd|access[_-]?token)\s*[:=]\s*["\'][A-Za-z0-9_\-]{16,}["\']'),
    ('Upstox reference',    r'(?i)upstox[_-]?(api|access|secret)'),
]
found = {}
n = 0
for d, _, fs in os.walk(DIST):
    for f in fs:
        p = os.path.join(d, f); n += 1
        try:
            t = open(p, encoding='utf8', errors='ignore').read()
        except Exception:
            continue
        for label, rx in PAT:
            if re.search(rx, t):
                found.setdefault(label, set()).add(os.path.relpath(p, DIST))
print(f"  scanned {n} files")
if found:
    for label, files in found.items():
        print(f"  ✘ {label}: {len(files)} file(s)")
        for f in sorted(files)[:5]:
            print(f"      {f}")          # path only — never the matched value
    sys.exit(1)
print("  ✔ no credential patterns")
PY
else
  bad "python3 unavailable — cannot run credential scan"
fi

# ── 5. content sanity ────────────────────────────────────────
say ""
say "5. Content sanity"
NEWS=$(find "$DIST/news" -name '*.html' ! -name 'index.html' 2>/dev/null | wc -l)
MIN_NEWS="${MIN_NEWS:-609}"
if [ "$NEWS" -lt "$MIN_NEWS" ]; then
  bad "news articles: $NEWS (expected >= $MIN_NEWS) — refusing to publish a smaller site"
else
  ok "news articles: $NEWS"
fi
for f in index.html robots.txt sitemap.xml news/index.html; do
  [ -f "$DIST/$f" ] && ok "present: $f" || bad "missing: $f"
done
if command -v python3 >/dev/null 2>&1; then
  python3 -c "import xml.etree.ElementTree as E,sys;E.parse('$DIST/sitemap.xml');print('  ✔ sitemap.xml parses')" || bad "sitemap.xml malformed"
fi

say ""
if [ "$FAIL" -ne 0 ]; then
  say "── RESULT: FAIL — deployment blocked ──"
  exit 1
fi
say "── RESULT: PASS — dist/ is safe to publish ──"
