import { ThemeId, ColorMode, FontFamilyChoice, FontSizeChoice } from '@/constants/themes';

export interface AppSettings {
  biometricsEnabled: boolean;
  pinEnabled: boolean;
  autoLockTimeoutMinutes: number; // 0 = immediate, 1, 5, 15, -1 = disabled
  lastBackupAt: string | null;

  // Appearance & Theme settings
  appTheme: ThemeId;
  colorMode: ColorMode;
  customThemeColor: string | null;
  fontFamily: FontFamilyChoice;
  readingFontSize: FontSizeChoice;
  writingFontSize: FontSizeChoice;

  // Writing & Formatting preferences
  formattingPreferences: {
    defaultFontFamily: FontFamilyChoice;
    defaultFontSize: FontSizeChoice;
    autoLists: boolean;
  };
}

export type SettingKey =
  | 'biometrics_enabled'
  | 'pin_enabled'
  | 'auto_lock_timeout_minutes'
  | 'last_backup_at'
  | 'app_theme'
  | 'color_mode'
  | 'custom_theme_color'
  | 'font_family'
  | 'reading_font_size'
  | 'writing_font_size'
  | 'formatting_preferences';

export interface RawSettingRow {
  key: string;
  value: string;
  updated_at: string;
}
