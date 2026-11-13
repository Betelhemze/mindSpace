import { Thought, ThoughtDraft } from '../types';

const THOUGHTS_KEY = 'mindspace_thoughts';
const DRAFT_KEY = 'mindspace_draft';

// Check if chrome.storage is available
function isChromeStorage(): boolean {
  return typeof chrome !== 'undefined' && !!chrome?.storage?.local;
}

export async function getStoredThoughts(): Promise<Thought[]> {
  if (isChromeStorage()) {
    const res = await chrome.storage.local.get([THOUGHTS_KEY, 'thoughts']);
    // Check both keys for backward compatibility
    const thoughts = res[THOUGHTS_KEY] || res.thoughts || [];
    return Array.isArray(thoughts) ? thoughts : [];
  }

  // Fallback to localStorage for browser dev
  try {
    const raw = localStorage.getItem(THOUGHTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export async function saveStoredThoughts(thoughts: Thought[]): Promise<void> {
  if (isChromeStorage()) {
    await chrome.storage.local.set({ [THOUGHTS_KEY]: thoughts, thoughts });
    return;
  }
  localStorage.setItem(THOUGHTS_KEY, JSON.stringify(thoughts));
}

export async function getStoredDraft(): Promise<ThoughtDraft | null> {
  if (isChromeStorage()) {
    const res = await chrome.storage.local.get([DRAFT_KEY]);
    return res[DRAFT_KEY] || null;
  }
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export async function saveStoredDraft(draft: ThoughtDraft | null): Promise<void> {
  if (isChromeStorage()) {
    if (draft) {
      await chrome.storage.local.set({ [DRAFT_KEY]: draft });
    } else {
      await chrome.storage.local.remove([DRAFT_KEY]);
    }
    return;
  }
  if (draft) {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  } else {
    localStorage.removeItem(DRAFT_KEY);
  }
}

