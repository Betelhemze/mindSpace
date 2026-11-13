/**
 * Input validation and sanitization helpers for Mindspace.
 */

export function isValidThoughtContent(content: string): boolean {
  if (typeof content !== 'string') return false;
  return content.trim().length > 0;
}

export function sanitizeThoughtContent(content: string): string {
  if (typeof content !== 'string') return '';
  return content.trim();
}

/**
 * Validates whether a string is a standard UUID v4.
 */
export function isValidUuid(id: string): boolean {
  if (typeof id !== 'string') return false;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
}

/**
 * Validates ISO 8601 string.
 */
export function isValidIsoDate(str: string): boolean {
  if (!str || typeof str !== 'string') return false;
  const d = new Date(str);
  return !isNaN(d.getTime());
}

/**
 * Sanitizes a search query for SQLite FTS5 MATCH queries or LIKE queries.
 * Strips special FTS control characters that could break queries or cause syntax errors.
 */
export function sanitizeSearchQuery(query: string): string {
  if (!query || typeof query !== 'string') return '';
  // Remove dangerous FTS syntax operators if used as raw tokens
  return query
    .replace(/["*^]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

