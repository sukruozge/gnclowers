/**
 * Admin API for the static /admin/dashboard.html panel.
 *
 * Endpoints (match what dashboard.html calls):
 *   POST   /api/admin/login          { username, password }  -> sets JWT cookie
 *   POST   /api/admin/logout
 *   GET    /api/admin/me             -> { ok, readOnly }
 *   POST   /api/admin/sync           -> dispatches the Etsy sync workflow
 *   POST   /api/admin/products       { product fields }       -> create
 *   PUT    /api/admin/products/:id   { product fields }       -> update
 *   DELETE /api/admin/products/:id                            -> delete
 *   PUT    /api/admin/settings       { etsyShop, ... }        -> best-effort
 *
 * Products persist to src/data/products.json via the GitHub Contents API,
 * which triggers a Cloudflare Pages rebuild. Storefront files are untouched.
 * WebCrypto-only (auth.ts) so it runs on Cloudflare Workers.
 */
import type { APIContext, APIRoute } from 'astro';
import { verifyPassword, signJwt, verifyJwt } from '@lib/admin/auth';
import { ghGetFile, ghPutFile, ghDispatchWorkflow, type Gh } from '@lib/admin/github';

export const prerender = false;

const COOKIE_NAME = 'aselovers_admin';
const JWT_TTL_SECONDS = 86400;
const RATE_LIMIT_MAX = 10;
const RATE_LIMIT_TTL_SECONDS = 900;
const MAX_BODY_BYTES = 512 * 1024;
const PRODUCTS_PATH = 'src/data/products.json';
const DEFAULT_REPO = 'sukruozge/gnclowers';

interface ProductInput {
  title_tr?: unknown;
  title_en?: unknown;
  description_tr?: unknown;
  description_en?: unknown;
  price?: unknown;
  currency?: unknown;
  category?: unknown;
  image?: unknown;
  url?: unknown;
  isActive?: unknown;
  isNew?: unknown;
}

interface Product {
  id: string;
  title_tr: string;
  title_en: string;
  description_tr: string;
  description_en: string;
  price: number;
  currency: string;
  category: string;
  image?: string;
  url?: string;
  isActive: boolean;
  isNew: boolean;
}

interface ProductsFile {
  lastSync?: string;
  shopId?: unknown;
  shopName?: unknown;
  total?: number;
  products: Product[];
  [key: string]: unknown;
}

function json(body: unknown, status: number, extraHeaders?: HeadersInit): Response {
  const headers = new Headers(extraHeaders);
  headers.set('content-type', 'application/json');
  headers.set('cache-control', 'no-store');
  return new Response(JSON.stringify(body), { status, headers });
}

function getEnv(locals: APIContext['locals']): Record<string, any> {
  return (locals as any).runtime?.env ?? {};
}

function ghClient(env: Record<string, any>): Gh {
  return { token: env.GITHUB_TOKEN, repo: env.GITHUB_REPO || DEFAULT_REPO };
}

function parseCookie(header: string | null, name: string): string | null {
  if (!header) return null;
  for (const part of header.split(';')) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    if (part.slice(0, idx).trim() === name) {
      return decodeURIComponent(part.slice(idx + 1).trim());
    }
  }
  return null;
}

function setAuthCookie(headers: Headers, token: string): void {
  headers.append(
    'set-cookie',
    `${COOKIE_NAME}=${token}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${JWT_TTL_SECONDS}`
  );
}

function clearAuthCookie(headers: Headers): void {
  headers.append(
    'set-cookie',
    `${COOKIE_NAME}=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0`
  );
}

async function isAuthed(request: Request, env: Record<string, any>): Promise<boolean> {
  const secret = env.JWT_SECRET;
  if (!secret) return false;
  const token = parseCookie(request.headers.get('cookie'), COOKIE_NAME);
  if (!token) return false;
  const payload = await verifyJwt(token, secret);
  return payload !== null;
}

