import { useState, useEffect, useRef, useCallback } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { getRepositories } from '@/database';

export type DraftStatus = 'saved' | 'saving' | 'unsaved' | 'empty';

export function useDraft(initialDraftId: string = 'main_quick_draft') {
  const [content, setContent] = useState<string>('');
  const [status, setStatus] = useState<DraftStatus>('empty');
  const [isLoaded, setIsLoaded] = useState<boolean>(false);

  const contentRef = useRef<string>('');
  const debounceTimerRef = useRef<any>(null);
  const isSavingRef = useRef<boolean>(false);

  contentRef.current = content;

  // Persist draft to SQLite database
  const persistDraft = useCallback(
    async (textToSave: string) => {
      if (isSavingRef.current) return;
      isSavingRef.current = true;
      setStatus('saving');

      try {
        const repos = await getRepositories();
        await repos.drafts.saveDraft(textToSave, initialDraftId);
        setStatus(textToSave.trim() ? 'saved' : 'empty');
      } catch (err) {
        console.error('[useDraft] Error auto-saving draft:', err);
        setStatus('unsaved');
      } finally {
        isSavingRef.current = false;
      }
    },
    [initialDraftId]
  );

  // Load existing draft from database on mount
  useEffect(() => {
    let isMounted = true;

    async function loadActiveDraft() {
      try {
        const repos = await getRepositories();
        const existing = await repos.drafts.getActiveDraft();
        if (isMounted && existing && existing.content.trim()) {
          setContent(existing.content);
          contentRef.current = existing.content;
          setStatus('saved');
        } else if (isMounted) {
          setStatus('empty');
        }
      } catch (err) {
        console.error('[useDraft] Error loading initial draft:', err);
      } finally {
        if (isMounted) {
          setIsLoaded(true);
        }
      }
    }

    loadActiveDraft();

    return () => {
      isMounted = false;
    };
  }, [initialDraftId]);

  // Handle text changes with debounce
  const updateContent = useCallback(
    (newText: string) => {
      setContent(newText);
      contentRef.current = newText;

      if (!newText.trim()) {
        setStatus('empty');
      } else {
        setStatus('unsaved');
      }

      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      debounceTimerRef.current = setTimeout(() => {
        persistDraft(newText);
      }, 500);
    },
    [persistDraft]
  );

  // AppState listener: Persist immediately when moving to background
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (nextAppState === 'background' || nextAppState === 'inactive') {
        if (debounceTimerRef.current) {
          clearTimeout(debounceTimerRef.current);
        }
        persistDraft(contentRef.current);
      }
    });

    return () => {
      subscription.remove();
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      // Save on hook unmount
      if (contentRef.current.trim()) {
        persistDraft(contentRef.current);
      }
    };
  }, [persistDraft]);

  // Manually clear draft (e.g. after successful save)
  const clearDraft = useCallback(async () => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    setContent('');
    contentRef.current = '';
    setStatus('empty');
    try {
      const repos = await getRepositories();
      await repos.drafts.deleteDraft(initialDraftId);
    } catch (err) {
      console.error('[useDraft] Error deleting draft:', err);
    }
  }, [initialDraftId]);

  return {
    content,
    status,
    isLoaded,
    updateContent,
    clearDraft,
    flushDraft: () => persistDraft(contentRef.current),
  };
}
