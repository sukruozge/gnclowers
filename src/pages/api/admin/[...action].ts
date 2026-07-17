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
import { ghGetFile, ghPutFile, ghDispatchWorkflow, ghGetFileSha, ghPutBinaryFile, type Gh } from '@lib/admin/github';

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
  priceUsd?: unknown;
  currency?: unknown;
  category?: unknown;
  image?: unknown;
  images?: unknown;
  tags?: unknown;
  options?: unknown;
  variants?: unknown;
  optionImages?: unknown;
  imageAlt?: unknown;
  url?: unknown;
  isActive?: unknown;
  isNew?: unknown;
}

interface ProductOptionGroup { name: string; values: string[] }
interface ProductVariant { values: Record<string, string>; price: number }

interface Product {
  id: string;
  title_tr: string;
  title_en: string;
  description_tr: string;
  description_en: string;
  price: number;
  priceUsd?: number;
  currency: string;
  category: string;
  image?: string;
  images?: string[];
  tags?: string[];
  options?: ProductOptionGroup[];
  variants?: ProductVariant[];
  optionImages?: Record<string, string>;
  imageAlt?: string;
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
    const m = String((err as any)?.message || '');
    // workflow_dispatch needs the PAT's "Actions: Read and write" permission;
    // the token likely only has Contents. Surface an actionable hint.
    if (m.includes('403')) {
      return json({ error: 'GitHub token\'ının "Actions" (Read and write) izni yok. Token ayarlarından Actions iznini ekleyip tekrar deneyin. (Gece otomatik senkron zaten çalışıyor.)' }, 502);
    }
    if (m.includes('404')) {
      return json({ error: 'Senkron iş akışı bulunamadı (etsy-sync.yml) veya token bu depoya erişemiyor.' }, 502);
    }
    return json({ error: 'Sync tetiklenemedi (' + (m || 'bilinmeyen hata') + ').' }, 502);
  }
}

const SETTINGS_PATH = 'src/data/settings.json';
const BLOG_PATH = 'src/data/blog.json';

async function loadSettings(gh: Gh): Promise<{ data: any; sha: string }> {
  const { content, sha } = await ghGetFile(gh, SETTINGS_PATH);
  return { data: JSON.parse(content), sha };
}

async function saveSettingsFile(gh: Gh, data: any, sha: string, message: string): Promise<void> {
  await ghPutFile(gh, SETTINGS_PATH, JSON.stringify(data, null, 2) + '\n', message, sha);
}

async function loadBlog(gh: Gh): Promise<{ data: any[]; sha: string }> {
  const { content, sha } = await ghGetFile(gh, BLOG_PATH);
  const parsed = JSON.parse(content);
  return { data: Array.isArray(parsed) ? parsed : [], sha };
}

async function saveBlogFile(gh: Gh, data: any[], sha: string, message: string): Promise<void> {
  await ghPutFile(gh, BLOG_PATH, JSON.stringify(data, null, 2) + '\n', message, sha);
}

async function handleSettingsGet(request: Request, env: Record<string, any>): Promise<Response> {
  if (!(await isAuthed(request, env))) return json({ error: 'invalid' }, 401);
  if (!env.GITHUB_TOKEN) return json({ error: 'GITHUB_TOKEN ayarlı değil.' }, 501);
  try {
    const gh = ghClient(env);
    const { data } = await loadSettings(gh);
    return json(data, 200);
  } catch (err) {
    console.error('admin get settings error', err);
    return json({ error: 'Ayarlar okunamadı.' }, 502);
  }
}

