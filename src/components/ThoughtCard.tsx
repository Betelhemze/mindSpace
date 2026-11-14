import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Thought } from '@/types/thought';
import { useTheme } from '@/context/ThemeContext';
import { formatLocalTime, formatGroupDate } from '@/utils/dateUtils';
import { getCategoryBySlug } from '@/constants/categories';
import { Icon } from './Icon';
import { RichTextViewer } from './RichTextViewer';

interface ThoughtCardProps {
  thought: Thought;
  onEdit?: (thought: Thought) => void;
  onDelete?: (id: string) => void;
  showDate?: boolean;
}

export const ThoughtCard: React.FC<ThoughtCardProps> = ({
  thought,
  onEdit,
  onDelete,
  showDate = false,
}) => {
  const { theme, readingScale } = useTheme();
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [showMenu, setShowMenu] = useState<boolean>(false);

  // Check if content is long enough to warrant an expand toggle (> 250 characters or multi-line)
  const isLong = thought.content.length > 250;

  const category = getCategoryBySlug(thought.category);

  const handleDelete = () => {
    setShowMenu(false);
    Alert.alert(
      'Delete thought?',
      'This entry will be removed from your journal.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => onDelete && onDelete(thought.id),
        },
      ]
    );
  };

  const handleEdit = () => {
    setShowMenu(false);
    if (onEdit) {
      onEdit(thought);
    }
  };

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.border,
          ...theme.shadows.card,
        },
      ]}
    >
      {/* Header with timestamp and menu toggle */}
      <View style={styles.header}>
        <View style={styles.timeWrapper}>
          <Icon name="clock" size={12} color={theme.colors.textMuted} style={styles.timeIcon} />
          <Text style={[styles.timeText, { color: theme.colors.textMuted }]}>
            {formatLocalTime(thought.created_at)}
            {showDate && ` · ${formatGroupDate(thought.created_at)}`}
          </Text>
        </View>

        <View style={styles.headerRight}>
          {category && (
            <View style={[styles.categoryBadge, { backgroundColor: category.bg }]}>
              <Icon name={category.icon as any} size={10} color={category.color} style={styles.badgeIcon} />
              <Text style={[styles.badgeLabel, { color: category.color }]}>{category.label}</Text>
            </View>
          )}
          <TouchableOpacity
            onPress={() => setShowMenu((prev) => !prev)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            style={styles.menuTrigger}
            accessibilityLabel="Entry options"
          >
            <Icon name="more-horizontal" size={18} color={theme.colors.textMuted} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Quick contextual action menu */}
      {showMenu && (
        <View style={[styles.actionMenu, { backgroundColor: theme.colors.surfaceSubtle }]}>
          {onEdit && (
            <TouchableOpacity onPress={handleEdit} style={styles.menuItem}>
              <Icon name="edit-2" size={14} color={theme.colors.textSecondary} />
              <Text style={[styles.menuItemText, { color: theme.colors.textSecondary }]}>Edit</Text>
            </TouchableOpacity>
          )}
          {onDelete && (
            <TouchableOpacity
              onPress={handleDelete}
              style={[styles.menuItem, styles.menuItemDelete, { borderLeftColor: theme.colors.border }]}
            >
              <Icon name="trash-2" size={14} color={theme.colors.statusError} />
              <Text style={[styles.menuItemText, { color: theme.colors.statusError }]}>Delete</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Formatted Content Body */}
      <View style={styles.contentContainer}>
        {thought.rich_content ? (
          <RichTextViewer
            rawContent={thought.rich_content}
            compact={isLong && !isExpanded}
            fontSizeScale={readingScale}
          />
        ) : (
          <RichTextViewer
            rawContent={thought.content}
            compact={isLong && !isExpanded}
            fontSizeScale={readingScale}
          />
        )}
      </View>

      {/* Read more toggle for lengthy reflections */}
      {isLong && (
        <TouchableOpacity
          onPress={() => setIsExpanded((prev) => !prev)}
          style={styles.expandToggle}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={[styles.expandText, { color: theme.colors.accentLight }]}>
            {isExpanded ? 'Show less' : 'Read more'}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  timeWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  timeIcon: {
    marginRight: 4,
  },
  timeText: {
    fontSize: 11,
    fontWeight: '500',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 9999,
  },
  badgeIcon: {
    marginRight: 3,
  },
  badgeLabel: {
    fontSize: 10,
    fontWeight: '600',
  },
  menuTrigger: {
    padding: 2,
  },
  actionMenu: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    borderRadius: 10,
    padding: 4,
    marginBottom: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  menuItemDelete: {
    borderLeftWidth: 1,
  },
  menuItemText: {
    fontSize: 12,
    marginLeft: 6,
    fontWeight: '500',
  },
  contentContainer: {
    width: '100%',
  },
  expandToggle: {
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  expandText: {
    fontSize: 12,
    fontWeight: '600',
  },
});
