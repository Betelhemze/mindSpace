export interface Thought {
  id: string;
  content: string; // Plain text (used for FTS5 search, previews, fallbacks)
  rich_content?: string | null; // Serialized RichTextDocument JSON
  category: string | null; // slugs from CATEGORIES constant; null = uncategorised
  created_at: string; // UTC ISO 8601
  updated_at: string; // UTC ISO 8601
  deleted_at: string | null;
}

export interface ThoughtDraft {
  id: string;
  content: string;
  rich_content?: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateThoughtDTO {
  content: string;
  rich_content?: string | null;
  category?: string | null;
  id?: string;
  created_at?: string;
}

export interface UpdateThoughtDTO {
  id: string;
  content: string;
  rich_content?: string | null;
  category?: string | null;
}

export interface ThoughtGroup {
  dateKey: string; // YYYY-MM-DD local format for grouping
  displayDate: string; // E.g., "Today", "Yesterday", "Monday, Nov 11"
  thoughts: Thought[];
}

export interface PaginationParams {
  limit?: number;
  offset?: number;
}
