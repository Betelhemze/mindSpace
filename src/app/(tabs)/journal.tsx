import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { useTheme } from '@/context/ThemeContext';
import { useThoughts } from '@/hooks/useThoughts';
import { ThoughtCard } from '@/components/ThoughtCard';
import { CategoryPicker } from '@/components/CategoryPicker';
import { EmptyState } from '@/components/EmptyState';
import { getRepositories } from '@/database';
import { Thought } from '@/types/thought';
import { Icon } from '@/components/Icon';

export default function JournalScreen() {
  const { theme } = useTheme();
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
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]} edges={['top', 'left', 'right']}>
      <View style={styles.container}>
        {/* Screen Header */}
        <View style={[styles.header, { borderBottomColor: theme.colors.borderLight }]}>
          <Text style={[styles.headerTitle, { color: theme.colors.textPrimary }]}>Journal</Text>
          <Text style={[styles.headerSubtitle, { color: theme.colors.textSecondary }]}>
            A chronological record of your mind
          </Text>

          {/* Search Bar */}
          <View
            style={[
              styles.searchBar,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border,
              },
            ]}
          >
            <Icon name="search" size={18} color={theme.colors.textMuted} style={styles.searchIcon} />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search thoughts, ideas, memories..."
              placeholderTextColor={theme.colors.textPlaceholder}
              style={[styles.searchInput, { color: theme.colors.textPrimary }]}
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
              <Text style={[styles.resultSummary, { color: theme.colors.textMuted }]}>
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
                <View style={[styles.groupHeader, { borderBottomColor: theme.colors.borderLight }]}>
                  <Text style={[styles.groupTitle, { color: theme.colors.textPrimary }]}>{group.displayDate}</Text>
                  <Text style={[styles.groupCount, { color: theme.colors.textMuted }]}>
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
  },
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '700',
  },
  headerSubtitle: {
    fontSize: 13,
    marginBottom: 12,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    marginBottom: 4,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 2,
  },
  resultSummary: {
    fontSize: 11,
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 32,
  },
  groupSection: {
    marginBottom: 24,
  },
  groupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 8,
    paddingBottom: 4,
    borderBottomWidth: 1,
  },
  groupTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  groupCount: {
    fontSize: 11,
  },
});
