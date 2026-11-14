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
import { useTheme } from '@/context/ThemeContext';
import { useThoughts } from '@/hooks/useThoughts';
import { useDraft } from '@/hooks/useDraft';
import { ThoughtCard } from '@/components/ThoughtCard';
import { EmptyState } from '@/components/EmptyState';
import { formatFullLocalDate } from '@/utils/dateUtils';
import { Icon } from '@/components/Icon';

export default function HomeScreen() {
  const { theme } = useTheme();
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
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]} edges={['top', 'left', 'right']}>
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
          <Text style={[styles.dateText, { color: theme.colors.textMuted }]}>{formatFullLocalDate(new Date())}</Text>
          <Text style={[styles.greetingText, { color: theme.colors.textPrimary }]}>{getGreeting()}</Text>

          {/* Today's thought counter pill */}
          <View
            style={[
              styles.todayPill,
              { backgroundColor: theme.colors.surfaceSubtle, borderColor: theme.colors.borderLight },
            ]}
          >
            <Icon name="sun" size={14} color={theme.colors.accent} style={styles.pillIcon} />
            <Text style={[styles.todayPillText, { color: theme.colors.textSecondary }]}>
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
          style={[
            styles.writeCard,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
              ...theme.shadows.card,
            },
          ]}
          onPress={() => router.push('/write')}
          activeOpacity={0.88}
        >
          <View style={styles.writeCardTop}>
            <View style={[styles.writeIconCircle, { backgroundColor: theme.colors.surfaceSubtle }]}>
              <Icon name="edit-3" size={20} color={theme.colors.accent} />
            </View>
            {hasActiveDraft && (
              <View
                style={[
                  styles.draftBadge,
                  { backgroundColor: theme.colors.statusDraftBg, borderColor: theme.colors.statusDraft },
                ]}
              >
                <Text style={[styles.draftBadgeText, { color: theme.colors.statusDraft }]}>Unfinished draft</Text>
              </View>
            )}
          </View>

          <Text style={[styles.writePromptText, { color: theme.colors.textPrimary }]}>
            {hasActiveDraft ? 'Continue your unfinished draft...' : "What's on your mind right now?"}
          </Text>
          <Text style={[styles.writeSubPromptText, { color: theme.colors.textSecondary }]}>
            Tap to record a thought instantly without distractions.
          </Text>

          <View style={styles.writeCardFooter}>
            <Text style={[styles.writeActionLabel, { color: theme.colors.accent }]}>Start writing</Text>
            <Icon name="arrow-right" size={16} color={theme.colors.accent} />
          </View>
        </TouchableOpacity>

        {/* Recent Thoughts Section */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>Recent thoughts</Text>
          {thoughts.length > 0 && (
            <TouchableOpacity onPress={() => router.push('/(tabs)/journal')}>
              <Text style={[styles.seeAllText, { color: theme.colors.accentLight }]}>View all ({totalCount})</Text>
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
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 32,
  },
  header: {
    marginBottom: 16,
  },
  dateText: {
    fontSize: 13,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  greetingText: {
    fontSize: 32,
    fontWeight: '700',
    marginBottom: 8,
  },
  todayPill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 9999,
    borderWidth: 1,
  },
  pillIcon: {
    marginRight: 6,
  },
  todayPillText: {
    fontSize: 11,
    fontWeight: '600',
  },
  writeCard: {
    borderRadius: 22,
    padding: 24,
    marginBottom: 24,
    borderWidth: 1,
  },
  writeCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  writeIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  draftBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 9999,
    borderWidth: 1,
  },
  draftBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  writePromptText: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 6,
  },
  writeSubPromptText: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 16,
  },
  writeCardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  writeActionLabel: {
    fontSize: 15,
    fontWeight: '600',
    marginRight: 6,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
  },
  seeAllText: {
    fontSize: 13,
    fontWeight: '600',
  },
});
