import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { CATEGORIES, Category } from '@/constants/categories';
import { theme } from '@/constants/theme';
import { Icon } from './Icon';

interface CategoryPickerProps {
  /** Currently selected slug, or null for "All" / uncategorised */
  selected: string | null;
  onSelect: (slug: string | null) => void;
  /** When true, shows an "All" pill at the front (use in filter bars) */
  showAll?: boolean;
  /** When true, shows an "None" pill to explicitly unset category (use in write/edit forms) */
  showNone?: boolean;
}

export const CategoryPicker: React.FC<CategoryPickerProps> = ({
  selected,
  onSelect,
  showAll = false,
  showNone = false,
}) => {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
      keyboardShouldPersistTaps="handled"
    >
      {showAll && (
        <Pill
          label="All"
          icon="layers"
          color={theme.colors.accentLight}
          bg={theme.colors.accentSubtle}
          selected={selected === null}
          onPress={() => onSelect(null)}
        />
      )}
      {showNone && (
        <Pill
          label="None"
          icon="minus-circle"
          color={theme.colors.textMuted}
          bg={theme.colors.surfaceSubtle}
          selected={selected === null}
          onPress={() => onSelect(null)}
        />
      )}
      {CATEGORIES.map((cat: Category) => (
        <Pill
          key={cat.slug}
          label={cat.label}
          icon={cat.icon}
          color={cat.color}
          bg={cat.bg}
          selected={selected === cat.slug}
          onPress={() => onSelect(cat.slug)}
        />
      ))}
    </ScrollView>
  );
};

interface PillProps {
  label: string;
  icon: string;
  color: string;
  bg: string;
  selected: boolean;
  onPress: () => void;
}

const Pill: React.FC<PillProps> = ({ label, icon, color, bg, selected, onPress }) => (
  <TouchableOpacity
    onPress={onPress}
    activeOpacity={0.75}
    style={[
      styles.pill,
      { backgroundColor: selected ? color : bg },
      selected && styles.pillSelected,
    ]}
    accessibilityRole="button"
    accessibilityState={{ selected }}
    accessibilityLabel={label}
  >
    <Icon
      name={icon as any}
      size={13}
      color={selected ? '#FFFFFF' : color}
      style={styles.pillIcon}
    />
    <Text style={[styles.pillLabel, { color: selected ? '#FFFFFF' : color }]}>{label}</Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    gap: theme.spacing.sm,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 6,
    borderRadius: theme.radii.full,
  },
  pillSelected: {
    // shadow to lift selected pills slightly
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 3,
    elevation: 2,
  },
  pillIcon: {
    marginRight: 5,
  },
  pillLabel: {
    fontSize: theme.typography.sizes.xs,
    fontWeight: '600',
  },
});

