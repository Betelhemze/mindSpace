import type { SQLiteDatabase } from 'expo-sqlite';

export const migration002 = {
  version: 2,
  name: '002_add_category',
  up: async (db: SQLiteDatabase): Promise<void> => {
    // Add nullable category column — existing rows get NULL (uncategorised)
    await db.execAsync(`
      ALTER TABLE thoughts ADD COLUMN category TEXT NULL;
    `);

    // Add an index so filtering by category stays fast
    await db.execAsync(`
      CREATE INDEX IF NOT EXISTS idx_thoughts_category ON thoughts(category);
    `);
  },
  down: async (db: SQLiteDatabase): Promise<void> => {
    // SQLite does not support DROP COLUMN before 3.35.0 — in older builds
    // the rollback simply recreates the table without the column.
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS thoughts_v1 (
        id TEXT PRIMARY KEY NOT NULL,
        content TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        deleted_at TEXT NULL
      );
      INSERT INTO thoughts_v1 SELECT id, content, created_at, updated_at, deleted_at FROM thoughts;
      DROP TABLE thoughts;
      ALTER TABLE thoughts_v1 RENAME TO thoughts;
      CREATE INDEX IF NOT EXISTS idx_thoughts_created_at ON thoughts(created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_thoughts_deleted_at ON thoughts(deleted_at);
    `);
  },
};

