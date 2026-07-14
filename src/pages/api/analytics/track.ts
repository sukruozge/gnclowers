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
    const MAX_PRODUCT_KEYS = 1000;
    const MAX_REFERRER_KEYS = 300;

    let refCat = 'direct';
    if (referrer && referrer !== 'direct') {
      const refUrl = referrer.toLowerCase();
      if (refUrl.includes('google.')) refCat = 'google';
      else if (refUrl.includes('instagram.com')) refCat = 'instagram';
      else if (refUrl.includes('facebook.com') || refUrl.includes('fb.com')) refCat = 'facebook';
      else if (refUrl.includes('pinterest.')) refCat = 'pinterest';
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

    await kv.put('analytics_traffic', JSON.stringify(data));

    return json({ ok: true }, 200);
  } catch (err) {
    console.error('Analytics tracking error:', err);
    return json({ error: 'server' }, 500);
  }
};
