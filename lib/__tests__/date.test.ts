import {
  dateStr,
  todayStr,
  currentMonthStr,
  toExpoWeekday,
  getWeekDates,
  getMonthDates,
} from '@/lib/date';

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

  it('toExpoWeekday maps app weekdays (0=Mon..6=Sun) to Expo (1=Sun..7=Sat)', () => {
    expect(toExpoWeekday(0)).toBe(2); // Mon
    expect(toExpoWeekday(5)).toBe(7); // Sat
    expect(toExpoWeekday(6)).toBe(1); // Sun
  });

  it('getWeekDates returns the Mon–Sun week containing the date', () => {
    const week = getWeekDates('2026-06-21'); // a Sunday
    expect(week).toHaveLength(7);
    expect(week[0]).toBe('2026-06-15'); // Monday
    expect(week[6]).toBe('2026-06-21'); // Sunday
    // Any day in that week yields the same span.
    expect(getWeekDates('2026-06-17')).toEqual(week);
  });

  it('getMonthDates lists every day of a (1-based) month', () => {
    const feb = getMonthDates(2026, 2);
    expect(feb).toHaveLength(28); // 2026 is not a leap year
    expect(feb[0]).toBe('2026-02-01');
    expect(feb[27]).toBe('2026-02-28');
    expect(getMonthDates(2026, 12)).toHaveLength(31);
  });
});
