// Mock the native db handle so importing dataAccess never touches expo-sqlite.
jest.mock('@/lib/db', () => ({ __esModule: true, default: {} }));

import {
  readStr,
  readInt,
  readReal,
  readBool,
  readJson,
  rowValues,
  buildSelect,
  buildInsert,
  buildUpdate,
  FieldMap,
} from '@/lib/dataAccess';

describe('column readers', () => {
  it('readStr coalesces null/undefined to the default, else stringifies', () => {
    expect(readStr({ a: 'x' }, 'a')).toBe('x');
    expect(readStr({ a: null }, 'a', 'd')).toBe('d');
    expect(readStr({}, 'a', 'd')).toBe('d');
    expect(readStr({ a: '' }, 'a', 'd')).toBe(''); // empty string is a real value
  });

  it('readInt/readReal coalesce null to default, else Number()', () => {
    expect(readInt({ n: 5 }, 'n')).toBe(5);
    expect(readInt({ n: null }, 'n', 1)).toBe(1);
    expect(readReal({ p: 2.5 }, 'p')).toBe(2.5);
    expect(readReal({ p: null }, 'p')).toBe(0);
  });

  it('readBool is true only for exactly 1', () => {
    expect(readBool({ d: 1 }, 'd')).toBe(true);
    expect(readBool({ d: 0 }, 'd')).toBe(false);
    expect(readBool({ d: null }, 'd')).toBe(false);
  });

  it('readJson parses, and falls back on null/empty/corrupt', () => {
    expect(readJson({ j: '[1,2]' }, 'j', [])).toEqual([1, 2]);
    expect(readJson({ j: null }, 'j', [] as number[])).toEqual([]);
    expect(readJson({ j: '' }, 'j', [] as number[])).toEqual([]);
    expect(readJson({ j: '{bad' }, 'j', { fallback: true })).toEqual({ fallback: true });
  });
});

describe('rowValues', () => {
  type Thing = { title: string; days: number[]; done: boolean; note?: string };
  const map: FieldMap<Thing> = {
    title: { col: 'title' },
    days: { col: 'days', to: (v) => JSON.stringify(v ?? []) },
    done: { col: 'done', to: (v) => (v ? 1 : 0) },
    note: { col: 'note', to: (v) => v ?? null },
  };

  it('maps only the supplied fields and applies serialisers', () => {
    expect(rowValues<Thing>({ title: 'a', done: true, days: [1, 2] }, map)).toEqual({
      title: 'a',
      done: 1,
      days: '[1,2]',
    });
  });

  it('serialises an explicit undefined via its `to`', () => {
    expect(rowValues<Thing>({ note: undefined }, map)).toEqual({ note: null });
  });

  it('ignores fields with no mapping entry', () => {
    expect(rowValues<Thing>({ title: 'a' } as Partial<Thing>, { title: { col: 'title' } })).toEqual({
      title: 'a',
    });
  });
});

describe('SQL builders', () => {
  it('buildSelect composes where + orderBy', () => {
    expect(buildSelect('tasks')).toEqual({ sql: 'SELECT * FROM tasks', params: [] });
    expect(buildSelect('tasks', { orderBy: 'task_date, task_time' })).toEqual({
      sql: 'SELECT * FROM tasks ORDER BY task_date, task_time',
      params: [],
    });
    expect(buildSelect('habit_logs', { where: 'log_date >= ?', params: ['2026-01-01'] })).toEqual({
      sql: 'SELECT * FROM habit_logs WHERE log_date >= ?',
      params: ['2026-01-01'],
    });
  });

  it('buildInsert lists columns and placeholders in order', () => {
    expect(buildInsert('t', { id: '1', name: 'x', n: 3 })).toEqual({
      sql: 'INSERT INTO t (id, name, n) VALUES (?, ?, ?)',
      params: ['1', 'x', 3],
    });
  });

  it('buildUpdate sets only given columns and appends where params', () => {
    expect(buildUpdate('t', { name: 'x', n: 3 }, 'id = ?', ['1'])).toEqual({
      sql: 'UPDATE t SET name = ?, n = ? WHERE id = ?',
      params: ['x', 3, '1'],
    });
  });
});
