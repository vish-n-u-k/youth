// ============================================
// PASSWORD UTILITIES
// ============================================

import { randomBytes, scrypt, timingSafeEqual } from 'crypto';
import { promisify } from 'util';

const scryptAsync = promisify(scrypt);

const SALT_LENGTH = 32;
const KEY_LENGTH = 64;

/**
 * Hash a password using scrypt
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_LENGTH).toString('hex');
  const derivedKey = (await scryptAsync(password, salt, KEY_LENGTH)) as Buffer;
  return `${salt}:${derivedKey.toString('hex')}`;
}

/**
 * Verify a password against a hash
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const [salt, key] = hash.split(':');
  if (!salt || !key) {return false;}

  const derivedKey = (await scryptAsync(password, salt, KEY_LENGTH)) as Buffer;
  const keyBuffer = Buffer.from(key, 'hex');

  return timingSafeEqual(derivedKey, keyBuffer);
}
