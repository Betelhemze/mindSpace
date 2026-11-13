export interface AppSettings {
  biometricsEnabled: boolean;
  pinEnabled: boolean;
  autoLockTimeoutMinutes: number; // 0 = immediate, 1, 5, 15, -1 = disabled
  lastBackupAt: string | null;
}

export type SettingKey =
  | 'biometrics_enabled'
  | 'pin_enabled'
  | 'auto_lock_timeout_minutes'
  | 'last_backup_at'
  | 'app_theme';

export interface RawSettingRow {
  key: string;
  value: string;
  updated_at: string;
}

