/**
 * useHealthStore.ts — symptom / ailment health log
 *
 * Zustand store for dated health entries (ailment, 1-5 severity, notes). Simple
 * append/remove log surfaced on the health screen, ordered newest-first.
 *
 * Connections:
 *   Imports → lib/db, lib/id
 *   Used by → app/_layout.tsx, app/health.tsx
 *   Data    → defines a Zustand store; owns SQLite table health_logs
 *
 * Edit notes:
 *   - DB column is log_date but the in-memory field is `date`; map both directions in load()/add().
 *   - health_logs is dated history and is pruned past RETENTION_DAYS in lib/db.ts.
 *   - New columns go through the migrations array in lib/db.ts; never recreate tables.
 */
import { create } from 'zustand';
import db from '@/lib/db';
import { generateId } from '@/lib/id';

export type HealthLog = {
  id: string;
  date: string; // YYYY-MM-DD
  ailment: string;
  severity: number; // 1-5
  notes: string;
};

type HealthStore = {
  logs: HealthLog[];
  load: () => void;
  add: (entry: Omit<HealthLog, 'id'>) => void;
  remove: (id: string) => void;
};

export const useHealthStore = create<HealthStore>((set) => ({
  logs: [],

  load() {
    try {
      const rows = db.getAllSync<{
        id: string;
        log_date: string;
        ailment: string;
        severity: number;
        notes: string;
      }>('SELECT * FROM health_logs ORDER BY log_date DESC');
      set({
        logs: rows.map((r) => ({
          id: r.id,
          date: r.log_date,
          ailment: r.ailment,
          severity: r.severity,
          notes: r.notes,
        })),
      });
    } catch {
      set({ logs: [] });
    }
  },

  add(entry) {
    const id = generateId();
    db.runSync(
      'INSERT INTO health_logs (id, log_date, ailment, severity, notes) VALUES (?, ?, ?, ?, ?)',
      [id, entry.date, entry.ailment, entry.severity, entry.notes]
    );
    set((s) => ({ logs: [{ ...entry, id }, ...s.logs] }));
  },

  remove(id) {
    db.runSync('DELETE FROM health_logs WHERE id = ?', [id]);
    set((s) => ({ logs: s.logs.filter((l) => l.id !== id) }));
  },
}));
