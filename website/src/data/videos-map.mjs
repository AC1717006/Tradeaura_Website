/* ─────────────────────────────────────────────────────────────
   Video → service mapping and content clean-up rules.

   Resolution order per video (first hit wins):
     1. overrides[videoId]  — explicit; null = show without a service
     2. playlists[playlistId] — once the YouTube Studio playlists exist,
        paste their IDs here (PL…) — the most reliable signal
     3. keywords — tested against the TITLE first, then the description
   exclude[] — video ids never built (old / non-business uploads).
   Service keys must match site.services[].key in site.mjs.
   ───────────────────────────────────────────────────────────── */
export const videoMap = {
  overrides: {
    // (Shorts inherit their long video's service automatically — see lib/videos.mjs pairShorts)
    'Ddt8jBtnKT4': 'software',   // "IRCTC Tatkal Pe Site Kyun Atakti Hai?" — system-design explainer, no keyword hit
  },
  playlists: {
    'PLJ99Uf4p0PzQ': 'software',   // Error Kaise Resolve Kare? Website & Coding Errors Fix
    'PLPkZbJ1EznD4': 'web',        // Vibe Coding Kaise Seekhe? | AI se App & Website
    'PLTGxIVVo8v_c': 'ai',         // How to Build Automation | WhatsApp, AI Agent, Business Automation
    // add when created in YouTube Studio:
    // 'PL…': 'whatsapp',           // WhatsApp Automation
    // 'PL…': 'gym_dashboard',      // GYM Dashboard
  },
  keywords: [
    [/whatsapp|wa\s*api|cloud api/i, 'whatsapp'],
    [/\bgym\b|fitness|membership/i, 'gym_dashboard'],
    [/\bcrm\b|lead(s| management| follow)|pipeline/i, 'crm'],
    // dev-basics topics (error codes, CORS, backend) come BEFORE the website rule, so
    // "Website pe 404/500/502" and "Error 502" land in the same service
    [/\b(cors|404|500|502|503|backend|express|fastapi|vite|database|server|deploy|docker|git|node\.?js|python)\b/i, 'software'],
    [/website|web ?site|landing page|claude design|frontend|wordpress|seo/i, 'web'],
    [/n8n|automation|automate|\bai\b|chatgpt|gemini|claude|agent|workflow|instagram|sheet/i, 'ai'],
  ],
  exclude: [
    'j3WAtU5xc7I',   // Short "98% Match… Reply: hmm" (dating app)
    'O9Zjg2zXdys',   // "Dating App Match Kaise Karwata Hai? Algorithm Explained"
    'qWPMcOSFA6Y',   // "AI se Algo Trading System Kaise Banayein?" (video)
    'uDp-a0RfEck',   // "AI se Algo Trading System Kaise Banayein?" (Short)
    'NTo33jVUPB4',   // duplicate Short "AI Website Launch Pe CRASH? 5 Wajah" (7 Oct) — 1Nu27YkInTI (9 Oct) kept
  ],
  /* description lines dropped on the website (channel boilerplate) */
  boilerplate: [
    /^(subscribe|like|share|comment|follow)\b/i,
    /^(chapters|timestamps?)\s*:?$/i,
    /^(instagram|facebook|linkedin|twitter|x)\s*[:\-–]/i,
    /^#/,
  ],
  channelUrl: 'https://www.youtube.com/@auraautomationsite',
};
