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

    const { productId, productName, referrer } = body;

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
    data.referrers[refCat] = (data.referrers[refCat] || 0) + 1;

    if (productId && productId !== 'home') {
      data.products = data.products || {};
      data.products[productId] = data.products[productId] || { views: 0, title: productName };
      data.products[productId].views = (data.products[productId].views || 0) + 1;
      data.products[productId].title = productName || data.products[productId].title;
    }

    await kv.put('analytics_traffic', JSON.stringify(data));

    return json({ ok: true }, 200);
  } catch (err) {
    console.error('Analytics tracking error:', err);
    return json({ error: 'server' }, 500);
  }
};
