import { useState, useEffect, useRef, useMemo } from 'react';
import { Thought, ThoughtDraft } from './types';
import {
  getStoredThoughts,
  saveStoredThoughts,
  getStoredDraft,
  saveStoredDraft,
} from './storage/storage';
import { WritingEditor } from './components/WritingEditor';
import { ThoughtCard } from './components/ThoughtCard';
import { CategoryPicker } from './components/CategoryPicker';
import { SettingsModal } from './components/SettingsModal';
import { Search, Settings, Feather, X } from 'lucide-react';

export default function App() {
  const [thoughts, setThoughts] = useState<Thought[]>([]);
  const [draftContent, setDraftContent] = useState('');
  const [draftCategory, setDraftCategory] = useState<string | null>(null);
  const [draftStatus, setDraftStatus] = useState<'clean' | 'unsaved' | 'saving' | 'saved'>('clean');
  const [editingThought, setEditingThought] = useState<Thought | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const draftTimerRef = useRef<any>(null);

  // Load thoughts and draft on mount
  useEffect(() => {
    async function init() {
      const storedThoughts = await getStoredThoughts();
      setThoughts(storedThoughts);

      const savedDraft = await getStoredDraft();
      if (savedDraft && savedDraft.content) {
        setDraftContent(savedDraft.content);
        setDraftCategory(savedDraft.category);
        setDraftStatus('saved');
      }
      setIsLoading(false);
    }
    init();

    // Listen for storage changes from background worker (e.g. context menu right-click captures)
    if (typeof chrome !== 'undefined' && chrome?.storage?.onChanged) {
      const listener = (changes: any) => {
        if (changes.mindspace_thoughts || changes.thoughts) {
          getStoredThoughts().then((updated) => setThoughts(updated));
        }
      };
      chrome.storage.onChanged.addListener(listener);
      return () => {
        chrome.storage.onChanged.removeListener(listener);
      };
    }
  }, []);

  // Debounced auto-save for working draft
  const handleDraftChange = (newContent: string) => {
    setDraftContent(newContent);

    if (editingThought) return; // Don't overwrite draft while editing an existing thought

    if (!newContent.trim()) {
      setDraftStatus('clean');
      saveStoredDraft(null);
      return;
    }

    setDraftStatus('unsaved');
    if (draftTimerRef.current) clearTimeout(draftTimerRef.current);

    draftTimerRef.current = setTimeout(async () => {
      setDraftStatus('saving');
      const draft: ThoughtDraft = {
        content: newContent,
        category: draftCategory,
        updated_at: new Date().toISOString(),
      };
      await saveStoredDraft(draft);
      setDraftStatus('saved');
    }, 600);
  };

  const handleCategoryChange = (cat: string | null) => {
    setDraftCategory(cat);
    if (!editingThought && draftContent.trim()) {
      saveStoredDraft({
        content: draftContent,
        category: cat,
        updated_at: new Date().toISOString(),
      });
    }
  };

  // Save new thought or update existing
  const handleSave = async () => {
    const text = draftContent.trim();
    if (!text) return;

    const now = new Date().toISOString();

    if (editingThought) {
      // Update existing
      const updated = thoughts.map((t) =>
        t.id === editingThought.id
          ? { ...t, content: text, category: draftCategory, updated_at: now }
          : t
      );
      setThoughts(updated);
      await saveStoredThoughts(updated);
      setEditingThought(null);
      setDraftContent('');
      setDraftCategory(null);
      setDraftStatus('clean');
    } else {
      // Create new
      const newThought: Thought = {
        id: crypto.randomUUID(),
        content: text,
        category: draftCategory,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      };

      const updated = [newThought, ...thoughts];
      setThoughts(updated);
      await saveStoredThoughts(updated);

      // Clear working draft
      setDraftContent('');
      setDraftCategory(null);
      setDraftStatus('clean');
      await saveStoredDraft(null);
    }
  };

  const handleStartEdit = (thought: Thought) => {
    setEditingThought(thought);
    setDraftContent(thought.content);
    setDraftCategory(thought.category);
    setDraftStatus('saved');
  };

  const handleCancelEdit = () => {
    setEditingThought(null);
    setDraftContent('');
    setDraftCategory(null);
    setDraftStatus('clean');
  };

  const handleDelete = async (id: string) => {
    const updated = thoughts.filter((t) => t.id !== id);
    setThoughts(updated);
    await saveStoredThoughts(updated);
  };

  const handleImportSuccess = async (imported: Thought[]) => {
    // Merge and deduplicate by id
    const existingIds = new Set(thoughts.map((t) => t.id));
    const toAdd = imported.filter((t) => !existingIds.has(t.id));
    const merged = [...toAdd, ...thoughts].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
    setThoughts(merged);
    await saveStoredThoughts(merged);
  };

  // Filtered thoughts by search and category
  const filteredThoughts = useMemo(() => {
    return thoughts.filter((t) => {
      if (t.deleted_at) return false;
      const matchesCategory = categoryFilter ? t.category === categoryFilter : true;
      const matchesSearch = searchQuery
        ? t.content.toLowerCase().includes(searchQuery.toLowerCase())
        : true;
      return matchesCategory && matchesSearch;
    });
  }, [thoughts, categoryFilter, searchQuery]);

  // Group thoughts by relative date
  const groupedThoughts = useMemo(() => {
    const groups: { [dateStr: string]: Thought[] } = {};
    const today = new Date().toDateString();
    const yesterday = new Date(Date.now() - 86400000).toDateString();

    for (const t of filteredThoughts) {
      const d = new Date(t.created_at).toDateString();
      let label = d;
      if (d === today) label = 'Today';
      else if (d === yesterday) label = 'Yesterday';
      else {
        label = new Date(t.created_at).toLocaleDateString([], {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
        });
      }

      if (!groups[label]) groups[label] = [];
      groups[label].push(t);
    }

    return Object.entries(groups).map(([label, items]) => ({ label, items }));
  }, [filteredThoughts]);

  return (
    <div className="mindspace-container">
      {/* App Header */}
      <header className="app-header">
        <div className="header-brand">
          <Feather size={20} color="#4A4036" />
          <div>
            <h1 className="header-title">Mindspace</h1>
            <span className="header-subtitle">Private Personal Thought Journal</span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsSettingsOpen(true)}
          className="header-icon-btn"
          title="Settings & Backup"
        >
          <Settings size={18} />
        </button>
      </header>

      {/* Search Bar */}
      <div className="search-bar-wrapper">
        <Search size={15} color="#8C8D91" className="search-icon" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search thoughts, ideas, reflections..."
          className="search-input"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => setSearchQuery('')}
            className="search-clear-btn"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* Category Filter Pills */}
      <div className="filter-bar">
        <CategoryPicker
          selected={categoryFilter}
          onSelect={setCategoryFilter}
          showAll
        />
      </div>

      {/* Quick Thought Writing Box */}
      <section className="writing-section">
        <WritingEditor
          content={draftContent}
          category={draftCategory}
          status={draftStatus}
          onChangeContent={handleDraftChange}
          onChangeCategory={handleCategoryChange}
          onSave={handleSave}
          onCancel={handleCancelEdit}
          isEditing={Boolean(editingThought)}
          saveLabel={editingThought ? 'Update thought' : 'Save thought'}
          placeholder={
            editingThought ? 'Edit your thought...' : "What's on your mind? (Ctrl+Enter to save)"
          }
        />
      </section>

      {/* Chronological Journal Feed */}
      <section className="journal-feed-section">
        {isLoading ? (
          <div className="empty-state">Loading your thoughts...</div>
        ) : filteredThoughts.length === 0 ? (
          <div className="empty-state">
            <p className="empty-title">
              {searchQuery
                ? 'No matching thoughts'
                : categoryFilter
                ? `No ${categoryFilter} thoughts recorded`
                : 'Your journal is clear'}
            </p>
            <p className="empty-desc">
              {searchQuery
                ? 'Try a different keyword or phrase.'
                : 'Write your first reflection above or highlight text on any web page to save it here.'}
            </p>
          </div>
        ) : (
          groupedThoughts.map((group) => (
            <div key={group.label} className="date-group">
              <div className="date-group-header">
                <span className="date-group-title">{group.label}</span>
                <span className="date-group-count">
                  {group.items.length} {group.items.length === 1 ? 'thought' : 'thoughts'}
                </span>
              </div>

              <div className="thought-cards-list">
                {group.items.map((thought) => (
                  <ThoughtCard
                    key={thought.id}
                    thought={thought}
                    onEdit={handleStartEdit}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
            </div>
          ))
        )}
      </section>

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        thoughts={thoughts}
        onImportSuccess={handleImportSuccess}
      />
    </div>
  );
}

