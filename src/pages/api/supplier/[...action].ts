/**
 * Tedarikçi üretim bilgi portalı API'si.
 *
 * Tedarikçi uçları (çerez `aselovers_supplier`, JWT payload { role:'supplier', sid, name }):
 *   POST   login              { username, password }
 *   POST   logout
 *   GET    me                 → { ok, name }
 *   GET    specs              → kendi kayıt özetleri
 *   GET    spec/:productId    → kendi kaydı | null
 *   PUT    spec/:productId    → doğrula + kaydet
 *   POST   file/:productId    { filename, base64 } (PDF ≤ 10 MB)
 *   GET    file/:productId    → application/pdf
 *   DELETE file/:productId
 *
 * Admin uçları (mevcut `aselovers_admin` çerezi, sub=admin):
 *   GET/POST admin/accounts · PUT/DELETE admin/accounts/:id
 *   GET admin/specs · GET/DELETE admin/spec/:pid/:sid · GET admin/file/:pid/:sid · GET admin/export.csv
 *
 * Veri Cloudflare KV'de (ADMIN_KV); PDF'ler asla public/ altına yazılmaz.
 */
import type { APIContext, APIRoute } from 'astro';
import { verifyPassword, signJwt, verifyJwt, hashPassword } from '@lib/admin/auth';
import { isAdminPayload, isSupplierPayload } from '@lib/admin/session';
import { createStore, type SupplierStore } from '@lib/supplier/store';
import { validateNewAccount, normalizeSpec, validatePdf, normalizeUsername, clip } from '@lib/supplier/validate';
import { specsToCsv } from '@lib/supplier/csv';
import { LIMITS, type KvLike, type StoredFile, type SupplierAccount } from '@lib/supplier/types';
import productsFile from '../../../data/products.json';

export const prerender = false;

const SUPPLIER_COOKIE = 'aselovers_supplier';
const ADMIN_COOKIE = 'aselovers_admin';
const SUPPLIER_TTL_SECONDS = 7 * 86400;
const RATE_LIMIT_MAX = 10;
const RATE_LIMIT_TTL_SECONDS = 900;
const MAX_JSON_BYTES = 256 * 1024;
const MAX_FILE_BODY_BYTES = 15 * 1024 * 1024; // 10 MB PDF base64 (~13.4 MB) + JSON zarfı

interface CatalogProduct { id: string | number; title_tr?: string; title_en?: string; isActive?: boolean }
const catalogProducts = ((productsFile as { products?: CatalogProduct[] }).products ?? []);
const ACTIVE_IDS = new Set(catalogProducts.filter((p) => p.isActive).map((p) => String(p.id)));
const TITLES = new Map(catalogProducts.map((p) => [String(p.id), p.title_tr || p.title_en || String(p.id)]));

type Env = Record<string, unknown>;

// ── Yardımcılar ───────────────────────────────────────────────

function json(body: unknown, status: number, extraHeaders?: HeadersInit): Response {
  const headers = new Headers(extraHeaders);
  headers.set('content-type', 'application/json');
  headers.set('cache-control', 'no-store');
  return new Response(JSON.stringify(body), { status, headers });
}

function getEnv(locals: APIContext['locals']): Env {
  return ((locals as { runtime?: { env?: Env } }).runtime?.env) ?? {};
}

function getKv(env: Env): KvLike | null {
  const kv = env.ADMIN_KV as KvLike | undefined;
  return kv && typeof kv.get === 'function' ? kv : null;
}

function parseCookie(header: string | null, name: string): string | null {
  if (!header) return null;
  for (const part of header.split(';')) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    if (part.slice(0, idx).trim() === name) {
      try {
        return decodeURIComponent(part.slice(idx + 1).trim());
      } catch {
        return null; // bozuk yüzde-kodlama → oturumsuz say, 500 üretme
      }
    }
  }
  return null;
}

function cookieHeader(token: string, maxAge: number): string {
  return `${SUPPLIER_COOKIE}=${token}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${maxAge}`;
}

