import type { APIRoute } from 'astro';

export const prerender = false;

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  });
}

// Coerce to a trimmed string capped at `max` chars, stripping control chars.
// The admin dashboard also HTML-escapes on render; this is defense-in-depth
// against oversized/garbage payloads and KV bloat from an unauthenticated caller.
function clip(v: unknown, max: number): string {
  return String(v ?? '').replace(/\p{Cc}/gu, '').slice(0, max).trim();
}

const MAX_TEXT = 2000;
const MAX_NAME = 80;
const MAX_EMAIL = 160;
const MAX_USERID = 64;
const MAX_MESSAGES_PER_USER = 300;
const MAX_INDEX_ENTRIES = 500;
const RL_MAX = 30; // messages per window per IP
const RL_WINDOW = 60; // seconds

/** Best-effort per-IP throttle. Returns true only when the caller is over limit. */
async function overRateLimit(kv: any, ip: string): Promise<boolean> {
  try {
    const key = `chat_rl:${ip}`;
    const n = parseInt((await kv.get(key)) || '0', 10) || 0;
    if (n >= RL_MAX) return true;
    await kv.put(key, String(n + 1), { expirationTtl: RL_WINDOW });
  } catch { /* ignore limiter errors */ }
  return false;
}

export const GET: APIRoute = async (context) => {
  const { request, locals } = context;
  const env = (locals as any).runtime?.env ?? {};
  const kv = env.ADMIN_KV;
  if (!kv) return json({ error: 'KV database not configured.' }, 500);

  const url = new URL(request.url);
  const userId = clip(url.searchParams.get('userId'), MAX_USERID);
  if (!userId) return json({ error: 'userId is required' }, 400);

  try {
    const raw = await kv.get(`chat_user:${userId}`);
    const data = raw ? JSON.parse(raw) : { userId, messages: [] };
    // Public endpoint: return only the conversation, never stored PII (name/email).
    // (Anyone who can guess a userId must not be able to harvest contact details.)
    return json({ userId, messages: data.messages || [] }, 200);
  } catch {
    return json({ error: 'server' }, 500);
  }
};

export const POST: APIRoute = async (context) => {
  const { request, locals } = context;
  const env = (locals as any).runtime?.env ?? {};
  const kv = env.ADMIN_KV;
  if (!kv) return json({ error: 'KV database not configured.' }, 500);

  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  if (await overRateLimit(kv, ip)) return json({ error: 'rate-limited' }, 429);

  try {
    const body = await request.json().catch(() => null);
    if (!body) return json({ error: 'invalid' }, 400);

    const userId = clip((body as any).userId, MAX_USERID);
    const name = clip((body as any).name, MAX_NAME);
    const email = clip((body as any).email, MAX_EMAIL);
    const text = clip((body as any).text, MAX_TEXT);
    if (!userId || !text) return json({ error: 'userId and text are required' }, 400);

    // Save history
    const rawHistory = await kv.get(`chat_user:${userId}`);
    const history = rawHistory ? JSON.parse(rawHistory) : { userId, name, email, messages: [] };

    // Update name/email if provided
    if (name) history.name = name;
    if (email) history.email = email;

    const newMsg = {
      id: 'msg-' + Date.now(),
      sender: 'user',
      text,
      createdAt: new Date().toISOString()
    };
    history.messages = (history.messages || []).slice(-MAX_MESSAGES_PER_USER + 1);
    history.messages.push(newMsg);
    await kv.put(`chat_user:${userId}`, JSON.stringify(history));

    // Update global index
    const rawIndex = await kv.get('chat_users');
    const index = rawIndex ? JSON.parse(rawIndex) : [];
    const idx = index.findIndex((u: any) => u.userId === userId);
    const userIndexEntry = {
      userId,
      name: history.name || 'Misafir',
      email: history.email || '',
      lastMessageText: text,
      lastActiveAt: new Date().toISOString(),
      unreadCount: idx !== -1 ? (index[idx].unreadCount || 0) + 1 : 1
    };

    if (idx !== -1) {
      index[idx] = userIndexEntry;
    } else {
      index.unshift(userIndexEntry);
    }
    // Bound the index so an attacker can't grow it without limit.
    await kv.put('chat_users', JSON.stringify(index.slice(0, MAX_INDEX_ENTRIES)));

    return json({ ok: true, message: newMsg }, 200);
  } catch (err) {
    console.error('Save message error:', err);
    return json({ error: 'server' }, 500);
  }
};
