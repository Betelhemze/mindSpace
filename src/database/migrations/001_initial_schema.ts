import type { SQLiteDatabase } from 'expo-sqlite';
import { SCHEMA_V1_SQL, FTS5_SETUP_SQL } from '../schema';

export const migration001 = {
  version: 1,
  name: '001_initial_schema',
  up: async (db: SQLiteDatabase): Promise<void> => {
    // 1. Create base tables and indexes
    await db.execAsync(SCHEMA_V1_SQL);

    // 2. Attempt to create FTS5 virtual table and triggers
    try {
      await db.execAsync(FTS5_SETUP_SQL);
    } catch (ftsError) {
      console.warn(
        '[Mindspace DB] FTS5 setup skipped or not supported on this engine. Search will fallback to indexed LIKE queries.',
        ftsError
      );
    }
  },
  down: async (db: SQLiteDatabase): Promise<void> => {
    await db.execAsync(`
      DROP TABLE IF EXISTS thoughts_fts;
      DROP TABLE IF EXISTS thoughts;
      DROP TABLE IF EXISTS drafts;
      DROP TABLE IF EXISTS app_settings;
    `);
  },
};

