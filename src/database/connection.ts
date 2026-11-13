import { Platform } from 'react-native';
import { openDatabaseAsync, SQLiteDatabase } from 'expo-sqlite';
import { DB_NAME } from './constants';
import {
  getOrCreateDatabaseEncryptionKey,
  applyDatabaseEncryption,
  EncryptionStatus,
} from './encryption';
import { runMigrations } from './migrations';

let dbInstance: SQLiteDatabase | null = null;
let encryptionStatus: EncryptionStatus | null = null;
let initPromise: Promise<SQLiteDatabase> | null = null;

export async function getDatabase(): Promise<SQLiteDatabase> {
  if (dbInstance) {
    return dbInstance;
  }

  // Prevent multiple concurrent initialization calls
  if (initPromise) {
    return initPromise;
  }

  initPromise = (async () => {
    try {
      const db = await openDatabaseAsync(DB_NAME);

      // 1. Retrieve or generate the encryption key from hardware-backed SecureStore
      let key: string | null = null;
      try {
        key = await getOrCreateDatabaseEncryptionKey();
      } catch (err) {
        console.error('[Mindspace DB] Encryption key error:', err);
        throw err;
      }

      // 2. Apply encryption PRAGMA and verify SQLCipher
      encryptionStatus = await applyDatabaseEncryption(db, key);

      // 3. Set performance and crash-safety pragmas
      // wa-sqlite (web) has limited PRAGMA support — skip WAL on web
      if (Platform.OS !== 'web') {
        await db.execAsync(`
          PRAGMA journal_mode = WAL;
          PRAGMA foreign_keys = ON;
          PRAGMA busy_timeout = 5000;
        `);
      } else {
        await db.execAsync(`PRAGMA foreign_keys = ON;`);
      }

      // 4. Run integrity check (native only — wa-sqlite doesn't support it reliably)
      if (Platform.OS !== 'web') {
        const integrityCheck = await db.getFirstAsync<{ integrity_check: string }>(
          'PRAGMA integrity_check;'
        );
        if (integrityCheck?.integrity_check !== 'ok') {
          throw new Error(
            `Database integrity check failed: ${integrityCheck?.integrity_check ?? 'Corrupted file'}. Operation aborted to protect data.`
          );
        }
      }

      // 5. Execute schema migrations
      await runMigrations(db);

      dbInstance = db;
      return dbInstance;
    } catch (error) {
      console.error('[Mindspace DB] Initialization failed:', error);
      // Clean up instance so future attempts can retry cleanly
      dbInstance = null;
      throw error;
    } finally {
      initPromise = null;
    }
  })();

  return initPromise;
}

export function getCachedEncryptionStatus(): EncryptionStatus | null {
  return encryptionStatus;
}

export async function closeDatabase(): Promise<void> {
  if (dbInstance) {
    try {
      await dbInstance.closeAsync();
    } catch (err) {
      console.warn('[Mindspace DB] Error closing database:', err);
    } finally {
      dbInstance = null;
      encryptionStatus = null;
      initPromise = null;
    }
  }
}

