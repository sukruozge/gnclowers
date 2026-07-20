import type { APIRoute } from 'astro';

export const prerender = false;

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  });
}

export const POST: APIRoute = async (context) => {
  const { request, locals } = context;
  const runtime = (locals as any).runtime;
  const env = runtime?.env ?? {};

  const kv = env.ADMIN_KV;
  if (!kv) return json({ ok: true, note: 'no KV binding' }, 200);

  // Per-IP throttle (same pattern as /api/messages): an unauthenticated caller
  // must not be able to inflate totalViews or rack up KV writes without bound.
  try {
    const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
    const rlKey = `an_rl:${ip}`;
    const n = parseInt((await kv.get(rlKey)) || '0', 10) || 0;
    if (n >= 60) return json({ error: 'rate-limited' }, 429);
    await kv.put(rlKey, String(n + 1), { expirationTtl: 60 });
  } catch { /* limiter must never break tracking */ }

  try {
    const body = await request.json().catch(() => null);
    if (!body) return json({ error: 'invalid' }, 400);

    // Unauthenticated endpoint: cap sizes so a caller can't bloat KV or the
    // admin payload. The dashboard also HTML-escapes these on render.
    const clip = (v: unknown, max: number) =>
      String(v ?? '').replace(/\p{Cc}/gu, '').slice(0, max).trim();
    const productId = clip(body.productId, 64);
    const productName = clip(body.productName, 120);
    const referrer = clip(body.referrer, 300);
    const lang = body.lang === 'en' ? 'en' : 'tr';
    const utm = clip(body.utm, 60);
    // Cloudflare stamps the visitor's country on every request — free geo data.
    const country = (clip(request.headers.get('CF-IPCountry'), 8) || 'XX').toUpperCase();
    // Bot vs human split. Note: JS-less crawlers never fire this endpoint at
    // all; what lands here as "bot" is JS-executing agents (AI browsers etc.).
    const ua = request.headers.get('user-agent') || '';
    const botMatch = ua.match(/GPTBot|OAI-SearchBot|ChatGPT-User|ClaudeBot|Claude-Web|PerplexityBot|Googlebot|bingbot|YandexBot|Applebot|DuckDuckBot|facebookexternalhit|HeadlessChrome|bot|crawler|spider/i);
    const MAX_PRODUCT_KEYS = 1000;
    const MAX_REFERRER_KEYS = 300;
    const MAX_COUNTRY_KEYS = 300;
    const MAX_UTM_KEYS = 200;
    const MAX_DAILY_DAYS = 60;

    let refCat = 'direct';
    if (referrer && referrer !== 'direct') {
      const refUrl = referrer.toLowerCase();
      // AI assistants first — gemini must beat the generic google match.
      if (refUrl.includes('chatgpt.com') || refUrl.includes('chat.openai.com')) refCat = 'chatgpt';
      else if (refUrl.includes('claude.ai')) refCat = 'claude';
      else if (refUrl.includes('perplexity.')) refCat = 'perplexity';
      else if (refUrl.includes('gemini.google.')) refCat = 'gemini';
      else if (refUrl.includes('copilot.microsoft.')) refCat = 'copilot';
      else if (refUrl.includes('bing.')) refCat = 'bing';
      else if (refUrl.includes('yandex.')) refCat = 'yandex';
      else if (refUrl.includes('google.')) refCat = 'google';
      else if (refUrl.includes('instagram.com')) refCat = 'instagram';
      else if (refUrl.includes('facebook.com') || refUrl.includes('fb.com')) refCat = 'facebook';
      else if (refUrl.includes('pinterest.')) refCat = 'pinterest';
      else if (refUrl.includes('trendyol.')) refCat = 'trendyol';
      else {
        try {
          refCat = new URL(referrer).hostname;
        } catch {
          refCat = 'other';
        }
      }
    }

    const dataRaw = await kv.get('analytics_traffic');
    const data = dataRaw ? JSON.parse(dataRaw) : { totalViews: 0, referrers: {}, products: {} };

    data.totalViews = (data.totalViews || 0) + 1;

    data.referrers = data.referrers || {};
    // Only count a brand-new referrer key if we're under the cap (prevents a
    // caller from spraying unique referrers to grow the object without bound).
    if (data.referrers[refCat] !== undefined || Object.keys(data.referrers).length < MAX_REFERRER_KEYS) {
      data.referrers[refCat] = (data.referrers[refCat] || 0) + 1;
    }

    if (productId && productId !== 'home') {
      data.products = data.products || {};
      const known = data.products[productId] !== undefined;
      if (known || Object.keys(data.products).length < MAX_PRODUCT_KEYS) {
        data.products[productId] = data.products[productId] || { views: 0, title: productName };
        data.products[productId].views = (data.products[productId].views || 0) + 1;
        data.products[productId].title = productName || data.products[productId].title;
      }
    }

    // Human vs bot split + named bots
    data.visitors = data.visitors || { human: 0, bot: 0 };
    if (botMatch) {
      data.visitors.bot++;
      data.bots = data.bots || {};
      const bn = botMatch[0];
      if (data.bots[bn] !== undefined || Object.keys(data.bots).length < 100) {
        data.bots[bn] = (data.bots[bn] || 0) + 1;
      }
    } else {
      data.visitors.human++;
    }

    // Visitor-origin breakdowns (admin "nereden geldi" panel)
    data.countries = data.countries || {};
    if (data.countries[country] !== undefined || Object.keys(data.countries).length < MAX_COUNTRY_KEYS) {
      data.countries[country] = (data.countries[country] || 0) + 1;
    }
    data.langs = data.langs || {};
    data.langs[lang] = (data.langs[lang] || 0) + 1;
    if (utm) {
      data.utm = data.utm || {};
      if (data.utm[utm] !== undefined || Object.keys(data.utm).length < MAX_UTM_KEYS) {
        data.utm[utm] = (data.utm[utm] || 0) + 1;
      }
    }
    // Rolling daily series for the trend chart
    const day = new Date().toISOString().slice(0, 10);
    data.daily = data.daily || {};
    data.daily[day] = (data.daily[day] || 0) + 1;
    const days = Object.keys(data.daily).sort();
    while (days.length > MAX_DAILY_DAYS) delete data.daily[days.shift() as string];

    await kv.put('analytics_traffic', JSON.stringify(data));

    return json({ ok: true }, 200);
  } catch (err) {
    console.error('Analytics tracking error:', err);
    return json({ error: 'server' }, 500);
  }
};
