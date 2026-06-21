import { isHoliday, isWeekendOrHoliday } from '@/lib/holidays';

describe('lib/holidays', () => {
  it('recognises fixed Norwegian holidays', () => {
    expect(isHoliday('2026-01-01')).toBe(true); // Nyttårsdag
    expect(isHoliday('2026-05-01')).toBe(true); // Arbeidernes dag
    expect(isHoliday('2026-05-17')).toBe(true); // Grunnlovsdagen
    expect(isHoliday('2026-12-25')).toBe(true); // 1. juledag
    expect(isHoliday('2026-12-26')).toBe(true); // 2. juledag
  });

  it('computes movable Easter-derived holidays (Easter 2026 = Apr 5)', () => {
    expect(isHoliday('2026-04-02')).toBe(true); // Skjærtorsdag (Easter - 3)
    expect(isHoliday('2026-04-03')).toBe(true); // Langfredag (Easter - 2)
    expect(isHoliday('2026-04-05')).toBe(true); // 1. påskedag
    expect(isHoliday('2026-04-06')).toBe(true); // 2. påskedag
    expect(isHoliday('2026-05-14')).toBe(true); // Kristi himmelfartsdag (Easter + 39)
    expect(isHoliday('2026-05-24')).toBe(true); // 1. pinsedag (Easter + 49)
    expect(isHoliday('2026-05-25')).toBe(true); // 2. pinsedag (Easter + 50)
  });

  it('returns false for an ordinary weekday', () => {
    expect(isHoliday('2026-06-10')).toBe(false);
  });

  it('treats weekends as off regardless of the holidays flag', () => {
    expect(isWeekendOrHoliday(new Date(2026, 5, 20), false)).toBe(true); // Saturday
    expect(isWeekendOrHoliday(new Date(2026, 5, 21), false)).toBe(true); // Sunday
  });

  it('honours holidays only when the flag is enabled', () => {
    const may1 = new Date(2026, 4, 1); // Friday, Arbeidernes dag
    expect(isWeekendOrHoliday(may1, true)).toBe(true);
    expect(isWeekendOrHoliday(may1, false)).toBe(false);
  });

  it('returns false for an ordinary weekday', () => {
    expect(isWeekendOrHoliday(new Date(2026, 5, 22), true)).toBe(false); // Monday
  });
});
