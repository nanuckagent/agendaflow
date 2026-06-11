/**
 * Encryption and hashing utilities for PII data
 * Uses AES-256-GCM for encryption and SHA-256 for hashing
 */

import { createCipheriv, createDecipheriv, randomBytes, createHash } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;
const SALT_LENGTH = 64;

/**
 * Derives a key from workspace key using PBKDF2-like approach
 */
function deriveKey(workspaceKey: string): Buffer {
  const hash = createHash('sha256');
  hash.update(workspaceKey);
  return hash.digest();
}

/**
 * Encrypts plaintext using AES-256-GCM
 */
export function encryptPII(plaintext: string, workspaceKey: string): string {
  const key = deriveKey(workspaceKey);
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag();

  // Format: iv:authTag:encrypted
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

/**
 * Decrypts ciphertext using AES-256-GCM
 */
export function decryptPII(ciphertext: string, workspaceKey: string): string {
  const key = deriveKey(workspaceKey);
  const [ivHex, authTagHex, encrypted] = ciphertext.split(':');

  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

/**
 * Hash phone number using SHA-256
 */
export function hashPhone(phone: string): string {
  const hash = createHash('sha256');
  hash.update(phone.replace(/\D/g, '')); // Remove non-digits
  return hash.digest('hex');
}

/**
 * Hash email using SHA-256
 */
export function hashEmail(email: string): string {
  const hash = createHash('sha256');
  hash.update(email.toLowerCase());
  return hash.digest('hex');
}

/**
 * Generate random token
 */
export function generateToken(length: number = 32): string {
  return randomBytes(length).toString('hex');
}

/**
 * Generate reference code for appointments
 */
export function generateReferenceCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}
