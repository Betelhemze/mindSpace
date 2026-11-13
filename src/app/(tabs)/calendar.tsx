import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { theme } from '@/constants/theme';
import { getRepositories } from '@/database';
import { Thought } from '@/types/thought';
import { ThoughtCard } from '@/components/ThoughtCard';
import { EmptyState } from '@/components/EmptyState';
import {
  getLocalDateKey,
  formatMonthYear,
  formatFullLocalDate,
} from '@/utils/dateUtils';
import { Icon } from '@/components/Icon';

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function CalendarScreen() {
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [selectedDateKey, setSelectedDateKey] = useState<string>(getLocalDateKey(new Date()));
  const [datesWithThoughts, setDatesWithThoughts] = useState<Set<string>>(new Set());
  const [thoughtsForSelectedDate, setThoughtsForSelectedDate] = useState<Thought[]>([]);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth() + 1; // 1-indexed

  // Load dates with thoughts for the current month view
  const loadMonthData = useCallback(async () => {
    try {
      const repos = await getRepositories();
      const dates = await repos.thoughts.getDatesWithThoughtsInMonth(year, month);
      setDatesWithThoughts(new Set(dates));
    } catch (err) {
      console.error('[CalendarScreen] Error loading month data:', err);
    }
  }, [year, month]);

  // Load thoughts for the selected date
  const loadDateThoughts = useCallback(async (dateKey: string) => {
    try {
      const repos = await getRepositories();
      const entries = await repos.thoughts.getByLocalDate(dateKey);
      setThoughtsForSelectedDate(entries);
    } catch (err) {
      console.error('[CalendarScreen] Error loading date entries:', err);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadMonthData();
      loadDateThoughts(selectedDateKey);
    }, [loadMonthData, loadDateThoughts, selectedDateKey])
  );

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 2, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month, 1));
  };

  const handleSelectDay = (day: number) => {
    const d = new Date(year, month - 1, day);
    const key = getLocalDateKey(d);
    setSelectedDateKey(key);
    loadDateThoughts(key);
  };

  // Build month calendar grid
  const daysInMonth = new Date(year, month, 0).getDate();
  const firstDayIndex = new Date(year, month - 1, 1).getDay();
  const todayKey = getLocalDateKey(new Date());

  const calendarCells: (number | null)[] = [];
  for (let i = 0; i < firstDayIndex; i++) {
    calendarCells.push(null);
  }
  for (let day = 1; day <= daysInMonth; day++) {
    calendarCells.push(day);
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Screen Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Calendar</Text>
          <Text style={styles.headerSubtitle}>Explore your thoughts by day</Text>
        </View>

        {/* Month Navigation Card */}
        <View style={styles.calendarCard}>
          <View style={styles.monthHeader}>
            <TouchableOpacity
              onPress={handlePrevMonth}
              style={styles.navButton}
              accessibilityLabel="Previous month"
            >
              <Icon name="chevron-left" size={20} color={theme.colors.textPrimary} />
            </TouchableOpacity>

            <Text style={styles.monthTitle}>{formatMonthYear(currentDate)}</Text>

            <TouchableOpacity
              onPress={handleNextMonth}
              style={styles.navButton}
              accessibilityLabel="Next month"
            >
              <Icon name="chevron-right" size={20} color={theme.colors.textPrimary} />
            </TouchableOpacity>
          </View>

          {/* Days of week header */}
          <View style={styles.weekRow}>
            {DAYS_OF_WEEK.map((d) => (
              <Text key={d} style={styles.weekDayText}>
                {d}
              </Text>
            ))}
          </View>

          {/* Grid of days */}
          <View style={styles.grid}>
            {calendarCells.map((day, idx) => {
              if (day === null) {
                return <View key={`empty-${idx}`} style={styles.dayCell} />;
              }

              const cellDateKey = getLocalDateKey(new Date(year, month - 1, day));
              const isSelected = cellDateKey === selectedDateKey;
              const isToday = cellDateKey === todayKey;
              const hasEntries = datesWithThoughts.has(cellDateKey);

              return (
                <TouchableOpacity
                  key={`day-${day}`}
                  style={[styles.dayCell, isSelected && styles.selectedCell]}
                  onPress={() => handleSelectDay(day)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.dayText,
                      isSelected && styles.selectedDayText,
                      isToday && !isSelected && styles.todayText,
                    ]}
                  >
                    {day}
                  </Text>
                  {hasEntries && (
                    <View
                      style={[
                        styles.entryDot,
                        isSelected && styles.selectedEntryDot,
                      ]}
                    />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Selected Date Entries Section */}
        <View style={styles.selectedSectionHeader}>
          <Text style={styles.selectedSectionTitle}>
            {formatFullLocalDate(new Date(`${selectedDateKey}T12:00:00`))}
          </Text>
          <Text style={styles.selectedSectionCount}>
            {thoughtsForSelectedDate.length}{' '}
            {thoughtsForSelectedDate.length === 1 ? 'thought' : 'thoughts'}
          </Text>
        </View>

        {thoughtsForSelectedDate.length === 0 ? (
          <EmptyState
            title="No thoughts on this day"
            description="You didn't record any thoughts on this date."
            actionLabel="Write a thought"
            onAction={() => router.push('/write')}
          />
        ) : (
          thoughtsForSelectedDate.map((item) => (
            <ThoughtCard
              key={item.id}
              thought={item}
              onEdit={(t) => router.push(`/edit/${t.id}`)}
              onDelete={async (id) => {
                const repos = await getRepositories();
                await repos.thoughts.softDelete(id);
                loadDateThoughts(selectedDateKey);
                loadMonthData();
              }}
            />
          ))
        )}
      </ScrollView>
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
    marginBottom: theme.spacing.md,
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
  calendarCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radii.xl,
    padding: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: theme.spacing.xl,
    ...theme.shadows.card,
  },
  monthHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  monthTitle: {
    fontSize: theme.typography.sizes.bodyLarge,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  navButton: {
    padding: theme.spacing.sm,
    borderRadius: theme.radii.full,
    backgroundColor: theme.colors.surfaceSubtle,
  },
  weekRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
    paddingBottom: 6,
  },
  weekDayText: {
    fontSize: theme.typography.sizes.xs,
    fontWeight: '600',
    color: theme.colors.textMuted,
    width: 38,
    textAlign: 'center',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
  },
  dayCell: {
    width: 38,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 2,
    borderRadius: theme.radii.md,
  },
  selectedCell: {
    backgroundColor: theme.colors.accent,
  },
  dayText: {
    fontSize: theme.typography.sizes.body,
    color: theme.colors.textPrimary,
    fontWeight: '500',
  },
  selectedDayText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  todayText: {
    color: theme.colors.statusDraft,
    fontWeight: '700',
  },
  entryDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.colors.accent,
    marginTop: 2,
  },
  selectedEntryDot: {
    backgroundColor: '#FFFFFF',
  },
  selectedSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
    paddingBottom: 4,
  },
  selectedSectionTitle: {
    fontSize: theme.typography.sizes.bodyLarge,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  selectedSectionCount: {
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.textMuted,
  },
});
