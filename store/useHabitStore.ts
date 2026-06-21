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
import {
  Row,
  FieldMap,
  loadAll,
  insertRow,
  updateRow,
  rowValues,
  readStr,
  readInt,
  readBool,
  readJson,
} from '@/lib/dataAccess';
import { generateId } from '@/lib/id';
import { useSettingsStore } from '@/store/useSettingsStore';
import { cancelDailyReminder } from '@/lib/notifications';
import { syncHabitReminder as scheduleHabitReminder } from '@/lib/habitNotifications';

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

/** Schedule (or cancel) a habit's daily reminder using the current language. */
function syncHabitReminder(habit: Habit): void {
  scheduleHabitReminder(habit, useSettingsStore.getState().language);
}

function rowToHabit(row: Row): Habit {
  return {
    id: readStr(row, 'id'),
    title: readStr(row, 'title'),
    icon: readStr(row, 'icon') || '⭐',
    kind: (readStr(row, 'kind') || 'build') as HabitKind,
    category: (readStr(row, 'category') || 'other') as HabitCategory,
    cue: readStr(row, 'cue'),
    craving: readStr(row, 'craving'),
    response: readStr(row, 'response'),
    reward: readStr(row, 'reward'),
    dailyGoal: readInt(row, 'daily_goal') || 1,
    recurrence: (readStr(row, 'recurrence') || 'daily') as HabitRecurrence,
    recurrenceDays: readJson<number[]>(row, 'recurrence_days', []),
    notificationEnabled: readBool(row, 'notification_enabled'),
    notificationTime: readStr(row, 'notification_time') || '08:00',
    routineOrder: readInt(row, 'routine_order'),
    active: readInt(row, 'active', 1) !== 0,
    createdAt: readStr(row, 'created_at'),
    childName: readStr(row, 'child_name'),
  };
}

function rowToLog(row: Row): HabitLog {
  return {
    id: readStr(row, 'id'),
    habitId: readStr(row, 'habit_id'),
    logDate: readStr(row, 'log_date'),
    count: readInt(row, 'count'),
    restDay: readBool(row, 'rest_day'),
  };
}

/** Field → column mapping for habits (serialisers preserve the old INSERT/UPDATE defaults). */
const HABIT_COLUMNS: FieldMap<Habit> = {
  id: { col: 'id' },
  title: { col: 'title' },
  icon: { col: 'icon' },
  kind: { col: 'kind' },
  category: { col: 'category' },
  cue: { col: 'cue' },
  craving: { col: 'craving' },
  response: { col: 'response' },
  reward: { col: 'reward' },
  dailyGoal: { col: 'daily_goal' },
  recurrence: { col: 'recurrence' },
  recurrenceDays: { col: 'recurrence_days', to: (v) => JSON.stringify(v ?? []) },
  notificationEnabled: { col: 'notification_enabled', to: (v) => (v ? 1 : 0) },
  notificationTime: { col: 'notification_time' },
  routineOrder: { col: 'routine_order' },
  active: { col: 'active', to: (v) => (v ? 1 : 0) },
  createdAt: { col: 'created_at' },
  childName: { col: 'child_name', to: (v) => v || '' },
};

export const useHabitStore = create<HabitStore>((set, get) => ({
  habits: [],
  logs: [],

  load() {
    const since = new Date();
    since.setDate(since.getDate() - 35);
    const sinceStr = since.toISOString().slice(0, 10);
    set({
      habits: loadAll('habits', rowToHabit, { where: 'active = 1', orderBy: 'routine_order, created_at' }),
      logs: loadAll('habit_logs', rowToLog, { where: 'log_date >= ?', params: [sinceStr] }),
    });
  },

  add(h) {
    const id = generateId();
    const now = new Date().toISOString();
    const routineOrder = h.routineOrder || Date.now();
    const habit: Habit = { ...h, id, routineOrder, active: true, createdAt: now };
    insertRow('habits', rowValues(habit, HABIT_COLUMNS));
    set((s) => ({ habits: [...s.habits, habit].sort((a, b) => a.routineOrder - b.routineOrder) }));
    syncHabitReminder(habit);
  },

  update(id, patch) {
    const habit = get().habits.find((h) => h.id === id);
    if (!habit) return;
    const next = { ...habit, ...patch };
    updateRow('habits', rowValues(patch, HABIT_COLUMNS), 'id = ?', [id]);
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
    updateRow('habits', { routine_order: bOrder }, 'id = ?', [a.id]);
    updateRow('habits', { routine_order: aOrder }, 'id = ?', [b.id]);
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
      updateRow('habit_logs', { count: newCount }, 'id = ?', [existing.id]);
      set((s) => ({
        logs: s.logs.map((l) => (l.id === existing.id ? { ...l, count: newCount } : l)),
      }));
    } else {
      const id = generateId();
      insertRow('habit_logs', { id, habit_id: habitId, log_date: date, count: 1 });
      set((s) => ({ logs: [...s.logs, { id, habitId, logDate: date, count: 1, restDay: false }] }));
    }
  },

  decrement(habitId, date) {
    const { logs } = get();
    const existing = logs.find((l) => l.habitId === habitId && l.logDate === date);
    if (!existing || existing.count <= 0) return;
    const newCount = existing.count - 1;
    updateRow('habit_logs', { count: newCount }, 'id = ?', [existing.id]);
    set((s) => ({
      logs: s.logs.map((l) => (l.id === existing.id ? { ...l, count: newCount } : l)),
    }));
  },

  markRestDay(habitId, date) {
    const { logs } = get();
    const existing = logs.find((l) => l.habitId === habitId && l.logDate === date);
    if (existing) {
      const restDay = !existing.restDay;
      updateRow('habit_logs', { rest_day: restDay ? 1 : 0 }, 'id = ?', [existing.id]);
      set((s) => ({
        logs: s.logs.map((l) => (l.id === existing.id ? { ...l, restDay } : l)),
      }));
    } else {
      const id = generateId();
      insertRow('habit_logs', { id, habit_id: habitId, log_date: date, count: 0, rest_day: 1 });
      set((s) => ({ logs: [...s.logs, { id, habitId, logDate: date, count: 0, restDay: true }] }));
    }
  },

  syncAllHabitReminders() {
    get().habits.forEach(syncHabitReminder);
  },
}));
