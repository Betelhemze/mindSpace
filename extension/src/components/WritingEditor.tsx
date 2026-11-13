import React, { useEffect, useRef } from 'react';
import { CategoryPicker } from './CategoryPicker';
import { Check, Clock, CornerDownLeft } from 'lucide-react';

interface WritingEditorProps {
  content: string;
  category: string | null;
  status: 'saved' | 'saving' | 'unsaved' | 'clean';
  onChangeContent: (text: string) => void;
  onChangeCategory: (cat: string | null) => void;
  onSave: () => void;
  onCancel?: () => void;
  placeholder?: string;
  saveLabel?: string;
  isEditing?: boolean;
}

export const WritingEditor: React.FC<WritingEditorProps> = ({
  content,
  category,
  status,
  onChangeContent,
  onChangeCategory,
  onSave,
  onCancel,
  placeholder = "What's on your mind?",
  saveLabel = 'Save thought',
  isEditing = false,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const trimmed = content.trim();
  const canSave = trimmed.length > 0;
  const wordCount = trimmed ? trimmed.split(/\s+/).length : 0;

  useEffect(() => {
    // Auto-focus on mount
    textareaRef.current?.focus();
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Ctrl+Enter or Cmd+Enter to save immediately
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      if (canSave) onSave();
    }
  };

  return (
    <div className="writing-editor-card">
      {/* Editor Header / Status */}
      <div className="editor-top-bar">
        <div className="draft-status-pill">
          {status === 'saving' && (
            <>
              <Clock size={12} className="spin" color="#B2641B" />
              <span style={{ color: '#B2641B' }}>Saving draft...</span>
            </>
          )}
          {status === 'saved' && (
            <>
              <Check size={12} color="#2E6930" />
              <span style={{ color: '#2E6930' }}>Draft saved</span>
            </>
          )}
          {status === 'unsaved' && (
            <>
              <Clock size={12} color="#8C8D91" />
              <span>Unsaved edits</span>
            </>
          )}
          {status === 'clean' && <span>New thought</span>}
        </div>

        <div className="top-actions">
          {onCancel && isEditing && (
            <button type="button" onClick={onCancel} className="btn-text">
              Cancel
            </button>
          )}
          <button
            type="button"
            disabled={!canSave}
            onClick={onSave}
            className="btn-primary"
            title="Press Ctrl + Enter to save"
          >
            <span>{saveLabel}</span>
            <CornerDownLeft size={13} style={{ opacity: 0.7 }} />
          </button>
        </div>
      </div>

      {/* Main Textarea */}
      <textarea
        ref={textareaRef}
        value={content}
        onChange={(e) => onChangeContent(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className="editor-textarea"
        rows={isEditing ? 4 : 3}
      />

      {/* Category selection */}
      <div className="editor-category-row">
        <span className="editor-section-label">Category:</span>
        <CategoryPicker
          selected={category}
          onSelect={onChangeCategory}
          showNone
        />
      </div>

      {/* Bottom meta */}
      <div className="editor-bottom-bar">
        <span className="word-count">
          {wordCount} {wordCount === 1 ? 'word' : 'words'}
        </span>
        <span className="shortcut-hint">Ctrl + Enter to save</span>
      </div>
    </div>
  );
};

