import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { Icon } from './Icon';
import { BlockType, ActiveFormatting } from '@/types/richText';

export interface EditorToolbarProps {
  formatting: ActiveFormatting;
  canUndo: boolean;
  canRedo: boolean;
  onToggleBold: () => void;
  onToggleItalic: () => void;
  onToggleUnderline: () => void;
  onToggleStrikethrough: () => void;
  onSetBlockType: (type: BlockType) => void;
  onSelectColor: (color?: string) => void;
  onSelectFontSize: (size: 'small' | 'normal' | 'large' | 'title') => void;
  onSelectFontFamily: (family: 'system' | 'serif' | 'monospace') => void;
  onUndo: () => void;
  onRedo: () => void;
}

const PALETTE_COLORS = [
  { label: 'Default', value: undefined, color: '#1F2022' },
  { label: 'Warm Brown', value: '#6B4F3A', color: '#6B4F3A' },
  { label: 'Forest', value: '#2D5A3E', color: '#2D5A3E' },
  { label: 'Slate Blue', value: '#2C5282', color: '#2C5282' },
  { label: 'Dusty Rose', value: '#8C3D4A', color: '#8C3D4A' },
  { label: 'Amber', value: '#B45309', color: '#B45309' },
  { label: 'Violet', value: '#5B21B6', color: '#5B21B6' },
];

