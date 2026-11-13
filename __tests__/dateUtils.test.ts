import {
  getCurrentUtcIso,
  getLocalDateKey,
  formatGroupDate,
  isTodayLocal,
} from '../src/utils/dateUtils';

describe('Date Utils', () => {
  it('getCurrentUtcIso returns valid ISO string', () => {
    const iso = getCurrentUtcIso();
    expect(iso).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
  });

  it('getLocalDateKey returns YYYY-MM-DD format', () => {
    const key = getLocalDateKey(new Date('2026-11-11T12:00:00Z'));
    expect(key).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('formatGroupDate recognizes Today and Yesterday', () => {
    const now = new Date();
    expect(formatGroupDate(now.toISOString())).toBe('Today');

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    expect(formatGroupDate(yesterday.toISOString())).toBe('Yesterday');
  });

  it('isTodayLocal identifies whether timestamp is today', () => {
    const now = new Date();
    expect(isTodayLocal(now.toISOString())).toBe(true);

    const oldDate = new Date('2020-01-01T00:00:00Z');
    expect(isTodayLocal(oldDate.toISOString())).toBe(false);
  });
});

