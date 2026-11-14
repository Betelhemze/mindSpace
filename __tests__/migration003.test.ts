import { migration003 } from '@/database/migrations/003_add_rich_text';

describe('Migration 003 - Rich Text Support', () => {
  it('defines migration 3 with correct metadata', () => {
    expect(migration003.version).toBe(3);
    expect(migration003.name).toBe('003_add_rich_text');
  });

  it('runs up migration executing alter table statements safely', async () => {
    const executedSql: string[] = [];
    const mockDb = {
      execAsync: async (sql: string) => {
        executedSql.push(sql);
      },
    };

    await migration003.up(mockDb as any);
    expect(executedSql.length).toBe(2);
    expect(executedSql[0]).toContain('ALTER TABLE thoughts ADD COLUMN rich_content TEXT NULL');
    expect(executedSql[1]).toContain('ALTER TABLE drafts ADD COLUMN rich_content TEXT NULL');
  });

  it('provides safe down rollback statement', async () => {
    const executedSql: string[] = [];
    const mockDb = {
      execAsync: async (sql: string) => {
        executedSql.push(sql);
      },
    };

    await migration003.down(mockDb as any);
    expect(executedSql.length).toBe(1);
    expect(executedSql[0]).toContain('CREATE TABLE IF NOT EXISTS thoughts_v2');
  });
});