/** KV-backed login rate limit. Skipped silently if no ADMIN_KV binding. */
async function checkRateLimit(env: Record<string, any>, request: Request): Promise<boolean> {
  const kv = env.ADMIN_KV;
  if (!kv) return true;
  try {
    const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
    const key = `rl:${ip}`;
    const raw = await kv.get(key);
    const count = raw ? parseInt(raw, 10) || 0 : 0;
    if (count >= RATE_LIMIT_MAX) return false;
    await kv.put(key, String(count + 1), { expirationTtl: RATE_LIMIT_TTL_SECONDS });
    return true;
  } catch {
    return true;
  }
}

async function readBody(request: Request): Promise<any | null> {
  try {
    const text = await request.text();
    if (text.length > MAX_BODY_BYTES) return null;
    return text ? JSON.parse(text) : {};
  } catch {
    return null;
  }
}

// ── Handlers ────────────────────────────────────────────────

async function handleLogin(request: Request, env: Record<string, any>): Promise<Response> {
  try {
    if (!(await checkRateLimit(env, request))) {
      return json({ error: 'Çok fazla deneme. Biraz sonra tekrar deneyin.' }, 429);
    }
    const body = (await readBody(request)) as { password?: unknown } | null;
    const password = body?.password;
    const storedHash = env.ADMIN_PASSWORD_HASH;
    const secret = env.JWT_SECRET;

    if (!storedHash || !secret) {
      return json({ error: 'Sunucu yapılandırılmamış (ADMIN_PASSWORD_HASH / JWT_SECRET).' }, 500);
    }
    if (typeof password !== 'string' || !(await verifyPassword(password, storedHash))) {
      return json({ error: 'Hatalı şifre.' }, 401);
    }

    const token = await signJwt({ sub: 'admin' }, secret, JWT_TTL_SECONDS);
    const headers = new Headers();
    setAuthCookie(headers, token);
    return json({ ok: true }, 200, headers);
  } catch (err) {
    console.error('admin login error', err);
    return json({ error: 'Sunucu hatası.' }, 500);
  }
}

function handleLogout(): Response {
  const headers = new Headers();
  clearAuthCookie(headers);
  return json({ ok: true }, 200, headers);
}

async function handleMe(request: Request, env: Record<string, any>): Promise<Response> {
  if (!(await isAuthed(request, env))) {
    return json({ error: 'invalid' }, 401);
  }
  return json({ ok: true, readOnly: !env.GITHUB_TOKEN }, 200);
}

async function handleSync(request: Request, env: Record<string, any>): Promise<Response> {
  if (!(await isAuthed(request, env))) return json({ error: 'invalid' }, 401);
  if (!env.GITHUB_TOKEN) return json({ error: 'GITHUB_TOKEN ayarlı değil.' }, 501);
  try {
    await ghDispatchWorkflow(ghClient(env), 'etsy-sync.yml');
    return json({ ok: true }, 200);
  } catch (err) {
    console.error('admin sync error', err);
    return json({ error: 'Sync tetiklenemedi.' }, 502);
  }
}

async function handleSettings(request: Request, env: Record<string, any>): Promise<Response> {
  if (!(await isAuthed(request, env))) return json({ error: 'invalid' }, 401);
  // The Etsy API key lives in the Cloudflare ETSY_API_KEY secret — we never
  // commit it to the repo. Accept the request so the UI's local save succeeds.
  const body = await readBody(request);
  if (body === null) return json({ error: 'invalid-body' }, 400);
  return json({ ok: true }, 200);
}

function normalizeProduct(input: ProductInput, id: string): Product | null {
  const title_tr = typeof input.title_tr === 'string' ? input.title_tr.trim() : '';
  const title_en = typeof input.title_en === 'string' ? input.title_en.trim() : '';
  const price = typeof input.price === 'number' ? input.price : Number(input.price);
  if (!title_tr || !title_en || !Number.isFinite(price)) return null;
  return {
    id,
    title_tr,
    title_en,
    description_tr: typeof input.description_tr === 'string' ? input.description_tr : '',
    description_en: typeof input.description_en === 'string' ? input.description_en : '',
    price,
    currency: typeof input.currency === 'string' && input.currency ? input.currency : 'TRY',
    category: typeof input.category === 'string' && input.category ? input.category : 'amigurumi',
    image: typeof input.image === 'string' && input.image ? input.image : undefined,
    url: typeof input.url === 'string' && input.url ? input.url : undefined,
    isActive: input.isActive !== false,
    isNew: input.isNew === true,
  };
}

