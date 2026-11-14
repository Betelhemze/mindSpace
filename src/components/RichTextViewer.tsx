import React from 'react';
import { View, Text, StyleSheet, TextStyle } from 'react-native';
import { RichTextDocument, RichTextBlock, RichTextSpan } from '@/types/richText';
import { deserializeDocument } from '@/utils/richText';
import { useTheme } from '@/context/ThemeContext';
import { FONT_FAMILY_MAP } from '@/constants/themes';

interface RichTextViewerProps {
  document?: RichTextDocument | null;
  rawContent?: string | null;
  numberOfLines?: number;
  fontSizeScale?: number;
  customTextColor?: string;
  compact?: boolean;
}

export const RichTextViewer: React.FC<RichTextViewerProps> = ({
  document,
  rawContent,
  numberOfLines,
  fontSizeScale = 1.0,
  customTextColor,
  compact = false,
}) => {
  const { theme } = useTheme();

  // Resolve document representation
  const doc = document || deserializeDocument(rawContent);

  if (!doc || !Array.isArray(doc.blocks) || doc.blocks.length === 0) {
    return null;
  }

  const renderSpan = (span: RichTextSpan, index: number, blockType: string) => {
    const spanStyles: TextStyle[] = [];

    // Font weight
    if (span.bold || blockType.startsWith('h')) {
      spanStyles.push({ fontWeight: '700' });
    }

    // Font style
    if (span.italic) {
      spanStyles.push({ fontStyle: 'italic' });
    }

    // Text decoration
    if (span.underline && span.strikethrough) {
      spanStyles.push({ textDecorationLine: 'underline line-through' });
    } else if (span.underline) {
      spanStyles.push({ textDecorationLine: 'underline' });
    } else if (span.strikethrough) {
      spanStyles.push({ textDecorationLine: 'line-through' });
    }

    // Custom text color
    if (span.color) {
      spanStyles.push({ color: span.color });
    } else if (customTextColor) {
      spanStyles.push({ color: customTextColor });
    } else {
      spanStyles.push({ color: theme.colors.textPrimary });
    }

    // Font family override
    if (span.fontFamily && FONT_FAMILY_MAP[span.fontFamily]) {
      const family = span.bold
        ? FONT_FAMILY_MAP[span.fontFamily].bold
        : span.fontFamily === 'serif'
        ? FONT_FAMILY_MAP.serif.regular
        : FONT_FAMILY_MAP[span.fontFamily].regular;
      spanStyles.push({ fontFamily: family });
    }

    // Font size override
    if (span.fontSize) {
      switch (span.fontSize) {
        case 'small':
          spanStyles.push({ fontSize: Math.round(theme.typography.sizes.sm * fontSizeScale) });
          break;
        case 'large':
          spanStyles.push({ fontSize: Math.round(theme.typography.sizes.bodyLarge * fontSizeScale) });
          break;
        case 'title':
          spanStyles.push({ fontSize: Math.round(theme.typography.sizes.title * fontSizeScale) });
          break;
        default:
          break;
      }
    }

    return (
      <Text key={`span-${index}`} style={spanStyles}>
        {span.text}
      </Text>
    );
  };

  const renderBlock = (block: RichTextBlock, blockIndex: number, listIndex?: number) => {
    let blockContainerStyle = styles.paragraphBlock;
    let baseTextStyle: TextStyle = {
      fontSize: Math.round(theme.typography.sizes.body * fontSizeScale),
      lineHeight: Math.round(theme.typography.lineHeights.body * fontSizeScale),
      color: customTextColor || theme.colors.textPrimary,
    };

    switch (block.type) {
      case 'h1':
        blockContainerStyle = styles.h1Block;
        baseTextStyle = {
          fontSize: Math.round(theme.typography.sizes.header * fontSizeScale),
          lineHeight: Math.round(theme.typography.lineHeights.header * fontSizeScale),
          fontWeight: '700',
          color: customTextColor || theme.colors.textPrimary,
        };
        break;
      case 'h2':
        blockContainerStyle = styles.h2Block;
        baseTextStyle = {
          fontSize: Math.round(theme.typography.sizes.title * fontSizeScale),
          lineHeight: Math.round(theme.typography.lineHeights.title * fontSizeScale),
          fontWeight: '700',
          color: customTextColor || theme.colors.textPrimary,
        };
        break;
      case 'h3':
        blockContainerStyle = styles.h3Block;
        baseTextStyle = {
          fontSize: Math.round(theme.typography.sizes.bodyLarge * fontSizeScale),
          lineHeight: Math.round(theme.typography.lineHeights.bodyLarge * fontSizeScale),
          fontWeight: '600',
          color: customTextColor || theme.colors.textPrimary,
        };
        break;
      case 'bullet-list':
        return (
          <View key={block.id || `block-${blockIndex}`} style={styles.listItemRow}>
            <Text style={[styles.bulletPoint, { color: theme.colors.accent }]}>•</Text>
            <Text style={[styles.listContent, baseTextStyle]} numberOfLines={compact ? 2 : undefined}>
              {(block.spans || []).map((span, idx) => renderSpan(span, idx, block.type))}
            </Text>
          </View>
        );
      case 'numbered-list':
        return (
          <View key={block.id || `block-${blockIndex}`} style={styles.listItemRow}>
            <Text style={[styles.numberPrefix, { color: theme.colors.textSecondary }]}>
              {listIndex ?? 1}.
            </Text>
            <Text style={[styles.listContent, baseTextStyle]} numberOfLines={compact ? 2 : undefined}>
              {(block.spans || []).map((span, idx) => renderSpan(span, idx, block.type))}
            </Text>
          </View>
        );
      default:
        break;
    }

    return (
      <View key={block.id || `block-${blockIndex}`} style={compact ? styles.compactBlock : blockContainerStyle}>
        <Text style={baseTextStyle} numberOfLines={compact ? 3 : undefined}>
          {(block.spans || []).map((span, idx) => renderSpan(span, idx, block.type))}
        </Text>
      </View>
    );
  };

  let currentNumberedIndex = 1;

  // In compact mode, show only top blocks
  const visibleBlocks = compact ? doc.blocks.slice(0, 3) : doc.blocks;

  return (
    <View style={styles.container}>
      {visibleBlocks.map((block, idx) => {
        if (block.type === 'numbered-list') {
          const num = currentNumberedIndex++;
          return renderBlock(block, idx, num);
        } else {
          currentNumberedIndex = 1;
          return renderBlock(block, idx);
        }
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  paragraphBlock: {
    marginBottom: 8,
  },
  compactBlock: {
    marginBottom: 4,
  },
  h1Block: {
    marginTop: 12,
    marginBottom: 8,
  },
  h2Block: {
    marginTop: 10,
    marginBottom: 6,
  },
  h3Block: {
    marginTop: 8,
    marginBottom: 4,
  },
  listItemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 4,
    paddingLeft: 4,
  },
  bulletPoint: {
    fontSize: 16,
    lineHeight: 22,
    marginRight: 8,
    fontWeight: '700',
  },
  numberPrefix: {
    fontSize: 14,
    lineHeight: 22,
    marginRight: 6,
    fontWeight: '600',
  },
  listContent: {
    flex: 1,
  },
});

