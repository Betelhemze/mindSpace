import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { theme } from '@/constants/theme';
import { useThoughts } from '@/hooks/useThoughts';
import { useDraft } from '@/hooks/useDraft';
import { ThoughtCard } from '@/components/ThoughtCard';
import { EmptyState } from '@/components/EmptyState';
import { formatFullLocalDate } from '@/utils/dateUtils';
import { Icon } from '@/components/Icon';

export default function HomeScreen() {
  const { thoughts, todayCount, totalCount, isRefreshing, refresh, deleteThought } = useThoughts();
  const { content: draftContent, isLoaded: draftLoaded } = useDraft();

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const hasActiveDraft = Boolean(draftLoaded && draftContent.trim());
  const recentThoughts = thoughts.slice(0, 4);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={refresh}
            tintColor={theme.colors.accent}
          />
        }
      >
        {/* Header Greeting */}
        <View style={styles.header}>
          <Text style={styles.dateText}>{formatFullLocalDate(new Date())}</Text>
          <Text style={styles.greetingText}>{getGreeting()}</Text>

          {/* Today's thought counter pill */}
          <View style={styles.todayPill}>
            <Icon name="sun" size={14} color={theme.colors.accent} style={styles.pillIcon} />
            <Text style={styles.todayPillText}>
              {todayCount === 0
                ? 'No thoughts yet today'
                : todayCount === 1
                ? '1 thought captured today'
                : `${todayCount} thoughts captured today`}
            </Text>
          </View>
        </View>

        {/* Prominent "Write a Thought" Action Card */}
        <TouchableOpacity
          style={styles.writeCard}
          onPress={() => router.push('/write')}
          activeOpacity={0.88}
        >
          <View style={styles.writeCardTop}>
            <View style={styles.writeIconCircle}>
              <Icon name="edit-3" size={20} color={theme.colors.accent} />
            </View>
            {hasActiveDraft && (
              <View style={styles.draftBadge}>
                <Text style={styles.draftBadgeText}>Unfinished draft</Text>
              </View>
            )}
          </View>

          <Text style={styles.writePromptText}>
            {hasActiveDraft ? 'Continue your unfinished draft...' : "What's on your mind right now?"}
          </Text>
          <Text style={styles.writeSubPromptText}>
            Tap to record a thought instantly without distractions.
          </Text>

          <View style={styles.writeCardFooter}>
            <Text style={styles.writeActionLabel}>Start writing</Text>
            <Icon name="arrow-right" size={16} color={theme.colors.accent} />
          </View>
        </TouchableOpacity>

        {/* Recent Thoughts Section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent thoughts</Text>
          {thoughts.length > 0 && (
            <TouchableOpacity onPress={() => router.push('/(tabs)/journal')}>
              <Text style={styles.seeAllText}>View all ({totalCount})</Text>
            </TouchableOpacity>
          )}
        </View>

        {thoughts.length === 0 ? (
          <EmptyState
            title="A calm, empty space"
            description="Capture thoughts, reflections, ideas, and memories. Everything is stored privately on your device."
            actionLabel="Write your first thought"
            onAction={() => router.push('/write')}
          />
        ) : (
          recentThoughts.map((item) => (
            <ThoughtCard
              key={item.id}
              thought={item}
              showDate
              onEdit={(t) => router.push(`/edit/${t.id}`)}
              onDelete={deleteThought}
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
    marginBottom: theme.spacing.lg,
  },
  dateText: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textMuted,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  greetingText: {
    fontSize: theme.typography.sizes.display,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.sm,
  },
  todayPill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceSubtle,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs + 2,
    borderRadius: theme.radii.full,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
  },
  pillIcon: {
    marginRight: 6,
  },
  todayPillText: {
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.textSecondary,
    fontWeight: '600',
  },
  writeCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radii.xl,
    padding: theme.spacing.xl,
    marginBottom: theme.spacing.xl,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadows.card,
  },
  writeCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  writeIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.surfaceSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  draftBadge: {
    backgroundColor: theme.colors.statusDraftBg,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 4,
    borderRadius: theme.radii.full,
    borderWidth: 1,
    borderColor: theme.colors.statusDraft,
  },
  draftBadgeText: {
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.statusDraft,
    fontWeight: '600',
  },
  writePromptText: {
    fontSize: theme.typography.sizes.title,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: 6,
  },
  writeSubPromptText: {
    fontSize: theme.typography.sizes.body,
    color: theme.colors.textSecondary,
    lineHeight: theme.typography.lineHeights.body,
    marginBottom: theme.spacing.lg,
  },
  writeCardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  writeActionLabel: {
    fontSize: theme.typography.sizes.body,
    fontWeight: '600',
    color: theme.colors.accent,
    marginRight: 6,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
    marginTop: theme.spacing.sm,
  },
  sectionTitle: {
    fontSize: theme.typography.sizes.title,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  seeAllText: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.accentLight,
    fontWeight: '600',
  },
});
