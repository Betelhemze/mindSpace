import type { SQLiteDatabase } from 'expo-sqlite';
import { AppSettings, SettingKey, RawSettingRow } from '@/types/settings';
import { getCurrentUtcIso } from '@/utils/dateUtils';

const DEFAULT_SETTINGS: AppSettings = {
  biometricsEnabled: false,
  pinEnabled: false,
  autoLockTimeoutMinutes: 5,
  lastBackupAt: null,
};

export class SettingsRepository {
  constructor(private db: SQLiteDatabase) {}

  async getSetting(key: SettingKey, defaultValue: string = ''): Promise<string> {
    const row = await this.db.getFirstAsync<RawSettingRow>(
      'SELECT key, value FROM app_settings WHERE key = ?;',
      [key]
    );
    return row ? row.value : defaultValue;
  }

  async setSetting(key: SettingKey, value: string): Promise<void> {
    const now = getCurrentUtcIso();
    await this.db.runAsync(
      `INSERT INTO app_settings (key, value, updated_at)
       VALUES (?, ?, ?)
       ON CONFLICT(key) DO UPDATE SET
         value = excluded.value,
         updated_at = excluded.updated_at;`,
      [key, value, now]
    );
  }

  async getAllSettings(): Promise<AppSettings> {
    const rows = await this.db.getAllAsync<RawSettingRow>(
      'SELECT key, value, updated_at FROM app_settings;'
    );
    const map = new Map(rows.map((r) => [r.key, r.value]));

    return {
      biometricsEnabled: map.get('biometrics_enabled') === 'true',
      pinEnabled: map.get('pin_enabled') === 'true',
      autoLockTimeoutMinutes: map.has('auto_lock_timeout_minutes')
        ? parseInt(map.get('auto_lock_timeout_minutes') || '5', 10)
        : DEFAULT_SETTINGS.autoLockTimeoutMinutes,
      lastBackupAt: map.get('last_backup_at') || null,
    };
  }

  async updateSettings(settings: Partial<AppSettings>): Promise<void> {
    if (settings.biometricsEnabled !== undefined) {
      await this.setSetting('biometrics_enabled', String(settings.biometricsEnabled));
    }
    if (settings.pinEnabled !== undefined) {
      await this.setSetting('pin_enabled', String(settings.pinEnabled));
    }
    if (settings.autoLockTimeoutMinutes !== undefined) {
      await this.setSetting(
        'auto_lock_timeout_minutes',
        String(settings.autoLockTimeoutMinutes)
      );
    }
    if (settings.lastBackupAt !== undefined) {
      await this.setSetting('last_backup_at', settings.lastBackupAt ?? '');
    }
  }

  async getAllRawSettings(): Promise<Record<string, string>> {
    const rows = await this.db.getAllAsync<RawSettingRow>(
      'SELECT key, value FROM app_settings;'
    );
    const result: Record<string, string> = {};
    for (const r of rows) {
      result[r.key] = r.value;
    }
    return result;
  }

  async restoreRawSettings(settings: Record<string, string>): Promise<void> {
    const now = getCurrentUtcIso();
    for (const [key, value] of Object.entries(settings)) {
      await this.db.runAsync(
        `INSERT INTO app_settings (key, value, updated_at)
         VALUES (?, ?, ?)
         ON CONFLICT(key) DO UPDATE SET
           value = excluded.value,
           updated_at = excluded.updated_at;`,
        [key, value, now]
      );
    }
  }
}

