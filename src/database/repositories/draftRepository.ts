import type { SQLiteDatabase } from 'expo-sqlite';
import { ThoughtDraft } from '@/types/thought';
import { getCurrentUtcIso } from '@/utils/dateUtils';
import { sanitizeThoughtContent } from '@/utils/validation';

export const DEFAULT_DRAFT_ID = 'main_quick_draft';

export class DraftRepository {
  constructor(private db: SQLiteDatabase) {}

  /**
   * Retrieves the current uncommitted draft.
   */
  async getActiveDraft(): Promise<ThoughtDraft | null> {
    const row = await this.db.getFirstAsync<ThoughtDraft>(
      `SELECT id, content, created_at, updated_at
       FROM drafts
       ORDER BY updated_at DESC
       LIMIT 1;`
    );
    return row ?? null;
  }

  /**
   * Upserts the draft. If content is empty, removes the draft to keep storage clean.
   */
  async saveDraft(content: string, draftId: string = DEFAULT_DRAFT_ID): Promise<ThoughtDraft | null> {
    const sanitized = sanitizeThoughtContent(content);
    if (!sanitized) {
      await this.deleteDraft(draftId);
      return null;
    }

    const now = getCurrentUtcIso();
    await this.db.runAsync(
      `INSERT INTO drafts (id, content, created_at, updated_at)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         content = excluded.content,
         updated_at = excluded.updated_at;`,
      [draftId, content, now, now]
    );

    return {
      id: draftId,
      content,
      created_at: now,
      updated_at: now,
    };
  }

  /**
   * Deletes a draft once it has been saved as a thought entry or explicitly discarded.
   */
  async deleteDraft(draftId: string = DEFAULT_DRAFT_ID): Promise<void> {
    await this.db.runAsync(`DELETE FROM drafts WHERE id = ?;`, [draftId]);
  }

  /**
   * Clears all drafts.
   */
  async clearAllDrafts(): Promise<void> {
    await this.db.runAsync(`DELETE FROM drafts;`);
  }
}

