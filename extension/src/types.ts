export interface Thought {
  id: string;
  content: string;
  category: string | null;
  created_at: string; // ISO 8601 UTC
  updated_at: string; // ISO 8601 UTC
  deleted_at: string | null;
  source_url?: string | null;
}

export interface ThoughtDraft {
  content: string;
  category: string | null;
  updated_at: string;
}

export interface MindspaceBackupFile {
  format: 'mindspace_backup_v1';
  checksum?: string;
  payload: {
    version: number;
    app: 'Mindspace';
    exported_at: string;
    record_count: number;
    data: {
      thoughts: Thought[];
      settings: Record<string, any>;
    };
  };
}