export const EditorToolbar: React.FC<EditorToolbarProps> = ({
  formatting,
  canUndo,
  canRedo,
  onToggleBold,
  onToggleItalic,
  onToggleUnderline,
  onToggleStrikethrough,
  onSetBlockType,
  onSelectColor,
  onSelectFontSize,
  onSelectFontFamily,
  onUndo,
  onRedo,
}) => {
  const { theme } = useTheme();

  const [showColorPicker, setShowColorPicker] = useState<boolean>(false);
  const [showFontMenu, setShowFontMenu] = useState<boolean>(false);
  const [showSizeMenu, setShowSizeMenu] = useState<boolean>(false);

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.surface, borderTopColor: theme.colors.borderLight }]}>
      {/* Sub-menu bar if Color Picker is open */}
      {showColorPicker && (
        <View style={[styles.subBar, { backgroundColor: theme.colors.surfaceSubtle }]}>
          <Text style={[styles.subBarTitle, { color: theme.colors.textMuted }]}>Text Color:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.colorRow}>
            {PALETTE_COLORS.map((item, idx) => {
              const isSelected = formatting.color === item.value;
              return (
                <TouchableOpacity
                  key={`color-${idx}`}
                  style={[
                    styles.colorCircle,
                    { backgroundColor: item.color },
                    isSelected && [styles.selectedColorCircle, { borderColor: theme.colors.accent }],
                  ]}
                  onPress={() => {
                    onSelectColor(item.value);
                    setShowColorPicker(false);
                  }}
                  accessibilityLabel={item.label}
                />
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* Sub-menu bar if Font Family Menu is open */}
      {showFontMenu && (
        <View style={[styles.subBar, { backgroundColor: theme.colors.surfaceSubtle }]}>
          <Text style={[styles.subBarTitle, { color: theme.colors.textMuted }]}>Font:</Text>
          {(['system', 'serif', 'monospace'] as const).map((font) => {
            const isSelected = formatting.fontFamily === font;
            return (
              <TouchableOpacity
                key={font}
                style={[
                  styles.optionPill,
                  isSelected && [styles.selectedPill, { backgroundColor: theme.colors.accent }],
                ]}
                onPress={() => {
                  onSelectFontFamily(font);
                  setShowFontMenu(false);
                }}
              >
                <Text
                  style={[
                    styles.optionPillText,
                    { color: isSelected ? '#FFFFFF' : theme.colors.textPrimary },
                  ]}
                >
                  {font === 'system' ? 'Sans' : font === 'serif' ? 'Serif' : 'Mono'}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {/* Sub-menu bar if Font Size Menu is open */}
      {showSizeMenu && (
        <View style={[styles.subBar, { backgroundColor: theme.colors.surfaceSubtle }]}>
          <Text style={[styles.subBarTitle, { color: theme.colors.textMuted }]}>Size:</Text>
          {(['small', 'normal', 'large', 'title'] as const).map((sz) => {
            const isSelected = (formatting.fontSize || 'normal') === sz;
            return (
              <TouchableOpacity
                key={sz}
                style={[
                  styles.optionPill,
                  isSelected && [styles.selectedPill, { backgroundColor: theme.colors.accent }],
                ]}
                onPress={() => {
                  onSelectFontSize(sz);
                  setShowSizeMenu(false);
                }}
              >
                <Text
                  style={[
                    styles.optionPillText,
                    { color: isSelected ? '#FFFFFF' : theme.colors.textPrimary },
                  ]}
                >
                  {sz.charAt(0).toUpperCase() + sz.slice(1)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {/* Primary Horizontal Toolbar */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.toolbarScroll}
        keyboardShouldPersistTaps="always"
      >
        {/* Undo & Redo */}
        <TouchableOpacity
          onPress={onUndo}
          disabled={!canUndo}
          style={[styles.btn, !canUndo && styles.btnDisabled]}
          accessibilityLabel="Undo"
        >
          <Icon name="rotate-ccw" size={17} color={canUndo ? theme.colors.textPrimary : theme.colors.textMuted} />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={onRedo}
          disabled={!canRedo}
          style={[styles.btn, !canRedo && styles.btnDisabled]}
          accessibilityLabel="Redo"
        >
          <Icon name="rotate-cw" size={17} color={canRedo ? theme.colors.textPrimary : theme.colors.textMuted} />
        </TouchableOpacity>

        <View style={[styles.separator, { backgroundColor: theme.colors.borderLight }]} />

        {/* Inline Formatting: Bold, Italic, Underline, Strikethrough */}
        <TouchableOpacity
          onPress={onToggleBold}
          style={[
            styles.btn,
            formatting.bold && [styles.btnActive, { backgroundColor: theme.colors.surfaceSubtle }],
          ]}
          accessibilityLabel="Bold"
        >
          <Text style={[styles.btnLetter, { fontWeight: '700', color: formatting.bold ? theme.colors.accent : theme.colors.textPrimary }]}>
            B
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={onToggleItalic}
          style={[
            styles.btn,
            formatting.italic && [styles.btnActive, { backgroundColor: theme.colors.surfaceSubtle }],
          ]}
          accessibilityLabel="Italic"
        >
          <Text style={[styles.btnLetter, { fontStyle: 'italic', color: formatting.italic ? theme.colors.accent : theme.colors.textPrimary }]}>
            I
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={onToggleUnderline}
          style={[
            styles.btn,
            formatting.underline && [styles.btnActive, { backgroundColor: theme.colors.surfaceSubtle }],
          ]}
          accessibilityLabel="Underline"
        >
          <Text style={[styles.btnLetter, { textDecorationLine: 'underline', color: formatting.underline ? theme.colors.accent : theme.colors.textPrimary }]}>
            U
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={onToggleStrikethrough}
          style={[
            styles.btn,
            formatting.strikethrough && [styles.btnActive, { backgroundColor: theme.colors.surfaceSubtle }],
          ]}
          accessibilityLabel="Strikethrough"
        >
          <Text style={[styles.btnLetter, { textDecorationLine: 'line-through', color: formatting.strikethrough ? theme.colors.accent : theme.colors.textPrimary }]}>
            S
          </Text>
        </TouchableOpacity>

        <View style={[styles.separator, { backgroundColor: theme.colors.borderLight }]} />

        {/* Headings: H1, H2, H3 */}
        <TouchableOpacity
          onPress={() => onSetBlockType(formatting.blockType === 'h1' ? 'paragraph' : 'h1')}
          style={[
            styles.btn,
            formatting.blockType === 'h1' && [styles.btnActive, { backgroundColor: theme.colors.surfaceSubtle }],
          ]}
          accessibilityLabel="Heading 1"
        >
          <Text style={[styles.btnText, { color: formatting.blockType === 'h1' ? theme.colors.accent : theme.colors.textPrimary }]}>
            H1
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => onSetBlockType(formatting.blockType === 'h2' ? 'paragraph' : 'h2')}
          style={[
            styles.btn,
            formatting.blockType === 'h2' && [styles.btnActive, { backgroundColor: theme.colors.surfaceSubtle }],
          ]}
          accessibilityLabel="Heading 2"
        >
          <Text style={[styles.btnText, { color: formatting.blockType === 'h2' ? theme.colors.accent : theme.colors.textPrimary }]}>
            H2
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => onSetBlockType(formatting.blockType === 'h3' ? 'paragraph' : 'h3')}
          style={[
            styles.btn,
            formatting.blockType === 'h3' && [styles.btnActive, { backgroundColor: theme.colors.surfaceSubtle }],
          ]}
          accessibilityLabel="Heading 3"
        >
          <Text style={[styles.btnText, { color: formatting.blockType === 'h3' ? theme.colors.accent : theme.colors.textPrimary }]}>
            H3
          </Text>
        </TouchableOpacity>

        <View style={[styles.separator, { backgroundColor: theme.colors.borderLight }]} />

        {/* Lists: Bullet and Numbered */}
        <TouchableOpacity
          onPress={() => onSetBlockType(formatting.blockType === 'bullet-list' ? 'paragraph' : 'bullet-list')}
          style={[
            styles.btn,
            formatting.blockType === 'bullet-list' && [styles.btnActive, { backgroundColor: theme.colors.surfaceSubtle }],
          ]}
          accessibilityLabel="Bullet list"
        >
          <Icon
            name="list"
            size={18}
            color={formatting.blockType === 'bullet-list' ? theme.colors.accent : theme.colors.textPrimary}
          />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => onSetBlockType(formatting.blockType === 'numbered-list' ? 'paragraph' : 'numbered-list')}
          style={[
            styles.btn,
            formatting.blockType === 'numbered-list' && [styles.btnActive, { backgroundColor: theme.colors.surfaceSubtle }],
          ]}
          accessibilityLabel="Numbered list"
        >
          <Text
            style={[
              styles.btnText,
              { color: formatting.blockType === 'numbered-list' ? theme.colors.accent : theme.colors.textPrimary },
            ]}
          >
            1.
          </Text>
        </TouchableOpacity>

        <View style={[styles.separator, { backgroundColor: theme.colors.borderLight }]} />

        {/* Font Family, Size, Color Dropdowns */}
        <TouchableOpacity
          onPress={() => {
            setShowFontMenu((v) => !v);
            setShowColorPicker(false);
            setShowSizeMenu(false);
          }}
          style={[styles.btn, showFontMenu && [styles.btnActive, { backgroundColor: theme.colors.surfaceSubtle }]]}
          accessibilityLabel="Font family"
        >
          <Text style={[styles.btnText, { color: theme.colors.textPrimary }]}>Aa</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => {
            setShowSizeMenu((v) => !v);
            setShowColorPicker(false);
            setShowFontMenu(false);
          }}
          style={[styles.btn, showSizeMenu && [styles.btnActive, { backgroundColor: theme.colors.surfaceSubtle }]]}
          accessibilityLabel="Font size"
        >
          <Text style={[styles.btnText, { fontSize: 13, color: theme.colors.textPrimary }]}>Size</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => {
            setShowColorPicker((v) => !v);
            setShowFontMenu(false);
            setShowSizeMenu(false);
          }}
          style={[styles.btn, showColorPicker && [styles.btnActive, { backgroundColor: theme.colors.surfaceSubtle }]]}
          accessibilityLabel="Text color"
        >
          <View style={styles.colorIndicatorWrapper}>
            <View
              style={[
                styles.colorDot,
                { backgroundColor: formatting.color || theme.colors.accent },
              ]}
            />
          </View>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderTopWidth: 1,
    paddingVertical: 4,
  },
  toolbarScroll: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  btn: {
    minWidth: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 2,
    paddingHorizontal: 6,
  },
  btnDisabled: {
    opacity: 0.35,
  },
  btnActive: {
    borderRadius: 8,
  },
  btnLetter: {
    fontSize: 16,
  },
  btnText: {
    fontSize: 14,
    fontWeight: '600',
  },
  separator: {
    width: 1,
    height: 22,
    marginHorizontal: 6,
  },
  subBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  subBarTitle: {
    fontSize: 12,
    fontWeight: '600',
    marginRight: 10,
  },
  colorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  colorCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  selectedColorCircle: {
    borderWidth: 2.5,
    transform: [{ scale: 1.15 }],
  },
  optionPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
    backgroundColor: 'rgba(0,0,0,0.04)',
  },
  selectedPill: {
    borderRadius: 12,
  },
  optionPillText: {
    fontSize: 12,
    fontWeight: '600',
  },
  colorIndicatorWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.15)',
  },
});

