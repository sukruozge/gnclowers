import type { APIRoute } from 'astro';
import { createHmac } from 'node:crypto';

export const prerender = false;

export const POST: APIRoute = async (context) => {
  const { request, locals } = context;
  const runtime = (locals as any).runtime;
  const env = runtime?.env ?? {};

  const PAYTR_MERCHANT_KEY = env.PAYTR_MERCHANT_KEY || 'test_merchant_key';
  const PAYTR_MERCHANT_SALT = env.PAYTR_MERCHANT_SALT || 'test_merchant_salt';

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
      const order = {
        orderId: merchant_oid,
        amount: (Number(total_amount) / 100).toFixed(2),
        status: status === 'success' ? 'completed' : 'failed',
        failedReason: status === 'success' ? '' : (failed_reason_msg || 'Bilinmeyen hata'),
        createdAt: new Date().toISOString(),
      };

      const rawOrders = await kv.get('orders');
      const orders = rawOrders ? JSON.parse(rawOrders) : [];
      orders.push(order);
      await kv.put('orders', JSON.stringify(orders));

      const rawActivity = await kv.get('activity');
      const activity = rawActivity ? JSON.parse(rawActivity) : [];
      activity.unshift({
        ts: new Date().toISOString(),
        action: status === 'success' ? 'ÖDEME_BAŞARILI' : 'ÖDEME_BAŞARISIZ',
        detail: `Sipariş: ${merchant_oid}, Tutar: ${order.amount}` + (status === 'success' ? '' : `, Sebep: ${order.failedReason}`),
      });
      await kv.put('activity', JSON.stringify(activity.slice(0, 500)));
    }

    return new Response('OK');
  } catch (err) {
    console.error('PayTR Callback error:', err);
    return new Response('FAIL');
  }
};