async function handleSettingsPut(request: Request, env: Record<string, any>): Promise<Response> {
  if (!(await isAuthed(request, env))) return json({ error: 'invalid' }, 401);
  if (!env.GITHUB_TOKEN) return json({ error: 'GITHUB_TOKEN ayarlı değil.' }, 501);
  const body = await readBody(request);
  if (body === null) return json({ error: 'invalid-body' }, 400);
  try {
    const gh = ghClient(env);
    const { data, sha } = await loadSettings(gh);
    
    if (typeof body.name === 'string') data.name = body.name;
    if (typeof body.description === 'string') data.description = body.description;
    if (typeof body.email === 'string') data.email = body.email;
    if (typeof body.analytics === 'string') data.analytics = body.analytics;
    if (typeof body.currency === 'string') data.currency = body.currency;
    if (typeof body.instagram === 'string') data.instagram = body.instagram;
    if (typeof body.pinterest === 'string') data.pinterest = body.pinterest;
    if (typeof body.etsy === 'string') data.etsy = body.etsy;
    if (typeof body.logo === 'string') data.logo = body.logo;
    if (typeof body.favicon === 'string') data.favicon = body.favicon;
    // Featured products (homepage "Öne Çıkanlar"): array of product ids, in order.
    if (Array.isArray(body.featured)) {
      data.featured = body.featured.map((x: unknown) => String(x)).slice(0, 24);
    }
    if (body.categoryCovers && typeof body.categoryCovers === 'object') {
      data.categoryCovers = { ...data.categoryCovers, ...body.categoryCovers };
    }

    // Rename category globally across covers & products if requested
    if (body.renameCategory && typeof body.renameCategory === 'object') {
      const { oldName, newName } = body.renameCategory;
      if (typeof oldName === 'string' && typeof newName === 'string' && oldName && newName && oldName !== newName) {
        // 1. Rename cover key
        if (data.categoryCovers && data.categoryCovers[oldName] !== undefined) {
          data.categoryCovers[newName] = data.categoryCovers[oldName];
          delete data.categoryCovers[oldName];
        }
        // 2. Load and update products
        try {
          const { data: prodData, sha: prodSha } = await loadProducts(gh);
          let updatedCount = 0;
          prodData.products = (prodData.products || []).map(p => {
            if (p.category === oldName) {
              updatedCount++;
              return { ...p, category: newName };
            }
            return p;
          });
          if (updatedCount > 0) {
            await saveProducts(gh, prodData, prodSha, `admin: rename category ${oldName} to ${newName}`);
          }
        } catch (pe) {
          console.error('Failed to update products for category rename', pe);
        }
      }
    }

    await saveSettingsFile(gh, data, sha, 'admin: update settings');
    return json({ ok: true }, 200);
  } catch (err) {
    console.error('admin save settings error', err);
    return json({ error: 'Ayarlar kaydedilemedi.' }, 502);
  }
}

