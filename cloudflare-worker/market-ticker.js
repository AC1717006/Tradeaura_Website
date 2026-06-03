const SYMBOLS = [
  { yahoo: "^BSESN",             label: "SENSEX",     type: "index"     },
  { yahoo: "^NSEI",              label: "NIFTY 50",   type: "index"     },
  { yahoo: "^NSEBANK",           label: "BANK NIFTY", type: "index"     },
  { yahoo: "NIFTY_MIDCAP_50.NS", label: "MIDCAP 50",  type: "index"     },
  { yahoo: "GC=F",               label: "GOLD",       type: "commodity" },
  { yahoo: "SI=F",               label: "SILVER",     type: "commodity" },
  { yahoo: "CL=F",               label: "CRUDE OIL",  type: "commodity" },
  { yahoo: "HG=F",               label: "COPPER",     type: "commodity" },
];

function yahooUrl(symbol) {
  return `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1m&range=1d`;
}

async function fetchQuote(sym) {
  const res = await fetch(yahooUrl(sym.yahoo), {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; TradeAura/1.0)" },
  });
  if (!res.ok) throw new Error(`Yahoo HTTP ${res.status} for ${sym.yahoo}`);
  const json = await res.json();
  const meta = json?.chart?.result?.[0]?.meta;
  if (!meta) throw new Error(`No meta for ${sym.yahoo}`);
  const price     = meta.regularMarketPrice ?? meta.previousClose ?? 0;
  const prevClose = meta.chartPreviousClose ?? meta.previousClose ?? price;
  const change    = +(price - prevClose).toFixed(2);
  const changePct = prevClose !== 0 ? +((change / prevClose) * 100).toFixed(2) : 0;
  return {
    symbol: sym.label, yahooSymbol: sym.yahoo, type: sym.type,
    currency: meta.currency ?? "USD", exchangeName: meta.exchangeName ?? "",
    price: +price.toFixed(2), change, changePercent: changePct,
  };
}

let cache = { data: null, updatedAt: null, fetchedAt: 0 };
const CACHE_TTL_MS = 30 * 1000;

async function getMarketData() {
  if (cache.data && Date.now() - cache.fetchedAt < CACHE_TTL_MS) {
    return { updatedAt: cache.updatedAt, data: cache.data, cached: true };
  }
  const results = await Promise.allSettled(SYMBOLS.map(fetchQuote));
  const data    = results.filter(r => r.status === "fulfilled").map(r => r.value);
  const failed  = results.filter(r => r.status === "rejected").map(r => r.reason?.message);
  if (data.length === 0) throw new Error("All symbols failed: " + failed.join(", "));
  const updatedAt = new Date().toISOString();
  cache = { data, updatedAt, fetchedAt: Date.now() };
  return { updatedAt, data, cached: false, ...(failed.length ? { failed } : {}) };
}

export default {
  async fetch(request) {
    const corsHeaders = {
      "Access-Control-Allow-Origin":  "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Cache-Control":                "public, max-age=30",
    };
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });
    if (request.method !== "GET")     return new Response("Method not allowed", { status: 405, headers: corsHeaders });
    try {
      const result = await getMarketData();
      return new Response(JSON.stringify(result), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } catch (err) {
      return new Response(JSON.stringify({ error: err.message }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  },
};
