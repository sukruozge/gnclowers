import type { APIRoute } from 'astro';

export const prerender = false;

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  });
}

export const GET: APIRoute = async (context) => {
  const { request, locals } = context;
  const env = (locals as any).runtime?.env ?? {};
  const kv = env.ADMIN_KV;
  if (!kv) return json({ error: 'KV database not configured.' }, 500);

  const url = new URL(request.url);
  const userId = url.searchParams.get('userId');
  if (!userId) return json({ error: 'userId is required' }, 400);

  try {
    const raw = await kv.get(`chat_user:${userId}`);
    const data = raw ? JSON.parse(raw) : { userId, messages: [] };
    return json(data, 200);
  } catch {
    return json({ error: 'server' }, 500);
  }
};

export const POST: APIRoute = async (context) => {
  const { request, locals } = context;
  const env = (locals as any).runtime?.env ?? {};
  const kv = env.ADMIN_KV;
  if (!kv) return json({ error: 'KV database not configured.' }, 500);

  try {
    const body = await request.json().catch(() => null);
    if (!body) return json({ error: 'invalid' }, 400);

    const { userId, name, email, text } = body;
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
    await kv.put('chat_users', JSON.stringify(index));

    return json({ ok: true, message: newMsg }, 200);
  } catch (err) {
    console.error('Save message error:', err);
    return json({ error: 'server' }, 500);
  }
};
