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
