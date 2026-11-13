import {
  isValidThoughtContent,
  sanitizeThoughtContent,
  isValidUuid,
  isValidIsoDate,
  sanitizeSearchQuery,
} from '../src/utils/validation';

describe('Validation Utils', () => {
  describe('isValidThoughtContent', () => {
    it('returns false for empty string or whitespace only', () => {
      expect(isValidThoughtContent('')).toBe(false);
      expect(isValidThoughtContent('   ')).toBe(false);
      expect(isValidThoughtContent('\n\t  \n')).toBe(false);
    });

    it('returns true for non-empty text', () => {
      expect(isValidThoughtContent('Reflecting on today')).toBe(true);
      expect(isValidThoughtContent('   Leading space')).toBe(true);
    });
  });

  describe('sanitizeThoughtContent', () => {
    it('trims outer whitespace while preserving internal structure', () => {
      expect(sanitizeThoughtContent('  Morning thoughts \n next line  ')).toBe(
        'Morning thoughts \n next line'
      );
    });
  });

  describe('isValidUuid', () => {
    it('validates standard UUID v4 strings', () => {
      expect(isValidUuid('123e4567-e89b-12d3-a456-426614174000')).toBe(true);
      expect(isValidUuid('c2937722-198b-4d77-a2e9-66ccbed64d62')).toBe(true);
      expect(isValidUuid('invalid-uuid')).toBe(false);
      expect(isValidUuid('')).toBe(false);
    });
  });

  describe('isValidIsoDate', () => {
    it('validates ISO 8601 timestamps', () => {
      expect(isValidIsoDate('2026-11-11T14:30:00.000Z')).toBe(true);
      expect(isValidIsoDate('not-a-date')).toBe(false);
    });
  });

  describe('sanitizeSearchQuery', () => {
    it('removes harmful FTS characters and collapses whitespace', () => {
      expect(sanitizeSearchQuery('   hello "world" * test^   ')).toBe('hello world test');
      expect(sanitizeSearchQuery('')).toBe('');
    });
  });
});

