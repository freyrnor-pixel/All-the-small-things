/**
 * date.ts — local-date string helpers (YYYY-MM-DD).
 *
 * Tiny utilities for formatting a Date as a local `YYYY-MM-DD` string, the
 * canonical date format used across the app's SQLite date columns and UI.
 * Uses local time (getFullYear/getMonth/getDate), never UTC.
 *
 * Connections:
 *   Imports → —
 *   Used by → app/habits.tsx, app/health.tsx, app/index.tsx, app/share-modal.tsx, app/task-form.tsx, components/QuickAddSheet.tsx, lib/db.ts, lib/holidays.ts
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
