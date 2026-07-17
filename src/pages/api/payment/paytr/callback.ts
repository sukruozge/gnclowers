import type { APIRoute } from 'astro';
import { createHmac } from 'node:crypto';

export const prerender = false;

export const POST: APIRoute = async (context) => {
  const { request, locals } = context;
  const runtime = (locals as any).runtime;
  const env = runtime?.env ?? {};

  const PAYTR_MERCHANT_KEY = env.PAYTR_MERCHANT_KEY;
  const PAYTR_MERCHANT_SALT = env.PAYTR_MERCHANT_SALT;

  // Never fall back to public/literal test credentials here. If the merchant
  // keys aren't configured, the signature check would use a well-known salt/key
  // and ANY anonymous caller could forge a valid "success" callback to mark
  // orders paid. When unconfigured, reject outright.
  if (!PAYTR_MERCHANT_KEY || !PAYTR_MERCHANT_SALT) {
    console.warn('[PayTR Callback] merchant creds not configured — rejecting callback');
    return new Response('FAIL');
  }

  try {
    const formData = await request.formData();
    const merchant_oid = formData.get('merchant_oid')?.toString();
    const status = formData.get('status')?.toString();
    const total_amount = formData.get('total_amount')?.toString();
    const hash = formData.get('hash')?.toString();
    const failed_reason_msg = formData.get('failed_reason_msg')?.toString();

    if (!merchant_oid || !status || !total_amount || !hash) {
      return new Response('FAIL');
    }

    const hashStr = merchant_oid + PAYTR_MERCHANT_SALT + status + total_amount;
    const calculatedHash = createHmac('sha256', PAYTR_MERCHANT_KEY).update(hashStr).digest('base64');

    if (calculatedHash !== hash) {
      console.warn('[PayTR Webhook Callback Signature Mismatch]', merchant_oid);
      return new Response('FAIL');
    }

    const kv = env.ADMIN_KV;
    if (kv) {
      const isSuccess = status === 'success';

      // Pull the pending order stored at payment init (customer + line items).
      let pending: any = null;
      try {
        const rawPending = await kv.get(`pending_order:${merchant_oid}`);
        pending = rawPending ? JSON.parse(rawPending) : null;
      } catch (e) {
        // Degrades to an order without customer/items — log so it's diagnosable.
        console.warn('pending_order read/parse failed', merchant_oid, e);
      }

      const rawOrders = await kv.get('orders');
      const orders = rawOrders ? JSON.parse(rawOrders) : [];

      // Idempotency: PayTR retries the callback until it gets "OK". If this order
      // is already recorded as completed, acknowledge without duplicating it.
      const existing = orders.find((o: any) => o.orderId === merchant_oid);
      if (existing && existing.status === 'completed') {
        return new Response('OK');
      }

      const order = {
        orderId: merchant_oid,
        amount: (Number(total_amount) / 100).toFixed(2),
        currency: pending?.currency || 'TRY',
        status: isSuccess ? 'completed' : 'failed',
        failedReason: isSuccess ? '' : (failed_reason_msg || 'Bilinmeyen hata'),
        customer: pending?.customer || null,
        items: pending?.items || [],
        shipping: pending?.shipping ?? null,
        createdAt: pending?.createdAt || new Date().toISOString(),
        paidAt: isSuccess ? new Date().toISOString() : null,
      };

      if (existing) Object.assign(existing, order);
      else orders.push(order);
      // Durable per-order record FIRST: the aggregate `orders` list below is a
      // read-modify-write and can lose an entry under concurrent callbacks; this
      // key makes every completed order individually recoverable.
      try { await kv.put(`order:${merchant_oid}`, JSON.stringify(order)); } catch (e) { console.warn('per-order KV write failed', merchant_oid, e); }
      await kv.put('orders', JSON.stringify(orders));

      const rawActivity = await kv.get('activity');
      const activity = rawActivity ? JSON.parse(rawActivity) : [];
      activity.unshift({
        ts: new Date().toISOString(),
        action: isSuccess ? 'ÖDEME_BAŞARILI' : 'ÖDEME_BAŞARISIZ',
        detail: `Sipariş: ${merchant_oid}, Tutar: ${order.amount}` + (isSuccess ? '' : `, Sebep: ${order.failedReason}`),
      });
      await kv.put('activity', JSON.stringify(activity.slice(0, 500)));

      // On success the pending record is consumed; drop it.
      if (isSuccess) { try { await kv.delete(`pending_order:${merchant_oid}`); } catch { /* ignore */ } }
    }

    return new Response('OK');
  } catch (err) {
    console.error('PayTR Callback error:', err);
    return new Response('FAIL');
  }
};
