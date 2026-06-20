/**
 * useHabitStore.ts — habits and their daily completion logs
 *
 * Zustand store for build/break habits (with optional per-habit daily reminders)
 * and the per-day count logs that drive streaks. Schedules each habit's
 * notification when added/updated and exposes syncAllHabitReminders for re-scheduling.
 *
 * Connections:
 *   Imports → lib/db, lib/i18n, lib/id, lib/notifications, store/useSettingsStore
 *   Used by → app/_layout.tsx, app/habit-form.tsx, app/habits.tsx, app/settings.tsx
 *   Data    → defines a Zustand store; owns SQLite tables habits and habit_logs; schedules per-habit daily notifications
 *
 * Edit notes:
 *   - Per-habit daily reminders are scheduled here via syncHabitReminder() (id `habit-<id>`); call syncAllHabitReminders() after a language change since strings are baked in.
 *   - load() only fetches active habits and the last 35 days of logs (streak window) — not full history.
 *   - User-facing notification strings go through getTranslations(useSettingsStore.getState().language), NOT useT.
 *   - New columns go through the migrations array in lib/db.ts; never recreate tables.
 *   - markRestDay() toggles the rest_day flag on a habit_logs row (upserting one if it doesn't
 *     exist yet) — a no-shame opt-out, framed as "Resting today" in app/habits.tsx, never "skipped".
 *     computeStreak() in app/habits.tsx treats a rest day like a met day so the streak survives it.
 */
import { create } from 'zustand';
import db from '@/lib/db';
import { generateId } from '@/lib/id';
import { getTranslations } from '@/lib/i18n';
import { useSettingsStore } from '@/store/useSettingsStore';
import { scheduleDailyReminder, cancelDailyReminder } from '@/lib/notifications';

export type HabitKind = 'build' | 'break' | 'neutral';
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
  routineOrder: number;
  active: boolean;
  createdAt: string;
  childName: string;
};

export type HabitLog = {
  id: string;
  habitId: string;
  logDate: string;
  count: number;
  restDay: boolean;
};

type HabitStore = {
  habits: Habit[];
  logs: HabitLog[];
  load: () => void;
  add: (h: Omit<Habit, 'id' | 'createdAt' | 'active'>) => void;
  update: (id: string, patch: Partial<Omit<Habit, 'id'>>) => void;
  remove: (id: string) => void;
  reorder: (id: string, direction: 'up' | 'down') => void;
  increment: (habitId: string, date: string) => void;
  decrement: (habitId: string, date: string) => void;
  /** Toggle a day between "resting" and normal — no-shame opt-out that keeps the streak alive. */
  markRestDay: (habitId: string, date: string) => void;
  /** Re-schedule every habit's daily reminder (after a language change). */
  syncAllHabitReminders: () => void;
};

/** Schedule (or cancel) a habit's daily reminder, honouring the user's language. */
function syncHabitReminder(habit: Habit): void {
  if (!habit.notificationEnabled || !habit.active) {
    void cancelDailyReminder(`habit-${habit.id}`);
    return;
  }
  const [h, m] = (habit.notificationTime || '08:00').split(':').map((n) => parseInt(n, 10));
  const hour = Number.isFinite(h) ? h : 8;
  const minute = Number.isFinite(m) ? m : 0;
  const t = getTranslations(useSettingsStore.getState().language);
  void scheduleDailyReminder(`habit-${habit.id}`, hour, minute, {
    title: t.notif.habitReminderTitle(habit.title),
    body: t.notif.habitReminderBody,
  });
}

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
    routineOrder: (row.routine_order as number) || 0,
    active: row.active !== 0,
    createdAt: (row.created_at as string) || '',
    childName: (row.child_name as string) || '',
  };
}

function rowToLog(row: Record<string, unknown>): HabitLog {
  return {
    id: row.id as string,
    habitId: row.habit_id as string,
    logDate: row.log_date as string,
    count: (row.count as number) || 0,
    restDay: row.rest_day === 1,
  };
}

