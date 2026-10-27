import { describe, it, expect, beforeEach } from 'vitest';
import { createStore, type SupplierStore } from './store';
import { normalizeSpec } from './validate';
import type { KvLike, StoredFile } from './types';

/** Map tabanlı sahte KV; list() tek sayfada döner. */
function fakeKv(): KvLike & { raw: Map<string, string> } {
  const raw = new Map<string, string>();
  return {
    raw,
    async get(k) { return raw.get(k) ?? null; },
    async put(k, v) { raw.set(k, v); },
    async delete(k) { raw.delete(k); },
    async list({ prefix }) {
      return { keys: [...raw.keys()].filter((k) => k.startsWith(prefix)).map((name) => ({ name })), list_complete: true };
    },
  };
}

const FILE: StoredFile = { filename: 'tarif.pdf', size: 8, type: 'application/pdf', base64: 'JVBERi0xLjQ=' };

describe('supplier store — accounts', () => {
  let kv: ReturnType<typeof fakeKv>;
  let store: SupplierStore;
  beforeEach(() => { kv = fakeKv(); store = createStore(kv); });

  it('creates, lists and finds accounts', async () => {
    const a = await store.createAccount({ name: 'Ayşe', username: 'ayse', passwordHash: 'pbkdf2$x' });
    expect(a.id).toMatch(/^sup_[0-9a-f]{8}$/);
    expect(a.isActive).toBe(true);
    expect(Date.parse(a.createdAt)).not.toBeNaN();
    expect(await store.listAccounts()).toHaveLength(1);
    expect((await store.findByUsername('ayse'))?.id).toBe(a.id);
    expect((await store.getAccount(a.id))?.username).toBe('ayse');
    expect(await store.findByUsername('yok')).toBeNull();
  });

  it('rejects a duplicate username', async () => {
    await store.createAccount({ name: 'Ayşe', username: 'ayse', passwordHash: 'h' });
    await expect(store.createAccount({ name: 'Başka', username: 'ayse', passwordHash: 'h' })).rejects.toThrow('username-taken');
  });

  it('records last login in a separate key without rewriting the account list', async () => {
    const a = await store.createAccount({ name: 'Ayşe', username: 'ayse', passwordHash: 'h' });
    const before = kv.raw.get('sup:accounts');
    await store.touchLogin(a.id);
    expect(kv.raw.get('sup:accounts')).toBe(before);
    const last = await store.getLastLogins([a.id, 'sup_yok']);
    expect(Date.parse(last[a.id])).not.toBeNaN();
    expect(last['sup_yok']).toBeUndefined();
    await store.deleteAccount(a.id);
    expect(kv.raw.has(`sup:last:${a.id}`)).toBe(false);
  });

  it('updates and deletes', async () => {
    const a = await store.createAccount({ name: 'Ayşe', username: 'ayse', passwordHash: 'h' });
    const u = await store.updateAccount(a.id, { isActive: false, name: 'Ayşe H.' });
    expect(u?.isActive).toBe(false);
    expect(u?.name).toBe('Ayşe H.');
    expect((await store.getAccount(a.id))?.isActive).toBe(false);
    expect(await store.updateAccount('sup_yok', { name: 'x' })).toBeNull();
    expect(await store.deleteAccount(a.id)).toBe(true);
    expect(await store.deleteAccount(a.id)).toBe(false);
    expect(await store.listAccounts()).toHaveLength(0);
  });
});

