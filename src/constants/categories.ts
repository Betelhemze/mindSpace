/**
 * Mindspace thought categories.
 * Each category has a stable slug (stored in DB), a display label,
 * a Feather icon name, and a warm accent color pair.
 */

export interface Category {
  slug: string;      // stored in DB — never rename
  label: string;     // display label
  icon: string;      // Feather icon name
  color: string;     // foreground / icon color
  bg: string;        // pill background
}

export const CATEGORIES: Category[] = [
  { slug: 'study',        label: 'Study',        icon: 'book-open',   color: '#3B6EA5', bg: '#E8F0FB' },
  { slug: 'life',         label: 'Life',         icon: 'sun',         color: '#B07D2E', bg: '#FEF6E4' },
  { slug: 'relationship', label: 'Relationship',  icon: 'heart',       color: '#B03A5B', bg: '#FDEDF3' },
  { slug: 'religious',    label: 'Religious',    icon: 'star',        color: '#6B4EA8', bg: '#F0EAFB' },
  { slug: 'health',       label: 'Health',       icon: 'activity',    color: '#2E8B57', bg: '#E6F7EE' },
  { slug: 'work',         label: 'Work',         icon: 'briefcase',   color: '#5A5A5A', bg: '#F0EFEE' },
  { slug: 'creative',     label: 'Creative',     icon: 'pen-tool',    color: '#D4650A', bg: '#FEF0E6' },
  { slug: 'random',       label: 'Random',       icon: 'shuffle',     color: '#8C8D91', bg: '#F4F4F5' },
];

/** Lookup by slug — returns undefined if slug is unrecognised */
export function getCategoryBySlug(slug: string | null | undefined): Category | undefined {
  if (!slug) return undefined;
  return CATEGORIES.find((c) => c.slug === slug);
}

