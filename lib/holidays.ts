import { dateStr } from '@/lib/date';

function easterSunday(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function holidaysForYear(year: number): Set<string> {
  const easter = easterSunday(year);
  return new Set([
    `${year}-01-01`, // Nyttårsdag
    `${year}-05-01`, // Arbeidernes dag
    `${year}-05-17`, // Grunnlovsdagen
    `${year}-12-25`, // 1. juledag
    `${year}-12-26`, // 2. juledag
    dateStr(addDays(easter, -3)),  // Skjærtorsdag
    dateStr(addDays(easter, -2)),  // Langfredag
    dateStr(easter),               // 1. påskedag
    dateStr(addDays(easter, 1)),   // 2. påskedag
    dateStr(addDays(easter, 39)),  // Kristi himmelfartsdag
    dateStr(addDays(easter, 49)),  // 1. pinsedag
    dateStr(addDays(easter, 50)),  // 2. pinsedag
  ]);
}

const cache: Partial<Record<number, Set<string>>> = {};

function getHolidays(year: number): Set<string> {
  if (!cache[year]) cache[year] = holidaysForYear(year);
  return cache[year]!;
}

export function isHoliday(date: string): boolean {
  const year = parseInt(date.slice(0, 4), 10);
  return getHolidays(year).has(date);
}

export function isWeekendOrHoliday(date: Date, holidaysEnabled: boolean): boolean {
  const dow = date.getDay();
  if (dow === 0 || dow === 6) return true;
  if (holidaysEnabled && isHoliday(dateStr(date))) return true;
  return false;
}
