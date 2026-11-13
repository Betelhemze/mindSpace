import * as Crypto from 'expo-crypto';
import type { SQLiteDatabase } from 'expo-sqlite';
import { Thought, CreateThoughtDTO, UpdateThoughtDTO, PaginationParams } from '@/types/thought';
import { getCurrentUtcIso, getLocalDateKey } from '@/utils/dateUtils';
import { isValidThoughtContent, sanitizeThoughtContent } from '@/utils/validation';

export class ThoughtRepository {
  constructor(private db: SQLiteDatabase) {}

  /**
   * Creates a new thought entry.
   * Parameterized to ensure SQL injection safety.
   */
  async create(dto: CreateThoughtDTO): Promise<Thought> {
    const cleanContent = sanitizeThoughtContent(dto.content);
    if (!isValidThoughtContent(cleanContent)) {
      throw new Error('Thought content cannot be empty.');
    }

    const id = dto.id || Crypto.randomUUID();
    const now = getCurrentUtcIso();
    const createdAt = dto.created_at || now;
    const updatedAt = now;
    const category = dto.category ?? null;

    await this.db.runAsync(
      `INSERT INTO thoughts (id, content, category, created_at, updated_at, deleted_at)
       VALUES (?, ?, ?, ?, ?, NULL);`,
      [id, cleanContent, category, createdAt, updatedAt]
    );

    return {
      id,
      content: cleanContent,
      category,
      created_at: createdAt,
      updated_at: updatedAt,
      deleted_at: null,
    };
  }

  /**
   * Retrieves paginated thoughts ordered newest first.
   * Optional category filter narrows the result set.
   */
  async getAll(
    params: PaginationParams = {},
    includeDeleted: boolean = false,
    category?: string | null
  ): Promise<Thought[]> {
    const limit = params.limit ?? 20;
    const offset = params.offset ?? 0;

    const conditions: string[] = [includeDeleted ? '1=1' : 'deleted_at IS NULL'];
    const args: (string | number | null)[] = [];

    if (category) {
      conditions.push('category = ?');
      args.push(category);
    }

    args.push(limit, offset);

    const rows = await this.db.getAllAsync<Thought>(
      `SELECT id, content, category, created_at, updated_at, deleted_at
       FROM thoughts
       WHERE ${conditions.join(' AND ')}
       ORDER BY created_at DESC
       LIMIT ? OFFSET ?;`,
      args
    );

    return rows;
  }

  /**
   * Fetches a single thought by ID.
   */
  async getById(id: string): Promise<Thought | null> {
    const row = await this.db.getFirstAsync<Thought>(
      `SELECT id, content, category, created_at, updated_at, deleted_at
       FROM thoughts
       WHERE id = ?;`,
      [id]
    );
    return row ?? null;
  }

  /**
   * Updates an existing thought's content and/or category.
   */
  async update(dto: UpdateThoughtDTO): Promise<Thought> {
    const cleanContent = sanitizeThoughtContent(dto.content);
    if (!isValidThoughtContent(cleanContent)) {
      throw new Error('Thought content cannot be empty.');
    }

    const existing = await this.getById(dto.id);
    if (!existing) {
      throw new Error(`Thought with id ${dto.id} not found.`);
    }

    const now = getCurrentUtcIso();
    // Only update category when it is explicitly provided in the DTO
    const newCategory = 'category' in dto ? (dto.category ?? null) : existing.category;

    await this.db.runAsync(
      `UPDATE thoughts
       SET content = ?, category = ?, updated_at = ?
       WHERE id = ?;`,
      [cleanContent, newCategory, now, dto.id]
    );

    return {
      ...existing,
      content: cleanContent,
      category: newCategory,
      updated_at: now,
    };
  }

  /**
   * Soft-deletes a thought (recoverable).
   */
  async softDelete(id: string): Promise<boolean> {
    const now = getCurrentUtcIso();
    const result = await this.db.runAsync(
      `UPDATE thoughts
       SET deleted_at = ?
       WHERE id = ? AND deleted_at IS NULL;`,
      [now, id]
    );
    return result.changes > 0;
  }

  /**
   * Permanently deletes a thought from disk.
   */
  async hardDelete(id: string): Promise<boolean> {
    const result = await this.db.runAsync(`DELETE FROM thoughts WHERE id = ?;`, [id]);
    return result.changes > 0;
  }

  /**
   * Restores a soft-deleted thought.
   */
  async restore(id: string): Promise<boolean> {
    const now = getCurrentUtcIso();
    const result = await this.db.runAsync(
      `UPDATE thoughts
       SET deleted_at = NULL, updated_at = ?
       WHERE id = ?;`,
      [now, id]
    );
    return result.changes > 0;
  }

  /**
   * Total count of active thoughts, optionally filtered by category.
   */
  async getCount(category?: string | null): Promise<number> {
    if (category) {
      const row = await this.db.getFirstAsync<{ count: number }>(
        'SELECT COUNT(*) as count FROM thoughts WHERE deleted_at IS NULL AND category = ?;',
        [category]
      );
      return row?.count ?? 0;
    }
    const row = await this.db.getFirstAsync<{ count: number }>(
      'SELECT COUNT(*) as count FROM thoughts WHERE deleted_at IS NULL;'
    );
    return row?.count ?? 0;
  }

  /**
   * Returns active thoughts created on a specific local date (YYYY-MM-DD).
   */
  async getByLocalDate(localDateStr: string): Promise<Thought[]> {
    const all = await this.db.getAllAsync<Thought>(
      `SELECT id, content, category, created_at, updated_at, deleted_at
       FROM thoughts
       WHERE deleted_at IS NULL
       ORDER BY created_at DESC;`
    );

    return all.filter((t) => getLocalDateKey(t.created_at) === localDateStr);
  }

  /**
   * Returns set of local dates (YYYY-MM-DD) that have thoughts recorded in a given month.
   */
  async getDatesWithThoughtsInMonth(year: number, month: number): Promise<string[]> {
    const all = await this.db.getAllAsync<{ created_at: string }>(
      `SELECT created_at FROM thoughts WHERE deleted_at IS NULL;`
    );

    const datesSet = new Set<string>();
    for (const row of all) {
      const d = new Date(row.created_at);
      if (d.getFullYear() === year && d.getMonth() + 1 === month) {
        datesSet.add(getLocalDateKey(d));
      }
    }

    return Array.from(datesSet);
  }

  /**
   * Duplicate prevention check:
   * Checks if an identical thought was saved within the last N seconds.
   */
  async isRecentDuplicate(content: string, withinSeconds: number = 4): Promise<boolean> {
    const cleanContent = sanitizeThoughtContent(content);
    if (!cleanContent) return false;

    const thresholdIso = new Date(Date.now() - withinSeconds * 1000).toISOString();
    const duplicate = await this.db.getFirstAsync<Thought>(
      `SELECT id FROM thoughts
       WHERE content = ? AND created_at >= ? AND deleted_at IS NULL
       LIMIT 1;`,
      [cleanContent, thresholdIso]
    );

    return duplicate !== null;
  }
}
