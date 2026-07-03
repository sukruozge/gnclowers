import { describe, it, expect } from 'vitest';
import { verifyPassword, hashPassword, signJwt, verifyJwt } from './auth';

describe('auth helper', () => {
  it('should verify pbkdf2 hash successfully', async () => {
    // PBKDF2 hash of "Aselovers2024!"
    const stored = 'pbkdf2$100000$REvVZ-RNyIh-s4yBvN7RIQ$_7aP6n7NjYqtcfdDGAhxW7aPsi4hJVFI3vgPHmAm-Nk';
    expect(await verifyPassword('Aselovers2024!', stored)).toBe(true);
    expect(await verifyPassword('wrong-password', stored)).toBe(false);
  });

  it('should verify bcrypt hash successfully', async () => {
    // Bcrypt hash of "Aselovers2024!"
    const validBcrypt = '$2a$12$PthCwGIf.cJdYhYZGUjZh.kCYYliTfgPj0Uh0sH2Had5alpJaeoOK';
    expect(await verifyPassword('Aselovers2024!', validBcrypt)).toBe(true);
    expect(await verifyPassword('wrong-password', validBcrypt)).toBe(false);
  });

  it('should sign and verify JWT correctly', async () => {
    const secret = 'test-secret-key-12345';
    const payload = { sub: 'admin', role: 'owner' };
    const token = await signJwt(payload, secret, 60);
    expect(token).toBeTypeOf('string');

    const verified = await verifyJwt(token, secret);
    expect(verified).not.toBeNull();
    expect(verified?.sub).toBe('admin');
    expect(verified?.role).toBe('owner');

    const badSecretVerified = await verifyJwt(token, 'wrong-secret');
    expect(badSecretVerified).toBeNull();
  });
});
