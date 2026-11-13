/**
 * Date and time utilities for Mindspace.
 * Storage format is strictly UTC ISO 8601 strings.
 * Display rendering is converted to the user's local device timezone.
 */

export function getCurrentUtcIso(): string {
  return new Date().toISOString();
}

/**
 * Returns YYYY-MM-DD representing the local date of the given ISO string or date.
 */
export function getLocalDateKey(dateOrIso: string | Date = new Date()): string {
  const d = typeof dateOrIso === 'string' ? new Date(dateOrIso) : dateOrIso;
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Format timestamp into local 12-hour or 24-hour time (e.g. "3:42 PM")
 */
export function formatLocalTime(isoString: string): string {
  if (!isoString) return '';
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

/**
 * Human friendly grouping label: "Today", "Yesterday", or "Monday, Oct 14, 2026"
 */
export function formatGroupDate(isoString: string): string {
  if (!isoString) return '';
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return '';

  const todayKey = getLocalDateKey(new Date());
  const entryKey = getLocalDateKey(d);

  if (entryKey === todayKey) {
    return 'Today';
  }

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  if (entryKey === getLocalDateKey(yesterday)) {
    return 'Yesterday';
  }

  const now = new Date();
  const isSameYear = d.getFullYear() === now.getFullYear();

  return d.toLocaleDateString([], {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    ...(isSameYear ? {} : { year: 'numeric' }),
  });
}

/**
 * Full date display for calendar header or detail view
 */
export function formatFullLocalDate(dateOrIso: string | Date): string {
  const d = typeof dateOrIso === 'string' ? new Date(dateOrIso) : dateOrIso;
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString([], {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * Month and year header for calendar navigation (e.g. "November 2026")
 */
export function formatMonthYear(d: Date): string {
  return d.toLocaleDateString([], { month: 'long', year: 'numeric' });
}

/**
 * Check whether a given ISO date falls on today's local date
 */
export function isTodayLocal(isoString: string): boolean {
  return getLocalDateKey(isoString) === getLocalDateKey(new Date());
}

