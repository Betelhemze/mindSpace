import { ThoughtRepository } from '../src/database/repositories/thoughtRepository';
import { DraftRepository, DEFAULT_DRAFT_ID } from '../src/database/repositories/draftRepository';
import { SettingsRepository } from '../src/database/repositories/settingsRepository';
import { SearchRepository } from '../src/database/repositories/searchRepository';
import type { SQLiteDatabase } from 'expo-sqlite';

// In-memory mock database implementing the subset of SQLiteDatabase needed by repositories
class MockSQLiteDatabase {
  public executedQueries: { sql: string; params: any[] }[] = [];
  public tables: {
    thoughts: any[];
    drafts: any[];
    app_settings: any[];
  } = {
    thoughts: [],
    drafts: [],
    app_settings: [],
  };

  async runAsync(rawSql: string, params: any[] = []): Promise<{ changes: number; lastInsertRowId: number }> {
    const sql = rawSql.replace(/\s+/g, ' ');
    this.executedQueries.push({ sql, params });

    if (sql.includes('INSERT INTO thoughts')) {
      const [id, content, rich_content, category, created_at, updated_at] = params;
      this.tables.thoughts.push({
        id,
        content,
        rich_content: rich_content ?? null,
        category: category ?? null,
        created_at,
        updated_at,
        deleted_at: null,
      });
      return { changes: 1, lastInsertRowId: 1 };
    }

    if (sql.includes('UPDATE thoughts') && sql.includes('SET content = ?')) {
      const [content, rich_content, category, updated_at, id] = params;
      const t = this.tables.thoughts.find((item) => item.id === id);
      if (t) {
        t.content = content;
        t.rich_content = rich_content ?? null;
        t.category = category ?? null;
        t.updated_at = updated_at;
        return { changes: 1, lastInsertRowId: 1 };
      }
      return { changes: 0, lastInsertRowId: 0 };
    }

    if (sql.includes('UPDATE thoughts') && sql.includes('SET deleted_at = ?')) {
      const [deleted_at, id] = params;
      const t = this.tables.thoughts.find((item) => item.id === id && item.deleted_at === null);
      if (t) {
        t.deleted_at = deleted_at;
        return { changes: 1, lastInsertRowId: 1 };
      }
      return { changes: 0, lastInsertRowId: 0 };
    }

    if (sql.includes('UPDATE thoughts') && sql.includes('SET deleted_at = NULL')) {
      const [updated_at, id] = params;
      const t = this.tables.thoughts.find((item) => item.id === id);
      if (t) {
        t.deleted_at = null;
        t.updated_at = updated_at;
        return { changes: 1, lastInsertRowId: 1 };
      }
      return { changes: 0, lastInsertRowId: 0 };
    }

    if (sql.includes('DELETE FROM thoughts WHERE id = ?')) {
      const [id] = params;
      const initial = this.tables.thoughts.length;
      this.tables.thoughts = this.tables.thoughts.filter((item) => item.id !== id);
      return { changes: initial - this.tables.thoughts.length, lastInsertRowId: 0 };
    }

    if (sql.includes('INSERT INTO drafts')) {
      const [id, content, rich_content, created_at, updated_at] = params;
      const idx = this.tables.drafts.findIndex((d) => d.id === id);
      if (idx >= 0) {
        this.tables.drafts[idx] = {
          id,
          content,
          rich_content: rich_content ?? null,
          created_at: this.tables.drafts[idx].created_at,
          updated_at,
        };
      } else {
        this.tables.drafts.push({
          id,
          content,
          rich_content: rich_content ?? null,
          created_at,
          updated_at,
        });
      }
      return { changes: 1, lastInsertRowId: 1 };
    }

    if (sql.includes('DELETE FROM drafts WHERE id = ?')) {
      const [id] = params;
      this.tables.drafts = this.tables.drafts.filter((d) => d.id !== id);
      return { changes: 1, lastInsertRowId: 0 };
    }

    if (sql.includes('INSERT INTO app_settings')) {
      const [key, value, updated_at] = params;
      const idx = this.tables.app_settings.findIndex((s) => s.key === key);
      if (idx >= 0) {
        this.tables.app_settings[idx] = { key, value, updated_at };
      } else {
        this.tables.app_settings.push({ key, value, updated_at });
      }
      return { changes: 1, lastInsertRowId: 1 };
    }

    return { changes: 1, lastInsertRowId: 1 };
  }

