import type { SQLiteDatabase } from 'expo-sqlite';
import { Thought } from '@/types/thought';
import { sanitizeSearchQuery } from '@/utils/validation';

export interface SearchResult extends Thought {
  matchSnippet?: string;
}

export class SearchRepository {
  private hasFTS5: boolean | null = null;

  constructor(private db: SQLiteDatabase) {}

  /**
   * Checks whether the FTS5 virtual table is operational.
   */
  private async checkFtsAvailability(): Promise<boolean> {
    if (this.hasFTS5 !== null) return this.hasFTS5;
    try {
      const tableCheck = await this.db.getFirstAsync<{ name: string }>(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='thoughts_fts';"
      );
      this.hasFTS5 = tableCheck !== null;
    } catch {
      this.hasFTS5 = false;
    }
    return this.hasFTS5;
  }

  /**
   * Searches thoughts with FTS5 when available, falling back to LIKE.
   */
  async search(rawQuery: string, limit: number = 50): Promise<SearchResult[]> {
    const query = sanitizeSearchQuery(rawQuery);
    if (!query) {
      return [];
    }

    const isFtsAvailable = await this.checkFtsAvailability();

    if (isFtsAvailable) {
      try {
        // Construct prefix search for FTS5 tokens: "word"*
        const tokens = query.split(/\s+/).filter(Boolean);
        const ftsQuery = tokens.map((t) => `"${t}"*`).join(' ');

        const results = await this.db.getAllAsync<SearchResult>(
          `SELECT t.id, t.content, t.created_at, t.updated_at, t.deleted_at
           FROM thoughts_fts fts
           JOIN thoughts t ON t.id = fts.thought_id
           WHERE thoughts_fts MATCH ? AND t.deleted_at IS NULL
           ORDER BY t.created_at DESC
           LIMIT ?;`,
          [ftsQuery, limit]
        );

        return results;
      } catch (err) {
        console.warn('[Mindspace Search] FTS5 query failed, falling back to LIKE query:', err);
      }
    }

    // Fallback: Case-insensitive parameterized LIKE query
    const likeParam = `%${query}%`;
    const results = await this.db.getAllAsync<SearchResult>(
      `SELECT id, content, created_at, updated_at, deleted_at
       FROM thoughts
       WHERE deleted_at IS NULL AND content LIKE ?
       ORDER BY created_at DESC
       LIMIT ?;`,
      [likeParam, limit]
    );

    return results;
  }
}