describe('supplier store — specs and files', () => {
  let kv: ReturnType<typeof fakeKv>;
  let store: SupplierStore;
  const P1 = '4549014419';
  const P2 = '4523296373';
  const S1 = 'sup_aaaaaaaa';
  const S2 = 'sup_bbbbbbbb';
  beforeEach(() => { kv = fakeKv(); store = createStore(kv); });

  it('puts, gets and lists specs with an optional supplier filter', async () => {
    await store.putSpec(normalizeSpec({ hookSize: '2 mm' }, { productId: P1, supplierId: S1 }));
    await store.putSpec(normalizeSpec({ hookSize: '3 mm' }, { productId: P2, supplierId: S1 }));
    await store.putSpec(normalizeSpec({ hookSize: '4 mm' }, { productId: P1, supplierId: S2 }));
    expect((await store.getSpec(P1, S1))?.hookSize).toBe('2 mm');
    expect(await store.getSpec(P2, S2)).toBeNull();
    expect(await store.listSpecs()).toHaveLength(3);
    expect(await store.listSpecs({ supplierId: S1 })).toHaveLength(2);
  });

  it('putFile marks the spec and creates a skeleton when the spec is missing', async () => {
    await store.putFile(P1, S1, FILE);
    const spec = await store.getSpec(P1, S1);
    expect(spec?.hasFile).toBe(true);
    expect(spec?.fileName).toBe('tarif.pdf');
    expect((await store.getFile(P1, S1))?.base64).toBe(FILE.base64);
  });

  it('deleteFile clears the flag; deleteSpec removes the file too', async () => {
    await store.putSpec(normalizeSpec({}, { productId: P1, supplierId: S1 }));
    await store.putFile(P1, S1, FILE);
    await store.deleteFile(P1, S1);
    expect((await store.getSpec(P1, S1))?.hasFile).toBe(false);
    expect((await store.getSpec(P1, S1))?.fileName).toBeUndefined();
    expect(await store.getFile(P1, S1)).toBeNull();

    await store.putFile(P1, S1, FILE);
    await store.deleteSpec(P1, S1);
    expect(await store.getSpec(P1, S1)).toBeNull();
    expect(await store.getFile(P1, S1)).toBeNull();
    expect([...kv.raw.keys()].filter((k) => k.startsWith('sup:'))).toHaveLength(0);
  });

  it('approval: admin approves, any supplier change drops it back to pending', async () => {
    await store.putSpec(normalizeSpec({}, { productId: P1, supplierId: S1 }));
    expect((await store.getSpec(P1, S1))?.approval).toBe('pending');
    const approved = await store.setApproval(P1, S1, true);
    expect(approved?.approval).toBe('approved');
    expect(Date.parse(approved!.approvedAt!)).not.toBeNaN();
    await store.putFile(P1, S1, FILE);
    expect((await store.getSpec(P1, S1))?.approval).toBe('pending');
    expect((await store.getSpec(P1, S1))?.approvedAt).toBeUndefined();
    await store.setApproval(P1, S1, true);
    await store.deleteFile(P1, S1);
    expect((await store.getSpec(P1, S1))?.approval).toBe('pending');
    expect(await store.setApproval(P2, S2, true)).toBeNull();
  });

  it('legacy specs without an approval field read as pending', async () => {
    const legacy = normalizeSpec({}, { productId: P1, supplierId: S1 }) as Partial<ReturnType<typeof normalizeSpec>>;
    delete legacy.approval;
    kv.raw.set(`sup:spec:${P1}:${S1}`, JSON.stringify(legacy));
    expect((await store.getSpec(P1, S1))?.approval).toBe('pending');
    expect((await store.listSpecs())[0].approval).toBe('pending');
  });

  it('listSpecRefs returns product/supplier pairs from key names only', async () => {
    await store.putSpec(normalizeSpec({}, { productId: P1, supplierId: S1 }));
    await store.putSpec(normalizeSpec({}, { productId: P1, supplierId: S2 }));
    const refs = await store.listSpecRefs();
    expect(refs).toHaveLength(2);
    expect(refs).toContainEqual({ productId: P1, supplierId: S2 });
  });

  it('a stale KV list entry whose value vanished is skipped', async () => {
    await store.putSpec(normalizeSpec({}, { productId: P1, supplierId: S1 }));
    kv.raw.set(`sup:spec:${P2}:${S1}`, 'not json');
    const all = await store.listSpecs();
    expect(all).toHaveLength(1);
  });
});
