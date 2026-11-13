import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Thought } from '@/types/thought';
import { theme } from '@/constants/theme';
import { formatLocalTime, formatGroupDate } from '@/utils/dateUtils';
import { getCategoryBySlug } from '@/constants/categories';
import { Icon } from './Icon';

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
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [showMenu, setShowMenu] = useState<boolean>(false);

  const isLong = thought.content.length > 280;
  const displayContent =
    isLong && !isExpanded ? `${thought.content.slice(0, 280)}...` : thought.content;

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
    <View style={styles.card}>
      {/* Header with timestamp and menu toggle */}
      <View style={styles.header}>
        <View style={styles.timeWrapper}>
          <Icon name="clock" size={12} color={theme.colors.textMuted} style={styles.timeIcon} />
          <Text style={styles.timeText}>
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
        <View style={styles.actionMenu}>
          {onEdit && (
            <TouchableOpacity onPress={handleEdit} style={styles.menuItem}>
              <Icon name="edit-2" size={14} color={theme.colors.textSecondary} />
              <Text style={styles.menuItemText}>Edit</Text>
            </TouchableOpacity>
          )}
          {onDelete && (
            <TouchableOpacity onPress={handleDelete} style={[styles.menuItem, styles.menuItemDelete]}>
              <Icon name="trash-2" size={14} color={theme.colors.statusError} />
              <Text style={[styles.menuItemText, { color: theme.colors.statusError }]}>Delete</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Content body */}
      <Text style={styles.content}>{displayContent}</Text>

      {/* Read more toggle for lengthy reflections */}
      {isLong && (
        <TouchableOpacity
          onPress={() => setIsExpanded((prev) => !prev)}
          style={styles.expandToggle}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={styles.expandText}>{isExpanded ? 'Show less' : 'Read more'}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radii.lg,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadows.card,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
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
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.textMuted,
    fontWeight: '500',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: theme.radii.full,
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
    backgroundColor: theme.colors.surfaceSubtle,
    borderRadius: theme.radii.md,
    padding: theme.spacing.xs,
    marginBottom: theme.spacing.sm,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
  },
  menuItemDelete: {
    borderLeftWidth: 1,
    borderLeftColor: theme.colors.border,
  },
  menuItemText: {
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.textSecondary,
    marginLeft: 6,
    fontWeight: '500',
  },
  content: {
    fontSize: theme.typography.sizes.body,
    lineHeight: theme.typography.lineHeights.body,
    color: theme.colors.textPrimary,
  },
  expandToggle: {
    marginTop: theme.spacing.sm,
    alignSelf: 'flex-start',
  },
  expandText: {
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.accentLight,
    fontWeight: '600',
  },
});
