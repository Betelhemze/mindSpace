import React, { useState } from 'react';
import { Thought } from '../types';
import { getCategoryBySlug } from '../constants/categories';
import { CategoryIcon } from './CategoryIcon';
import { Clock, Edit2, Trash2, ExternalLink } from 'lucide-react';

interface ThoughtCardProps {
  thought: Thought;
  onEdit: (thought: Thought) => void;
  onDelete: (id: string) => void;
}

export const ThoughtCard: React.FC<ThoughtCardProps> = ({
  thought,
  onEdit,
  onDelete,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const category = getCategoryBySlug(thought.category);

  const isLong = thought.content.length > 240;
  const displayContent =
    isLong && !isExpanded ? `${thought.content.slice(0, 240)}...` : thought.content;

  const dateObj = new Date(thought.created_at);
  const timeStr = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const handleDelete = () => {
    if (window.confirm('Delete this thought?')) {
      onDelete(thought.id);
    }
  };

  return (
    <div className="thought-card">
      <div className="thought-card-header">
        <div className="time-wrapper">
          <Clock size={11} color="#8C8D91" />
          <span className="time-text">{timeStr}</span>
        </div>

        <div className="card-header-right">
          {category && (
            <span
              className="card-category-badge"
              style={{ backgroundColor: category.bg, color: category.color }}
            >
              <CategoryIcon iconName={category.iconName} size={10} color={category.color} />
              <span>{category.label}</span>
            </span>
          )}

          <div className="card-actions">
            <button
              type="button"
              onClick={() => onEdit(thought)}
              className="icon-action-btn"
              title="Edit thought"
            >
              <Edit2 size={13} />
            </button>
            <button
              type="button"
              onClick={handleDelete}
              className="icon-action-btn delete"
              title="Delete thought"
            >
              <Trash2 size={13} />
            </button>
          </div>
        </div>
      </div>

      <div className="thought-content">{displayContent}</div>

      {isLong && (
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="read-more-btn"
        >
          {isExpanded ? 'Show less' : 'Read more'}
        </button>
      )}

      {thought.source_url && (
        <div className="source-link-wrapper">
          <a
            href={thought.source_url}
            target="_blank"
            rel="noreferrer"
            className="source-link"
          >
            <ExternalLink size={10} />
            <span>Source web page</span>
          </a>
        </div>
      )}
    </div>
  );
};

