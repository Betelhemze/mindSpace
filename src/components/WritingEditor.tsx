import React, { useState, useRef, useCallback, useEffect } from 'react';
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
  ScrollView,
} from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { DraftStatus } from '@/hooks/useDraft';
import { Icon } from './Icon';
import { EditorToolbar } from './EditorToolbar';
import { RichTextViewer } from './RichTextViewer';
import { BlockType, ActiveFormatting, RichTextDocument } from '@/types/richText';
import {
  plainTextToDocument,
  documentToPlainText,
  serializeDocument,
  deserializeDocument,
} from '@/utils/richText';

interface WritingEditorProps {
  content: string;
  richContent?: string | null;
  status: DraftStatus;
  onChangeText?: (text: string) => void;
  onChangeContent?: (plainText: string, richContentJson: string) => void;
  onSave: () => Promise<void>;
  onCancel?: () => void;
  isSaving: boolean;
  saveButtonLabel?: string;
  placeholder?: string;
  autoFocus?: boolean;
  footer?: React.ReactNode;
}

export const WritingEditor: React.FC<WritingEditorProps> = ({
  content,
  richContent,
  status,
  onChangeText,
  onChangeContent,
  onSave,
  onCancel,
  isSaving,
  saveButtonLabel = 'Save thought',
  placeholder = "What's on your mind?",
  autoFocus = true,
  footer,
}) => {
  const { theme, writingScale } = useTheme();

  // Mode: 'write' or 'preview'
  const [editorMode, setEditorMode] = useState<'write' | 'preview'>('write');

  // Text selection state
  const [selection, setSelection] = useState<{ start: number; end: number }>({ start: 0, end: 0 });

  // History stack for undo / redo
  const [history, setHistory] = useState<string[]>([content]);
  const [historyIndex, setHistoryIndex] = useState<number>(0);

  // Active formatting state for the toolbar
  const [formatting, setFormatting] = useState<ActiveFormatting>({
    bold: false,
    italic: false,
    underline: false,
    strikethrough: false,
    blockType: 'paragraph',
    color: undefined,
    fontSize: 'normal',
    fontFamily: 'system',
  });

  const inputRef = useRef<any>(null);

  // Synchronize history when content changes from external prop initially
  useEffect(() => {
    if (history.length === 1 && history[0] === '' && content) {
      setHistory([content]);
      setHistoryIndex(0);
    }
  }, [content, history]);

  // Push new state to undo/redo history
  const pushToHistory = useCallback(
    (newText: string) => {
      setHistory((prev) => {
        const next = prev.slice(0, historyIndex + 1);
        next.push(newText);
        // Limit history to 50 snapshots
        if (next.length > 50) next.shift();
        return next;
      });
      setHistoryIndex((prev) => Math.min(prev + 1, 49));
    },
    [historyIndex]
  );

  // Emit changes to caller
  const emitChange = useCallback(
    (newText: string) => {
      // Parse to structured document representation
      const doc: RichTextDocument = plainTextToDocument(newText);
      const serialized = serializeDocument(doc);

      if (onChangeContent) {
        onChangeContent(newText, serialized);
      }
      if (onChangeText) {
        onChangeText(newText);
      }
    },
    [onChangeContent, onChangeText]
  );

  // Handle direct text changes from TextInput
  const handleChangeText = (newText: string) => {
    emitChange(newText);

    // Debounce history snapshot on typing pauses
    pushToHistory(newText);
  };

  // Undo action
  const handleUndo = () => {
    if (historyIndex > 0) {
      const targetIndex = historyIndex - 1;
      const prevText = history[targetIndex];
      setHistoryIndex(targetIndex);
      emitChange(prevText);
    }
  };

  // Redo action
  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const targetIndex = historyIndex + 1;
      const nextText = history[targetIndex];
      setHistoryIndex(targetIndex);
      emitChange(nextText);
    }
  };

  // Helper to wrap selected text with inline formatting markers
  const wrapSelection = (prefix: string, suffix: string = prefix) => {
    const { start, end } = selection;
    const isSelected = start !== end;
    const selectedText = isSelected ? content.slice(start, end) : '';

    // Check if selection is already wrapped with prefix and suffix
    const before = content.slice(0, start);
    const after = content.slice(end);

    let newContent: string;
    let newCursorPos: number;

    if (
      isSelected &&
      selectedText.startsWith(prefix) &&
      selectedText.endsWith(suffix) &&
      selectedText.length >= prefix.length + suffix.length
    ) {
      // Unwrap
      const unwrapped = selectedText.slice(prefix.length, -suffix.length);
      newContent = before + unwrapped + after;
      newCursorPos = start + unwrapped.length;
    } else if (
      !isSelected &&
      before.endsWith(prefix) &&
      after.startsWith(suffix)
    ) {
      // Unwrap empty cursor
      newContent = before.slice(0, -prefix.length) + after.slice(suffix.length);
      newCursorPos = start - prefix.length;
    } else {
      // Wrap
      const textToWrap = isSelected ? selectedText : '';
      newContent = before + prefix + textToWrap + suffix + after;
      newCursorPos = isSelected ? end + prefix.length + suffix.length : start + prefix.length;
    }

    emitChange(newContent);
    pushToHistory(newContent);

    // Maintain cursor position
    setSelection({ start: newCursorPos, end: newCursorPos });
    inputRef.current?.focus();
  };

  // Toggle Bold
  const handleToggleBold = () => {
    wrapSelection('**');
    setFormatting((prev) => ({ ...prev, bold: !prev.bold }));
  };

  // Toggle Italic
  const handleToggleItalic = () => {
    wrapSelection('*');
    setFormatting((prev) => ({ ...prev, italic: !prev.italic }));
  };

  // Toggle Underline
  const handleToggleUnderline = () => {
    wrapSelection('<u>', '</u>');
    setFormatting((prev) => ({ ...prev, underline: !prev.underline }));
  };

  // Toggle Strikethrough
  const handleToggleStrikethrough = () => {
    wrapSelection('~~');
    setFormatting((prev) => ({ ...prev, strikethrough: !prev.strikethrough }));
  };

  // Change current line block type (Headings, Lists, Paragraph)
  const handleSetBlockType = (type: BlockType) => {
    const { start } = selection;
    // Find the current line start and end
    const lastNewline = content.lastIndexOf('\n', start - 1);
    const lineStart = lastNewline === -1 ? 0 : lastNewline + 1;
    const nextNewline = content.indexOf('\n', start);
    const lineEnd = nextNewline === -1 ? content.length : nextNewline;

    const currentLine = content.slice(lineStart, lineEnd);
    // Strip existing prefix (# , ## , ### , - , • , 1. )
    const cleanLine = currentLine
      .replace(/^(#{1,3}\s|[•\-]\s|\d+\.\s)/, '')
      .trimStart();

    let prefix = '';
    switch (type) {
      case 'h1':
        prefix = '# ';
        break;
      case 'h2':
        prefix = '## ';
        break;
      case 'h3':
        prefix = '### ';
        break;
      case 'bullet-list':
        prefix = '• ';
        break;
      case 'numbered-list':
        prefix = '1. ';
        break;
      default:
        prefix = '';
        break;
    }

    const newLine = prefix + cleanLine;
    const newContent = content.slice(0, lineStart) + newLine + content.slice(lineEnd);

    emitChange(newContent);
    pushToHistory(newContent);
    setFormatting((prev) => ({ ...prev, blockType: type }));
  };

  // Select custom color
  const handleSelectColor = (color?: string) => {
    setFormatting((prev) => ({ ...prev, color }));
  };

  // Select font size
  const handleSelectFontSize = (size: 'small' | 'normal' | 'large' | 'title') => {
    setFormatting((prev) => ({ ...prev, fontSize: size }));
  };

  // Select font family
  const handleSelectFontFamily = (family: 'system' | 'serif' | 'monospace') => {
    setFormatting((prev) => ({ ...prev, fontFamily: family }));
  };

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
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      {/* Top Bar */}
      <View style={[styles.topBar, { borderBottomColor: theme.colors.borderLight }]}>
        {onCancel && (
          <TouchableOpacity
            onPress={handleCancel}
            style={styles.iconButton}
            accessibilityLabel="Go back"
          >
            <Icon name="arrow-left" size={22} color={theme.colors.textPrimary} />
          </TouchableOpacity>
        )}

        {/* Draft Status Pill */}
        <View style={[styles.statusPill, { backgroundColor: theme.colors.surfaceSubtle }]}>
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
              <Text style={[styles.statusText, { color: theme.colors.textSecondary }]}>Unsaved edits</Text>
            </>
          )}
          {status === 'empty' && (
            <Text style={[styles.statusText, { color: theme.colors.textSecondary }]}>New thought</Text>
          )}
        </View>

        {/* View / Edit Mode Toggle Button */}
        <TouchableOpacity
          onPress={() => setEditorMode((m) => (m === 'write' ? 'preview' : 'write'))}
          style={[styles.modeToggle, { backgroundColor: theme.colors.surfaceSubtle }]}
          accessibilityLabel={editorMode === 'write' ? 'Switch to Preview' : 'Switch to Write'}
        >
          <Icon
            name={editorMode === 'write' ? 'eye' : 'edit-2'}
            size={16}
            color={theme.colors.accent}
            style={{ marginRight: 4 }}
          />
          <Text style={[styles.modeToggleText, { color: theme.colors.accent }]}>
            {editorMode === 'write' ? 'Preview' : 'Write'}
          </Text>
        </TouchableOpacity>

        {/* Save Button */}
        <TouchableOpacity
          onPress={onSave}
          disabled={!canSave}
          style={[
            styles.saveButton,
            { backgroundColor: canSave ? theme.colors.accent : theme.colors.border },
            !canSave && styles.saveButtonDisabled,
          ]}
          activeOpacity={0.8}
        >
          {isSaving ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.saveButtonText}>{saveButtonLabel}</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Main Content Area */}
      {editorMode === 'write' ? (
        <View style={styles.editorWrapper}>
          <TextInput
            ref={inputRef}
            value={content}
            onChangeText={handleChangeText}
            onSelectionChange={(e) => setSelection(e.nativeEvent.selection)}
            placeholder={placeholder}
            placeholderTextColor={theme.colors.textPlaceholder}
            multiline
            autoFocus={autoFocus}
            textAlignVertical="top"
            style={[
              styles.textInput,
              {
                fontSize: Math.round(theme.typography.sizes.bodyLarge * writingScale),
                lineHeight: Math.round(theme.typography.lineHeights.bodyLarge * writingScale),
                color: theme.colors.textPrimary,
                fontFamily:
                  formatting.fontFamily === 'serif'
                    ? 'serif'
                    : formatting.fontFamily === 'monospace'
                    ? 'monospace'
                    : theme.typography.fontFamilies.regular,
              },
            ]}
            selectionColor={theme.colors.accent}
          />
        </View>
      ) : (
        <ScrollView style={styles.previewWrapper} contentContainerStyle={styles.previewScroll}>
          <RichTextViewer rawContent={content} />
        </ScrollView>
      )}

      {/* Optional slot (e.g. Category picker) */}
      {footer}

      {/* Rich-Text Formatting Toolbar (rendered only in write mode) */}
      {editorMode === 'write' && (
        <EditorToolbar
          formatting={formatting}
          canUndo={historyIndex > 0}
          canRedo={historyIndex < history.length - 1}
          onToggleBold={handleToggleBold}
          onToggleItalic={handleToggleItalic}
          onToggleUnderline={handleToggleUnderline}
          onToggleStrikethrough={handleToggleStrikethrough}
          onSetBlockType={handleSetBlockType}
          onSelectColor={handleSelectColor}
          onSelectFontSize={handleSelectFontSize}
          onSelectFontFamily={handleSelectFontFamily}
          onUndo={handleUndo}
          onRedo={handleRedo}
        />
      )}

      {/* Bottom Meta Information Bar */}
      <View style={[styles.bottomBar, { borderTopColor: theme.colors.borderLight }]}>
        <Text style={[styles.wordCountText, { color: theme.colors.textMuted }]}>
          {wordCount} {wordCount === 1 ? 'word' : 'words'}
        </Text>
        <Text style={[styles.privacyNote, { color: theme.colors.textMuted }]}>Encrypted & offline</Text>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  iconButton: {
    padding: 4,
    marginRight: 6,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 9999,
  },
  statusIcon: {
    marginRight: 6,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '500',
  },
  modeToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 9999,
  },
  modeToggleText: {
    fontSize: 12,
    fontWeight: '600',
  },
  saveButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 9999,
    minWidth: 84,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.65,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  editorWrapper: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  textInput: {
    flex: 1,
    textAlignVertical: 'top',
  },
  previewWrapper: {
    flex: 1,
  },
  previewScroll: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 32,
  },
  bottomBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderTopWidth: 1,
  },
  wordCountText: {
    fontSize: 11,
  },
  privacyNote: {
    fontSize: 11,
    fontStyle: 'italic',
  },
});