export const useHabitStore = create<HabitStore>((set, get) => ({
  habits: [],
  logs: [],

  load() {
    try {
      const habitRows = db.getAllSync<Record<string, unknown>>(
        'SELECT * FROM habits WHERE active = 1 ORDER BY routine_order, created_at'
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
    const routineOrder = h.routineOrder || Date.now();
    db.runSync(
      `INSERT INTO habits (id, title, icon, kind, category, cue, craving, response, reward,
       daily_goal, recurrence, recurrence_days, notification_enabled, notification_time,
       routine_order, active, created_at, child_name)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
      [id, h.title, h.icon, h.kind, h.category, h.cue, h.craving, h.response, h.reward,
       h.dailyGoal, h.recurrence, JSON.stringify(h.recurrenceDays),
       h.notificationEnabled ? 1 : 0, h.notificationTime, routineOrder, now, h.childName || '']
    );
    const habit: Habit = { ...h, id, routineOrder, active: true, createdAt: now };
    set((s) => ({ habits: [...s.habits, habit].sort((a, b) => a.routineOrder - b.routineOrder) }));
    syncHabitReminder(habit);
  },

  update(id, patch) {
    const habit = get().habits.find((h) => h.id === id);
    if (!habit) return;
    const next = { ...habit, ...patch };
    db.runSync(
      `UPDATE habits SET title=?, icon=?, kind=?, category=?, cue=?, craving=?, response=?, reward=?,
       daily_goal=?, recurrence=?, recurrence_days=?, notification_enabled=?, notification_time=?,
       routine_order=?, active=?, child_name=?
       WHERE id=?`,
      [next.title, next.icon, next.kind, next.category, next.cue, next.craving, next.response, next.reward,
       next.dailyGoal, next.recurrence, JSON.stringify(next.recurrenceDays),
       next.notificationEnabled ? 1 : 0, next.notificationTime, next.routineOrder, next.active ? 1 : 0, next.childName || '', id]
    );
    set((s) => ({
      habits: s.habits.map((h) => (h.id === id ? next : h)).sort((a, b) => a.routineOrder - b.routineOrder),
    }));
    syncHabitReminder(next);
  },

  remove(id) {
    db.runSync('DELETE FROM habits WHERE id = ?', [id]);
    db.runSync('DELETE FROM habit_logs WHERE habit_id = ?', [id]);
    void cancelDailyReminder(`habit-${id}`);
    set((s) => ({
      habits: s.habits.filter((h) => h.id !== id),
      logs: s.logs.filter((l) => l.habitId !== id),
    }));
  },

  reorder(id, direction) {
    const { habits } = get();
    const sorted = [...habits].sort((a, b) => a.routineOrder - b.routineOrder);
    const idx = sorted.findIndex((h) => h.id === id);
    if (idx < 0) return;
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= sorted.length) return;
    const a = sorted[idx];
    const b = sorted[swapIdx];
    const aOrder = a.routineOrder;
    const bOrder = b.routineOrder;
    db.runSync('UPDATE habits SET routine_order = ? WHERE id = ?', [bOrder, a.id]);
    db.runSync('UPDATE habits SET routine_order = ? WHERE id = ?', [aOrder, b.id]);
    set((s) => ({
      habits: s.habits.map((h) => {
        if (h.id === a.id) return { ...h, routineOrder: bOrder };
        if (h.id === b.id) return { ...h, routineOrder: aOrder };
        return h;
      }).sort((x, y) => x.routineOrder - y.routineOrder),
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
      set((s) => ({ logs: [...s.logs, { id, habitId, logDate: date, count: 1, restDay: false }] }));
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

  markRestDay(habitId, date) {
    const { logs } = get();
    const existing = logs.find((l) => l.habitId === habitId && l.logDate === date);
    if (existing) {
      const restDay = !existing.restDay;
      db.runSync('UPDATE habit_logs SET rest_day = ? WHERE id = ?', [restDay ? 1 : 0, existing.id]);
      set((s) => ({
        logs: s.logs.map((l) => (l.id === existing.id ? { ...l, restDay } : l)),
      }));
    } else {
      const id = generateId();
      db.runSync(
        'INSERT INTO habit_logs (id, habit_id, log_date, count, rest_day) VALUES (?, ?, ?, 0, 1)',
        [id, habitId, date]
      );
      set((s) => ({ logs: [...s.logs, { id, habitId, logDate: date, count: 0, restDay: true }] }));
    }
  },

  syncAllHabitReminders() {
    get().habits.forEach(syncHabitReminder);
  },
}));
