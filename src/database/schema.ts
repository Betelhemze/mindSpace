export const CREATE_MIGRATIONS_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS __mindspace_migrations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  version INTEGER UNIQUE NOT NULL,
  name TEXT NOT NULL,
  applied_at TEXT NOT NULL
);
`;

export const SCHEMA_V1_SQL = `
-- Main journal entries table
CREATE TABLE IF NOT EXISTS thoughts (
  id TEXT PRIMARY KEY NOT NULL,
  content TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT NULL
);

-- Indexes for high performance chronological and state queries
CREATE INDEX IF NOT EXISTS idx_thoughts_created_at ON thoughts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_thoughts_deleted_at ON thoughts(deleted_at);

-- Uncommitted working drafts table
CREATE TABLE IF NOT EXISTS drafts (
  id TEXT PRIMARY KEY NOT NULL,
  content TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_drafts_updated_at ON drafts(updated_at DESC);

-- Application persistent settings table
CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY NOT NULL,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
`;

export const FTS5_SETUP_SQL = `
-- Full-Text Search index for thoughts
CREATE VIRTUAL TABLE IF NOT EXISTS thoughts_fts USING fts5(
  thought_id UNINDEXED,
  content,
  tokenize = 'unicode61 remove_diacritics 2'
);

-- Trigger: keep FTS updated on INSERT
CREATE TRIGGER IF NOT EXISTS trg_thoughts_ai AFTER INSERT ON thoughts
BEGIN
  INSERT INTO thoughts_fts(thought_id, content)
  SELECT new.id, new.content
  WHERE new.deleted_at IS NULL;
END;

-- Trigger: keep FTS updated on UPDATE (handles edits & soft-deletes)
CREATE TRIGGER IF NOT EXISTS trg_thoughts_au AFTER UPDATE ON thoughts
BEGIN
  DELETE FROM thoughts_fts WHERE thought_id = old.id;
  INSERT INTO thoughts_fts(thought_id, content)
  SELECT new.id, new.content
  WHERE new.deleted_at IS NULL;
END;

-- Trigger: keep FTS updated on DELETE
CREATE TRIGGER IF NOT EXISTS trg_thoughts_ad AFTER DELETE ON thoughts
BEGIN
  DELETE FROM thoughts_fts WHERE thought_id = old.id;
END;
`;

