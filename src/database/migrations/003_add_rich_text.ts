import type { SQLiteDatabase } from 'expo-sqlite';

export const migration003 = {
  version: 3,
  name: '003_add_rich_text',
  up: async (db: SQLiteDatabase): Promise<void> => {
    // Add nullable rich_content column to thoughts for structured rich-text AST/JSON
    await db.execAsync(`
      ALTER TABLE thoughts ADD COLUMN rich_content TEXT NULL;
    `);

    // Add nullable rich_content column to drafts so in-progress rich drafts persist safely
    await db.execAsync(`
      ALTER TABLE drafts ADD COLUMN rich_content TEXT NULL;
    `);
  },
  down: async (db: SQLiteDatabase): Promise<void> => {
    // SQLite rollback without rich_content
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS thoughts_v2 (
        id TEXT PRIMARY KEY NOT NULL,
        content TEXT NOT NULL,
        category TEXT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        deleted_at TEXT NULL
      );
      INSERT INTO thoughts_v2 SELECT id, content, category, created_at, updated_at, deleted_at FROM thoughts;
      DROP TABLE thoughts;
      ALTER TABLE thoughts_v2 RENAME TO thoughts;
      CREATE INDEX IF NOT EXISTS idx_thoughts_created_at ON thoughts(created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_thoughts_deleted_at ON thoughts(deleted_at);
      CREATE INDEX IF NOT EXISTS idx_thoughts_category ON thoughts(category);
    `);
  },
};

