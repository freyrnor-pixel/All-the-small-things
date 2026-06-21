/**
 * date.ts — local-date string helpers (YYYY-MM-DD).
 *
 * Tiny utilities for formatting a Date as a local `YYYY-MM-DD` string, the
 * canonical date format used across the app's SQLite date columns and UI.
 * Uses local time (getFullYear/getMonth/getDate), never UTC.
 *
 * Connections:
 *   Imports → —
 *   Used by → app/budget.tsx, app/habits.tsx, app/health.tsx, app/index.tsx, app/plans.tsx, app/scan.tsx, app/share-modal.tsx, app/task-form.tsx, components/QuickAddSheet.tsx, components/SharedRequestsSection.tsx, lib/db.ts, lib/holidays.ts, store/useReceiptStore.ts
 *   Data    → none (pure functions)
 *
 * Edit notes:
 *   - These are LOCAL-time formatters; do not switch to toISOString() (UTC) or
 *     off-by-one-day bugs appear around midnight / timezone boundaries.
 */
export function todayStr(): string {
  const d = new Date();
  return dateStr(d);
}

export function dateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Current local month as `YYYY-MM` (e.g. receipts/budget tracking). */
export function currentMonthStr(): string {
  return todayStr().slice(0, 7);
}

/** App weekday (0 = Mon … 6 = Sun) → Expo weekday (1 = Sun … 7 = Sat). */
export function toExpoWeekday(mon0: number): number {
  return ((mon0 + 1) % 7) + 1;
}

/** The seven `YYYY-MM-DD` dates of the Mon–Sun week containing `today`. */
export function getWeekDates(today: string): string[] {
  const d = new Date(today + 'T12:00:00');
  const mon = new Date(d);
  mon.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return Array.from({ length: 7 }, (_, i) => {
    const day = new Date(mon);
    day.setDate(mon.getDate() + i);
    return dateStr(day);
  });
}

/** Every `YYYY-MM-DD` date in the given month (`month` is 1-based: 1 = January). */
export function getMonthDates(year: number, month: number): string[] {
  const days = new Date(year, month, 0).getDate();
  return Array.from({ length: days }, (_, i) => {
    const d = i + 1;
    return `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  });
}
