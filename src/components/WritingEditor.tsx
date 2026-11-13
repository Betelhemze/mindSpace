import React from 'react';
import {
  View,
  TextInput,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { theme } from '@/constants/theme';
import { DraftStatus } from '@/hooks/useDraft';
import { Icon } from './Icon';

interface WritingEditorProps {
  content: string;
  status: DraftStatus;
  onChangeText: (text: string) => void;
  onSave: () => Promise<void>;
  onCancel?: () => void;
  isSaving: boolean;
  saveButtonLabel?: string;
  placeholder?: string;
  autoFocus?: boolean;
  /** Optional slot rendered between the writing area and the bottom bar */
  footer?: React.ReactNode;
}

export const WritingEditor: React.FC<WritingEditorProps> = ({
  content,
  status,
  onChangeText,
  onSave,
  onCancel,
  isSaving,
  saveButtonLabel = 'Save thought',
  placeholder = "What's on your mind?",
  autoFocus = true,
  footer,
}) => {
  const trimmed = content.trim();
  const canSave = trimmed.length > 0 && !isSaving;
  const wordCount = trimmed ? trimmed.split(/\s+/).length : 0;

  const handleCancel = () => {
    if (!onCancel) return;
    if (trimmed.length > 0) {
      Alert.alert(
        'Discard draft?',
        'Your draft is safely saved and will be waiting for you when you return.',
        [
          { text: 'Keep editing', style: 'cancel' },
          { text: 'Leave for now', style: 'default', onPress: onCancel },
        ]
      );
    } else {
      onCancel();
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
    >
      {/* Top action bar */}
      <View style={styles.topBar}>
        {onCancel && (
          <TouchableOpacity
            onPress={handleCancel}
            style={styles.iconButton}
            accessibilityLabel="Go back"
          >
            <Icon name="arrow-left" size={22} color={theme.colors.textPrimary} />
          </TouchableOpacity>
        )}

        {/* Draft status indicator */}
        <View style={styles.statusPill}>
          {status === 'saving' && (
            <>
              <ActivityIndicator size="small" color={theme.colors.statusDraft} style={styles.statusIcon} />
              <Text style={[styles.statusText, { color: theme.colors.statusDraft }]}>Saving...</Text>
            </>
          )}
          {status === 'saved' && (
            <>
              <Icon name="check" size={14} color={theme.colors.statusSaved} style={styles.statusIcon} />
              <Text style={[styles.statusText, { color: theme.colors.statusSaved }]}>Draft saved</Text>
            </>
          )}
          {status === 'unsaved' && (
            <>
              <Icon name="clock" size={14} color={theme.colors.textMuted} style={styles.statusIcon} />
              <Text style={styles.statusText}>Unsaved edits</Text>
            </>
          )}
          {status === 'empty' && (
            <Text style={styles.statusText}>New thought</Text>
          )}
        </View>

        {/* Save button */}
        <TouchableOpacity
          onPress={onSave}
          disabled={!canSave}
          style={[styles.saveButton, !canSave && styles.saveButtonDisabled]}
          activeOpacity={0.8}
        >
          {isSaving ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.saveButtonText}>{saveButtonLabel}</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Main writing area */}
      <View style={styles.editorWrapper}>
        <TextInput
          value={content}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={theme.colors.textPlaceholder}
          multiline
          autoFocus={autoFocus}
          textAlignVertical="top"
          style={styles.textInput}
          selectionColor={theme.colors.accent}
        />
      </View>

      {/* Optional footer slot (e.g. category picker) */}
      {footer}

      {/* Bottom meta information */}
      <View style={styles.bottomBar}>
        <Text style={styles.wordCountText}>
          {wordCount} {wordCount === 1 ? 'word' : 'words'}
        </Text>
        <Text style={styles.privacyNote}>Encrypted & offline</Text>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
  },
  iconButton: {
    padding: theme.spacing.xs,
    marginRight: theme.spacing.sm,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceSubtle,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs + 2,
    borderRadius: theme.radii.full,
  },
  statusIcon: {
    marginRight: 6,
  },
  statusText: {
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },
  saveButton: {
    backgroundColor: theme.colors.accent,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm + 2,
    borderRadius: theme.radii.full,
    minWidth: 90,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonDisabled: {
    backgroundColor: theme.colors.border,
    opacity: 0.7,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: theme.typography.sizes.body,
    fontWeight: '600',
  },
  editorWrapper: {
    flex: 1,
    paddingHorizontal: theme.spacing.xl,
    paddingTop: theme.spacing.lg,
  },
  textInput: {
    flex: 1,
    fontSize: theme.typography.sizes.bodyLarge,
    lineHeight: theme.typography.lineHeights.bodyLarge,
    color: theme.colors.textPrimary,
  },
  bottomBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderLight,
  },
  wordCountText: {
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.textMuted,
  },
  privacyNote: {
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.textMuted,
    fontStyle: 'italic',
  },
});
