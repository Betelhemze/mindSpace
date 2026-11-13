import React from 'react';
import { CATEGORIES } from '../constants/categories';
import { CategoryIcon } from './CategoryIcon';

interface CategoryPickerProps {
  selected: string | null;
  onSelect: (slug: string | null) => void;
  showAll?: boolean;
  showNone?: boolean;
}

export const CategoryPicker: React.FC<CategoryPickerProps> = ({
  selected,
  onSelect,
  showAll = false,
  showNone = false,
}) => {
  return (
    <div className="category-scroll-container">
      {showAll && (
        <button
          type="button"
          onClick={() => onSelect(null)}
          className={`category-pill ${selected === null ? 'selected' : ''}`}
          style={{
            backgroundColor: selected === null ? '#4A4036' : '#EAE4D9',
            color: selected === null ? '#FFFFFF' : '#4A4036',
          }}
        >
          <span>All</span>
        </button>
      )}

      {showNone && (
        <button
          type="button"
          onClick={() => onSelect(null)}
          className={`category-pill ${selected === null ? 'selected' : ''}`}
          style={{
            backgroundColor: selected === null ? '#5C5D60' : '#F4EFE6',
            color: selected === null ? '#FFFFFF' : '#8C8D91',
          }}
        >
          <span>None</span>
        </button>
      )}

      {CATEGORIES.map((cat) => {
        const isSelected = selected === cat.slug;
        return (
          <button
            key={cat.slug}
            type="button"
            onClick={() => onSelect(isSelected ? null : cat.slug)}
            className={`category-pill ${isSelected ? 'selected' : ''}`}
            style={{
              backgroundColor: isSelected ? cat.color : cat.bg,
              color: isSelected ? '#FFFFFF' : cat.color,
            }}
          >
            <CategoryIcon
              iconName={cat.iconName}
              size={12}
              color={isSelected ? '#FFFFFF' : cat.color}
            />
            <span>{cat.label}</span>
          </button>
        );
      })}
    </div>
  );
};

