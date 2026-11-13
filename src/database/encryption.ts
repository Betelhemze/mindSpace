import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { SECURE_STORE_DB_KEY } from './constants';
import type { SQLiteDatabase } from 'expo-sqlite';

export interface EncryptionStatus {
  isSQLCipherAvailable: boolean;
  cipherVersion: string | null;
  keyConfigured: boolean;
  error?: string;
}

/**
 * Converts a byte array to a lowercase hex string.
 */
function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Retrieves the database encryption key from Expo SecureStore.
 * If no key exists yet, generates a cryptographically secure 256-bit random key
 * and securely saves it in SecureStore.
 *
 * Security guarantees:
 * - Key is never written to plain-text files, AsyncStorage, or logs.
 * - Hardware-backed keychain / Keystore is used where supported.
 */
export async function getOrCreateDatabaseEncryptionKey(): Promise<string | null> {
  // SecureStore is supported on native iOS and Android.
  if (Platform.OS === 'web') {
    return null;
  }

  try {
    const isAvailable = await SecureStore.isAvailableAsync();
    if (!isAvailable) {
      console.warn('[Mindspace Security] SecureStore is not available on this environment.');
      return null;
    }

    let existingKey = await SecureStore.getItemAsync(SECURE_STORE_DB_KEY, {
      keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK,
    });

    if (existingKey) {
      return existingKey;
    }

    // Generate 32 bytes (256-bit) of cryptographically secure random data
    const randomBytes = await Crypto.getRandomBytesAsync(32);
    const newKey = bytesToHex(randomBytes);

    await SecureStore.setItemAsync(SECURE_STORE_DB_KEY, newKey, {
      keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK,
    });

    return newKey;
  } catch (error) {
    console.error('[Mindspace Security] Failed to read or create encryption key in SecureStore');
    throw new Error(
      'Unable to securely access or generate the database encryption key. Journal access is blocked to protect data integrity.'
    );
  }
}

/**
 * Applies the encryption key to an open SQLite connection using SQLCipher PRAGMA.
 * Also verifies whether SQLCipher is active and functional.
 */
export async function applyDatabaseEncryption(
  db: SQLiteDatabase,
  key: string | null
): Promise<EncryptionStatus> {
  let cipherVersion: string | null = null;
  let isSQLCipherAvailable = false;

  try {
    if (key) {
      // In SQLCipher, raw hex key is configured via: PRAGMA key = "x'<hex>'";
      await db.execAsync(`PRAGMA key = "x'${key}'";`);
    }

    // Check if SQLCipher is compiled into this build
    const result = await db.getFirstAsync<{ cipher_version?: string }>('PRAGMA cipher_version;');
    if (result && result.cipher_version) {
      cipherVersion = result.cipher_version;
      isSQLCipherAvailable = true;
    }

    // Verify key validity and file integrity by querying the master table
    await db.execAsync('SELECT count(*) FROM sqlite_master;');

    return {
      isSQLCipherAvailable,
      cipherVersion,
      keyConfigured: Boolean(key),
    };
  } catch (error: any) {
    // If the database is encrypted but the key is incorrect or corrupted,
    // SQLite/SQLCipher throws "file is not a database" or similar error.
    console.error('[Mindspace Security] Database key verification failed');
    throw new Error(
      `Database decryption failed. The encryption key may be invalid or the database file is inaccessible: ${error?.message ?? 'unknown'}`
    );
  }
}

