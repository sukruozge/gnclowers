/**
 * Tedarikçi portalı giriş doğrulama / normalizasyon. Saf fonksiyonlar, KV veya HTTP bilmez.
 * Tüm dış veri `unknown` kabul edilir ve burada daraltılır.
 */
import { LIMITS, type ProductSpec, type YarnLine } from './types';

export function clip(v: unknown, max: number): string {
  return String(v ?? '').replace(/\p{Cc}/gu, '').trim().slice(0, max);
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

const YARN_FIELDS: (keyof YarnLine)[] = ['brand', 'name', 'colorCode', 'colorName', 'usage', 'amount'];

function normalizeYarns(raw: unknown): YarnLine[] {
  if (!Array.isArray(raw)) return [];
  const out: YarnLine[] = [];
  for (const row of raw) {
    if (typeof row !== 'object' || row === null) continue;
    const r = row as Record<string, unknown>;
    const line = Object.fromEntries(YARN_FIELDS.map((f) => [f, clip(r[f], LIMITS.FIELD_MAX)])) as unknown as YarnLine;
    if (YARN_FIELDS.every((f) => line[f] === '')) continue;
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
    notes: clip(b.notes, LIMITS.NOTES_MAX),
    isComplete: b.isComplete === true,
    // Dosya bayrakları yalnız dosya uçlarından değişir; istemcinin gönderdiği değer yok sayılır.
    hasFile: prev?.hasFile ?? false,
    ...(prev?.fileName ? { fileName: prev.fileName } : {}),
    createdAt: prev?.createdAt ?? now,
    updatedAt: now,
  };
}

export type PdfResult =
  | { ok: true; filename: string; bytes: Uint8Array }
  | { ok: false; error: string };

function decodeBase64(input: string): Uint8Array | null {
  try {
    const bin = atob(input);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return bytes;
  } catch {
    return null;
  }
}

const PDF_MAGIC = '%PDF-';

export function validatePdf(filename: unknown, base64: unknown): PdfResult {
  const name = clip(filename, LIMITS.FILENAME_MAX);
  if (!/\.pdf$/i.test(name)) return { ok: false, error: 'Yalnızca .pdf dosyası yüklenebilir.' };
  if (typeof base64 !== 'string' || base64 === '') return { ok: false, error: 'Dosya içeriği boş.' };
  const comma = base64.indexOf(',');
  const payload = comma !== -1 ? base64.slice(comma + 1) : base64;
  // 4 base64 karakteri = 3 byte; decode etmeden önce kaba boyut kontrolü (bellek koruması).
  if ((payload.length * 3) / 4 > LIMITS.PDF_MAX_BYTES + 3) {
    return { ok: false, error: 'Dosya 6 MB sınırını aşıyor.' };
  }
  const bytes = decodeBase64(payload);
  if (!bytes) return { ok: false, error: 'Dosya okunamadı (geçersiz base64).' };
  if (bytes.length > LIMITS.PDF_MAX_BYTES) return { ok: false, error: 'Dosya 6 MB sınırını aşıyor.' };
  const head = String.fromCharCode(...bytes.slice(0, PDF_MAGIC.length));
  if (head !== PDF_MAGIC) return { ok: false, error: 'Dosya geçerli bir PDF değil.' };
  return { ok: true, filename: name, bytes };
}
