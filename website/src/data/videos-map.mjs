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
    // 'VIDEO_ID': 'whatsapp',
  },
  playlists: {
    // 'PLxxxxxxxx': 'whatsapp',      // WhatsApp Automation
    // 'PLxxxxxxxx': 'ai',            // AI & n8n
    // 'PLxxxxxxxx': 'web',           // Website Development
    // 'PLxxxxxxxx': 'gym_dashboard', // GYM Dashboard
    // 'PLxxxxxxxx': 'software',      // Dev Basics
  },
  keywords: [
    [/whatsapp|wa\s*api|cloud api/i, 'whatsapp'],
    [/\bgym\b|fitness|membership/i, 'gym_dashboard'],
    [/\bcrm\b|lead(s| management| follow)|pipeline/i, 'crm'],
    [/website|web ?site|landing page|claude design|frontend|wordpress|seo/i, 'web'],
    [/\b(cors|404|500|502|api|backend|express|fastapi|vite|database|server|deploy|docker|git)\b/i, 'software'],
    [/n8n|automation|automate|\bai\b|chatgpt|gemini|claude|agent|workflow|instagram|sheet/i, 'ai'],
  ],
  exclude: [
    // 'VIDEO_ID',
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
