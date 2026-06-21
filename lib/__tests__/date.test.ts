import { dateStr, todayStr, currentMonthStr } from '@/lib/date';

describe('lib/date', () => {
  it('formats a Date as local YYYY-MM-DD', () => {
    expect(dateStr(new Date(2026, 5, 21))).toBe('2026-06-21'); // month is 0-based: 5 = June
  });

  it('zero-pads single-digit months and days', () => {
    expect(dateStr(new Date(2026, 0, 5))).toBe('2026-01-05');
    expect(dateStr(new Date(2026, 8, 9))).toBe('2026-09-09');
  });

  it('uses local time, not UTC (no midnight rollover)', () => {
    // A local date constructed with no time component must stay on the same day.
    expect(dateStr(new Date(2026, 11, 31))).toBe('2026-12-31');
  });

  it('todayStr is a well-formed local date equal to dateStr(now)', () => {
    expect(todayStr()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(todayStr()).toBe(dateStr(new Date()));
  });

  it('currentMonthStr is the YYYY-MM prefix of today', () => {
    expect(currentMonthStr()).toBe(todayStr().slice(0, 7));
    expect(currentMonthStr()).toMatch(/^\d{4}-\d{2}$/);
  });
});
