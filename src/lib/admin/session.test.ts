import { describe, it, expect } from 'vitest';
import { isAdminPayload, isSupplierPayload } from './session';
import { signJwt, verifyJwt } from './auth';

describe('session role separation', () => {
  it('only the admin payload counts as admin', () => {
    expect(isAdminPayload({ sub: 'admin', exp: 1 })).toBe(true);
    expect(isAdminPayload({ role: 'supplier', sid: 'sup_1', name: 'A', exp: 1 })).toBe(false);
    expect(isAdminPayload({ sub: 'supplier' })).toBe(false);
    expect(isAdminPayload(null)).toBe(false);
  });

  it('recognises a supplier payload and nothing else', () => {
    expect(isSupplierPayload({ role: 'supplier', sid: 'sup_1', name: 'Ayşe' })).toBe(true);
    expect(isSupplierPayload({ role: 'supplier', name: 'Ayşe' })).toBe(false);
    expect(isSupplierPayload({ sub: 'admin' })).toBe(false);
    expect(isSupplierPayload(null)).toBe(false);
  });

  it('a signed supplier token is never an admin session even with the same secret', async () => {
    const secret = 'test-secret';
    const token = await signJwt({ role: 'supplier', sid: 'sup_1', name: 'Ayşe' }, secret, 60);
    const payload = await verifyJwt(token, secret);
    expect(payload).not.toBeNull();
    expect(isAdminPayload(payload)).toBe(false);
    expect(isSupplierPayload(payload)).toBe(true);
  });
});
