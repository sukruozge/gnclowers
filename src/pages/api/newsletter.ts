import type { APIRoute } from 'astro';

export const prerender = false;

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  });
}

// Trimmed, control-char-stripped, length-capped. The admin panel HTML-escapes on
// render too; this is defense-in-depth against garbage payloads / KV bloat from
// an unauthenticated caller.
function clip(v: unknown, max: number): string {
  return String(v ?? '').replace(/\p{Cc}/gu, '').slice(0, max).trim();
}

const MAX_EMAIL = 160;
const MAX_LIST = 5000;
const RL_MAX = 10;      // subscribe attempts per window per IP
const RL_WINDOW = 300;  // seconds
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

async function overRateLimit(kv: any, ip: string): Promise<boolean> {
  try {
    const key = `news_rl:${ip}`;
    const n = parseInt((await kv.get(key)) || '0', 10) || 0;
    if (n >= RL_MAX) return true;
    await kv.put(key, String(n + 1), { expirationTtl: RL_WINDOW });
  } catch { /* ignore limiter errors */ }
  return false;
}

export const POST: APIRoute = async (context) => {
  const { request, locals } = context;
  const env = (locals as any).runtime?.env ?? {};
  const kv = env.ADMIN_KV;
  if (!kv) return json({ error: 'kv-missing' }, 500);

  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  if (await overRateLimit(kv, ip)) return json({ error: 'rate-limited' }, 429);

  try {
    const body = await request.json().catch(() => null);
    const email = clip((body as any)?.email, MAX_EMAIL).toLowerCase();
    const source = clip((body as any)?.source, 40) || 'site';
    if (!email || !EMAIL_RE.test(email)) return json({ error: 'invalid-email' }, 400);

    const raw = await kv.get('newsletter');
    const list: any[] = raw ? JSON.parse(raw) : [];

    // Idempotent: silently succeed if already subscribed (don't leak membership
    // via a different response, and don't duplicate).
    if (list.some((s) => (s.email || '').toLowerCase() === email)) {
      return json({ ok: true, already: true }, 200);
    }

    list.unshift({ email, source, ts: new Date().toISOString() });
    await kv.put('newsletter', JSON.stringify(list.slice(0, MAX_LIST)));

    // Feed the real activity log the admin notification bell reads from.
    try {
      const rawAct = await kv.get('activity');
      const activity = rawAct ? JSON.parse(rawAct) : [];
      activity.unshift({ ts: new Date().toISOString(), action: 'BÜLTEN_ABONE', detail: `Yeni bülten abonesi: ${email}` });
      await kv.put('activity', JSON.stringify(activity.slice(0, 500)));
    } catch { /* activity is best-effort */ }

    return json({ ok: true }, 200);
  } catch (err) {
    console.error('newsletter subscribe error', err);
    return json({ error: 'server' }, 500);
  }
};