  async getAllAsync<T>(rawSql: string, params: any[] = []): Promise<T[]> {
    const sql = rawSql.replace(/\s+/g, ' ');
    this.executedQueries.push({ sql, params });

    if (sql.includes('FROM thoughts')) {
      if (sql.includes('deleted_at IS NULL') && sql.includes('content LIKE ?')) {
        const queryTerm = params[0].replace(/%/g, '').toLowerCase();
        return this.tables.thoughts.filter(
          (t) => t.deleted_at === null && t.content.toLowerCase().includes(queryTerm)
        ) as T[];
      }
      if (sql.includes('deleted_at IS NULL')) {
        return this.tables.thoughts.filter((t) => t.deleted_at === null) as T[];
      }
      return this.tables.thoughts as T[];
    }

    if (sql.includes('FROM app_settings')) {
      return this.tables.app_settings as T[];
    }

    return [];
  }

  async getFirstAsync<T>(rawSql: string, params: any[] = []): Promise<T | null> {
    const sql = rawSql.replace(/\s+/g, ' ');
    this.executedQueries.push({ sql, params });

    if (sql.includes('SELECT name FROM sqlite_master')) {
      // Simulate FTS5 not available to test LIKE fallback
      return null;
    }

    if (sql.includes('FROM thoughts WHERE id = ?')) {
      const [id] = params;
      return (this.tables.thoughts.find((t) => t.id === id) as T) || null;
    }

    if (sql.includes('SELECT COUNT(*) as count FROM thoughts WHERE deleted_at IS NULL')) {
      const count = this.tables.thoughts.filter((t) => t.deleted_at === null).length;
      return { count } as T;
    }

    if (sql.includes('SELECT id FROM thoughts WHERE content = ?')) {
      const [content] = params;
      return (this.tables.thoughts.find((t) => t.content === content && t.deleted_at === null) as T) || null;
    }

    if (sql.includes('FROM drafts')) {
      return (this.tables.drafts[0] as T) || null;
    }

    if (sql.includes('FROM app_settings WHERE key = ?')) {
      const [key] = params;
      return (this.tables.app_settings.find((s) => s.key === key) as T) || null;
    }

    return null;
  }

  async execAsync(sql: string): Promise<void> {
    this.executedQueries.push({ sql, params: [] });
  }

  async withExclusiveTransactionAsync(fn: any): Promise<void> {
    await fn(this);
  }

  async withTransactionAsync(fn: any): Promise<void> {
    await fn();
  }
}

describe('ThoughtRepository', () => {
  let db: MockSQLiteDatabase;
  let repo: ThoughtRepository;

  beforeEach(() => {
    db = new MockSQLiteDatabase();
    repo = new ThoughtRepository(db as unknown as SQLiteDatabase);
  });

  it('creates thought successfully with valid content', async () => {
    const thought = await repo.create({ content: 'Deep focus on journaling.' });
    expect(thought.id).toBeDefined();
    expect(thought.content).toBe('Deep focus on journaling.');
    expect(thought.created_at).toBeDefined();
    expect(thought.deleted_at).toBeNull();
    expect(db.tables.thoughts.length).toBe(1);
  });

  it('rejects creation when content is empty or whitespace', async () => {
    await expect(repo.create({ content: '   ' })).rejects.toThrow('Thought content cannot be empty.');
    expect(db.tables.thoughts.length).toBe(0);
  });

  it('updates thought content and sets updated_at', async () => {
    const created = await repo.create({ content: 'Initial version' });
    const updated = await repo.update({ id: created.id, content: 'Updated content' });

    expect(updated.content).toBe('Updated content');
    expect(db.tables.thoughts[0].content).toBe('Updated content');
  });

  it('soft deletes and restores thought', async () => {
    const created = await repo.create({ content: 'Temporary note' });
    const deleted = await repo.softDelete(created.id);
    expect(deleted).toBe(true);
    expect(db.tables.thoughts[0].deleted_at).not.toBeNull();

    const restored = await repo.restore(created.id);
    expect(restored).toBe(true);
    expect(db.tables.thoughts[0].deleted_at).toBeNull();
  });

  it('detects duplicate thought within threshold', async () => {
    await repo.create({ content: 'Repeated sentence' });
    const isDup = await repo.isRecentDuplicate('Repeated sentence', 10);
    expect(isDup).toBe(true);

    const notDup = await repo.isRecentDuplicate('Unique sentence', 10);
    expect(notDup).toBe(false);
  });
});

