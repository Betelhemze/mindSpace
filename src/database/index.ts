import { getDatabase, closeDatabase, getCachedEncryptionStatus } from './connection';
import { ThoughtRepository } from './repositories/thoughtRepository';
import { DraftRepository } from './repositories/draftRepository';
import { SettingsRepository } from './repositories/settingsRepository';
import { SearchRepository } from './repositories/searchRepository';

export * from './constants';
export * from './schema';
export * from './encryption';
export * from './connection';
export * from './repositories/thoughtRepository';
export * from './repositories/draftRepository';
export * from './repositories/settingsRepository';
export * from './repositories/searchRepository';

export interface MindspaceRepositories {
  thoughts: ThoughtRepository;
  drafts: DraftRepository;
  settings: SettingsRepository;
  search: SearchRepository;
}

export async function getRepositories(): Promise<MindspaceRepositories> {
  const db = await getDatabase();
  return {
    thoughts: new ThoughtRepository(db),
    drafts: new DraftRepository(db),
    settings: new SettingsRepository(db),
    search: new SearchRepository(db),
  };
}

