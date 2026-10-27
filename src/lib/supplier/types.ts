/**
 * Tedarikçi üretim bilgi portalı — paylaşılan tipler.
 * KV anahtarları: sup:accounts · sup:spec:{productId}:{supplierId} · sup:file:{productId}:{supplierId}
 */

export interface SupplierAccount {
  id: string;            // 'sup_' + 8 hex
  name: string;
  username: string;      // küçük harf, [a-z0-9._-]{3,32}, benzersiz
  passwordHash: string;  // pbkdf2$... (@lib/admin/auth)
  isActive: boolean;
  createdAt: string;     // ISO 8601
  lastLoginAt?: string;  // ISO 8601
}

export interface YarnLine {
  brand: string;
  name: string;
  colorCode: string;
  colorName: string;
  usage: string;
  amount: string;
}

export interface ProductSpec {
  productId: string;
  supplierId: string;
  yarns: YarnLine[];
  hookSize: string;
  fill: string;
  eyes: string;
  finishedSize: string;
  productionHours: string;
  patternUrl: string;
  notes: string;
  isComplete: boolean;
  hasFile: boolean;
  fileName?: string;
  createdAt: string;
  updatedAt: string;
}

export interface StoredFile {
  filename: string;
  size: number;
  type: 'application/pdf';
  base64: string;
}

/** Cloudflare KVNamespace'in kullandığımız alt kümesi (testte Map ile taklit edilir). */
export interface KvLike {
  get(key: string): Promise<string | null>;
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
  delete(key: string): Promise<void>;
  list(options: { prefix: string; cursor?: string }): Promise<{
    keys: { name: string }[];
    list_complete: boolean;
    cursor?: string;
  }>;
}

export const LIMITS = {
  NAME_MIN: 2,
  NAME_MAX: 80,
  USERNAME_RE: /^[a-z0-9._-]{3,32}$/,
  PASSWORD_MIN: 8,
  YARNS_MAX: 30,
  FIELD_MAX: 120,
  NOTES_MAX: 4000,
  URL_MAX: 500,
  FILENAME_MAX: 120,
  PDF_MAX_BYTES: 6 * 1024 * 1024,
} as const;
