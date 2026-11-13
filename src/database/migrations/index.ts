import { Platform } from 'react-native';
import type { SQLiteDatabase } from 'expo-sqlite';
import { CREATE_MIGRATIONS_TABLE_SQL } from '../schema';
import { migration001 } from './001_initial_schema';
import { migration002 } from './002_add_category';

export interface Migration {
  version: number;
  name: string;
  up: (db: SQLiteDatabase) => Promise<void>;
  down?: (db: SQLiteDatabase) => Promise<void>;
}

export const MIGRATIONS: Migration[] = [migration001, migration002];

async function executeMigrationTransaction(
  db: SQLiteDatabase,
  action: () => Promise<void>
): Promise<void> {
  if (Platform.OS === 'web') {
    // wa-sqlite (web) does not support transaction wrappers — run statements directly
    await action();
  } else {
    await db.withExclusiveTransactionAsync(async () => {
      await action();
    });
  }
}

export async function runMigrations(db: SQLiteDatabase): Promise<void> {
  // Ensure the migration tracking table exists
  await db.execAsync(CREATE_MIGRATIONS_TABLE_SQL);

  // Retrieve already applied versions
  const appliedRows = await db.getAllAsync<{ version: number }>(
    'SELECT version FROM __mindspace_migrations ORDER BY version ASC;'
  );
  const appliedVersions = new Set(appliedRows.map((r) => r.version));

  // Sort migrations in ascending order
  const pendingMigrations = MIGRATIONS.filter((m) => !appliedVersions.has(m.version)).sort(
    (a, b) => a.version - b.version
  );

  if (pendingMigrations.length === 0) {
    return;
  }

  for (const migration of pendingMigrations) {
    try {
      await executeMigrationTransaction(db, async () => {
        await migration.up(db);
        const now = new Date().toISOString();
        await db.runAsync(
          'INSERT INTO __mindspace_migrations (version, name, applied_at) VALUES (?, ?, ?);',
          [migration.version, migration.name, now]
        );
        await db.execAsync(`PRAGMA user_version = ${migration.version};`);
      });
    } catch (error) {
      console.error(`[Mindspace DB] Migration ${migration.name} (v${migration.version}) failed:`, error);
      throw new Error(
        `Database migration error at version ${migration.version} (${migration.name}). Data remains untouched: ${(error as any)?.message ?? 'unknown'}`
      );
    }
  }
}
