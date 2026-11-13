import { Thought, ThoughtDraft } from './thought';

export interface MindspaceBackupPayload {
  version: 1;
  app: 'Mindspace';
  exported_at: string;
  record_count: number;
  data: {
    thoughts: Thought[];
    drafts: ThoughtDraft[];
    settings: Record<string, string>;
  };
}

export interface MindspaceBackupFile {
  format: 'mindspace_backup_v1';
  checksum: string; // SHA-256 hash of the JSON payload
  payload: MindspaceBackupPayload;
}

export interface RestoreResult {
  success: boolean;
  importedThoughtsCount: number;
  skippedDuplicatesCount: number;
  error?: string;
}

