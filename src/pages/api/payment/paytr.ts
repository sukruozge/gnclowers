import type { APIRoute } from 'astro';
import { createHmac } from 'node:crypto';
import productsData from '../../../data/products.json';
import settings from '../../../data/settings.json';
import { shippingFee } from '@lib/shipping';
import { resolveVariantPrice } from '@lib/variants';

export const prerender = false;

function json(body: unknown, status: number): Response {
  // Same-origin endpoint (called only by our own checkout page). No wildcard
  // CORS — a `*` here let any site invoke it and spam pending_order/PayTR.
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json',
      'cache-control': 'no-store',
    },
  });
}

const CURRENCIES = ['TRY', 'USD', 'EUR', 'GBP'];
const clip = (v: unknown, max: number) =>
  String(v ?? '').replace(/\p{Cc}/gu, '').slice(0, max).trim();

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

    const lang = body.lang === 'en' ? 'en' : 'tr';
    const email = clip(body.email, 160);
    const name = clip(body.name, 120);
    const phone = clip(body.phone, 40);
    const address = clip(body.address, 400);
    const city = clip(body.city, 80);
    const country = clip(body.country, 8) || 'TR';
    const province = clip(body.province, 60);
    const district = clip(body.district, 60);
    const postal = clip(body.postal, 12);
    // For TR orders the shipping locality is İl + İlçe; fall back to raw city text.
    const cityResolved = (province && district) ? `${district} / ${province}` : city;
    const currency = CURRENCIES.includes(body.currency) ? body.currency : 'TRY';
    const cart = body.cart;

    if (!email || !name || !phone || !address || !cityResolved || !Array.isArray(cart) || cart.length === 0) {
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
    let totalAmount = 0; // in the order currency (converted)
    let subtotalTry = 0; // TRY base, for the TRY-denominated free-shipping threshold
    const basket: [string, string, number][] = [];
    const items: { id: string; title: string; qty: number; price: number; image?: string; options?: Record<string, string> }[] = [];

    // Product prices are stored in TRY. When the order is placed in USD/EUR (the
    // EN storefront), convert every amount server-side with the settings rate so
    // PayTR charges the correct foreign-currency amount — never trust the client.
    const rates = (settings as any).rates ?? { usd: 47.03, eur: 53.65 };
    const fxRate = currency === 'USD' ? (Number(rates.usd) || 47.03)
      : currency === 'EUR' ? (Number(rates.eur) || 53.65) : 1;
    const conv = (tryAmt: number) => currency === 'TRY' ? tryAmt : Math.round((tryAmt / fxRate) * 100) / 100;

    for (const item of cart) {
      const prod = products.find((p: any) => String(p.id) === String(item.id));
      if (!prod) return json({ error: 'Geçersiz ürün seçimi.' }, 400);

      // Sanitize the client-sent options against the product's real option set,
      // so only genuine variation values reach the order / price lookup.
      let options: Record<string, string> | undefined;
      const prodOptions = (prod as any).options;
      if (item.options && typeof item.options === 'object' && Array.isArray(prodOptions)) {
        const clean: Record<string, string> = {};
        for (const grp of prodOptions) {
          const v = (item.options as any)[grp.name];
          if (typeof v === 'string' && Array.isArray(grp.values) && grp.values.includes(v)) clean[grp.name] = v;
        }
        if (Object.keys(clean).length) options = clean;
      }

      // Price ALWAYS resolved server-side from products.json — never trust client.
      // Then converted to the order currency (TRY→USD/EUR) if needed.
      const priceTry = resolveVariantPrice(prod as any, options);
      const price = conv(priceTry);
      // Bound quantity to a sane positive range: `parseInt(...)||1` alone would
      // let a negative quantity through (-1 || 1 === -1) and skew the basket.
      const qty = Math.min(Math.max(parseInt(item.quantity, 10) || 1, 1), 99);
      totalAmount += price * qty;
      subtotalTry += priceTry * qty;
      const baseTitle = prod.title_tr || prod.title_en;
      const optSuffix = options ? ' (' + Object.keys(options).map((k) => `${k}: ${options![k]}`).join(', ') + ')' : '';
      basket.push([baseTitle + optSuffix, String(price), qty]);
      items.push({ id: String(prod.id), title: baseTitle, qty, price, image: prod.image, ...(options ? { options } : {}) });
    }

    // Region-based shipping, computed server-side (never trust the client),
    // then converted to the order currency to match the item prices.
    const subtotal = totalAmount;
    const shipping = conv(shippingFee((settings as any).shipping, country, subtotalTry));
    if (shipping > 0) basket.push(['Kargo', String(shipping), 1]);
    const grandTotal = subtotal + shipping;

    const paytrAmount = Math.round(grandTotal * 100);
    // Crypto-random suffix so order ids aren't guessable within the 24h window.
    const merchant_oid = 'oid' + Date.now() + crypto.randomUUID().replace(/-/g, '').slice(0, 12);
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
            customer: { name, email, phone, address, city: cityResolved, province, district, postal, country },
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

    // Field names MUST be `no_installment` / `max_installment` (PayTR's official
    // sample). The old `no_install` / `max_install` were silently ignored by
    // PayTR, so its token hash used its own defaults and never matched ours.
    const no_installment = '0';   // 0 = installments allowed
    const max_installment = '0';  // 0 = show all available installments
    const timeout_limit = '30';
    const test_mode = PAYTR_TEST_MODE;
    // Verbose provider errors only while testing; off in live mode.
    const debug_on = test_mode === '1' ? '1' : '0';
    // PayTR expects 'TL' for Turkish Lira, not the ISO code 'TRY'. This value is
    // part of the token hash, so it must be identical here and in the payload.
    const paytrCurrency = currency === 'TRY' ? 'TL' : currency;

    const hashStr = PAYTR_MERCHANT_ID + user_ip + merchant_oid + email + paytrAmount + user_basket + no_installment + max_installment + paytrCurrency + test_mode + PAYTR_MERCHANT_SALT;
    const paytr_token = createHmac('sha256', PAYTR_MERCHANT_KEY).update(hashStr).digest('base64');

    const payload = new URLSearchParams({
      merchant_id: PAYTR_MERCHANT_ID,
      user_ip,
      merchant_oid,
      email,
      payment_amount: String(paytrAmount),
      paytr_token,
      user_basket,
      no_installment,
      max_installment,
      currency: paytrCurrency,
      test_mode,
      user_name: name,
      user_address: `${address} ${city}`,
      user_phone: phone,
      merchant_ok_url,
      merchant_fail_url,
      timeout_limit,
      debug_on,
      lang,
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
