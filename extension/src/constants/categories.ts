export interface Category {
  slug: string;
  label: string;
  iconName: string;
  color: string;
  bg: string;
}

export const CATEGORIES: Category[] = [
  { slug: 'study',        label: 'Study',        iconName: 'BookOpen', color: '#3B6EA5', bg: '#E8F0FB' },
  { slug: 'life',         label: 'Life',         iconName: 'Sun',      color: '#B07D2E', bg: '#FEF6E4' },
  { slug: 'relationship', label: 'Relationship',  iconName: 'Heart',    color: '#B03A5B', bg: '#FDEDF3' },
  { slug: 'religious',    label: 'Religious',    iconName: 'Star',     color: '#6B4EA8', bg: '#F0EAFB' },
  { slug: 'health',       label: 'Health',       iconName: 'Activity', color: '#2E8B57', bg: '#E6F7EE' },
  { slug: 'work',         label: 'Work',         iconName: 'Briefcase',color: '#5A5A5A', bg: '#F0EFEE' },
  { slug: 'creative',     label: 'Creative',     iconName: 'PenTool',  color: '#D4650A', bg: '#FEF0E6' },
  { slug: 'random',       label: 'Random',       iconName: 'Shuffle',  color: '#8C8D91', bg: '#F4F4F5' },
];

export function getCategoryBySlug(slug: string | null | undefined): Category | undefined {
  if (!slug) return undefined;
  return CATEGORIES.find((c) => c.slug === slug);
}

