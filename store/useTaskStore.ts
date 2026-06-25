/**
 * useTaskStore.ts — tasks (one-off + weekly recurring) and their reminders
 *
 * Zustand store for to-do tasks: one-off and weekly-recurring, start-at and
 * time-box types, with importance, priority, and a backlog view. Owns per-task
 * notification scheduling (start, and end reminders for time-box tasks).
 *
 * Connections:
 *   Imports → lib/db, lib/dataAccess, lib/id, lib/date, lib/time, lib/notifications, lib/taskNotifications, store/useAutomationStore, store/useSettingsStore
 *   Used by → app/_layout.tsx, app/index.tsx, app/onboarding/step6.tsx, app/plans.tsx, app/settings.tsx, app/share-modal.tsx, app/shared.tsx, app/task-form.tsx, components/DayTimeline.tsx (Task type only), components/QuickAddSheet.tsx, components/SharedRequestsSection.tsx, components/TaskItem.tsx, store/useInboxStore.ts (add() only, for promoteToTask)
 *   Data    → defines a Zustand store; owns SQLite table tasks; schedules per-task notifications; fires the 'task_completed' automation trigger
 *
 * Edit notes:
 *   - Per-task notification scheduling lives here (syncTaskNotification); add/update auto-reschedule. Call syncAllTaskNotifications() after a settings/language change since notification copy is baked in at schedule time.
 *   - User-facing notification strings go through getTranslations(useSettingsStore.getState().language), NOT useT.
 *   - Quiet hours (AP-05) only defer the *reminder*, never the task's own date/time/duration — deferPastQuietHours/deferOccurrencePastQuietHours wrap lib/notifications.ts's pushPastQuietHours right before scheduling.
 *   - completedCount() counts done tasks in the currently loaded list (load() fetches all tasks), not a separate cumulative counter.
 *   - focusTask(today, workModeActive) returns the first pending task for focus view — sorted by time ASC NULLS LAST, then id.
 *   - New columns (e.g. importance) go through the migrations array in lib/db.ts; never recreate tables.
 *   - confirmPending() fires the 'task_completed' automation trigger only on the rising edge for each task transitioning from not-done → done.
 *   - completeDirect() writes done=true straight to SQLite without going through pending/confirmPending — used by the notification "Done" action, which has no Save step to trigger a confirm.
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
import { dayOfWeekMon0 } from '@/lib/date';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useAutomationStore } from '@/store/useAutomationStore';
import { cancelTaskNotification } from '@/lib/notifications';
import { syncTaskNotification as scheduleTaskReminder } from '@/lib/taskNotifications';

export type TaskType = 'start-at' | 'time-box';
export type Recurring = 'none' | 'weekly';
export type Importance = 'regular' | 'essential';
export type Priority = 'high' | 'medium' | 'low';

export type Task = {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  time?: string; // HH:MM
  taskType: TaskType;
  durationMinutes?: number;
  done: boolean;
  recurring: Recurring;
  recurringDays: number[]; // 0=Mon … 6=Sun
  importance: Importance;
  priority: Priority;
};

type TaskStore = {
  tasks: Task[];
  pending: Set<string>;
  load: () => void;
  add: (t: Omit<Task, 'id'>) => Task;
  update: (id: string, patch: Partial<Omit<Task, 'id'>>) => void;
  toggle: (id: string) => void;
  confirmPending: () => void;
  /** Mark a task done immediately, bypassing the pending/confirm flow. */
  completeDirect: (id: string) => void;
  remove: (id: string) => void;
  clearAll: () => void;
  tasksForDate: (date: string) => Task[];
  backlogTasks: (today: string) => Task[];
  completedCount: () => number;
  getPendingCount: () => number;
  /** First pending task for the focus view, respecting work-mode filter. */
  focusTask: (date: string, workModeActive: boolean) => Task | null;
  /** Re-schedule every task's reminder (after a settings/language change). */
  syncAllTaskNotifications: () => void;
};

/** Schedule (or cancel) a single task's reminder using the current settings. */
function syncTaskNotification(task: Task): void {
  scheduleTaskReminder(task, useSettingsStore.getState());
}

function rowToTask(row: Row): Task {
  return {
    id: readStr(row, 'id'),
    title: readStr(row, 'title'),
    date: readStr(row, 'task_date'),
    time: readStr(row, 'task_time') || undefined,
    taskType: readStr(row, 'task_type', 'start-at') as TaskType,
    durationMinutes: readInt(row, 'duration_minutes') || undefined,
    done: readBool(row, 'done'),
    recurring: readStr(row, 'recurring', 'none') as Recurring,
    recurringDays: readJson<number[]>(row, 'recurring_days', []),
    importance: readStr(row, 'importance', 'regular') as Importance,
    priority: readStr(row, 'priority', 'medium') as Priority,
  };
}

