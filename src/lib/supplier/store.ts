/**
 * Tedarikçi portalı KV deposu. Anahtarlar:
 *   sup:accounts                      → SupplierAccount[]   (lastLoginAt hariç)
 *   sup:last:{supplierId}             → ISO tarih (son giriş; ayrı anahtar — hesap listesini
 *                                        girişte yeniden yazmak eski-okuma yarışıyla admin
 *                                        değişikliklerini silebilirdi)
 *   sup:spec:{productId}:{supplierId} → ProductSpec
 *   sup:file:{productId}:{supplierId} → StoredFile
 * Bağımsız test için KvLike alır (Cloudflare KVNamespace bu arayüzü karşılar).
 */
import type { KvLike, ProductSpec, SpecRef, StoredFile, SupplierAccount } from './types';

const ACCOUNTS_KEY = 'sup:accounts';
const LAST_PREFIX = 'sup:last:';
const SPEC_PREFIX = 'sup:spec:';
const FILE_PREFIX = 'sup:file:';

const specKey = (productId: string, supplierId: string): string => `${SPEC_PREFIX}${productId}:${supplierId}`;
const fileKey = (productId: string, supplierId: string): string => `${FILE_PREFIX}${productId}:${supplierId}`;

function newId(): string {
  const bytes = globalThis.crypto.getRandomValues(new Uint8Array(4));
  return 'sup_' + Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

function parseJson<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function emptySpec(productId: string, supplierId: string, now: string): ProductSpec {
  return {
    productId, supplierId, yarns: [], hookSize: '', fill: '', eyes: '', finishedSize: '',
    productionHours: '', patternUrl: '', notes: '', isComplete: false, hasFile: false,
    approval: 'pending', createdAt: now, updatedAt: now,
  };
}

/** Tedarikçi tarafındaki her değişiklik onayı düşürür. */
function withPendingApproval(spec: ProductSpec): ProductSpec {
  const { approvedAt: _dropped, ...rest } = spec;
  return { ...rest, approval: 'pending' };
}

/** Eski kayıtlar (onay alanı yokken yazılmış) 'pending' sayılır. */
function withDefaults(spec: ProductSpec): ProductSpec {
  return spec.approval === 'approved' ? spec : { ...spec, approval: 'pending' };
}

function parseSpecKey(key: string): SpecRef | null {
  const rest = key.slice(SPEC_PREFIX.length);
  const idx = rest.lastIndexOf(':');
  if (idx <= 0) return null;
  return { productId: rest.slice(0, idx), supplierId: rest.slice(idx + 1) };
}

export interface CreateAccountInput {
  name: string;
  username: string;
  passwordHash: string;
}

export type AccountPatch = Partial<Pick<SupplierAccount, 'name' | 'isActive' | 'passwordHash'>>;

export interface SupplierStore {
  listAccounts(): Promise<SupplierAccount[]>;
  createAccount(input: CreateAccountInput): Promise<SupplierAccount>;
  updateAccount(id: string, patch: AccountPatch): Promise<SupplierAccount | null>;
  deleteAccount(id: string): Promise<boolean>;
  findByUsername(username: string): Promise<SupplierAccount | null>;
  getAccount(id: string): Promise<SupplierAccount | null>;
  /** Son girişi ayrı anahtara yazar; hesap listesine dokunmaz. */
  touchLogin(id: string): Promise<void>;
  getLastLogins(ids: string[]): Promise<Record<string, string>>;
  getSpec(productId: string, supplierId: string): Promise<ProductSpec | null>;
  putSpec(spec: ProductSpec): Promise<void>;
  deleteSpec(productId: string, supplierId: string): Promise<void>;
  listSpecs(filter?: { supplierId?: string }): Promise<ProductSpec[]>;
  /** Yalnız anahtar adlarından (get yapmadan) ürün/tedarikçi çiftleri. */
  listSpecRefs(): Promise<SpecRef[]>;
  /** Admin onayı verir/kaldırır; kayıt yoksa null. */
  setApproval(productId: string, supplierId: string, approved: boolean): Promise<ProductSpec | null>;
  getFile(productId: string, supplierId: string): Promise<StoredFile | null>;
  putFile(productId: string, supplierId: string, file: StoredFile): Promise<void>;
  deleteFile(productId: string, supplierId: string): Promise<void>;
}

export function createStore(kv: KvLike): SupplierStore {
  async function readAccounts(): Promise<SupplierAccount[]> {
    const list = parseJson<SupplierAccount[]>(await kv.get(ACCOUNTS_KEY));
    return Array.isArray(list) ? list : [];
  }

  async function writeAccounts(list: SupplierAccount[]): Promise<void> {
    await kv.put(ACCOUNTS_KEY, JSON.stringify(list));
  }

  async function listSpecKeys(): Promise<string[]> {
    const keys: string[] = [];
    let cursor: string | undefined;
    do {
      const page = await kv.list({ prefix: SPEC_PREFIX, cursor });
      keys.push(...page.keys.map((k) => k.name));
      cursor = page.list_complete ? undefined : page.cursor;
    } while (cursor);
    return keys;
  }

  return {
    listAccounts: readAccounts,

    async createAccount(input) {
      const list = await readAccounts();
      if (list.some((a) => a.username === input.username)) throw new Error('username-taken');
      const account: SupplierAccount = {
        id: newId(),
        name: input.name,
        username: input.username,
        passwordHash: input.passwordHash,
        isActive: true,
        createdAt: new Date().toISOString(),
      };
      await writeAccounts([...list, account]);
      return account;
    },

    async updateAccount(id, patch) {
      const list = await readAccounts();
      const idx = list.findIndex((a) => a.id === id);
      if (idx === -1) return null;
      const updated: SupplierAccount = { ...list[idx], ...patch };
      await writeAccounts(list.map((a, i) => (i === idx ? updated : a)));
      return updated;
    },

    async deleteAccount(id) {
      const list = await readAccounts();
      const next = list.filter((a) => a.id !== id);
      if (next.length === list.length) return false;
      await writeAccounts(next);
      await kv.delete(`${LAST_PREFIX}${id}`);
      return true;
    },

    async findByUsername(username) {
      return (await readAccounts()).find((a) => a.username === username) ?? null;
    },

    async getAccount(id) {
      return (await readAccounts()).find((a) => a.id === id) ?? null;
    },

    async touchLogin(id) {
      await kv.put(`${LAST_PREFIX}${id}`, new Date().toISOString());
    },

    async getLastLogins(ids) {
      const values = await Promise.all(ids.map((id) => kv.get(`${LAST_PREFIX}${id}`)));
      const out: Record<string, string> = {};
      ids.forEach((id, i) => { if (values[i]) out[id] = values[i] as string; });
      return out;
    },

    async getSpec(productId, supplierId) {
      const spec = parseJson<ProductSpec>(await kv.get(specKey(productId, supplierId)));
      return spec ? withDefaults(spec) : null;
    },

    async listSpecRefs() {
      return (await listSpecKeys()).map(parseSpecKey).filter((r): r is SpecRef => r !== null);
    },

    async setApproval(productId, supplierId, approved) {
      const prev = parseJson<ProductSpec>(await kv.get(specKey(productId, supplierId)));
      if (!prev) return null;
      const next: ProductSpec = approved
        ? { ...prev, approval: 'approved', approvedAt: new Date().toISOString() }
        : withPendingApproval(prev);
      await kv.put(specKey(productId, supplierId), JSON.stringify(next));
      return next;
    },

    async putSpec(spec) {
      await kv.put(specKey(spec.productId, spec.supplierId), JSON.stringify(spec));
    },

    async deleteSpec(productId, supplierId) {
      await kv.delete(fileKey(productId, supplierId));
      await kv.delete(specKey(productId, supplierId));
    },

    async listSpecs(filter) {
      const keys = await listSpecKeys();
      const wanted = filter?.supplierId ? keys.filter((k) => k.endsWith(`:${filter.supplierId}`)) : keys;
      const specs = await Promise.all(wanted.map(async (k) => parseJson<ProductSpec>(await kv.get(k))));
      return specs.filter((s): s is ProductSpec => s !== null && typeof s.productId === 'string').map(withDefaults);
    },

    async getFile(productId, supplierId) {
      return parseJson<StoredFile>(await kv.get(fileKey(productId, supplierId)));
    },

    async putFile(productId, supplierId, file) {
      await kv.put(fileKey(productId, supplierId), JSON.stringify(file));
      const now = new Date().toISOString();
      const prev = parseJson<ProductSpec>(await kv.get(specKey(productId, supplierId)));
      const base = prev ?? emptySpec(productId, supplierId, now);
      const next = withPendingApproval({ ...base, hasFile: true, fileName: file.filename, updatedAt: now });
      await kv.put(specKey(productId, supplierId), JSON.stringify(next));
    },

    async deleteFile(productId, supplierId) {
      await kv.delete(fileKey(productId, supplierId));
      const prev = parseJson<ProductSpec>(await kv.get(specKey(productId, supplierId)));
      if (!prev) return;
      const { fileName: _dropped, ...rest } = prev;
      const next = withPendingApproval({ ...rest, hasFile: false, updatedAt: new Date().toISOString() });
      await kv.put(specKey(productId, supplierId), JSON.stringify(next));
    },
  };
}
