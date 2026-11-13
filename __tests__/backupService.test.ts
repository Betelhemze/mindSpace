import { BackupService } from '../src/services/backupService';
import { MindspaceBackupFile } from '../src/types/backup';

describe('BackupService', () => {
  const sampleBackup: MindspaceBackupFile = {
    format: 'mindspace_backup_v1',
    checksum: '',
    payload: {
      version: 1,
      app: 'Mindspace',
      exported_at: '2026-11-11T12:00:00.000Z',
      record_count: 1,
      data: {
        thoughts: [
          {
            id: '11111111-1111-1111-1111-111111111111',
            content: 'Backup test entry',
            category: null,
            created_at: '2026-11-11T12:00:00.000Z',
            updated_at: '2026-11-11T12:00:00.000Z',
            deleted_at: null,
          },
        ],
        drafts: [],
        settings: {},
      },
    },
  };

  beforeAll(async () => {
    // Generate valid checksum for sampleBackup using our mocked crypto
    const crypto = require('crypto');
    sampleBackup.checksum = crypto
      .createHash('sha256')
      .update(JSON.stringify(sampleBackup.payload))
      .digest('hex');
  });

  it('validates a correct backup file', async () => {
    const jsonString = JSON.stringify(sampleBackup);
    const result = await BackupService.validateBackup(jsonString);

    expect(result.isValid).toBe(true);
    expect(result.backup?.payload.data.thoughts.length).toBe(1);
  });

  it('rejects an invalid backup format or tampered file', async () => {
    const tampered = {
      ...sampleBackup,
      checksum: 'bad_hash_123',
    };

    const result = await BackupService.validateBackup(JSON.stringify(tampered));
    expect(result.isValid).toBe(false);
    expect(result.error).toContain('integrity check failed');
  });

  it('rejects non-JSON input cleanly', async () => {
    const result = await BackupService.validateBackup('not json content');
    expect(result.isValid).toBe(false);
    expect(result.error).toContain('Invalid JSON');
  });
});

