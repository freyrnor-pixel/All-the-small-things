/**
 * useEnergyStore.ts — daily energy check-in (one level per day)
 *
 * Zustand store for the once-a-day energy level the user self-reports
 * (components/EnergyCheckIn.tsx). On a 'low' day, app/plans.tsx narrows the
 * visible today-task list to importance === 'essential' tasks only, on top of
 * any existing essentials/work-mode filtering — never as a replacement for it.
 *
 * Connections:
 *   Imports → lib/db, lib/dataAccess, lib/date
 *   Used by → app/_layout.tsx, app/index.tsx, components/EnergyCheckIn.tsx
 *   Data    → defines a Zustand store; owns SQLite table energy_logs (one row per date)
 *
 * Edit notes:
 *   - One row per `log_date`; setToday() upserts (INSERT OR REPLACE) rather than
 *     append, since a day can only have one energy level.
 *   - load() fetches all rows into memory (small table, append-rate of 1/day);
 *     todayLevel() reads back out of that in-memory map.
 */
import { create } from 'zustand';
import db from '@/lib/db';
import { loadAll, readStr } from '@/lib/dataAccess';
import { todayStr } from '@/lib/date';

export type EnergyLevel = 'low' | 'medium' | 'high';

type EnergyStore = {
  levels: Record<string, EnergyLevel>; // date -> level
  load: () => void;
  setToday: (level: EnergyLevel) => void;
  todayLevel: () => EnergyLevel | null;
};

export const useEnergyStore = create<EnergyStore>((set, get) => ({
  levels: {},

  load() {
    const rows = loadAll('energy_logs', (r) => ({
      date: readStr(r, 'log_date'),
      level: readStr(r, 'level', 'medium') as EnergyLevel,
    }));
    const levels: Record<string, EnergyLevel> = {};
    for (const row of rows) levels[row.date] = row.level;
    set({ levels });
  },

  setToday(level) {
    const date = todayStr();
    db.runSync(
      'INSERT INTO energy_logs (log_date, level) VALUES (?, ?) ON CONFLICT(log_date) DO UPDATE SET level = excluded.level',
      [date, level]
    );
    set((s) => ({ levels: { ...s.levels, [date]: level } }));
  },

  todayLevel() {
    return get().levels[todayStr()] ?? null;
  },
}));
