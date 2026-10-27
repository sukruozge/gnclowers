/**
 * Tedarikçi portalı giriş doğrulama / normalizasyon. Saf fonksiyonlar, KV veya HTTP bilmez.
 * Tüm dış veri `unknown` kabul edilir ve burada daraltılır.
 */
import { LIMITS, type ProductSpec, type YarnLine } from './types';

/** Tek satırlık alan: tüm kontrol karakterleri (satır sonu dahil) silinir, trim + kes. */
export function clip(v: unknown, max: number): string {
  return String(v ?? '').replace(/\p{Cc}/gu, '').trim().slice(0, max);
}

/** Çok satırlı alan (notlar): satır sonları korunur, diğer kontrol karakterleri silinir. */
export function clipMultiline(v: unknown, max: number): string {
  return String(v ?? '')
    .replace(/\r\n?/g, '\n')
    .replace(/(?!\n)\p{Cc}/gu, '')
    .trim()
    .slice(0, max);
}

export function normalizeUsername(v: unknown): string | null {
  if (typeof v !== 'string') return null;
  const u = v.trim().toLowerCase();
  return LIMITS.USERNAME_RE.test(u) ? u : null;
}

export type NewAccountResult =
  | { ok: true; name: string; username: string; password: string }
  | { ok: false; error: string };

export function validateNewAccount(body: unknown): NewAccountResult {
  if (typeof body !== 'object' || body === null) return { ok: false, error: 'Geçersiz istek.' };
  const b = body as Record<string, unknown>;
  const name = clip(b.name, LIMITS.NAME_MAX);
  if (name.length < LIMITS.NAME_MIN) return { ok: false, error: 'Ad en az 2 karakter olmalı.' };
  const username = normalizeUsername(b.username);
  if (!username) return { ok: false, error: 'Kullanıcı adı 3-32 karakter; yalnız küçük harf, rakam, nokta, alt çizgi ve tire.' };
  const password = typeof b.password === 'string' ? b.password : '';
  if (password.length < LIMITS.PASSWORD_MIN) return { ok: false, error: 'Şifre en az 8 karakter olmalı.' };
  return { ok: true, name, username, password };
}

const YARN_FIELDS: (keyof YarnLine)[] = ['variant', 'brand', 'name', 'colorCode', 'colorName', 'usage', 'amount'];
/** Satırın "dolu" sayılması için varyasyon seçimi yetmez; iplik bilgisi olmalı. */
const YARN_CONTENT_FIELDS: (keyof YarnLine)[] = ['brand', 'name', 'colorCode', 'colorName', 'usage', 'amount'];

function normalizeYarns(raw: unknown): YarnLine[] {
  if (!Array.isArray(raw)) return [];
  const out: YarnLine[] = [];
  for (const row of raw) {
    if (typeof row !== 'object' || row === null) continue;
    const r = row as Record<string, unknown>;
    const line = Object.fromEntries(YARN_FIELDS.map((f) => [f, clip(r[f], LIMITS.FIELD_MAX)])) as unknown as YarnLine;
    if (YARN_CONTENT_FIELDS.every((f) => line[f] === '')) continue;
    out.push(line);
    if (out.length >= LIMITS.YARNS_MAX) break;
  }
  return out;
}

function normalizeUrl(v: unknown): string {
  const s = clip(v, LIMITS.URL_MAX);
  return /^https?:\/\//i.test(s) ? s : '';
}

export function normalizeSpec(
  body: unknown,
  ids: { productId: string; supplierId: string },
  prev?: ProductSpec
): ProductSpec {
  const b = (typeof body === 'object' && body !== null ? body : {}) as Record<string, unknown>;
  const now = new Date().toISOString();
  return {
    productId: ids.productId,
    supplierId: ids.supplierId,
    yarns: normalizeYarns(b.yarns),
    hookSize: clip(b.hookSize, LIMITS.FIELD_MAX),
    fill: clip(b.fill, LIMITS.FIELD_MAX),
    eyes: clip(b.eyes, LIMITS.FIELD_MAX),
    finishedSize: clip(b.finishedSize, LIMITS.FIELD_MAX),
    productionHours: clip(b.productionHours, LIMITS.FIELD_MAX),
    patternUrl: normalizeUrl(b.patternUrl),
    notes: clipMultiline(b.notes, LIMITS.NOTES_MAX),
    isComplete: b.isComplete === true,
    // Dosya bayrakları yalnız dosya uçlarından değişir; istemcinin gönderdiği değer yok sayılır.
    hasFile: prev?.hasFile ?? false,
    ...(prev?.fileName ? { fileName: prev.fileName } : {}),
    // Tedarikçi kaydı her değiştirdiğinde admin onayı sıfırlanır.
    approval: 'pending',
    createdAt: prev?.createdAt ?? now,
    updatedAt: now,
  };
}

export type PdfResult =
  | { ok: true; filename: string; base64: string; size: number }
  | { ok: false; error: string };

const BASE64_RE = /^[A-Za-z0-9+/]*={0,2}$/;
const PDF_MAGIC = '%PDF-';

/** Base64 uzunluğundan byte sayısı (padding düşülür). */
function base64Size(b64: string): number {
  const padding = b64.endsWith('==') ? 2 : b64.endsWith('=') ? 1 : 0;
  return (b64.length * 3) / 4 - padding;
}

/**
 * PDF doğrulaması: uzantı, base64 biçimi, boyut ve `%PDF-` imzası.
 * Dosyanın tamamı decode edilmez (Workers CPU bütçesi); yalnız ilk 8 base64 karakteri (6 byte)
 * açılır. Geçerli payload olduğu gibi saklanır, böylece yeniden encode gerekmez.
 */
export function validatePdf(filename: unknown, base64: unknown): PdfResult {
  const name = clip(filename, LIMITS.FILENAME_MAX);
  if (!/\.pdf$/i.test(name)) return { ok: false, error: 'Yalnızca .pdf dosyası yüklenebilir.' };
  if (typeof base64 !== 'string' || base64 === '') return { ok: false, error: 'Dosya içeriği boş.' };
  const comma = base64.indexOf(',');
  const payload = (comma !== -1 ? base64.slice(comma + 1) : base64).replace(/\s+/g, '');
  if (payload.length < 8 || payload.length % 4 !== 0 || !BASE64_RE.test(payload)) {
    return { ok: false, error: 'Dosya okunamadı (geçersiz base64).' };
  }
  const size = base64Size(payload);
  if (size > LIMITS.PDF_MAX_BYTES) return { ok: false, error: 'Dosya 10 MB sınırını aşıyor.' };
  let head: string;
  try {
    head = atob(payload.slice(0, 8));
  } catch {
    return { ok: false, error: 'Dosya okunamadı (geçersiz base64).' };
  }
  if (!head.startsWith(PDF_MAGIC)) return { ok: false, error: 'Dosya geçerli bir PDF değil.' };
  return { ok: true, filename: name, base64: payload, size };
}