describe('DraftRepository', () => {
  let db: MockSQLiteDatabase;
  let repo: DraftRepository;

  beforeEach(() => {
    db = new MockSQLiteDatabase();
    repo = new DraftRepository(db as unknown as SQLiteDatabase);
  });

  it('saves draft and retrieves it', async () => {
    await repo.saveDraft('Unfinished idea...', DEFAULT_DRAFT_ID);
    const draft = await repo.getActiveDraft();
    expect(draft).not.toBeNull();
    expect(draft?.content).toBe('Unfinished idea...');
  });

  it('removes draft when content is cleared to empty', async () => {
    await repo.saveDraft('Starting something', DEFAULT_DRAFT_ID);
    expect(db.tables.drafts.length).toBe(1);

    await repo.saveDraft('   ', DEFAULT_DRAFT_ID);
    expect(db.tables.drafts.length).toBe(0);
  });

  it('deletes draft after entry save', async () => {
    await repo.saveDraft('My thought', DEFAULT_DRAFT_ID);
    await repo.deleteDraft(DEFAULT_DRAFT_ID);
    expect(db.tables.drafts.length).toBe(0);
  });
});

describe('SettingsRepository', () => {
  let db: MockSQLiteDatabase;
  let repo: SettingsRepository;

  beforeEach(() => {
    db = new MockSQLiteDatabase();
    repo = new SettingsRepository(db as unknown as SQLiteDatabase);
  });

  it('returns default settings when none stored', async () => {
    const settings = await repo.getAllSettings();
    expect(settings.biometricsEnabled).toBe(false);
    expect(settings.pinEnabled).toBe(false);
    expect(settings.autoLockTimeoutMinutes).toBe(5);
  });

  it('saves and reads updated settings', async () => {
    await repo.updateSettings({
      biometricsEnabled: true,
      autoLockTimeoutMinutes: 1,
    });

    const settings = await repo.getAllSettings();
    expect(settings.biometricsEnabled).toBe(true);
    expect(settings.autoLockTimeoutMinutes).toBe(1);
  });
});

describe('SearchRepository', () => {
  let db: MockSQLiteDatabase;
  let repo: SearchRepository;
  let thoughtRepo: ThoughtRepository;

  beforeEach(async () => {
    db = new MockSQLiteDatabase();
    repo = new SearchRepository(db as unknown as SQLiteDatabase);
    thoughtRepo = new ThoughtRepository(db as unknown as SQLiteDatabase);

    await thoughtRepo.create({ content: 'Reflecting on stillness and meditation' });
    await thoughtRepo.create({ content: 'Grocery shopping list for dinner' });
    await thoughtRepo.create({ content: 'Meditation practice in the morning' });
  });

  it('searches thoughts and finds matching records via LIKE fallback', async () => {
    const results = await repo.search('meditation');
    expect(results.length).toBe(2);
    expect(results[0].content).toContain('meditation');
  });

  it('returns empty array when query is empty or whitespace', async () => {
    const results = await repo.search('   ');
    expect(results).toEqual([]);
  });
});

