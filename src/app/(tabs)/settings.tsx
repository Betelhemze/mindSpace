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
import { theme } from '@/constants/theme';
import { getRepositories } from '@/database';
import { AuthService } from '@/services/authService';
import { BackupService } from '@/services/backupService';
import { useSecurityLock } from '@/hooks/useSecurityLock';
import { formatFullLocalDate } from '@/utils/dateUtils';
import { Icon } from '@/components/Icon';

const TIMEOUT_OPTIONS = [
  { label: 'Immediately', value: 0 },
  { label: '1 minute', value: 1 },
  { label: '5 minutes', value: 5 },
  { label: '15 minutes', value: 15 },
  { label: 'Never', value: -1 },
];

export default function SettingsScreen() {
  const { lockImmediately, refreshLockSettings } = useSecurityLock();

  const [biometricsEnabled, setBiometricsEnabled] = useState<boolean>(false);
  const [pinEnabled, setPinEnabled] = useState<boolean>(false);
  const [autoLockTimeout, setAutoLockTimeout] = useState<number>(5);
  const [lastBackupAt, setLastBackupAt] = useState<string | null>(null);
  const [totalEntries, setTotalEntries] = useState<number>(0);

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

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Settings</Text>
          <Text style={styles.headerSubtitle}>Security, privacy, and data ownership</Text>
        </View>

        {/* Section: Security & App Lock */}
        <View style={styles.section}>
          <View style={styles.sectionTitleRow}>
            <Icon name="shield" size={18} color={theme.colors.accent} style={styles.sectionIcon} />
            <Text style={styles.sectionTitle}>Security & App Lock</Text>
          </View>

          <View style={styles.card}>
            {/* Biometric Toggle */}
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Biometric authentication</Text>
                <Text style={styles.settingDescription}>
                  Require Face ID or Fingerprint to open journal
                </Text>
              </View>
              <Switch
                value={biometricsEnabled}
                onValueChange={handleToggleBiometrics}
                trackColor={{ false: theme.colors.borderLight, true: theme.colors.accent }}
              />
            </View>

            <View style={styles.divider} />

            {/* PIN Protection */}
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>PIN protection</Text>
                <Text style={styles.settingDescription}>
                  Protect journal with a private 4-digit PIN
                </Text>
              </View>
              <Switch
                value={pinEnabled}
                onValueChange={handleTogglePin}
                trackColor={{ false: theme.colors.borderLight, true: theme.colors.accent }}
              />
            </View>

            <View style={styles.divider} />

            {/* Inactivity Auto-Lock */}
            <View style={styles.settingColumn}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Auto-lock timeout</Text>
                <Text style={styles.settingDescription}>
                  Lock application when left in the background
                </Text>
              </View>
              <View style={styles.timeoutRow}>
                {TIMEOUT_OPTIONS.map((opt) => {
                  const isSelected = autoLockTimeout === opt.value;
                  return (
                    <TouchableOpacity
                      key={opt.value}
                      style={[styles.timeoutChip, isSelected && styles.timeoutChipActive]}
                      onPress={() => handleChangeTimeout(opt.value)}
                    >
                      <Text
                        style={[styles.timeoutChipText, isSelected && styles.timeoutChipTextActive]}
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
                <View style={styles.divider} />
                <TouchableOpacity
                  style={styles.lockNowButton}
                  onPress={lockImmediately}
                  activeOpacity={0.7}
                >
                  <Icon name="lock" size={16} color={theme.colors.accent} style={{ marginRight: 6 }} />
                  <Text style={styles.lockNowText}>Lock Mindspace now</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>

        {/* Section: Data & Backup */}
        <View style={styles.section}>
          <View style={styles.sectionTitleRow}>
            <Icon name="database" size={18} color={theme.colors.accent} style={styles.sectionIcon} />
            <Text style={styles.sectionTitle}>Journal Data & Backups</Text>
          </View>

          <View style={styles.card}>
            <View style={styles.backupNotice}>
              <Icon name="info" size={16} color={theme.colors.accentLight} style={{ marginRight: 8 }} />
              <Text style={styles.backupNoticeText}>
                Mindspace is 100% offline. Export regular backups to protect your thoughts against device loss or damage.
              </Text>
            </View>

            <View style={styles.backupButtonsRow}>
              <TouchableOpacity
                style={[styles.actionBtn, styles.exportBtn]}
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
                style={[styles.actionBtn, styles.restoreBtn]}
                onPress={promptRestoreManual}
                disabled={isRestoring}
                activeOpacity={0.8}
              >
                <Icon name="upload" size={16} color={theme.colors.textPrimary} style={{ marginRight: 6 }} />
                <Text style={styles.restoreBtnText}>Restore</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.divider} />

            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Last backup exported</Text>
              <Text style={styles.metaValue}>
                {lastBackupAt ? formatFullLocalDate(lastBackupAt) : 'Never'}
              </Text>
            </View>
          </View>
        </View>

        {/* Section: Database & Storage Architecture */}
        <View style={styles.section}>
          <View style={styles.sectionTitleRow}>
            <Icon name="key" size={18} color={theme.colors.accent} style={styles.sectionIcon} />
            <Text style={styles.sectionTitle}>Database & Security Diagnostics</Text>
          </View>

          <View style={styles.card}>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Database file</Text>
              <Text style={styles.metaValue}>mindspace.db</Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Storage encryption</Text>
              <Text style={[styles.metaValue, { color: theme.colors.statusSaved }]}>
                SQLCipher 256-bit AES
              </Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Encryption key storage</Text>
              <Text style={styles.metaValue}>Expo SecureStore (Hardware Keychain)</Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Database schema version</Text>
              <Text style={styles.metaValue}>v1.0 (Initial schema)</Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Total thoughts recorded</Text>
              <Text style={styles.metaValue}>{totalEntries} thoughts</Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Network requests</Text>
              <Text style={styles.metaValue}>None (100% Offline)</Text>
            </View>
          </View>
        </View>

        {/* Section: About */}
        <View style={styles.section}>
          <View style={styles.aboutCard}>
            <Text style={styles.aboutTitle}>Mindspace</Text>
            <Text style={styles.aboutText}>
              A private digital notebook crafted for quiet thought capture, personal reflections, and long-term data preservation.
            </Text>
            <Text style={styles.aboutVersion}>Version 1.0.0 · Production Ready</Text>
          </View>
        </View>
      </ScrollView>

      {/* PIN Setup Modal */}
      <Modal visible={showPinModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Set 4-Digit PIN</Text>
            <Text style={styles.modalSubtitle}>
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
              style={styles.pinInput}
            />

            <TextInput
              value={confirmPin}
              onChangeText={setConfirmPin}
              placeholder="Confirm 4-digit PIN"
              placeholderTextColor={theme.colors.textPlaceholder}
              keyboardType="numeric"
              maxLength={4}
              secureTextEntry
              style={styles.pinInput}
            />

            {pinError ? <Text style={styles.modalErrorText}>{pinError}</Text> : null}

            <View style={styles.modalActionsRow}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setShowPinModal(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSaveBtn} onPress={handleSavePin}>
                <Text style={styles.modalSaveText}>Save PIN</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Manual Restore JSON Modal */}
      <Modal visible={restoreModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Restore Backup</Text>
            <Text style={styles.modalSubtitle}>
              Paste the verified JSON payload from your exported Mindspace backup file:
            </Text>

            <TextInput
              value={restoreJsonInput}
              onChangeText={setRestoreJsonInput}
              placeholder='Paste {"format":"mindspace_backup_v1", ...}'
              placeholderTextColor={theme.colors.textPlaceholder}
              multiline
              style={[styles.pinInput, { height: 120, textAlignVertical: 'top' }]}
            />

            <View style={styles.modalActionsRow}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setRestoreModalVisible(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalSaveBtn}
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
    backgroundColor: theme.colors.background,
  },
  scrollContent: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.xxl,
  },
  header: {
    marginBottom: theme.spacing.lg,
  },
  headerTitle: {
    fontSize: theme.typography.sizes.display,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  headerSubtitle: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
  },
  section: {
    marginBottom: theme.spacing.xl,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  sectionIcon: {
    marginRight: 6,
  },
  sectionTitle: {
    fontSize: theme.typography.sizes.bodyLarge,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radii.lg,
    padding: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadows.card,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: theme.spacing.xs,
  },
  settingColumn: {
    paddingVertical: theme.spacing.xs,
  },
  settingInfo: {
    flex: 1,
    marginRight: theme.spacing.md,
  },
  settingLabel: {
    fontSize: theme.typography.sizes.body,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: 2,
  },
  settingDescription: {
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.textSecondary,
    lineHeight: 16,
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.borderLight,
    marginVertical: theme.spacing.md,
  },
  timeoutRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: theme.spacing.sm,
  },
  timeoutChip: {
    backgroundColor: theme.colors.surfaceSubtle,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 6,
    borderRadius: theme.radii.full,
    marginRight: theme.spacing.sm,
    marginBottom: theme.spacing.xs,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
  },
  timeoutChipActive: {
    backgroundColor: theme.colors.accent,
    borderColor: theme.colors.accent,
  },
  timeoutChipText: {
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },
  timeoutChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  lockNowButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surfaceSubtle,
    paddingVertical: theme.spacing.sm + 2,
    borderRadius: theme.radii.md,
  },
  lockNowText: {
    fontSize: theme.typography.sizes.sm,
    fontWeight: '600',
    color: theme.colors.accent,
  },
  backupNotice: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surfaceSubtle,
    borderRadius: theme.radii.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  backupNoticeText: {
    flex: 1,
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.textSecondary,
    lineHeight: 18,
  },
  backupButtonsRow: {
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.md,
    borderRadius: theme.radii.full,
  },
  exportBtn: {
    backgroundColor: theme.colors.accent,
  },
  exportBtnText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: theme.typography.sizes.body,
  },
  restoreBtn: {
    backgroundColor: theme.colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  restoreBtnText: {
    color: theme.colors.textPrimary,
    fontWeight: '600',
    fontSize: theme.typography.sizes.body,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  metaLabel: {
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.textMuted,
  },
  metaValue: {
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.textPrimary,
    fontWeight: '500',
  },
  aboutCard: {
    backgroundColor: theme.colors.surfaceSubtle,
    borderRadius: theme.radii.lg,
    padding: theme.spacing.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
  },
  aboutTitle: {
    fontSize: theme.typography.sizes.title,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: 6,
  },
  aboutText: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: theme.spacing.md,
  },
  aboutVersion: {
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.textMuted,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.xl,
  },
  modalCard: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radii.xl,
    padding: theme.spacing.xl,
  },
  modalTitle: {
    fontSize: theme.typography.sizes.title,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: 6,
  },
  modalSubtitle: {
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.lg,
    lineHeight: 18,
  },
  pinInput: {
    backgroundColor: theme.colors.surfaceSubtle,
    borderRadius: theme.radii.md,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    fontSize: theme.typography.sizes.body,
    color: theme.colors.textPrimary,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: theme.spacing.md,
  },
  modalErrorText: {
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.statusError,
    marginBottom: theme.spacing.md,
  },
  modalActionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: theme.spacing.md,
    marginTop: theme.spacing.sm,
  },
  modalCancelBtn: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
  },
  modalCancelText: {
    color: theme.colors.textSecondary,
    fontWeight: '600',
  },
  modalSaveBtn: {
    backgroundColor: theme.colors.accent,
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.radii.full,
  },
  modalSaveText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
});