async function readJson(request: Request, max: number): Promise<Record<string, unknown> | null> {
  // Gövdeyi belleğe almadan önce beyan edilen uzunluğa bak (kimliksiz uçlar için önemli).
  const declared = Number(request.headers.get('content-length') ?? 0);
  if (Number.isFinite(declared) && declared > max) return null;
  try {
    const text = await request.text();
    if (text.length > max) return null;
    const parsed: unknown = text ? JSON.parse(text) : {};
    return typeof parsed === 'object' && parsed !== null ? (parsed as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

function base64ToBytes(b64: string): Uint8Array {
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
}

/** Şifre hash'inin kısa parmak izi: JWT'ye konur, şifre sıfırlanınca eski oturumlar düşer. */
async function passwordVersion(passwordHash: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(passwordHash));
  return Array.from(new Uint8Array(digest).slice(0, 6), (b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Bilinmeyen kullanıcı adı için de gerçek maliyetli bir doğrulama koşturulur (zamanlama sızıntısı
 * olmasın). Hash bir kez üretilir; gerçek hesaplarla aynı iterasyon sayısına sahiptir.
 */
let dummyHashPromise: Promise<string> | null = null;
function dummyHash(): Promise<string> {
  if (!dummyHashPromise) dummyHashPromise = hashPassword(crypto.randomUUID());
  return dummyHashPromise;
}

function pdfResponse(file: StoredFile): Response {
  const ascii = file.filename.replace(/[^\x20-\x7e]/g, '_').replace(/"/g, '');
  const headers = new Headers({
    'content-type': 'application/pdf',
    'cache-control': 'private, no-store',
    'x-content-type-options': 'nosniff',
    'content-disposition': `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(file.filename)}`,
  });
  const bytes = base64ToBytes(file.base64);
  return new Response(bytes.buffer as ArrayBuffer, { status: 200, headers });
}

function publicAccount(a: SupplierAccount): Omit<SupplierAccount, 'passwordHash'> {
  const { passwordHash: _omit, ...rest } = a;
  return rest;
}

async function overLoginRateLimit(kv: KvLike, request: Request): Promise<boolean> {
  try {
    const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
    const key = `sup:rl:${ip}`;
    const n = parseInt((await kv.get(key)) || '0', 10) || 0;
    if (n >= RATE_LIMIT_MAX) return true;
    await kv.put(key, String(n + 1), { expirationTtl: RATE_LIMIT_TTL_SECONDS });
  } catch {
    /* sayaç hatası girişi engellemesin */
  }
  return false;
}

// ── Oturumlar ─────────────────────────────────────────────────

async function supplierSession(request: Request, env: Env, store: SupplierStore): Promise<SupplierAccount | null> {
  const secret = env.JWT_SECRET;
  if (typeof secret !== 'string' || !secret) return null;
  const token = parseCookie(request.headers.get('cookie'), SUPPLIER_COOKIE);
  if (!token) return null;
  const payload = await verifyJwt(token, secret);
  if (!isSupplierPayload(payload)) return null;
  const account = await store.getAccount(payload.sid);
  if (!account || !account.isActive) return null;
  // Şifre değiştiyse (pv uyuşmuyorsa) eski token geçersiz.
  if (payload.pv !== (await passwordVersion(account.passwordHash))) return null;
  return account;
}

async function isAdmin(request: Request, env: Env): Promise<boolean> {
  const secret = env.JWT_SECRET;
  if (typeof secret !== 'string' || !secret) return false;
  const token = parseCookie(request.headers.get('cookie'), ADMIN_COOKIE);
  if (!token) return false;
  return isAdminPayload(await verifyJwt(token, secret));
}

// ── Tedarikçi uçları ──────────────────────────────────────────

async function handleLogin(request: Request, env: Env, kv: KvLike, store: SupplierStore): Promise<Response> {
  const secret = env.JWT_SECRET;
  if (typeof secret !== 'string' || !secret) return json({ error: 'Sunucu yapılandırılmamış (JWT_SECRET).' }, 500);
  if (await overLoginRateLimit(kv, request)) return json({ error: 'Çok fazla deneme. 15 dakika sonra tekrar deneyin.' }, 429);

  const body = await readJson(request, MAX_JSON_BYTES);
  const username = normalizeUsername(body?.username);
  const password = typeof body?.password === 'string' ? body.password : '';
  const account = username ? await store.findByUsername(username) : null;
  // Hesap yoksa da şifre doğrulaması çalıştırılır: zamanlama farkıyla kullanıcı adı sızmasın.
  const ok = await verifyPassword(password, account?.passwordHash ?? (await dummyHash()));
  if (!account || !ok) return json({ error: 'Kullanıcı adı veya şifre hatalı.' }, 401);
  if (!account.isActive) return json({ error: 'Hesabınız pasif durumda. Lütfen Aselovers ile iletişime geçin.' }, 403);

  const pv = await passwordVersion(account.passwordHash);
  const token = await signJwt({ role: 'supplier', sid: account.id, name: account.name, pv }, secret, SUPPLIER_TTL_SECONDS);
  await store.touchLogin(account.id);
  return json({ ok: true, name: account.name }, 200, { 'set-cookie': cookieHeader(token, SUPPLIER_TTL_SECONDS) });
}

function handleLogout(): Response {
  return json({ ok: true }, 200, { 'set-cookie': cookieHeader('', 0) });
}

/**
 * Tedarikçiye: kendi kayıtlarının özeti + hangi ürünlerin (kim olduğu söylenmeden) başka biri
 * tarafından doldurulduğu. Diğer tedarikçilerin adı veya içeriği asla dönmez.
 */
async function handleSpecsSummary(account: SupplierAccount, store: SupplierStore): Promise<Response> {
  const [specs, refs] = await Promise.all([store.listSpecs({ supplierId: account.id }), store.listSpecRefs()]);
  const mine = specs.map((s) => ({
    productId: s.productId,
    isComplete: s.isComplete,
    hasFile: s.hasFile,
    approval: s.approval,
    yarnCount: s.yarns.length,
    updatedAt: s.updatedAt,
  }));
  const filledByOthers = [...new Set(refs.filter((r) => r.supplierId !== account.id).map((r) => r.productId))];
  return json({ mine, filledByOthers }, 200);
}

async function handleSpecPut(productId: string, request: Request, account: SupplierAccount, store: SupplierStore): Promise<Response> {
  if (!ACTIVE_IDS.has(productId)) return json({ error: 'Ürün katalogda bulunamadı.' }, 404);
  const body = await readJson(request, MAX_JSON_BYTES);
  if (!body) return json({ error: 'Geçersiz veya çok büyük istek.' }, 400);
  const prev = await store.getSpec(productId, account.id);
  const spec = normalizeSpec(body, { productId, supplierId: account.id }, prev ?? undefined);
  await store.putSpec(spec);
  return json(spec, 200);
}

async function handleFilePost(productId: string, request: Request, account: SupplierAccount, store: SupplierStore): Promise<Response> {
  if (!ACTIVE_IDS.has(productId)) return json({ error: 'Ürün katalogda bulunamadı.' }, 404);
  const body = await readJson(request, MAX_FILE_BODY_BYTES);
  if (!body) return json({ error: 'Dosya çok büyük veya istek bozuk (sınır 10 MB).' }, 400);
  const pdf = validatePdf(body.filename, body.base64);
  if (!pdf.ok) return json({ error: pdf.error }, 400);
  const file: StoredFile = { filename: pdf.filename, size: pdf.size, type: 'application/pdf', base64: pdf.base64 };
  try {
    await store.putFile(productId, account.id, file);
  } catch (err) {
    console.error('supplier file put error', err);
    return json({ error: 'Dosya kaydedilemedi. Lütfen tekrar deneyin.' }, 502);
  }
  return json({ ok: true, fileName: file.filename, size: file.size }, 200);
}

async function supplierRouter(method: string, action: string, request: Request, env: Env, kv: KvLike, store: SupplierStore): Promise<Response> {
  if (method === 'POST' && action === 'login') return handleLogin(request, env, kv, store);
  if (method === 'POST' && action === 'logout') return handleLogout();

  const account = await supplierSession(request, env, store);
  if (!account) return json({ error: 'unauthorized' }, 401);

  if (method === 'GET' && action === 'me') return json({ ok: true, name: account.name, username: account.username }, 200);
  if (method === 'GET' && action === 'specs') return handleSpecsSummary(account, store);

  // Astro `params.action`'ı zaten decode eder; ikinci bir decode yapılmaz.
  if (action.startsWith('spec/')) {
    const productId = clip(action.slice('spec/'.length), 32);
    if (method === 'GET') return json(await store.getSpec(productId, account.id), 200);
    if (method === 'PUT') return handleSpecPut(productId, request, account, store);
  }
  if (action.startsWith('file/')) {
    const productId = clip(action.slice('file/'.length), 32);
    if (method === 'POST') return handleFilePost(productId, request, account, store);
    if (method === 'GET') {
      const file = await store.getFile(productId, account.id);
      return file ? pdfResponse(file) : json({ error: 'Dosya yok.' }, 404);
    }
    if (method === 'DELETE') {
      await store.deleteFile(productId, account.id);
      return json({ ok: true }, 200);
    }
  }
  return json({ error: 'not-found' }, 404);
}

// ── Admin uçları ──────────────────────────────────────────────

async function handleAccountCreate(request: Request, store: SupplierStore): Promise<Response> {
  const body = await readJson(request, MAX_JSON_BYTES);
  const v = validateNewAccount(body);
  if (!v.ok) return json({ error: v.error }, 400);
  try {
    const account = await store.createAccount({ name: v.name, username: v.username, passwordHash: await hashPassword(v.password) });
    return json(publicAccount(account), 201);
  } catch (err) {
    if (err instanceof Error && err.message === 'username-taken') return json({ error: 'Bu kullanıcı adı zaten kullanılıyor.' }, 409);
    throw err;
  }
}

async function handleAccountUpdate(id: string, request: Request, store: SupplierStore): Promise<Response> {
  const body = await readJson(request, MAX_JSON_BYTES);
  if (!body) return json({ error: 'Geçersiz istek.' }, 400);
  const patch: { name?: string; isActive?: boolean; passwordHash?: string } = {};
  if (typeof body.name === 'string') {
    const name = clip(body.name, LIMITS.NAME_MAX);
    if (name.length < LIMITS.NAME_MIN) return json({ error: 'Ad en az 2 karakter olmalı.' }, 400);
    patch.name = name;
  }
  if (typeof body.isActive === 'boolean') patch.isActive = body.isActive;
  if (typeof body.newPassword === 'string') {
    if (body.newPassword.length < LIMITS.PASSWORD_MIN) return json({ error: 'Şifre en az 8 karakter olmalı.' }, 400);
    patch.passwordHash = await hashPassword(body.newPassword);
  }
  const updated = await store.updateAccount(id, patch);
  return updated ? json(publicAccount(updated), 200) : json({ error: 'Hesap bulunamadı.' }, 404);
}

async function handleAdminSpecs(store: SupplierStore): Promise<Response> {
  const [specs, accounts] = await Promise.all([store.listSpecs(), store.listAccounts()]);
  const names = new Map(accounts.map((a) => [a.id, a.name]));
  const rows = specs.map((s) => ({
    ...s,
    supplierName: names.get(s.supplierId) ?? '(silinmiş hesap)',
    productTitle: TITLES.get(s.productId) ?? s.productId,
    productActive: ACTIVE_IDS.has(s.productId),
  }));
  rows.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  return json({ rows, activeProducts: ACTIVE_IDS.size, supplierCount: accounts.length }, 200);
}

async function handleExportCsv(store: SupplierStore): Promise<Response> {
  const [specs, accounts] = await Promise.all([store.listSpecs(), store.listAccounts()]);
  const names = new Map(accounts.map((a) => [a.id, a.name]));
  const csv = specsToCsv(
    specs.map((spec) => ({
      spec,
      supplierName: names.get(spec.supplierId) ?? '(silinmiş hesap)',
      productTitle: TITLES.get(spec.productId) ?? spec.productId,
    }))
  );
  const date = new Date().toISOString().slice(0, 10);
  return new Response(csv, {
    status: 200,
    headers: {
      'content-type': 'text/csv; charset=utf-8',
      'cache-control': 'no-store',
      'content-disposition': `attachment; filename="aselovers-uretim-bilgileri-${date}.csv"`,
    },
  });
}

function splitPair(rest: string): { productId: string; supplierId: string; tail?: string } | null {
  const parts = rest.split('/').map((p) => clip(p, 32));
  if (parts.length < 2 || parts.length > 3 || !parts[0] || !parts[1]) return null;
  return { productId: parts[0], supplierId: parts[1], ...(parts[2] ? { tail: parts[2] } : {}) };
}

async function handleApproval(pair: { productId: string; supplierId: string }, request: Request, store: SupplierStore): Promise<Response> {
  const body = await readJson(request, MAX_JSON_BYTES);
  if (!body || typeof body.approved !== 'boolean') return json({ error: 'approved (true/false) zorunlu.' }, 400);
  const spec = await store.setApproval(pair.productId, pair.supplierId, body.approved);
  return spec ? json(spec, 200) : json({ error: 'Kayıt bulunamadı.' }, 404);
}

async function adminRouter(method: string, action: string, request: Request, env: Env, store: SupplierStore): Promise<Response> {
  if (!(await isAdmin(request, env))) return json({ error: 'invalid' }, 401);

  if (action === 'accounts') {
    if (method === 'GET') {
      const list = await store.listAccounts();
      const last = await store.getLastLogins(list.map((a) => a.id));
      return json(list.map((a) => ({ ...publicAccount(a), lastLoginAt: last[a.id] })), 200);
    }
    if (method === 'POST') return handleAccountCreate(request, store);
  }
  if (action.startsWith('accounts/')) {
    const id = clip(action.slice('accounts/'.length), 32);
    if (method === 'PUT') return handleAccountUpdate(id, request, store);
    if (method === 'DELETE') {
      const removed = await store.deleteAccount(id);
      return removed ? json({ ok: true }, 200) : json({ error: 'Hesap bulunamadı.' }, 404);
    }
  }
  if (method === 'GET' && action === 'specs') return handleAdminSpecs(store);
  if (method === 'GET' && action === 'export.csv') return handleExportCsv(store);

  if (action.startsWith('spec/')) {
    const pair = splitPair(action.slice('spec/'.length));
    if (!pair) return json({ error: 'not-found' }, 404);
    // POST admin/spec/:pid/:sid/approval { approved: boolean }
    if (pair.tail === 'approval' && method === 'POST') return handleApproval(pair, request, store);
    if (pair.tail) return json({ error: 'not-found' }, 404);
    if (method === 'GET') return json(await store.getSpec(pair.productId, pair.supplierId), 200);
    if (method === 'DELETE') {
      await store.deleteSpec(pair.productId, pair.supplierId);
      return json({ ok: true }, 200);
    }
  }
  if (method === 'GET' && action.startsWith('file/')) {
    const pair = splitPair(action.slice('file/'.length));
    if (!pair) return json({ error: 'not-found' }, 404);
    const file = await store.getFile(pair.productId, pair.supplierId);
    return file ? pdfResponse(file) : json({ error: 'Dosya yok.' }, 404);
  }
  return json({ error: 'not-found' }, 404);
}

// ── Giriş noktası ─────────────────────────────────────────────

async function router(method: string, context: APIContext): Promise<Response> {
  const { request, params, locals } = context;
  const env = getEnv(locals);
  const action = (params.action ?? '').replace(/^\/+|\/+$/g, '');
  const kv = getKv(env);
  if (!kv) return json({ error: 'kv-missing', message: 'Cloudflare ADMIN_KV tanımlı değil; tedarikçi portalı çalışamaz.' }, 500);
  const store = createStore(kv);

  try {
    if (action.startsWith('admin/')) return await adminRouter(method, action.slice('admin/'.length), request, env, store);
    return await supplierRouter(method, action, request, env, kv, store);
  } catch (err) {
    console.error('supplier api error', err);
    return json({ error: 'server' }, 500);
  }
}

export const GET: APIRoute = (context) => router('GET', context);
export const POST: APIRoute = (context) => router('POST', context);
export const PUT: APIRoute = (context) => router('PUT', context);
export const DELETE: APIRoute = (context) => router('DELETE', context);
