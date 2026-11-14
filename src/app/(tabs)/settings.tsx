import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  Modal,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/context/ThemeContext';
import { ThemeId, ColorMode, FontFamilyChoice, FontSizeChoice, PRESET_THEMES } from '@/constants/themes';
import { getRepositories } from '@/database';
import { AuthService } from '@/services/authService';
import { BackupService } from '@/services/backupService';
import { useSecurityLock } from '@/hooks/useSecurityLock';
import { formatFullLocalDate } from '@/utils/dateUtils';
import { Icon } from '@/components/Icon';
import { RichTextViewer } from '@/components/RichTextViewer';

const TIMEOUT_OPTIONS = [
  { label: 'Immediately', value: 0 },
  { label: '1 minute', value: 1 },
  { label: '5 minutes', value: 5 },
  { label: '15 minutes', value: 15 },
  { label: 'Never', value: -1 },
];

const THEME_PRESETS: { id: ThemeId; label: string; primaryColor: string; bg: string }[] = [
  { id: 'warm-beige', label: 'Warm Beige', primaryColor: '#4A4036', bg: '#FBF9F5' },
  { id: 'sage-green', label: 'Sage Green', primaryColor: '#3B5240', bg: '#F6F8F5' },
  { id: 'soft-blue', label: 'Soft Blue', primaryColor: '#33506E', bg: '#F5F7FA' },
  { id: 'lavender', label: 'Lavender', primaryColor: '#56426C', bg: '#F9F7FB' },
  { id: 'rose', label: 'Rose', primaryColor: '#6D3F43', bg: '#FBF7F7' },
  { id: 'neutral-sand', label: 'Neutral Sand', primaryColor: '#423F3C', bg: '#F8F7F5' },
  { id: 'mint', label: 'Mint', primaryColor: '#2B584B', bg: '#F4F9F7' },
  { id: 'dark', label: 'Dark', primaryColor: '#E5E1DB', bg: '#141517' },
];

const CURATED_CUSTOM_COLORS = [
  '#B45309', // Amber
  '#C2410C', // Terracotta
  '#047857', // Emerald
  '#0F766E', // Teal
  '#4338CA', // Indigo
  '#6B21A8', // Plum
  '#BE123C', // Crimson
];

const SAMPLE_PREVIEW_DOC = {
  version: 1 as const,
  blocks: [
    {
      id: 'prev_1',
      type: 'h2' as const,
      spans: [{ text: 'Morning Reflection' }],
    },
    {
      id: 'prev_2',
      type: 'paragraph' as const,
      spans: [
        { text: 'A calm mind welcomes clarity. ' },
        { text: 'Formatting ', bold: true },
        { text: 'feels ', italic: true },
        { text: 'effortless.', underline: true },
      ],
    },
    {
      id: 'prev_3',
      type: 'bullet-list' as const,
      spans: [{ text: 'Grateful for quiet mornings' }],
    },
  ],
};