async function handleUpload(request: Request, env: Record<string, any>): Promise<Response> {
  if (!(await isAuthed(request, env))) return json({ error: 'invalid' }, 401);
  if (!env.GITHUB_TOKEN) return json({ error: 'GITHUB_TOKEN ayarlı değil.' }, 501);

  const body = await readBody(request);
  if (body === null) return json({ error: 'invalid-body' }, 400);

  let { path: filePath, base64 } = body;
  if (typeof filePath !== 'string' || typeof base64 !== 'string') {
    return json({ error: 'path ve base64 alanları zorunludur.' }, 400);
  }

  // Confine uploads to the public/ asset tree. Without this, an authenticated
  // admin (or a hijacked session) could overwrite ANY repo path — e.g.
  // .github/workflows/*.yml — and gain arbitrary code execution in CI, which
  // holds the repo secrets. Reject traversal and anything outside public/.
  filePath = filePath.replace(/\\/g, '/').replace(/^\/+/, '');
  if (
    filePath.includes('..') ||
    filePath.includes('\0') ||
    !filePath.startsWith('public/')
  ) {
    return json({ error: 'Geçersiz dosya yolu (yalnızca public/ altına yükleme yapılabilir).' }, 400);
  }

  // Strip base64 metadata prefix if exists
  const commaIdx = base64.indexOf(',');
  if (commaIdx !== -1) {
    base64 = base64.slice(commaIdx + 1);
  }

  try {
    const gh = ghClient(env);
    const sha = await ghGetFileSha(gh, filePath);
    await ghPutBinaryFile(gh, filePath, base64, `admin: upload ${filePath}`, sha);
    const url = '/' + filePath.replace(/^public\//, '');
    return json({ ok: true, url }, 200);
  } catch (err) {
    console.error('admin upload error', err);
    return json({ error: 'Yükleme başarısız.' }, 502);
  }
}

async function handleBlogGet(request: Request, env: Record<string, any>): Promise<Response> {
  if (!(await isAuthed(request, env))) return json({ error: 'invalid' }, 401);
  if (!env.GITHUB_TOKEN) return json({ error: 'GITHUB_TOKEN ayarlı değil.' }, 501);
  try {
    const gh = ghClient(env);
    const { data } = await loadBlog(gh);
    return json(data, 200);
  } catch (err) {
    console.error('admin get blog error', err);
    return json({ error: 'Blog okunamadı.' }, 502);
  }
}

async function handleBlogCreate(request: Request, env: Record<string, any>): Promise<Response> {
  if (!(await isAuthed(request, env))) return json({ error: 'invalid' }, 401);
  if (!env.GITHUB_TOKEN) return json({ error: 'GITHUB_TOKEN ayarlı değil.' }, 501);
  const body = await readBody(request);
  if (body === null) return json({ error: 'invalid-body' }, 400);
  
  const post = {
    slug: typeof body.slug === 'string' && body.slug ? body.slug : 'post-' + Date.now(),
    date: typeof body.date === 'string' && body.date ? body.date : new Date().toISOString().split('T')[0],
    title_tr: typeof body.title_tr === 'string' ? body.title_tr : (body.title || ''),
    title_en: typeof body.title_en === 'string' ? body.title_en : (body.title || ''),
    excerpt_tr: typeof body.excerpt_tr === 'string' ? body.excerpt_tr : (body.excerpt || ''),
    excerpt_en: typeof body.excerpt_en === 'string' ? body.excerpt_en : (body.excerpt || ''),
    bodyHtml_tr: typeof body.bodyHtml_tr === 'string' ? body.bodyHtml_tr : (body.content || ''),
    bodyHtml_en: typeof body.bodyHtml_en === 'string' ? body.bodyHtml_en : (body.content || ''),
    category: typeof body.category === 'string' ? body.category : 'General',
    cover: typeof body.cover === 'string' ? body.cover : '',
    metaTitle: typeof body.metaTitle === 'string' ? body.metaTitle : '',
    metaDesc: typeof body.metaDesc === 'string' ? body.metaDesc : '',
    readTime: typeof body.readTime === 'string' ? body.readTime : '',
    published: body.published !== false
  };

  try {
    const gh = ghClient(env);
    const { data, sha } = await loadBlog(gh);
    data.unshift(post);
    await saveBlogFile(gh, data, sha, `admin: create blog post ${post.slug}`);
    return json({ ok: true }, 200);
  } catch (err) {
    console.error('admin create blog error', err);
    return json({ error: 'Kaydedilemedi.' }, 502);
  }
}

async function handleBlogUpdate(slug: string, request: Request, env: Record<string, any>): Promise<Response> {
  if (!(await isAuthed(request, env))) return json({ error: 'invalid' }, 401);
  if (!env.GITHUB_TOKEN) return json({ error: 'GITHUB_TOKEN ayarlı değil.' }, 501);
  const body = await readBody(request);
  if (body === null) return json({ error: 'invalid-body' }, 400);

  try {
    const gh = ghClient(env);
    const { data, sha } = await loadBlog(gh);
    const idx = data.findIndex((p) => p.slug === slug);
    if (idx === -1) return json({ error: 'Yazı bulunamadı.' }, 404);

    data[idx] = {
      slug: typeof body.slug === 'string' && body.slug ? body.slug : data[idx].slug,
      date: typeof body.date === 'string' && body.date ? body.date : data[idx].date,
      title_tr: typeof body.title_tr === 'string' ? body.title_tr : (body.title || data[idx].title_tr),
      title_en: typeof body.title_en === 'string' ? body.title_en : (body.title || data[idx].title_en),
      excerpt_tr: typeof body.excerpt_tr === 'string' ? body.excerpt_tr : (body.excerpt || data[idx].excerpt_tr),
      excerpt_en: typeof body.excerpt_en === 'string' ? body.excerpt_en : (body.excerpt || data[idx].excerpt_en),
      bodyHtml_tr: typeof body.bodyHtml_tr === 'string' ? body.bodyHtml_tr : (body.content || data[idx].bodyHtml_tr),
      bodyHtml_en: typeof body.bodyHtml_en === 'string' ? body.bodyHtml_en : (body.content || data[idx].bodyHtml_en),
      category: typeof body.category === 'string' ? body.category : (data[idx].category || 'General'),
      cover: typeof body.cover === 'string' ? body.cover : (data[idx].cover || ''),
      metaTitle: typeof body.metaTitle === 'string' ? body.metaTitle : (data[idx].metaTitle || ''),
      metaDesc: typeof body.metaDesc === 'string' ? body.metaDesc : (data[idx].metaDesc || ''),
      readTime: typeof body.readTime === 'string' ? body.readTime : (data[idx].readTime || ''),
      published: body.published !== false
    };

    await saveBlogFile(gh, data, sha, `admin: update blog post ${slug}`);
    return json({ ok: true }, 200);
  } catch (err) {
    console.error('admin update blog error', err);
    return json({ error: 'Güncellenemedi.' }, 502);
  }
}

async function handleBlogDelete(slug: string, request: Request, env: Record<string, any>): Promise<Response> {
  if (!(await isAuthed(request, env))) return json({ error: 'invalid' }, 401);
  if (!env.GITHUB_TOKEN) return json({ error: 'GITHUB_TOKEN ayarlı değil.' }, 501);
  try {
    const gh = ghClient(env);
    const { data, sha } = await loadBlog(gh);
    const next = data.filter((p) => p.slug !== slug);
    if (next.length === data.length) return json({ error: 'Yazı bulunamadı.' }, 404);
    await saveBlogFile(gh, next, sha, `admin: delete blog post ${slug}`);
    return json({ ok: true }, 200);
  } catch (err) {
    console.error('admin delete blog error', err);
    return json({ error: 'Silinemedi.' }, 502);
  }
}

function normalizeProduct(input: ProductInput, id: string): Product | null {
  const title_tr = typeof input.title_tr === 'string' ? input.title_tr.trim() : '';
  const title_en = typeof input.title_en === 'string' ? input.title_en.trim() : '';
  const price = typeof input.price === 'number' ? input.price : Number(input.price);
  if (!title_tr || !title_en || !Number.isFinite(price)) return null;
  // Optional independent USD price for the EN storefront. Empty/0/invalid → undefined
  // (auto-convert). Always emitted as a key so an update can also CLEAR it.
  const puRaw = input.priceUsd;
  const puNum = typeof puRaw === 'number' ? puRaw : (typeof puRaw === 'string' && puRaw.trim() !== '' ? Number(puRaw) : NaN);
  const priceUsd = Number.isFinite(puNum) && puNum > 0 ? puNum : undefined;
  const out: Product = {
    id,
    title_tr,
    title_en,
    description_tr: typeof input.description_tr === 'string' ? input.description_tr : '',
    description_en: typeof input.description_en === 'string' ? input.description_en : '',
    price,
    priceUsd,
    currency: typeof input.currency === 'string' && input.currency ? input.currency : 'TRY',
    category: typeof input.category === 'string' && input.category ? input.category : 'amigurumi',
    image: typeof input.image === 'string' && input.image ? input.image : undefined,
    isActive: input.isActive !== false,
    isNew: input.isNew === true,
  };
  // url (Etsy source ref) + imageAlt are only touched when the caller sends them,
  // so the removed-from-UI Shopier field and partial PUTs don't wipe existing values.
  if (typeof input.url === 'string') out.url = input.url.trim() || undefined;
  if (typeof input.imageAlt === 'string') out.imageAlt = input.imageAlt.trim() || undefined;
  // Rich fields are only touched when the caller actually sends them — a partial PUT
  // (e.g. the active/featured toggle) omits them, so `{...existing, ...updated}` keeps
  // the current values instead of wiping variants/images the form didn't include.
  if (Array.isArray(input.images)) {
    out.images = (input.images as unknown[]).filter((x): x is string => typeof x === 'string' && x.trim() !== '');
    if (!out.image && out.images.length) out.image = out.images[0];
  }
  if (Array.isArray(input.tags)) {
    out.tags = (input.tags as unknown[]).filter((x): x is string => typeof x === 'string' && x.trim() !== '').map((s) => s.trim());
  }
  if (Array.isArray(input.options)) {
    out.options = (input.options as any[])
      .map((o) => ({
        name: typeof o?.name === 'string' ? o.name.trim() : '',
        values: Array.isArray(o?.values) ? o.values.filter((v: unknown): v is string => typeof v === 'string' && v.trim() !== '').map((v: string) => v.trim()) : [],
      }))
      .filter((o) => o.name && o.values.length);
  }
  if (Array.isArray(input.variants)) {
    const names = new Set((out.options ?? []).map((o) => o.name));
    out.variants = (input.variants as any[])
      .map((v) => {
        const values: Record<string, string> = {};
        if (v?.values && typeof v.values === 'object') {
          for (const [k, val] of Object.entries(v.values)) {
            if (typeof k === 'string' && typeof val === 'string' && (names.size === 0 || names.has(k))) values[k] = val;
          }
        }
        const vp = typeof v?.price === 'number' ? v.price : Number(v?.price);
        return { values, price: Number.isFinite(vp) && vp > 0 ? vp : price };
      })
      .filter((v) => Object.keys(v.values).length > 0);
  }
  if (input.optionImages && typeof input.optionImages === 'object' && !Array.isArray(input.optionImages)) {
    const map: Record<string, string> = {};
    for (const [k, v] of Object.entries(input.optionImages as Record<string, unknown>)) {
      if (typeof k === 'string' && typeof v === 'string' && v.trim() !== '') map[k] = v;
    }
    out.optionImages = map;
  }
  return out;
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
    if (method === 'GET' && action === 'settings') return await handleSettingsGet(request, env);
    if (method === 'PUT' && action === 'settings') return await handleSettingsPut(request, env);
    if (method === 'POST' && action === 'upload') return await handleUpload(request, env);

    if (method === 'GET' && action === 'blog') return await handleBlogGet(request, env);
    if (method === 'POST' && action === 'blog') return await handleBlogCreate(request, env);
    if (action.startsWith('blog/')) {
      const slug = decodeURIComponent(action.slice('blog/'.length));
      if (method === 'PUT') return await handleBlogUpdate(slug, request, env);
      if (method === 'DELETE') return await handleBlogDelete(slug, request, env);
    }

    if (action === 'messages') {
      if (!(await isAuthed(request, env))) return json({ error: 'invalid' }, 401);
      const kv = env.ADMIN_KV;
      if (!kv) return json({ error: 'kv-missing', message: 'Cloudflare ADMIN_KV veritabanı tanımlanmamış. Mesajlar çalışmayacaktır.' }, 200);
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

    // Recent activity feed (payment success/fail, new subscribers) for the bell.
    if (method === 'GET' && action === 'activity') {
      if (!(await isAuthed(request, env))) return json({ error: 'invalid' }, 401);
      const kv = env.ADMIN_KV;
      if (!kv) return json([], 200);
      const raw = await kv.get('activity');
      const list = raw ? JSON.parse(raw) : [];
      return json(Array.isArray(list) ? list.slice(0, 20) : [], 200);
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

    // Newsletter subscribers (written by the public /api/newsletter endpoint).
    if (action === 'newsletter') {
      if (!(await isAuthed(request, env))) return json({ error: 'invalid' }, 401);
      const kv = env.ADMIN_KV;
      if (!kv) return json([], 200);
      if (method === 'GET') {
        const raw = await kv.get('newsletter');
        return json(raw ? JSON.parse(raw) : [], 200);
      }
      // Unsubscribe / remove an address from the list.
      if (method === 'DELETE') {
        const body = await readBody(request);
        const email = typeof body?.email === 'string' ? body.email.toLowerCase() : '';
        if (!email) return json({ error: 'invalid' }, 400);
        const raw = await kv.get('newsletter');
        const list = raw ? JSON.parse(raw) : [];
        const next = list.filter((s: any) => (s.email || '').toLowerCase() !== email);
        await kv.put('newsletter', JSON.stringify(next));
        return json({ ok: true }, 200);
      }
    }

    // Update an order's fulfillment status / cargo tracking / internal note.
    // Orders live in ADMIN_KV (written by the PayTR callback), so this is a KV
    // write, not a GitHub commit.
    if (method === 'POST' && action === 'order-update') {
      if (!(await isAuthed(request, env))) return json({ error: 'invalid' }, 401);
      const kv = env.ADMIN_KV;
      if (!kv) return json({ error: 'no-kv' }, 500);
      const body = await readBody(request);
      if (!body || typeof body.orderId !== 'string') return json({ error: 'invalid' }, 400);
      const ALLOWED = ['new', 'preparing', 'shipped', 'delivered', 'cancelled'];
      const raw = await kv.get('orders');
      const orders = raw ? JSON.parse(raw) : [];
      const o = orders.find((x: any) => x.orderId === body.orderId);
      if (!o) return json({ error: 'not-found' }, 404);
      if (typeof body.fulfillment === 'string' && ALLOWED.includes(body.fulfillment)) o.fulfillment = body.fulfillment;
      if (typeof body.tracking === 'string') o.tracking = body.tracking.slice(0, 120);
      if (typeof body.note === 'string') o.note = body.note.slice(0, 500);
      o.updatedAt = new Date().toISOString();
      await kv.put('orders', JSON.stringify(orders));
      return json({ ok: true, order: o }, 200);
    }

    // Delete a single order, or clear all of them (going-live cleanup of test orders).
    if (method === 'POST' && action === 'order-delete') {
      if (!(await isAuthed(request, env))) return json({ error: 'invalid' }, 401);
      const kv = env.ADMIN_KV;
      if (!kv) return json({ error: 'no-kv' }, 500);
      const body = await readBody(request);
      const raw = await kv.get('orders');
      const orders = raw ? JSON.parse(raw) : [];
      if (body?.all === true) {
        await kv.put('orders', JSON.stringify([]));
        return json({ ok: true, cleared: orders.length }, 200);
      }
      if (!body || typeof body.orderId !== 'string') return json({ error: 'invalid' }, 400);
      const next = orders.filter((x: any) => x.orderId !== body.orderId);
      await kv.put('orders', JSON.stringify(next));
      return json({ ok: true, removed: orders.length - next.length }, 200);
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
