import type { APIRoute } from 'astro';
import { createHmac } from 'node:crypto';
import productsData from '../../../data/products.json';
import settings from '../../../data/settings.json';
import { shippingFee } from '@lib/shipping';

export const prerender = false;

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json',
      'cache-control': 'no-store',
      'access-control-allow-origin': '*',
    },
  });
}

export const POST: APIRoute = async (context) => {
  const { request, locals } = context;
  const runtime = (locals as any).runtime;
  const env = runtime?.env ?? {};

  const PAYTR_MERCHANT_ID = env.PAYTR_MERCHANT_ID || 'test_merchant_id';
  const PAYTR_MERCHANT_KEY = env.PAYTR_MERCHANT_KEY || 'test_merchant_key';
  const PAYTR_MERCHANT_SALT = env.PAYTR_MERCHANT_SALT || 'test_merchant_salt';
  const PAYTR_TEST_MODE = env.PAYTR_TEST_MODE === '0' ? '0' : '1';
  const credsConfigured = Boolean(env.PAYTR_MERCHANT_ID && env.PAYTR_MERCHANT_KEY && env.PAYTR_MERCHANT_SALT);

  try {
    const body = await request.json().catch(() => null);
    if (!body) return json({ error: 'Geçersiz istek gövdesi.' }, 400);

    const { email, name, phone, address, city, cart, currency = 'TRY', lang = 'tr', country = 'TR' } = body;

    if (!email || !name || !phone || !address || !city || !Array.isArray(cart) || cart.length === 0) {
      return json({ error: lang === 'en' ? 'Please check your details.' : 'Lütfen bilgilerinizi kontrol edin.' }, 400);
    }

    // PayTR merchant keys not configured yet — fail gracefully with a clear,
    // customer-friendly message instead of a raw provider error.
    if (!credsConfigured) {
      return json({
        error: lang === 'en'
          ? 'Online payment is not active yet. Please reach us on WhatsApp (+90 506 792 76 85) and we will gladly complete your order.'
          : 'Online ödeme henüz aktif değil. Lütfen WhatsApp’tan (+90 506 792 76 85) bize ulaşın; siparişinizi birlikte seve seve tamamlayalım.',
        code: 'payment_unavailable',
      }, 503);
    }

    const products = productsData.products || [];
    let totalAmount = 0;
    const basket: [string, string, number][] = [];
    const items: { id: string; title: string; qty: number; price: number }[] = [];

    for (const item of cart) {
      const prod = products.find((p: any) => String(p.id) === String(item.id));
      if (!prod) return json({ error: 'Geçersiz ürün seçimi.' }, 400);

      const price = prod.price;
      const qty = parseInt(item.quantity, 10) || 1;
      totalAmount += price * qty;
      const title = prod.title_tr || prod.title_en;
      basket.push([title, String(price), qty]);
      items.push({ id: String(prod.id), title, qty, price });
    }

    // Region-based shipping, computed server-side (never trust the client).
    const subtotal = totalAmount;
    const shipping = shippingFee((settings as any).shipping, country, subtotal);
    if (shipping > 0) basket.push(['Kargo', String(shipping), 1]);
    const grandTotal = subtotal + shipping;

    const paytrAmount = Math.round(grandTotal * 100);
    const merchant_oid = 'oid_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
    const user_ip = request.headers.get('CF-Connecting-IP') || request.headers.get('x-real-ip') || '127.0.0.1';

    // Persist a pending order so the async callback can attach customer + line items.
    // Best-effort: skipped if ADMIN_KV isn't bound; self-expires so orphans clean up.
    try {
      const kv = env.ADMIN_KV;
      if (kv) {
        await kv.put(
          `pending_order:${merchant_oid}`,
          JSON.stringify({
            orderId: merchant_oid,
            customer: { name, email, phone, address, city, country },
            items,
            subtotal,
            shipping,
            amount: grandTotal,
            currency,
            lang,
            createdAt: new Date().toISOString(),
          }),
          { expirationTtl: 60 * 60 * 24 }
        );
      }
    } catch (e) {
      console.error('pending_order write failed', e);
    }

    const siteUrl = env.SITE_URL || 'http://localhost:4321';
    const merchant_ok_url = lang === 'en' ? `${siteUrl}/en/payment-success` : `${siteUrl}/tr/odeme-basarili`;
    const merchant_fail_url = lang === 'en' ? `${siteUrl}/en/payment-failed` : `${siteUrl}/tr/odeme-basarisiz`;

    const user_basket = Buffer.from(JSON.stringify(basket)).toString('base64');

    const no_install = '0';
    const max_install = '12';
    const timeout_limit = '30';
    const test_mode = PAYTR_TEST_MODE;

    const hashStr = PAYTR_MERCHANT_ID + user_ip + merchant_oid + email + paytrAmount + user_basket + no_install + max_install + currency + test_mode + PAYTR_MERCHANT_SALT;
    const paytr_token = createHmac('sha256', PAYTR_MERCHANT_KEY).update(hashStr).digest('base64');

    const payload = new URLSearchParams({
      merchant_id: PAYTR_MERCHANT_ID,
      user_ip,
      merchant_oid,
      email,
      payment_amount: String(paytrAmount),
      paytr_token,
      user_basket,
      no_install,
      max_install,
      currency,
      test_mode,
      user_name: name,
      user_address: `${address} ${city}`,
      user_phone: phone,
      merchant_ok_url,
      merchant_fail_url,
      timeout_limit,
      debug_on: '1',
    });

    const response = await fetch('https://www.paytr.com/odeme/api/get-token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: payload.toString(),
    });

    const data = await response.json() as any;
    if (data.status === 'success') {
      return json({ token: data.token }, 200);
    } else {
      console.error('[PayTR API Error]', data.err_msg);
      const base = lang === 'en' ? 'Could not start the payment session.' : 'Ödeme oturumu başlatılamadı.';
      return json({ error: data.err_msg ? `${base} (${data.err_msg})` : base }, 502);
    }
  } catch (e: any) {
    console.error('[PayTR Fetch Error]', e.message);
    return json({ error: 'PayTR sunucusuna bağlanılamadı. Lütfen tekrar deneyin.' }, 502);
  }
};
