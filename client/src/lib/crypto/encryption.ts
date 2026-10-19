import { EncryptedBackupPayload, FinancialDataPayload, EncryptedBackupPayloadSchema } from '@spendwise/shared';

// Helper to convert ArrayBuffer to Base64
function bufferToBase64(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

// Helper to convert Base64 to ArrayBuffer
function base64ToBuffer(base64: string): Uint8Array {
  const binary = window.atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Derives an AES-GCM 256-bit key from a passphrase and salt using PBKDF2 (100,000 iterations).
 */
async function deriveKey(passphrase: string, salt: Uint8Array): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const passwordKey = await window.crypto.subtle.importKey(
    'raw',
    encoder.encode(passphrase),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  return window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt as unknown as BufferSource,
      iterations: 100000,
      hash: 'SHA-256'
    },
    passwordKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypts a financial data payload into an EncryptedBackupPayload.
 */
export async function encryptFinancialPayload(
  payload: FinancialDataPayload,
  passphrase: string
): Promise<EncryptedBackupPayload> {
  if (!passphrase || passphrase.length < 6) {
    throw new Error('Encryption passphrase must be at least 6 characters long.');
  }

  // Generate 16 bytes random salt and 12 bytes random nonce
  const salt = window.crypto.getRandomValues(new Uint8Array(16));
  const nonce = window.crypto.getRandomValues(new Uint8Array(12));

  const key = await deriveKey(passphrase, salt);
  const encodedData = new TextEncoder().encode(JSON.stringify(payload));

  const ciphertextBuffer = await window.crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: nonce as unknown as BufferSource
    },
    key,
    encodedData
  );

  return {
    schemaVersion: payload.schemaVersion,
    revision: payload.revision,
    encrypted: true,
    algorithm: 'AES-GCM-256',
    kdf: 'PBKDF2',
    salt: bufferToBase64(salt),
    nonce: bufferToBase64(nonce),
    ciphertext: bufferToBase64(ciphertextBuffer),
    exportedAt: new Date().toISOString()
  };
}

/**
 * Decrypts an EncryptedBackupPayload back into FinancialDataPayload.
 */
export async function decryptFinancialPayload(
  encryptedPayload: EncryptedBackupPayload,
  passphrase: string
): Promise<FinancialDataPayload> {
  // Validate schema
  EncryptedBackupPayloadSchema.parse(encryptedPayload);

  const salt = base64ToBuffer(encryptedPayload.salt);
  const nonce = base64ToBuffer(encryptedPayload.nonce);
  const ciphertext = base64ToBuffer(encryptedPayload.ciphertext);

  const key = await deriveKey(passphrase, salt);

  try {
    const decryptedBuffer = await window.crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: nonce as unknown as BufferSource
      },
      key,
      ciphertext as unknown as BufferSource
    );

    const decryptedJson = new TextDecoder().decode(decryptedBuffer);
    return JSON.parse(decryptedJson) as FinancialDataPayload;
  } catch (err) {
    throw new Error('Decryption failed. The passphrase entered is incorrect or the backup file is corrupted.');
  }
}