async function loadProducts(gh: Gh): Promise<{ data: ProductsFile; sha: string }> {
  const { content, sha } = await ghGetFile(gh, PRODUCTS_PATH);
  const parsed = JSON.parse(content) as ProductsFile;
  if (!Array.isArray(parsed.products)) parsed.products = [];
  return { data: parsed, sha };
}

async function saveProducts(gh: Gh, data: ProductsFile, sha: string, message: string): Promise<void> {
  data.total = data.products.length;
  await ghPutFile(gh, PRODUCTS_PATH, JSON.stringify(data, null, 2) + '\n', message, sha);
}

async function handleProductCreate(request: Request, env: Record<string, any>): Promise<Response> {
  if (!(await isAuthed(request, env))) return json({ error: 'invalid' }, 401);
  if (!env.GITHUB_TOKEN) return json({ error: 'GITHUB_TOKEN ayarlı değil.' }, 501);
  const body = await readBody(request);
  if (body === null) return json({ error: 'invalid-body' }, 400);
  const product = normalizeProduct(body, `man-${Date.now()}`);
  if (!product) return json({ error: 'Zorunlu alanlar eksik (başlık ve fiyat).' }, 400);
  try {
    const gh = ghClient(env);
    const { data, sha } = await loadProducts(gh);
    data.products.unshift(product);
    await saveProducts(gh, data, sha, `admin: add product ${product.id}`);
    return json({ ok: true, id: product.id }, 200);
  } catch (err) {
    console.error('admin product create error', err);
    return json({ error: 'Kaydedilemedi.' }, 502);
  }
}

async function handleProductUpdate(id: string, request: Request, env: Record<string, any>): Promise<Response> {
  if (!(await isAuthed(request, env))) return json({ error: 'invalid' }, 401);
  if (!env.GITHUB_TOKEN) return json({ error: 'GITHUB_TOKEN ayarlı değil.' }, 501);
  const body = await readBody(request);
  if (body === null) return json({ error: 'invalid-body' }, 400);
  const updated = normalizeProduct(body, id);
  if (!updated) return json({ error: 'Zorunlu alanlar eksik (başlık ve fiyat).' }, 400);
  try {
    const gh = ghClient(env);
    const { data, sha } = await loadProducts(gh);
    const idx = data.products.findIndex((p) => String(p.id) === String(id));
    if (idx === -1) return json({ error: 'Ürün bulunamadı.' }, 404);
    data.products[idx] = { ...data.products[idx], ...updated, id: data.products[idx].id };
    await saveProducts(gh, data, sha, `admin: update product ${id}`);
    return json({ ok: true }, 200);
  } catch (err) {
    console.error('admin product update error', err);
    return json({ error: 'Güncellenemedi.' }, 502);
  }
}

async function handleProductDelete(id: string, request: Request, env: Record<string, any>): Promise<Response> {
  if (!(await isAuthed(request, env))) return json({ error: 'invalid' }, 401);
  if (!env.GITHUB_TOKEN) return json({ error: 'GITHUB_TOKEN ayarlı değil.' }, 501);
  try {
    const gh = ghClient(env);
    const { data, sha } = await loadProducts(gh);
    const next = data.products.filter((p) => String(p.id) !== String(id));
    if (next.length === data.products.length) return json({ error: 'Ürün bulunamadı.' }, 404);
    data.products = next;
    await saveProducts(gh, data, sha, `admin: delete product ${id}`);
    return json({ ok: true }, 200);
  } catch (err) {
    console.error('admin product delete error', err);
    return json({ error: 'Silinemedi.' }, 502);
  }
}

// ── Router ──────────────────────────────────────────────────

