import { Platform } from 'react-native';
import { openDatabaseAsync, SQLiteDatabase } from 'expo-sqlite';
import { DB_NAME } from './constants';
import {
  getOrCreateDatabaseEncryptionKey,
  applyDatabaseEncryption,
  EncryptionStatus,
} from './encryption';
import { runMigrations } from './migrations';

const globalScope = globalThis as unknown as {
  __mindspace_db_instance__?: SQLiteDatabase | null;
  __mindspace_encryption_status__?: EncryptionStatus | null;
  __mindspace_init_promise__?: Promise<SQLiteDatabase> | null;
};

async function openDatabaseWithRetry(name: string, maxRetries = 3): Promise<SQLiteDatabase> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await openDatabaseAsync(name);
    } catch (err: any) {
      const isLockError =
        err?.message?.includes('createSyncAccessHandle') ||
        err?.message?.includes('Access Handle') ||
        err?.message?.includes('lock');

      if (attempt < maxRetries && isLockError && Platform.OS === 'web') {
        console.warn(`[Mindspace DB] Database locked by previous handle, retrying in ${(attempt + 1) * 300}ms...`);
        await new Promise((res) => setTimeout(res, (attempt + 1) * 300));
        continue;
      }
      throw err;
    }
  }
  return openDatabaseAsync(name);
}

export async function getDatabase(): Promise<SQLiteDatabase> {
  if (globalScope.__mindspace_db_instance__) {
    return globalScope.__mindspace_db_instance__;
  }

  // Prevent multiple concurrent initialization calls across fast refresh
  if (globalScope.__mindspace_init_promise__) {
    return globalScope.__mindspace_init_promise__;
  }

  globalScope.__mindspace_init_promise__ = (async () => {
    try {
      const db = await openDatabaseWithRetry(DB_NAME);

      // 1. Retrieve or generate the encryption key from hardware-backed SecureStore
      let key: string | null = null;
      try {
        key = await getOrCreateDatabaseEncryptionKey();
      } catch (err) {
        console.error('[Mindspace DB] Encryption key error:', err);
        throw err;
      }

      // 2. Apply encryption PRAGMA and verify SQLCipher
      globalScope.__mindspace_encryption_status__ = await applyDatabaseEncryption(db, key);

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

      globalScope.__mindspace_db_instance__ = db;
      return db;
    } catch (error) {
      console.error('[Mindspace DB] Initialization failed:', error);
      // Clean up instance so future attempts can retry cleanly
      globalScope.__mindspace_db_instance__ = null;
      throw error;
    } finally {
      globalScope.__mindspace_init_promise__ = null;
    }
  })();

  return globalScope.__mindspace_init_promise__;
}

export function getCachedEncryptionStatus(): EncryptionStatus | null {
  return globalScope.__mindspace_encryption_status__ ?? null;
}

export async function closeDatabase(): Promise<void> {
  if (globalScope.__mindspace_db_instance__) {
    try {
      await globalScope.__mindspace_db_instance__.closeAsync();
    } catch (err) {
      console.warn('[Mindspace DB] Error closing database:', err);
    } finally {
      globalScope.__mindspace_db_instance__ = null;
      globalScope.__mindspace_encryption_status__ = null;
      globalScope.__mindspace_init_promise__ = null;
    }
  }
}

