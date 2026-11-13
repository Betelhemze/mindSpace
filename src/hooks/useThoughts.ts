import { useState, useEffect, useCallback, useRef } from 'react';
import { Thought, ThoughtGroup } from '@/types/thought';
import { getRepositories } from '@/database';
import { formatGroupDate, getLocalDateKey, isTodayLocal } from '@/utils/dateUtils';

export function useThoughts() {
  const [thoughts, setThoughts] = useState<Thought[]>([]);
  const [groupedThoughts, setGroupedThoughts] = useState<ThoughtGroup[]>([]);
  const [todayCount, setTodayCount] = useState<number>(0);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const isSavingRef = useRef<boolean>(false);

  // Group thoughts chronologically by local date
  const groupThoughtsByDate = (items: Thought[]): ThoughtGroup[] => {
    const groupsMap = new Map<string, { displayDate: string; thoughts: Thought[] }>();

    for (const thought of items) {
      const dateKey = getLocalDateKey(thought.created_at);
      if (!groupsMap.has(dateKey)) {
        groupsMap.set(dateKey, {
          displayDate: formatGroupDate(thought.created_at),
          thoughts: [],
        });
      }
      groupsMap.get(dateKey)!.thoughts.push(thought);
    }

    return Array.from(groupsMap.entries()).map(([dateKey, value]) => ({
      dateKey,
      displayDate: value.displayDate,
      thoughts: value.thoughts,
    }));
  };

  const loadThoughts = useCallback(async () => {
    try {
      setError(null);
      const repos = await getRepositories();
      const allThoughts = await repos.thoughts.getAll({ limit: 100, offset: 0 });
      const count = await repos.thoughts.getCount();

      const todayEntries = allThoughts.filter((t) => isTodayLocal(t.created_at));
      setTodayCount(todayEntries.length);
      setTotalCount(count);
      setThoughts(allThoughts);
      setGroupedThoughts(groupThoughtsByDate(allThoughts));
    } catch (err: any) {
      console.error('[useThoughts] Error loading thoughts:', err);
      setError(err?.message || 'Failed to load journal entries');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadThoughts();
  }, [loadThoughts]);

  const refresh = useCallback(async () => {
    setIsRefreshing(true);
    await loadThoughts();
  }, [loadThoughts]);

  /**
   * Save a thought with duplicate prevention and automatic draft clearing.
   */
  const addThought = useCallback(
    async (content: string, category?: string | null): Promise<Thought | null> => {
      if (isSavingRef.current) {
        return null; // Prevent concurrent double-clicks
      }

      isSavingRef.current = true;
      try {
        const repos = await getRepositories();

        // 1. Guard against duplicate rapid saves
        const isDuplicate = await repos.thoughts.isRecentDuplicate(content, 4);
        if (isDuplicate) {
          console.warn('[useThoughts] Duplicate save rejected (already saved recently)');
          return null;
        }

        // 2. Insert into database
        const newThought = await repos.thoughts.create({ content, category });

        // 3. Clear working draft in database
        await repos.drafts.deleteDraft();

        // 4. Update memory state immediately
        setThoughts((prev) => {
          const updated = [newThought, ...prev];
          setGroupedThoughts(groupThoughtsByDate(updated));
          return updated;
        });

        setTotalCount((prev) => prev + 1);
        if (isTodayLocal(newThought.created_at)) {
          setTodayCount((prev) => prev + 1);
        }

        return newThought;
      } catch (err: any) {
        console.error('[useThoughts] Error saving thought:', err);
        setError(err?.message || 'Could not save thought');
        throw err;
      } finally {
        isSavingRef.current = false;
      }
    },
    []
  );

  /**
   * Update an existing thought
   */
  const updateThought = useCallback(async (id: string, content: string, category?: string | null): Promise<Thought> => {
    const repos = await getRepositories();
    const updated = await repos.thoughts.update({ id, content, category });

    setThoughts((prev) => {
      const newList = prev.map((item) => (item.id === id ? updated : item));
      setGroupedThoughts(groupThoughtsByDate(newList));
      return newList;
    });

    return updated;
  }, []);

  /**
   * Delete a thought (soft-delete for safety)
   */
  const deleteThought = useCallback(async (id: string): Promise<boolean> => {
    const repos = await getRepositories();
    const success = await repos.thoughts.softDelete(id);

    if (success) {
      setThoughts((prev) => {
        const deletedItem = prev.find((t) => t.id === id);
        const remaining = prev.filter((item) => item.id !== id);
        setGroupedThoughts(groupThoughtsByDate(remaining));

        if (deletedItem && isTodayLocal(deletedItem.created_at)) {
          setTodayCount((c) => Math.max(0, c - 1));
        }
        setTotalCount((c) => Math.max(0, c - 1));

        return remaining;
      });
    }

    return success;
  }, []);

  return {
    thoughts,
    groupedThoughts,
    todayCount,
    totalCount,
    isLoading,
    isRefreshing,
    error,
    refresh,
    addThought,
    updateThought,
    deleteThought,
  };
}

