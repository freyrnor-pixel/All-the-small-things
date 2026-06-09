import { create } from 'zustand';
import db from '@/lib/db';
import { generateId } from '@/lib/id';

export type HabitKind = 'build' | 'break';
export type HabitRecurrence = 'daily' | 'weekly' | 'monthly' | 'one-time';
export type HabitCategory =
  | 'physical' | 'mental' | 'health' | 'nutrition'
  | 'sleep' | 'work' | 'wellbeing' | 'other';

export type Habit = {
  id: string;
  title: string;
  icon: string;
  kind: HabitKind;
  category: HabitCategory;
  cue: string;
  craving: string;
  response: string;
  reward: string;
  dailyGoal: number;
  recurrence: HabitRecurrence;
  recurrenceDays: number[];
  notificationEnabled: boolean;
  notificationTime: string;
  active: boolean;
  createdAt: string;
};

export type HabitLog = {
  id: string;
  habitId: string;
  logDate: string;
  count: number;
};

type HabitStore = {
  habits: Habit[];
  logs: HabitLog[];
  load: () => void;
  add: (h: Omit<Habit, 'id' | 'createdAt' | 'active'>) => void;
  update: (id: string, patch: Partial<Omit<Habit, 'id'>>) => void;
  remove: (id: string) => void;
  increment: (habitId: string, date: string) => void;
  decrement: (habitId: string, date: string) => void;
};

function rowToHabit(row: Record<string, unknown>): Habit {
  return {
    id: row.id as string,
    title: row.title as string,
    icon: (row.icon as string) || '⭐',
    kind: (row.kind as HabitKind) || 'build',
    category: (row.category as HabitCategory) || 'other',
    cue: (row.cue as string) || '',
    craving: (row.craving as string) || '',
    response: (row.response as string) || '',
    reward: (row.reward as string) || '',
    dailyGoal: (row.daily_goal as number) || 1,
    recurrence: (row.recurrence as HabitRecurrence) || 'daily',
    recurrenceDays: JSON.parse((row.recurrence_days as string) || '[]'),
    notificationEnabled: row.notification_enabled === 1,
    notificationTime: (row.notification_time as string) || '08:00',
    active: row.active !== 0,
    createdAt: (row.created_at as string) || '',
  };
}

function rowToLog(row: Record<string, unknown>): HabitLog {
  return {
    id: row.id as string,
    habitId: row.habit_id as string,
    logDate: row.log_date as string,
    count: (row.count as number) || 0,
  };
}

export const useHabitStore = create<HabitStore>((set, get) => ({
  habits: [],
  logs: [],

  load() {
    try {
      const habitRows = db.getAllSync<Record<string, unknown>>(
        'SELECT * FROM habits WHERE active = 1 ORDER BY kind DESC, created_at'
      );
      const since = new Date();
      since.setDate(since.getDate() - 35);
      const sinceStr = since.toISOString().slice(0, 10);
      const logRows = db.getAllSync<Record<string, unknown>>(
        'SELECT * FROM habit_logs WHERE log_date >= ?',
        [sinceStr]
      );
      set({ habits: habitRows.map(rowToHabit), logs: logRows.map(rowToLog) });
    } catch {
      set({ habits: [], logs: [] });
    }
  },

  add(h) {
    const id = generateId();
    const now = new Date().toISOString();
    db.runSync(
      `INSERT INTO habits (id, title, icon, kind, category, cue, craving, response, reward,
       daily_goal, recurrence, recurrence_days, notification_enabled, notification_time, active, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)`,
      [id, h.title, h.icon, h.kind, h.category, h.cue, h.craving, h.response, h.reward,
       h.dailyGoal, h.recurrence, JSON.stringify(h.recurrenceDays),
       h.notificationEnabled ? 1 : 0, h.notificationTime, now]
    );
    const habit: Habit = { ...h, id, active: true, createdAt: now };
    set((s) => ({ habits: [...s.habits, habit] }));
  },

  update(id, patch) {
    const habit = get().habits.find((h) => h.id === id);
    if (!habit) return;
    const next = { ...habit, ...patch };
    db.runSync(
      `UPDATE habits SET title=?, icon=?, kind=?, category=?, cue=?, craving=?, response=?, reward=?,
       daily_goal=?, recurrence=?, recurrence_days=?, notification_enabled=?, notification_time=?, active=?
       WHERE id=?`,
      [next.title, next.icon, next.kind, next.category, next.cue, next.craving, next.response, next.reward,
       next.dailyGoal, next.recurrence, JSON.stringify(next.recurrenceDays),
       next.notificationEnabled ? 1 : 0, next.notificationTime, next.active ? 1 : 0, id]
    );
    set((s) => ({ habits: s.habits.map((h) => (h.id === id ? next : h)) }));
  },

  remove(id) {
    db.runSync('DELETE FROM habits WHERE id = ?', [id]);
    db.runSync('DELETE FROM habit_logs WHERE habit_id = ?', [id]);
    set((s) => ({
      habits: s.habits.filter((h) => h.id !== id),
      logs: s.logs.filter((l) => l.habitId !== id),
    }));
  },

  increment(habitId, date) {
    const { logs } = get();
    const existing = logs.find((l) => l.habitId === habitId && l.logDate === date);
    if (existing) {
      const newCount = existing.count + 1;
      db.runSync('UPDATE habit_logs SET count = ? WHERE id = ?', [newCount, existing.id]);
      set((s) => ({
        logs: s.logs.map((l) => (l.id === existing.id ? { ...l, count: newCount } : l)),
      }));
    } else {
      const id = generateId();
      db.runSync(
        'INSERT INTO habit_logs (id, habit_id, log_date, count) VALUES (?, ?, ?, 1)',
        [id, habitId, date]
      );
      set((s) => ({ logs: [...s.logs, { id, habitId, logDate: date, count: 1 }] }));
    }
  },

  decrement(habitId, date) {
    const { logs } = get();
    const existing = logs.find((l) => l.habitId === habitId && l.logDate === date);
    if (!existing || existing.count <= 0) return;
    const newCount = existing.count - 1;
    db.runSync('UPDATE habit_logs SET count = ? WHERE id = ?', [newCount, existing.id]);
    set((s) => ({
      logs: s.logs.map((l) => (l.id === existing.id ? { ...l, count: newCount } : l)),
    }));
  },
}));