async function router(method: string, context: APIContext): Promise<Response> {
  const { request, params, locals } = context;
  const env = getEnv(locals);
  const action = (params.action ?? '').replace(/^\/+|\/+$/g, '');

  try {
    if (method === 'POST' && action === 'login') return await handleLogin(request, env);
    if (method === 'POST' && action === 'logout') return handleLogout();
    if (method === 'GET' && action === 'me') return await handleMe(request, env);
    if (method === 'POST' && action === 'sync') return await handleSync(request, env);
    if (method === 'PUT' && action === 'settings') return await handleSettings(request, env);

    if (action === 'messages') {
      if (!(await isAuthed(request, env))) return json({ error: 'invalid' }, 401);
      const kv = env.ADMIN_KV;
      if (!kv) return json([], 200);
      if (method === 'GET') {
        const raw = await kv.get('chat_users');
        return json(raw ? JSON.parse(raw) : [], 200);
      }
    }
    if (action.startsWith('messages/')) {
      if (!(await isAuthed(request, env))) return json({ error: 'invalid' }, 401);
      const kv = env.ADMIN_KV;
      if (!kv) return json({ error: 'no-kv' }, 500);
      
      const userId = decodeURIComponent(action.slice('messages/'.length));
      if (method === 'GET') {
        const raw = await kv.get(`chat_user:${userId}`);
        return json(raw ? JSON.parse(raw) : { userId, messages: [] }, 200);
      }
    }
    if (method === 'POST' && action === 'messages-reply') {
      if (!(await isAuthed(request, env))) return json({ error: 'invalid' }, 401);
      const kv = env.ADMIN_KV;
      if (!kv) return json({ error: 'no-kv' }, 500);
      
      const body = await readBody(request);
      const { userId, text } = body;
      if (!userId || !text) return json({ error: 'missing fields' }, 400);

      const rawHistory = await kv.get(`chat_user:${userId}`);
      if (!rawHistory) return json({ error: 'not-found' }, 404);
      const history = JSON.parse(rawHistory);
      const newReply = {
        id: 'reply-' + Date.now(),
        sender: 'admin',
        text,
        createdAt: new Date().toISOString()
      };
      history.messages.push(newReply);
      await kv.put(`chat_user:${userId}`, JSON.stringify(history));

      const rawIndex = await kv.get('chat_users');
      if (rawIndex) {
        const index = JSON.parse(rawIndex);
        const idx = index.findIndex((u: any) => u.userId === userId);
        if (idx !== -1) {
          index[idx].unreadCount = 0;
          index[idx].lastMessageText = text;
          index[idx].lastActiveAt = new Date().toISOString();
          await kv.put('chat_users', JSON.stringify(index));
        }
      }
      return json({ ok: true, message: newReply }, 200);
    }

    if (method === 'GET' && action === 'analytics') {
      if (!(await isAuthed(request, env))) return json({ error: 'invalid' }, 401);
      const kv = env.ADMIN_KV;
      if (!kv) return json({ totalViews: 0, referrers: {}, products: {} }, 200);
      const raw = await kv.get('analytics_traffic');
      return json(raw ? JSON.parse(raw) : { totalViews: 0, referrers: {}, products: {} }, 200);
    }

    if (method === 'GET' && action === 'orders') {
      if (!(await isAuthed(request, env))) return json({ error: 'invalid' }, 401);
      const kv = env.ADMIN_KV;
      if (!kv) return json([], 200);
      const raw = await kv.get('orders');
      return json(raw ? JSON.parse(raw) : [], 200);
    }

    if (method === 'POST' && action === 'products') return await handleProductCreate(request, env);
    if (action.startsWith('products/')) {
      const id = decodeURIComponent(action.slice('products/'.length));
      if (method === 'PUT') return await handleProductUpdate(id, request, env);
      if (method === 'DELETE') return await handleProductDelete(id, request, env);
    }

    return json({ error: 'not-found' }, 404);
  } catch (err) {
    console.error('admin api error', err);
    return json({ error: 'server' }, 500);
  }
}

export const GET: APIRoute = (context) => router('GET', context);
export const POST: APIRoute = (context) => router('POST', context);
export const PUT: APIRoute = (context) => router('PUT', context);
export const DELETE: APIRoute = (context) => router('DELETE', context);
