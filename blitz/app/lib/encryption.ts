import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto';

const ALGORITHM = 'aes-256-cbc';
const SALT_LENGTH = 16;
const IV_LENGTH = 16;
const KEY_LENGTH = 32;

/**
 * Derives a 32-byte key from the encryption key using scrypt
 */
function deriveKey(encryptionKey: string, salt: Buffer): Buffer {
  return scryptSync(encryptionKey, salt, KEY_LENGTH);
}

/**
 * Encrypts an API key using AES-256-CBC
 * Format: salt:iv:encrypted
 */
export function encryptAPIKey(apiKey: string): string {
  const encryptionKey = process.env.API_ENCRYPTION_KEY;
  if (!encryptionKey) {
    throw new Error('API_ENCRYPTION_KEY environment variable is not set');
  }

  // Generate random salt and IV
  const salt = randomBytes(SALT_LENGTH);
  const iv = randomBytes(IV_LENGTH);

  // Derive key from encryption key and salt
  const key = deriveKey(encryptionKey, salt);

  // Encrypt
  const cipher = createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(apiKey, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  // Return format: salt:iv:encrypted (all in hex)
  return `${salt.toString('hex')}:${iv.toString('hex')}:${encrypted}`;
}

/**
 * Decrypts an API key using AES-256-CBC
 * Expected format: salt:iv:encrypted
 */
export function decryptAPIKey(encryptedData: string): string {
  const encryptionKey = process.env.API_ENCRYPTION_KEY;
  if (!encryptionKey) {
    throw new Error('API_ENCRYPTION_KEY environment variable is not set');
  }

  // Parse the encrypted data
  const parts = encryptedData.split(':');
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted data format. Expected salt:iv:encrypted');
  }

  const [saltHex, ivHex, encryptedHex] = parts;

  // Convert hex strings to buffers
  const salt = Buffer.from(saltHex, 'hex');
  const iv = Buffer.from(ivHex, 'hex');

  // Derive key from encryption key and salt
  const key = deriveKey(encryptionKey, salt);

  // Decrypt
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