/** Field → column mapping for tasks (serialisers preserve the old INSERT/UPDATE defaults). */
const TASK_COLUMNS: FieldMap<Task> = {
  id: { col: 'id' },
  title: { col: 'title' },
  date: { col: 'task_date' },
  time: { col: 'task_time', to: (v) => v ?? null },
  taskType: { col: 'task_type' },
  durationMinutes: { col: 'duration_minutes', to: (v) => v ?? null },
  done: { col: 'done', to: (v) => (v ? 1 : 0) },
  recurring: { col: 'recurring' },
  recurringDays: { col: 'recurring_days', to: (v) => JSON.stringify(v ?? []) },
  importance: { col: 'importance', to: (v) => v ?? 'regular' },
  priority: { col: 'priority', to: (v) => v ?? 'medium' },
};

export const useTaskStore = create<TaskStore>((set, get) => ({
  tasks: [],
  pending: new Set(),

  load() {
    set({ tasks: loadAll('tasks', rowToTask, { orderBy: 'task_date, task_time' }) });
  },

  add(t) {
    const id = generateId();
    const task: Task = { ...t, id, done: false };
    insertRow('tasks', rowValues(task, TASK_COLUMNS));
    set((s) => ({ tasks: [...s.tasks, task] }));
    syncTaskNotification(task);
    return task;
  },

  update(id, patch) {
    const task = get().tasks.find((t) => t.id === id);
    if (!task) return;
    const next = { ...task, ...patch };
    updateRow('tasks', rowValues(patch, TASK_COLUMNS), 'id = ?', [id]);
    set((s) => ({ tasks: s.tasks.map((t) => (t.id === id ? next : t)) }));
    syncTaskNotification(next);
  },

  toggle(id) {
    const task = get().tasks.find((t) => t.id === id);
    if (!task) return;
    set((s) => {
      const newPending = new Set(s.pending);
      if (newPending.has(id)) {
        newPending.delete(id);
      } else {
        newPending.add(id);
      }
      return { pending: newPending };
    });
  },

  completeDirect(id) {
    const task = get().tasks.find((t) => t.id === id);
    if (!task || task.done) return;
    get().update(id, { done: true });
    useAutomationStore.getState().fireTrigger('task_completed');
  },

  confirmPending() {
    const { pending } = get();
    if (pending.size === 0) return;

    for (const id of pending) {
      const task = get().tasks.find((t) => t.id === id);
      if (!task) continue;
      const wasDone = task.done;
      get().update(id, { done: !task.done });
      if (!wasDone) useAutomationStore.getState().fireTrigger('task_completed');
    }

    set({ pending: new Set() });
  },

  remove(id) {
    db.runSync('DELETE FROM tasks WHERE id = ?', [id]);
    void cancelTaskNotification(id);
    set((s) => ({ tasks: s.tasks.filter((t) => t.id !== id) }));
  },

  clearAll() {
    const ids = get().tasks.map((t) => t.id);
    db.runSync('DELETE FROM tasks');
    ids.forEach((id) => void cancelTaskNotification(id));
    set({ tasks: [] });
  },

  tasksForDate(date) {
    const { tasks } = get();
    const mon0 = dayOfWeekMon0(new Date(date + 'T12:00:00'));
    return tasks.filter((t) => {
      if (t.date === date) return true;
      if (t.recurring === 'weekly' && t.recurringDays.includes(mon0)) return true;
      return false;
    });
  },

  backlogTasks(today) {
    const { tasks } = get();
    return tasks
      .filter((t) => t.date < today && !t.done && t.recurring === 'none')
      .sort((a, b) => a.date.localeCompare(b.date));
  },

  completedCount() {
    return get().tasks.filter((t) => t.done).length;
  },

  getPendingCount() {
    return get().pending.size;
  },

  focusTask(date, workModeActive) {
    const candidates = get().tasksForDate(date).filter((t) => {
      if (t.done) return false;
      if (workModeActive && t.importance !== 'essential') return false;
      return true;
    });
    const sorted = candidates.sort((a, b) => {
      if (a.time && b.time) return a.time.localeCompare(b.time);
      if (a.time) return -1;
      if (b.time) return 1;
      return a.id.localeCompare(b.id);
    });
    return sorted[0] ?? null;
  },

  syncAllTaskNotifications() {
    get().tasks.forEach(syncTaskNotification);
  },
}));
