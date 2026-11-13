import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { theme } from '@/constants/theme';
import { useThoughts } from '@/hooks/useThoughts';
import { ThoughtCard } from '@/components/ThoughtCard';
import { CategoryPicker } from '@/components/CategoryPicker';
import { EmptyState } from '@/components/EmptyState';
import { getRepositories } from '@/database';
import { Thought } from '@/types/thought';
import { Icon } from '@/components/Icon';

export default function JournalScreen() {
  const { groupedThoughts, isRefreshing, refresh, deleteThought } = useThoughts();
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchResults, setSearchResults] = useState<Thought[]>([]);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

  // Execute database search when query changes
  useEffect(() => {
    let isCancelled = false;

    async function executeSearch() {
      const trimmed = searchQuery.trim();
      if (!trimmed) {
        setSearchResults([]);
        setIsSearching(false);
        return;
      }

      setIsSearching(true);
      try {
        const repos = await getRepositories();
        const results = await repos.search.search(trimmed);
        if (!isCancelled) {
          setSearchResults(results);
        }
      } catch (err) {
        console.error('[JournalScreen] Search error:', err);
      } finally {
        if (!isCancelled) {
          setIsSearching(false);
        }
      }
    }

    const timer = setTimeout(executeSearch, 250);
    return () => {
      isCancelled = true;
      clearTimeout(timer);
    };
  }, [searchQuery]);

  const isQueryActive = searchQuery.trim().length > 0;

  // Filter grouped thoughts by active category
  const filteredGroups = activeCategory
    ? groupedThoughts
        .map((group) => ({
          ...group,
          thoughts: group.thoughts.filter((t) => t.category === activeCategory),
        }))
        .filter((g) => g.thoughts.length > 0)
    : groupedThoughts;

  // Filter search results by active category
  const filteredSearchResults = activeCategory
    ? searchResults.filter((t) => t.category === activeCategory)
    : searchResults;

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Screen Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Journal</Text>
          <Text style={styles.headerSubtitle}>A chronological record of your mind</Text>

          {/* Search Bar */}
          <View style={styles.searchBar}>
            <Icon name="search" size={18} color={theme.colors.textMuted} style={styles.searchIcon} />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search thoughts, ideas, memories..."
              placeholderTextColor={theme.colors.textPlaceholder}
              style={styles.searchInput}
              clearButtonMode="while-editing"
              returnKeyType="search"
            />
            {isSearching ? (
              <ActivityIndicator size="small" color={theme.colors.accent} />
            ) : isQueryActive ? (
              <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Icon name="x" size={18} color={theme.colors.textMuted} />
              </TouchableOpacity>
            ) : null}
          </View>
        </View>

        {/* Category filter bar */}
        <CategoryPicker
          selected={activeCategory}
          onSelect={setActiveCategory}
          showAll
        />

        {/* Content View: Search Results vs Chronological Groups */}
        {isQueryActive ? (
          <FlatList
            data={filteredSearchResults}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            ListHeaderComponent={
              <Text style={styles.resultSummary}>
                {filteredSearchResults.length} {filteredSearchResults.length === 1 ? 'result' : 'results'} for &ldquo;{searchQuery}&rdquo;
                {activeCategory ? ` in ${activeCategory}` : ''}
              </Text>
            }
            ListEmptyComponent={
              !isSearching ? (
                <EmptyState
                  title="No matching thoughts"
                  description="Try searching for different keywords, phrases, or topics."
                />
              ) : undefined
            }
            renderItem={({ item }) => (
              <ThoughtCard
                thought={item}
                showDate
                onEdit={(t) => router.push(`/edit/${t.id}`)}
                onDelete={deleteThought}
              />
            )}
          />
        ) : (
          <FlatList
            data={filteredGroups}
            keyExtractor={(group) => group.dateKey}
            contentContainerStyle={styles.listContent}
            refreshing={isRefreshing}
            onRefresh={refresh}
            ListEmptyComponent={
              <EmptyState
                title={activeCategory ? `No ${activeCategory} thoughts yet` : 'Your journal is empty'}
                description={
                  activeCategory
                    ? `Thoughts tagged as "${activeCategory}" will appear here.`
                    : 'Thoughts you capture will appear here grouped by day.'
                }
                actionLabel="Write a thought"
                onAction={() => router.push('/write')}
              />
            }
            renderItem={({ item: group }) => (
              <View style={styles.groupSection}>
                <View style={styles.groupHeader}>
                  <Text style={styles.groupTitle}>{group.displayDate}</Text>
                  <Text style={styles.groupCount}>
                    {group.thoughts.length} {group.thoughts.length === 1 ? 'thought' : 'thoughts'}
                  </Text>
                </View>
                {group.thoughts.map((t) => (
                  <ThoughtCard
                    key={t.id}
                    thought={t}
                    onEdit={(thought) => router.push(`/edit/${thought.id}`)}
                    onDelete={deleteThought}
                  />
                ))}
              </View>
            )}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
  },
  headerTitle: {
    fontSize: theme.typography.sizes.display,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  headerSubtitle: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.md,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radii.lg,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: theme.spacing.xs,
  },
  searchIcon: {
    marginRight: theme.spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: theme.typography.sizes.body,
    color: theme.colors.textPrimary,
    paddingVertical: 2,
  },
  resultSummary: {
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.textMuted,
    marginBottom: theme.spacing.md,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  listContent: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.lg,
    paddingBottom: theme.spacing.xxl,
  },
  groupSection: {
    marginBottom: theme.spacing.xl,
  },
  groupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: theme.spacing.sm,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
  },
  groupTitle: {
    fontSize: theme.typography.sizes.bodyLarge,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  groupCount: {
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.textMuted,
  },
});