export default function SettingsScreen() {
  const {
    theme,
    themeId,
    colorMode,
    customColor,
    fontFamily,
    readingFontSize,
    writingFontSize,
    setThemeId,
    setColorMode,
    setCustomColor,
    setFontFamily,
    setReadingFontSize,
    setWritingFontSize,
    resetAppearance,
  } = useTheme();

  const { lockImmediately, refreshLockSettings } = useSecurityLock();

  const [biometricsEnabled, setBiometricsEnabled] = useState<boolean>(false);
  const [pinEnabled, setPinEnabled] = useState<boolean>(false);
  const [autoLockTimeout, setAutoLockTimeout] = useState<number>(5);
  const [lastBackupAt, setLastBackupAt] = useState<string | null>(null);
  const [totalEntries, setTotalEntries] = useState<number>(0);

  // Custom hex color input state
  const [customHexInput, setCustomHexInput] = useState<string>('');

  // Pin setup modal state
  const [showPinModal, setShowPinModal] = useState<boolean>(false);
  const [newPin, setNewPin] = useState<string>('');
  const [confirmPin, setConfirmPin] = useState<string>('');
  const [pinError, setPinError] = useState<string>('');

  // Backup / export state
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [isRestoring, setIsRestoring] = useState<boolean>(false);
  const [restoreModalVisible, setRestoreModalVisible] = useState(false);
  const [restoreJsonInput, setRestoreJsonInput] = useState('');

  const loadSettingsData = useCallback(async () => {
    try {
      const repos = await getRepositories();
      const settings = await repos.settings.getAllSettings();
      const count = await repos.thoughts.getCount();

      setBiometricsEnabled(settings.biometricsEnabled);
      setPinEnabled(settings.pinEnabled);
      setAutoLockTimeout(settings.autoLockTimeoutMinutes);
      setLastBackupAt(settings.lastBackupAt);
      setTotalEntries(count);
    } catch (err) {
      console.error('[SettingsScreen] Error loading settings:', err);
    }
  }, []);

  useEffect(() => {
    loadSettingsData();
  }, [loadSettingsData]);

  // Handle Biometric toggle
  const handleToggleBiometrics = async (value: boolean) => {
    if (value) {
      const availability = await AuthService.checkBiometricsAvailability();
      if (!availability.hasHardware) {
        Alert.alert('Not Supported', 'Biometric authentication hardware is not available on this device.');
        return;
      }
      if (!availability.isEnrolled) {
        Alert.alert(
          'No Biometrics Enrolled',
          'Please set up Face ID or Fingerprint authentication in your device system settings first.'
        );
        return;
      }

      const verified = await AuthService.promptBiometricAuth('Verify your identity to enable biometric lock');
      if (!verified) {
        return;
      }
    }

    try {
      const repos = await getRepositories();
      await repos.settings.updateSettings({ biometricsEnabled: value });
      setBiometricsEnabled(value);
      await refreshLockSettings();
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Could not update biometrics setting.');
    }
  };

  // Handle PIN setup modal submit
  const handleSavePin = async () => {
    if (newPin.length !== 4) {
      setPinError('PIN must be exactly 4 digits.');
      return;
    }
    if (newPin !== confirmPin) {
      setPinError('PINs do not match. Please try again.');
      return;
    }

    try {
      await AuthService.setPin(newPin);
      const repos = await getRepositories();
      await repos.settings.updateSettings({ pinEnabled: true });
      setPinEnabled(true);
      setShowPinModal(false);
      setNewPin('');
      setConfirmPin('');
      setPinError('');
      await refreshLockSettings();
      Alert.alert('PIN configured', 'Your 4-digit PIN is now active.');
    } catch (err: any) {
      setPinError(err?.message || 'Failed to set PIN.');
    }
  };

  // Handle PIN toggle
  const handleTogglePin = async (value: boolean) => {
    if (value) {
      setNewPin('');
      setConfirmPin('');
      setPinError('');
      setShowPinModal(true);
    } else {
      Alert.alert(
        'Remove PIN protection?',
        'Are you sure you want to disable PIN lock for Mindspace?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Disable PIN',
            style: 'destructive',
            onPress: async () => {
              await AuthService.removePin();
              const repos = await getRepositories();
              await repos.settings.updateSettings({ pinEnabled: false });
              setPinEnabled(false);
              await refreshLockSettings();
            },
          },
        ]
      );
    }
  };

  // Handle Auto-lock timeout change
  const handleChangeTimeout = async (value: number) => {
    try {
      const repos = await getRepositories();
      await repos.settings.updateSettings({ autoLockTimeoutMinutes: value });
      setAutoLockTimeout(value);
      await refreshLockSettings();
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Could not update timeout setting.');
    }
  };

  // Handle Export Backup
  const handleExportBackup = async () => {
    setIsExporting(true);
    try {
      await BackupService.exportBackup();
      const repos = await getRepositories();
      const settings = await repos.settings.getAllSettings();
      setLastBackupAt(settings.lastBackupAt);
      Alert.alert('Backup created', 'Your journal backup was exported and verified with SHA-256 integrity check.');
    } catch (err: any) {
      Alert.alert('Export failed', err?.message || 'Could not create journal backup.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportMarkdown = async () => {
    try {
      await BackupService.exportAsMarkdown();
      Alert.alert('Markdown Exported', 'Your journal was successfully exported as clean formatted Markdown.');
    } catch (err: any) {
      Alert.alert('Export failed', err?.message || 'Could not export journal as markdown.');
    }
  };

  const promptRestoreManual = () => {
    setRestoreJsonInput('');
    setRestoreModalVisible(true);
  };

  const processRestoreJson = async (jsonString: string) => {
    setIsRestoring(true);
    try {
      const validation = await BackupService.validateBackup(jsonString);
      if (!validation.isValid || !validation.backup) {
        Alert.alert('Invalid Backup', validation.error || 'Backup file is corrupted or not recognized.');
        return;
      }

      const backup = validation.backup;
      const count = backup.payload.data.thoughts.length;

      Alert.alert(
        'Confirm Restoration',
        `Restore ${count} entries from backup created on ${formatFullLocalDate(
          backup.payload.exported_at
        )}?\n\nExisting thoughts will not be deleted or replaced.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Restore Now',
            onPress: async () => {
              const result = await BackupService.restoreBackup(backup);
              await loadSettingsData();
              setRestoreModalVisible(false);
              Alert.alert(
                'Restore Completed',
                `Successfully restored ${result.importedThoughtsCount} entries (${result.skippedDuplicatesCount} duplicates skipped).`
              );
            },
          },
        ]
      );
    } catch (err: any) {
      Alert.alert('Restore Failed', err?.message || 'Could not restore backup.');
    } finally {
      setIsRestoring(false);
    }
  };

  const handleCustomHexSubmit = () => {
    const trimmed = customHexInput.trim();
    if (/^#?[0-9A-Fa-f]{6}$/.test(trimmed)) {
      const clean = trimmed.startsWith('#') ? trimmed : `#${trimmed}`;
      setCustomColor(clean);
      setCustomHexInput('');
    } else {
      Alert.alert('Invalid Color', 'Please enter a valid 6-digit hex code, e.g. #3B82F6');
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: theme.colors.textPrimary }]}>Settings</Text>
          <Text style={[styles.headerSubtitle, { color: theme.colors.textSecondary }]}>
            Appearance, writing, security, and data preservation
          </Text>
        </View>

        {/* SECTION 1: APPEARANCE & THEME */}
        <View style={styles.section}>
          <View style={styles.sectionTitleRow}>
            <Icon name="sliders" size={18} color={theme.colors.accent} style={styles.sectionIcon} />
            <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>Appearance</Text>
          </View>

          <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            {/* Live Preview Box */}
            <View style={styles.previewBoxContainer}>
              <Text style={[styles.previewLabel, { color: theme.colors.textMuted }]}>LIVE THEME PREVIEW</Text>
              <View
                style={[
                  styles.previewCard,
                  {
                    backgroundColor: theme.colors.background,
                    borderColor: theme.colors.border,
                  },
                ]}
              >
                <RichTextViewer document={SAMPLE_PREVIEW_DOC} />
              </View>
            </View>

            <View style={[styles.divider, { backgroundColor: theme.colors.borderLight }]} />

            {/* Theme Palette Selection */}
            <Text style={[styles.settingLabel, { color: theme.colors.textPrimary }]}>Color Theme</Text>
            <Text style={[styles.settingDescription, { color: theme.colors.textSecondary }]}>
              Choose from 8 tranquil palettes or pick a custom color
            </Text>

            <View style={styles.themesGrid}>
              {THEME_PRESETS.map((t) => {
                const isSelected = !customColor && themeId === t.id;
                return (
                  <TouchableOpacity
                    key={t.id}
                    style={[
                      styles.themeCard,
                      { backgroundColor: t.bg, borderColor: isSelected ? theme.colors.accent : theme.colors.borderLight },
                      isSelected && styles.themeCardSelected,
                    ]}
                    onPress={() => setThemeId(t.id)}
                    activeOpacity={0.8}
                  >
                    <View style={[styles.themeColorDot, { backgroundColor: t.primaryColor }]} />
                    <Text
                      style={[
                        styles.themeCardText,
                        { color: t.id === 'dark' ? '#E5E1DB' : '#1F2022' },
                        isSelected && { fontWeight: '700' },
                      ]}
                    >
                      {t.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={[styles.divider, { backgroundColor: theme.colors.borderLight }]} />

            {/* Custom Theme Color Picker */}
            <Text style={[styles.settingLabel, { color: theme.colors.textPrimary }]}>Custom Accent Color</Text>
            <View style={styles.customColorsRow}>
              {CURATED_CUSTOM_COLORS.map((hex) => {
                const isSelected = customColor === hex;
                return (
                  <TouchableOpacity
                    key={hex}
                    style={[
                      styles.colorDot,
                      { backgroundColor: hex },
                      isSelected && [styles.colorDotSelected, { borderColor: theme.colors.accent }],
                    ]}
                    onPress={() => setCustomColor(hex)}
                  />
                );
              })}
            </View>

            {/* Hex input row */}
            <View style={styles.hexInputRow}>
              <TextInput
                value={customHexInput}
                onChangeText={setCustomHexInput}
                placeholder="Custom #Hex Code (e.g. #2563EB)"
                placeholderTextColor={theme.colors.textPlaceholder}
                style={[
                  styles.hexInput,
                  {
                    backgroundColor: theme.colors.surfaceSubtle,
                    color: theme.colors.textPrimary,
                    borderColor: theme.colors.border,
                  },
                ]}
                maxLength={7}
                autoCapitalize="characters"
              />
              <TouchableOpacity
                style={[styles.applyHexBtn, { backgroundColor: theme.colors.accent }]}
                onPress={handleCustomHexSubmit}
              >
                <Text style={styles.applyHexBtnText}>Apply</Text>
              </TouchableOpacity>
            </View>

            <View style={[styles.divider, { backgroundColor: theme.colors.borderLight }]} />

            {/* Light / Dark / System Mode */}
            <View style={styles.settingColumn}>
              <Text style={[styles.settingLabel, { color: theme.colors.textPrimary }]}>Display Mode</Text>
              <View style={styles.segmentedRow}>
                {(['light', 'dark', 'system'] as const).map((mode) => {
                  const isSelected = colorMode === mode;
                  return (
                    <TouchableOpacity
                      key={mode}
                      style={[
                        styles.segmentedBtn,
                        isSelected && [styles.segmentedBtnActive, { backgroundColor: theme.colors.accent }],
                      ]}
                      onPress={() => setColorMode(mode)}
                    >
                      <Text
                        style={[
                          styles.segmentedBtnText,
                          { color: isSelected ? '#FFFFFF' : theme.colors.textSecondary },
                        ]}
                      >
                        {mode.charAt(0).toUpperCase() + mode.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <View style={[styles.divider, { backgroundColor: theme.colors.borderLight }]} />

            {/* Typography: Font Family */}
            <View style={styles.settingColumn}>
              <Text style={[styles.settingLabel, { color: theme.colors.textPrimary }]}>Font Family</Text>
              <View style={styles.segmentedRow}>
                {(['system', 'serif', 'monospace'] as const).map((font) => {
                  const isSelected = fontFamily === font;
                  return (
                    <TouchableOpacity
                      key={font}
                      style={[
                        styles.segmentedBtn,
                        isSelected && [styles.segmentedBtnActive, { backgroundColor: theme.colors.accent }],
                      ]}
                      onPress={() => setFontFamily(font)}
                    >
                      <Text
                        style={[
                          styles.segmentedBtnText,
                          {
                            color: isSelected ? '#FFFFFF' : theme.colors.textSecondary,
                            fontFamily: font === 'serif' ? 'serif' : font === 'monospace' ? 'monospace' : undefined,
                          },
                        ]}
                      >
                        {font === 'system' ? 'Sans-Serif' : font === 'serif' ? 'Serif' : 'Monospace'}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <View style={[styles.divider, { backgroundColor: theme.colors.borderLight }]} />

            {/* Typography: Reading Text Size */}
            <View style={styles.settingColumn}>
              <Text style={[styles.settingLabel, { color: theme.colors.textPrimary }]}>Reading Text Size</Text>
              <View style={styles.segmentedRow}>
                {(['small', 'medium', 'large', 'extraLarge'] as const).map((sz) => {
                  const isSelected = readingFontSize === sz;
                  return (
                    <TouchableOpacity
                      key={sz}
                      style={[
                        styles.segmentedBtn,
                        isSelected && [styles.segmentedBtnActive, { backgroundColor: theme.colors.accent }],
                      ]}
                      onPress={() => setReadingFontSize(sz)}
                    >
                      <Text
                        style={[
                          styles.segmentedBtnText,
                          { color: isSelected ? '#FFFFFF' : theme.colors.textSecondary },
                        ]}
                      >
                        {sz === 'small' ? 'S' : sz === 'medium' ? 'M' : sz === 'large' ? 'L' : 'XL'}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <View style={[styles.divider, { backgroundColor: theme.colors.borderLight }]} />

            {/* Reset to Default */}
            <TouchableOpacity
              style={[styles.resetButton, { backgroundColor: theme.colors.surfaceSubtle }]}
              onPress={() => {
                Alert.alert(
                  'Reset Appearance?',
                  'Reset all theme colors, fonts, and sizing back to Mindspace defaults?',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Reset', style: 'destructive', onPress: resetAppearance },
                  ]
                );
              }}
            >
              <Icon name="rotate-ccw" size={15} color={theme.colors.textSecondary} style={{ marginRight: 6 }} />
              <Text style={[styles.resetButtonText, { color: theme.colors.textSecondary }]}>
                Reset Appearance to Default
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* SECTION 2: WRITING PREFERENCES */}
        <View style={styles.section}>
          <View style={styles.sectionTitleRow}>
            <Icon name="edit-3" size={18} color={theme.colors.accent} style={styles.sectionIcon} />
            <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>Writing Preferences</Text>
          </View>

          <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            {/* Writing Text Size */}
            <View style={styles.settingColumn}>
              <Text style={[styles.settingLabel, { color: theme.colors.textPrimary }]}>Writing Text Size</Text>
              <Text style={[styles.settingDescription, { color: theme.colors.textSecondary }]}>
                Scales the writing area comfortably for your eyes
              </Text>
              <View style={styles.segmentedRow}>
                {(['small', 'medium', 'large', 'extraLarge'] as const).map((sz) => {
                  const isSelected = writingFontSize === sz;
                  return (
                    <TouchableOpacity
                      key={sz}
                      style={[
                        styles.segmentedBtn,
                        isSelected && [styles.segmentedBtnActive, { backgroundColor: theme.colors.accent }],
                      ]}
                      onPress={() => setWritingFontSize(sz)}
                    >
                      <Text
                        style={[
                          styles.segmentedBtnText,
                          { color: isSelected ? '#FFFFFF' : theme.colors.textSecondary },
                        ]}
                      >
                        {sz === 'small' ? 'S' : sz === 'medium' ? 'M' : sz === 'large' ? 'L' : 'XL'}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <View style={[styles.divider, { backgroundColor: theme.colors.borderLight }]} />

            {/* Rich Text Toolbar Info */}
            <View style={styles.metaRow}>
              <Text style={[styles.metaLabel, { color: theme.colors.textMuted }]}>Rich-text editor</Text>
              <Text style={[styles.metaValue, { color: theme.colors.statusSaved }]}>Active & Enhanced</Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={[styles.metaLabel, { color: theme.colors.textMuted }]}>Supported formats</Text>
              <Text style={[styles.metaValue, { color: theme.colors.textPrimary }]}>
                Bold, Italic, Underline, Strike, H1-H3, Lists
              </Text>
            </View>
          </View>
        </View>

        {/* SECTION 3: SECURITY & APP LOCK */}
        <View style={styles.section}>
          <View style={styles.sectionTitleRow}>
            <Icon name="shield" size={18} color={theme.colors.accent} style={styles.sectionIcon} />
            <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>Security & App Lock</Text>
          </View>

          <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            {/* Biometric Toggle */}
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={[styles.settingLabel, { color: theme.colors.textPrimary }]}>Biometric authentication</Text>
                <Text style={[styles.settingDescription, { color: theme.colors.textSecondary }]}>
                  Require Face ID or Fingerprint to open journal
                </Text>
              </View>
              <Switch
                value={biometricsEnabled}
                onValueChange={handleToggleBiometrics}
                trackColor={{ false: theme.colors.borderLight, true: theme.colors.accent }}
              />
            </View>

            <View style={[styles.divider, { backgroundColor: theme.colors.borderLight }]} />

            {/* PIN Protection */}
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={[styles.settingLabel, { color: theme.colors.textPrimary }]}>PIN protection</Text>
                <Text style={[styles.settingDescription, { color: theme.colors.textSecondary }]}>
                  Protect journal with a private 4-digit PIN
                </Text>
              </View>
              <Switch
                value={pinEnabled}
                onValueChange={handleTogglePin}
                trackColor={{ false: theme.colors.borderLight, true: theme.colors.accent }}
              />
            </View>

            <View style={[styles.divider, { backgroundColor: theme.colors.borderLight }]} />

            {/* Inactivity Auto-Lock */}
            <View style={styles.settingColumn}>
              <View style={styles.settingInfo}>
                <Text style={[styles.settingLabel, { color: theme.colors.textPrimary }]}>Auto-lock timeout</Text>
                <Text style={[styles.settingDescription, { color: theme.colors.textSecondary }]}>
                  Lock application when left in the background
                </Text>
              </View>
              <View style={styles.timeoutRow}>
                {TIMEOUT_OPTIONS.map((opt) => {
                  const isSelected = autoLockTimeout === opt.value;
                  return (
                    <TouchableOpacity
                      key={opt.value}
                      style={[
                        styles.timeoutChip,
                        { backgroundColor: theme.colors.surfaceSubtle, borderColor: theme.colors.borderLight },
                        isSelected && { backgroundColor: theme.colors.accent, borderColor: theme.colors.accent },
                      ]}
                      onPress={() => handleChangeTimeout(opt.value)}
                    >
                      <Text
                        style={[
                          styles.timeoutChipText,
                          { color: isSelected ? '#FFFFFF' : theme.colors.textSecondary },
                          isSelected && styles.timeoutChipTextActive,
                        ]}
                      >
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {(biometricsEnabled || pinEnabled) && (
              <>
                <View style={[styles.divider, { backgroundColor: theme.colors.borderLight }]} />
                <TouchableOpacity
                  style={[styles.lockNowButton, { backgroundColor: theme.colors.surfaceSubtle }]}
                  onPress={lockImmediately}
                  activeOpacity={0.7}
                >
                  <Icon name="lock" size={16} color={theme.colors.accent} style={{ marginRight: 6 }} />
                  <Text style={[styles.lockNowText, { color: theme.colors.accent }]}>Lock Mindspace now</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>

        {/* SECTION 4: DATA & BACKUP */}
        <View style={styles.section}>
          <View style={styles.sectionTitleRow}>
            <Icon name="database" size={18} color={theme.colors.accent} style={styles.sectionIcon} />
            <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>Journal Data & Backups</Text>
          </View>

          <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            <View style={[styles.backupNotice, { backgroundColor: theme.colors.surfaceSubtle }]}>
              <Icon name="info" size={16} color={theme.colors.accentLight} style={{ marginRight: 8 }} />
              <Text style={[styles.backupNoticeText, { color: theme.colors.textSecondary }]}>
                Mindspace is 100% offline. Export regular backups to protect your thoughts against device loss or damage.
              </Text>
            </View>

            <View style={styles.backupButtonsRow}>
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: theme.colors.accent }]}
                onPress={handleExportBackup}
                disabled={isExporting}
                activeOpacity={0.8}
              >
                {isExporting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Icon name="download" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                    <Text style={styles.exportBtnText}>Export Backup</Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.actionBtn,
                  { backgroundColor: theme.colors.surfaceSubtle, borderColor: theme.colors.border, borderWidth: 1 },
                ]}
                onPress={promptRestoreManual}
                disabled={isRestoring}
                activeOpacity={0.8}
              >
                <Icon name="upload" size={16} color={theme.colors.textPrimary} style={{ marginRight: 6 }} />
                <Text style={[styles.restoreBtnText, { color: theme.colors.textPrimary }]}>Restore</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[
                styles.markdownExportBtn,
                { backgroundColor: theme.colors.surfaceSubtle, borderColor: theme.colors.borderLight },
              ]}
              onPress={handleExportMarkdown}
            >
              <Icon name="file-text" size={16} color={theme.colors.textPrimary} style={{ marginRight: 6 }} />
              <Text style={[styles.markdownExportText, { color: theme.colors.textPrimary }]}>
                Export as Formatted Markdown (.md)
              </Text>
            </TouchableOpacity>

            <View style={[styles.divider, { backgroundColor: theme.colors.borderLight }]} />

            <View style={styles.metaRow}>
              <Text style={[styles.metaLabel, { color: theme.colors.textMuted }]}>Last backup exported</Text>
              <Text style={[styles.metaValue, { color: theme.colors.textPrimary }]}>
                {lastBackupAt ? formatFullLocalDate(lastBackupAt) : 'Never'}
              </Text>
            </View>
          </View>
        </View>

        {/* SECTION 5: DIAGNOSTICS & ABOUT */}
        <View style={styles.section}>
          <View style={styles.sectionTitleRow}>
            <Icon name="key" size={18} color={theme.colors.accent} style={styles.sectionIcon} />
            <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>Security & Storage Diagnostics</Text>
          </View>

          <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            <View style={styles.metaRow}>
              <Text style={[styles.metaLabel, { color: theme.colors.textMuted }]}>Database file</Text>
              <Text style={[styles.metaValue, { color: theme.colors.textPrimary }]}>mindspace.db</Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={[styles.metaLabel, { color: theme.colors.textMuted }]}>Storage encryption</Text>
              <Text style={[styles.metaValue, { color: theme.colors.statusSaved }]}>
                SQLCipher 256-bit AES
              </Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={[styles.metaLabel, { color: theme.colors.textMuted }]}>Encryption key storage</Text>
              <Text style={[styles.metaValue, { color: theme.colors.textPrimary }]}>
                Expo SecureStore (Hardware Keystore)
              </Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={[styles.metaLabel, { color: theme.colors.textMuted }]}>Schema migration</Text>
              <Text style={[styles.metaValue, { color: theme.colors.textPrimary }]}>v3 (Rich Text Support)</Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={[styles.metaLabel, { color: theme.colors.textMuted }]}>Total thoughts</Text>
              <Text style={[styles.metaValue, { color: theme.colors.textPrimary }]}>{totalEntries} thoughts</Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={[styles.metaLabel, { color: theme.colors.textMuted }]}>Network requests</Text>
              <Text style={[styles.metaValue, { color: theme.colors.textPrimary }]}>None (100% Offline)</Text>
            </View>
          </View>
        </View>

        {/* About Card */}
        <View style={styles.section}>
          <View
            style={[
              styles.aboutCard,
              { backgroundColor: theme.colors.surfaceSubtle, borderColor: theme.colors.borderLight },
            ]}
          >
            <Text style={[styles.aboutTitle, { color: theme.colors.textPrimary }]}>Mindspace</Text>
            <Text style={[styles.aboutText, { color: theme.colors.textSecondary }]}>
              A private digital notebook crafted for quiet thought capture, personal reflections, and long-term data preservation.
            </Text>
            <Text style={[styles.aboutVersion, { color: theme.colors.textMuted }]}>
              Version 1.0.0 · Production Ready · Theme & Rich-Text Edition
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* PIN Setup Modal */}
      <Modal visible={showPinModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: theme.colors.surface }]}>
            <Text style={[styles.modalTitle, { color: theme.colors.textPrimary }]}>Set 4-Digit PIN</Text>
            <Text style={[styles.modalSubtitle, { color: theme.colors.textSecondary }]}>
              Choose a PIN to unlock Mindspace when biometrics is not used.
            </Text>

            <TextInput
              value={newPin}
              onChangeText={setNewPin}
              placeholder="Enter 4-digit PIN"
              placeholderTextColor={theme.colors.textPlaceholder}
              keyboardType="numeric"
              maxLength={4}
              secureTextEntry
              style={[
                styles.pinInput,
                {
                  backgroundColor: theme.colors.surfaceSubtle,
                  color: theme.colors.textPrimary,
                  borderColor: theme.colors.border,
                },
              ]}
            />

            <TextInput
              value={confirmPin}
              onChangeText={setConfirmPin}
              placeholder="Confirm 4-digit PIN"
              placeholderTextColor={theme.colors.textPlaceholder}
              keyboardType="numeric"
              maxLength={4}
              secureTextEntry
              style={[
                styles.pinInput,
                {
                  backgroundColor: theme.colors.surfaceSubtle,
                  color: theme.colors.textPrimary,
                  borderColor: theme.colors.border,
                },
              ]}
            />

            {pinError ? <Text style={[styles.modalErrorText, { color: theme.colors.statusError }]}>{pinError}</Text> : null}

            <View style={styles.modalActionsRow}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setShowPinModal(false)}>
                <Text style={[styles.modalCancelText, { color: theme.colors.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalSaveBtn, { backgroundColor: theme.colors.accent }]}
                onPress={handleSavePin}
              >
                <Text style={styles.modalSaveText}>Save PIN</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Manual Restore JSON Modal */}
      <Modal visible={restoreModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: theme.colors.surface }]}>
            <Text style={[styles.modalTitle, { color: theme.colors.textPrimary }]}>Restore Backup</Text>
            <Text style={[styles.modalSubtitle, { color: theme.colors.textSecondary }]}>
              Paste the verified JSON payload from your exported Mindspace backup file:
            </Text>

            <TextInput
              value={restoreJsonInput}
              onChangeText={setRestoreJsonInput}
              placeholder='Paste {"format":"mindspace_backup_v1", ...}'
              placeholderTextColor={theme.colors.textPlaceholder}
              multiline
              style={[
                styles.pinInput,
                {
                  height: 120,
                  textAlignVertical: 'top',
                  backgroundColor: theme.colors.surfaceSubtle,
                  color: theme.colors.textPrimary,
                  borderColor: theme.colors.border,
                },
              ]}
            />

            <View style={styles.modalActionsRow}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setRestoreModalVisible(false)}
              >
                <Text style={[styles.modalCancelText, { color: theme.colors.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalSaveBtn, { backgroundColor: theme.colors.accent }]}
                onPress={() => processRestoreJson(restoreJsonInput.trim())}
              >
                <Text style={styles.modalSaveText}>Verify & Restore</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '700',
  },
  headerSubtitle: {
    fontSize: 13,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionIcon: {
    marginRight: 6,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  card: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
  },
  previewBoxContainer: {
    marginBottom: 10,
  },
  previewLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  previewCard: {
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  settingColumn: {
    paddingVertical: 4,
  },
  settingInfo: {
    flex: 1,
    marginRight: 12,
  },
  settingLabel: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  settingDescription: {
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 10,
  },
  divider: {
    height: 1,
    marginVertical: 14,
  },
  themesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  themeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1.5,
    minWidth: '47%',
  },
  themeCardSelected: {
    borderWidth: 2,
  },
  themeColorDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    marginRight: 8,
  },
  themeCardText: {
    fontSize: 12,
    fontWeight: '500',
  },
  customColorsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  colorDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  colorDotSelected: {
    borderWidth: 3,
    transform: [{ scale: 1.15 }],
  },
  hexInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  hexInput: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    fontSize: 13,
  },
  applyHexBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  applyHexBtnText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 13,
  },
  segmentedRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,0.04)',
    borderRadius: 10,
    padding: 3,
    marginTop: 6,
  },
  segmentedBtn: {
    flex: 1,
    paddingVertical: 6,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentedBtnActive: {
    borderRadius: 8,
  },
  segmentedBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
  },
  resetButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
  timeoutRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  timeoutChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 9999,
    marginRight: 8,
    marginBottom: 6,
    borderWidth: 1,
  },
  timeoutChipText: {
    fontSize: 12,
    fontWeight: '500',
  },
  timeoutChipTextActive: {
    fontWeight: '600',
  },
  lockNowButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
  },
  lockNowText: {
    fontSize: 13,
    fontWeight: '600',
  },
  backupNotice: {
    flexDirection: 'row',
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
  },
  backupNoticeText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
  },
  backupButtonsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 10,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 9999,
  },
  exportBtnText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  restoreBtnText: {
    fontWeight: '600',
    fontSize: 14,
  },
  markdownExportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 9999,
    borderWidth: 1,
  },
  markdownExportText: {
    fontSize: 13,
    fontWeight: '600',
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  metaLabel: {
    fontSize: 12,
  },
  metaValue: {
    fontSize: 12,
    fontWeight: '500',
  },
  aboutCard: {
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
  },
  aboutTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 6,
  },
  aboutText: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 12,
  },
  aboutVersion: {
    fontSize: 11,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    width: '100%',
    maxWidth: 340,
    borderRadius: 22,
    padding: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 6,
  },
  modalSubtitle: {
    fontSize: 12,
    marginBottom: 16,
    lineHeight: 18,
  },
  pinInput: {
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    borderWidth: 1,
    marginBottom: 12,
  },
  modalErrorText: {
    fontSize: 12,
    marginBottom: 12,
  },
  modalActionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 8,
  },
  modalCancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  modalCancelText: {
    fontWeight: '600',
  },
  modalSaveBtn: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 9999,
  },
  modalSaveText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
});
