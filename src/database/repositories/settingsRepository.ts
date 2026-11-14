import type { SQLiteDatabase } from 'expo-sqlite';
import { AppSettings, SettingKey, RawSettingRow } from '@/types/settings';
import { getCurrentUtcIso } from '@/utils/dateUtils';
import { ThemeId, ColorMode, FontFamilyChoice, FontSizeChoice } from '@/constants/themes';

export const DEFAULT_SETTINGS: AppSettings = {
  biometricsEnabled: false,
  pinEnabled: false,
  autoLockTimeoutMinutes: 5,
  lastBackupAt: null,
  appTheme: 'warm-beige',
  colorMode: 'system',
  customThemeColor: null,
  fontFamily: 'system',
  readingFontSize: 'medium',
  writingFontSize: 'medium',
  formattingPreferences: {
    defaultFontFamily: 'system',
    defaultFontSize: 'medium',
    autoLists: true,
  },
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

    let formattingPreferences = DEFAULT_SETTINGS.formattingPreferences;
    const rawFormatting = map.get('formatting_preferences');
    if (rawFormatting) {
      try {
        formattingPreferences = { ...DEFAULT_SETTINGS.formattingPreferences, ...JSON.parse(rawFormatting) };
      } catch {
        // use default
      }
    }

    return {
      biometricsEnabled: map.get('biometrics_enabled') === 'true',
      pinEnabled: map.get('pin_enabled') === 'true',
      autoLockTimeoutMinutes: map.has('auto_lock_timeout_minutes')
        ? parseInt(map.get('auto_lock_timeout_minutes') || '5', 10)
        : DEFAULT_SETTINGS.autoLockTimeoutMinutes,
      lastBackupAt: map.get('last_backup_at') || null,
      appTheme: (map.get('app_theme') as ThemeId) || DEFAULT_SETTINGS.appTheme,
      colorMode: (map.get('color_mode') as ColorMode) || DEFAULT_SETTINGS.colorMode,
      customThemeColor: map.get('custom_theme_color') || null,
      fontFamily: (map.get('font_family') as FontFamilyChoice) || DEFAULT_SETTINGS.fontFamily,
      readingFontSize: (map.get('reading_font_size') as FontSizeChoice) || DEFAULT_SETTINGS.readingFontSize,
      writingFontSize: (map.get('writing_font_size') as FontSizeChoice) || DEFAULT_SETTINGS.writingFontSize,
      formattingPreferences,
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
    if (settings.appTheme !== undefined) {
      await this.setSetting('app_theme', settings.appTheme);
    }
    if (settings.colorMode !== undefined) {
      await this.setSetting('color_mode', settings.colorMode);
    }
    if (settings.customThemeColor !== undefined) {
      await this.setSetting('custom_theme_color', settings.customThemeColor ?? '');
    }
    if (settings.fontFamily !== undefined) {
      await this.setSetting('font_family', settings.fontFamily);
    }
    if (settings.readingFontSize !== undefined) {
      await this.setSetting('reading_font_size', settings.readingFontSize);
    }
    if (settings.writingFontSize !== undefined) {
      await this.setSetting('writing_font_size', settings.writingFontSize);
    }
    if (settings.formattingPreferences !== undefined) {
      await this.setSetting(
        'formatting_preferences',
        JSON.stringify(settings.formattingPreferences)
      );
    }
  }

  async resetAppearanceSettings(): Promise<void> {
    await this.updateSettings({
      appTheme: DEFAULT_SETTINGS.appTheme,
      colorMode: DEFAULT_SETTINGS.colorMode,
      customThemeColor: null,
      fontFamily: DEFAULT_SETTINGS.fontFamily,
      readingFontSize: DEFAULT_SETTINGS.readingFontSize,
      writingFontSize: DEFAULT_SETTINGS.writingFontSize,
    });
  }

  async resetWritingPreferences(): Promise<void> {
    await this.updateSettings({
      formattingPreferences: DEFAULT_SETTINGS.formattingPreferences,
    });
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
