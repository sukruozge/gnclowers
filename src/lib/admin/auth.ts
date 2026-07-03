/**
 * WebCrypto-only auth primitives (PBKDF2 password hashing + HS256 JWT).
 *
 * Uses only `globalThis.crypto.subtle` so this module works unmodified in
 * both Cloudflare Workers and Node 20 (Vitest) — no `node:crypto` import.
 */

// @ts-ignore
import bcrypt from 'bcryptjs';

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const base64 = btoa(binary);
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlToBytes(input: string): Uint8Array {
  const base64 = input.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function encodeJsonBase64Url(obj: unknown): string {
  return bytesToBase64Url(textEncoder.encode(JSON.stringify(obj)));
}

function decodeJsonBase64Url(input: string): unknown {
  return JSON.parse(textDecoder.decode(base64UrlToBytes(input)));
}

/**
 * Constant-time byte comparison. Both inputs are hashed to fixed 32-byte
 * digests first, so there is a single code path with identical cost
 * regardless of input lengths (the digest binds both content and length).
 */
async function constantTimeEqual(a: Uint8Array, b: Uint8Array): Promise<boolean> {
  const [da, db] = await Promise.all([
    crypto.subtle.digest('SHA-256', a as BufferSource),
    crypto.subtle.digest('SHA-256', b as BufferSource),
  ]);
  const x = new Uint8Array(da);
  const y = new Uint8Array(db);
  let diff = 0;
  for (let i = 0; i < 32; i++) {
    diff |= x[i] ^ y[i];
  }
  return diff === 0;
}

async function pbkdf2DeriveBits(
  password: string,
  salt: Uint8Array,
  iterations: number,
  bitLength = 256
): Promise<Uint8Array> {
  const keyMaterial = await globalThis.crypto.subtle.importKey(
    'raw',
    textEncoder.encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  );
  const derived = await globalThis.crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: salt as BufferSource,
      iterations,
      hash: 'SHA-256',
    },
    keyMaterial,
    bitLength
  );
  return new Uint8Array(derived);
}

/**
 * Hashes a password using PBKDF2-SHA256 with a random 16-byte salt.
 * Format: `pbkdf2$<iterations>$<saltB64url>$<hashB64url>`
 */
export async function hashPassword(pw: string, iterations = 100000): Promise<string> {
  const salt = globalThis.crypto.getRandomValues(new Uint8Array(16));
  const derived = await pbkdf2DeriveBits(pw, salt, iterations, 256);
  return `pbkdf2$${iterations}$${bytesToBase64Url(salt)}$${bytesToBase64Url(derived)}`;
}

/**
 * Verifies a password against a stored `pbkdf2$<iter>$<salt>$<hash>` or `bcrypt` string.
 * Never throws — malformed input simply returns false.
 */
export async function verifyPassword(pw: string, stored: string): Promise<boolean> {
  try {
    if (typeof stored !== 'string' || stored.length === 0) return false;

    // Bcrypt fallback check
    if (stored.startsWith('$2a$') || stored.startsWith('$2b$') || stored.startsWith('$2y$')) {
      return new Promise<boolean>((resolve) => {
        bcrypt.compare(pw, stored, (err: any, res: boolean) => {
          if (err) resolve(false);
          else resolve(!!res);
        });
      });
    }

    const parts = stored.split('$');
    if (parts.length !== 4) return false;
    const [scheme, iterationsRaw, saltB64, hashB64] = parts;
    if (scheme !== 'pbkdf2') return false;
    if (!saltB64 || !hashB64) return false;

    const iterations = Number(iterationsRaw);
    if (!Number.isInteger(iterations) || iterations <= 0) return false;

    const salt = base64UrlToBytes(saltB64);
    const expected = base64UrlToBytes(hashB64);
    const actual = await pbkdf2DeriveBits(pw, salt, iterations, expected.length * 8 || 256);

    return await constantTimeEqual(actual, expected);
  } catch (e) {
    console.error('VERIFY ERROR:', e);
    return false;
  }
}

async function hmacSha256(secret: string, data: string): Promise<Uint8Array> {
  const key = await globalThis.crypto.subtle.importKey(
    'raw',
    textEncoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await globalThis.crypto.subtle.sign('HMAC', key, textEncoder.encode(data));
  return new Uint8Array(signature);
}

/**
 * Signs a payload as an HS256 JWT. Adds `exp` = now + expSeconds (seconds since epoch).
 */
export async function signJwt(
  payload: object,
  secret: string,
  expSeconds: number
): Promise<string> {
  const header = { alg: 'HS256', typ: 'JWT' };
  const fullPayload = {
    ...payload,
    exp: Math.floor(Date.now() / 1000) + expSeconds,
  };

  const headerSegment = encodeJsonBase64Url(header);
  const payloadSegment = encodeJsonBase64Url(fullPayload);
  const signingInput = `${headerSegment}.${payloadSegment}`;
  const signature = await hmacSha256(secret, signingInput);
  const signatureSegment = bytesToBase64Url(signature);

  return `${signingInput}.${signatureSegment}`;
}

/**
 * Verifies an HS256 JWT. Returns the payload object if valid and not expired,
 * otherwise null. Never throws.
 */
export async function verifyJwt(
  token: string,
  secret: string
): Promise<Record<string, unknown> | null> {
  try {
    if (typeof token !== 'string' || token.length === 0) return null;
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const [headerSegment, payloadSegment, signatureSegment] = parts;
    if (!headerSegment || !payloadSegment || !signatureSegment) return null;

    const signingInput = `${headerSegment}.${payloadSegment}`;
    const expectedSignature = await hmacSha256(secret, signingInput);
    const actualSignature = base64UrlToBytes(signatureSegment);

    if (!(await constantTimeEqual(actualSignature, expectedSignature))) return null;

    const payload = decodeJsonBase64Url(payloadSegment);
    if (typeof payload !== 'object' || payload === null) return null;

    const record = payload as Record<string, unknown>;
    const exp = record.exp;
    if (typeof exp !== 'number' || !Number.isFinite(exp)) return null;
    const now = Math.floor(Date.now() / 1000);
    if (exp < now) return null;

    return record;
  } catch {
    return null;
  }
}
