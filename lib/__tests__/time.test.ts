import { parseTimeStrict, parseTimeOrDefault } from '@/lib/time';

describe('parseTimeStrict', () => {
  it('parses a valid time', () => {
    expect(parseTimeStrict('09:30')).toEqual([9, 30]);
    expect(parseTimeStrict('00:00')).toEqual([0, 0]);
    expect(parseTimeStrict('23:59')).toEqual([23, 59]);
  });

  it('returns null on out-of-range or malformed input', () => {
    expect(parseTimeStrict('24:00')).toBeNull();
    expect(parseTimeStrict('12:60')).toBeNull();
    expect(parseTimeStrict('-1:00')).toBeNull();
    expect(parseTimeStrict('abc')).toBeNull();
    expect(parseTimeStrict('')).toBeNull();
  });
});

describe('parseTimeOrDefault', () => {
  it('parses a valid time', () => {
    expect(parseTimeOrDefault('07:15')).toEqual([7, 15]);
  });

  it('falls back to 08:00 on missing/garbage input', () => {
    expect(parseTimeOrDefault('')).toEqual([8, 0]);
    expect(parseTimeOrDefault('nope')).toEqual([8, 0]);
  });

  it('clamps out-of-range parts instead of rejecting', () => {
    expect(parseTimeOrDefault('30:90')).toEqual([23, 59]);
    expect(parseTimeOrDefault('09:90')).toEqual([9, 59]);
  });
});
