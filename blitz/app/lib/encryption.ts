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
    throw new Error('API_ENCRYPTION_KEY environment variable is not set. Please set it in your .env.local file.');
  }

  // Validate encrypted data is not empty
  if (!encryptedData || encryptedData.trim().length === 0) {
    throw new Error('Encrypted data is empty');
  }

  // Parse the encrypted data
  const parts = encryptedData.split(':');
  if (parts.length !== 3) {
    throw new Error(`Invalid encrypted data format. Expected salt:iv:encrypted, but got ${parts.length} parts. Data length: ${encryptedData.length}`);
  }

  const [saltHex, ivHex, encryptedHex] = parts;

  // Validate hex strings are not empty
  if (!saltHex || !ivHex || !encryptedHex) {
    throw new Error('Invalid encrypted data format. Salt, IV, or encrypted data is empty.');
  }

  try {
    // Convert hex strings to buffers
    const salt = Buffer.from(saltHex, 'hex');
    const iv = Buffer.from(ivHex, 'hex');

    // Validate buffer lengths
    if (salt.length !== SALT_LENGTH) {
      throw new Error(`Invalid salt length: expected ${SALT_LENGTH} bytes, got ${salt.length}`);
    }
    if (iv.length !== IV_LENGTH) {
      throw new Error(`Invalid IV length: expected ${IV_LENGTH} bytes, got ${iv.length}`);
    }

    // Derive key from encryption key and salt
    const key = deriveKey(encryptionKey, salt);

    // Decrypt
    const decipher = createDecipheriv(ALGORITHM, key, iv);
    let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    // Validate decrypted data is not empty
    if (!decrypted || decrypted.trim().length === 0) {
      throw new Error('Decrypted API key is empty');
    }

    return decrypted;
  } catch (error) {
    // Provide more detailed error message
    if (error instanceof Error) {
      if (error.message.includes('bad decrypt') || error.message.includes('wrong final block length')) {
        throw new Error(`Failed to decrypt API key: The encryption key (API_ENCRYPTION_KEY) may be incorrect or the data is corrupted. Original error: ${error.message}`);
      }
      throw new Error(`Failed to decrypt API key: ${error.message}`);
    }
    throw new Error(`Failed to decrypt API key: Unknown error`);
  }
}

