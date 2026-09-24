/**
 * OClever crawler-hit collector (Cloudflare Worker).
 *
 * Passes every request through to your origin unchanged and, on the side,
 * reports bot-looking requests to OClever. Reporting runs in ctx.waitUntil
 * after the response is on its way, and every failure is swallowed, so it can
 * never change or delay what a visitor gets.
 *
 * DESIGN DECISION: report only requests whose user agent looks like a bot or
 * AI crawler, not all traffic. Reasons:
 *  - Volume/cost: a Worker makes one extra subrequest per reported request.
 *    Reporting every human page view and asset would multiply subrequests and
 *    Worker invocations' work by the whole site's traffic, burning through
 *    free-plan limits and sending OClever mostly noise.
 *  - The backend still does the real classification (services.crawlers.classify),
 *    so this filter is deliberately BROAD and cheap: it only decides "worth a
 *    look", not "which bot". A false positive costs one ignored row; a false
 *    negative loses a hit, so the pattern errs on the inclusive side.
 * To report everything instead, set BOT_ONLY to false below.
 */
const BOT_ONLY = true;

// Broad on purpose: generic bot words plus known AI-crawler tokens. The
// authoritative list lives server-side; see https://github.com/ai-robots-txt/ai.robots.txt
const BOT_UA =
  /bot|crawl|spider|slurp|fetch|scrape|gpt|claude|anthropic|perplexity|openai|oai-|gemini|google-extended|bytespider|ccbot|amazonbot|applebot|meta-external|facebookexternalhit|cohere|diffbot|youbot|mistral|duckassist|petalbot|ai2|imagesift|omgili|timpi|webz|panscient|velenpublic|semrush|ahrefs/i;

// Static assets and health checks are never interesting page fetches.
const SKIP_PATH =
  /\.(?:css|js|mjs|map|png|jpe?g|gif|svg|ico|webp|avif|woff2?|ttf|otf|eot|mp4|webm|mp3)$|^\/(?:health|healthz|ping|_next\/|static\/|assets\/)/i;

export default {
  async fetch(request, env, ctx) {
    const response = await fetch(request);
    try {
      if (shouldReport(request, env)) {
        ctx.waitUntil(reportHit(request, response, env));
      }
    } catch {
      // Never let reporting logic affect the response.
    }
    return response;
  },
};

function shouldReport(request, env) {
  if (!env.INGEST_KEY || !env.API_BASE) return false;
  if (request.method !== "GET" && request.method !== "HEAD") return false;
  const ua = request.headers.get("user-agent") || "";
  if (BOT_ONLY && !BOT_UA.test(ua)) return false;
  const path = new URL(request.url).pathname;
  return !SKIP_PATH.test(path);
}

async function reportHit(request, response, env) {
  try {
    await fetch(`${env.API_BASE.replace(/\/+$/, "")}/api/agent-analytics/ingest/crawler-hit`, {
      method: "POST",
      headers: {
        "X-Ingest-Key": env.INGEST_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url: request.url,
        user_agent: request.headers.get("user-agent") || "",
        status_code: response.status,
      }),
    });
  } catch {
    // Best effort by design.
  }
}
