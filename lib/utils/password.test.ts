import { describe, it, expect } from 'vitest';
import { hashPassword, verifyPassword } from './password';

describe('hashPassword / verifyPassword', () => {
  const plain = 'mi-contraseña-123';

  it('hashes a password successfully', () => {
    const hash = hashPassword(plain);
    expect(hash).toBeTruthy();
    expect(hash).not.toBe(plain);
  });

  it('verifies correct password against hash', () => {
    const hash = hashPassword(plain);
    expect(verifyPassword(plain, hash)).toBe(true);
  });

  it('rejects wrong password', () => {
    const hash = hashPassword(plain);
    expect(verifyPassword('wrong-password', hash)).toBe(false);
  });

  it('produces different hashes for the same input (salt)', () => {
    const hash1 = hashPassword(plain);
    const hash2 = hashPassword(plain);
    expect(hash1).not.toBe(hash2);
  });
});
