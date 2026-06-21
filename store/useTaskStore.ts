/**
 * useTaskStore.ts — tasks (one-off + weekly recurring) and their reminders
 *
 * Zustand store for to-do tasks: one-off and weekly-recurring, start-at and
 * time-box types, with importance, priority, and a backlog view. Owns per-task
 * notification scheduling (start, and end reminders for time-box tasks).
 *
 * Connections:
 *   Imports → lib/db, lib/i18n, lib/id, lib/notifications, store/useAutomationStore, store/useSettingsStore
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
 *   - toggle() fires the 'task_completed' automation trigger only on the rising edge (not-done → done), not on uncheck.
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
import { toExpoWeekday } from '@/lib/date';
import { parseTimeStrict } from '@/lib/time';
import { getTranslations } from '@/lib/i18n';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useAutomationStore } from '@/store/useAutomationStore';
import {
  scheduleTaskNotification,
  scheduleWeeklyTaskNotifications,
  cancelTaskNotification,
  pushPastQuietHours,
  WeeklyTaskOccurrence,
} from '@/lib/notifications';

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
  load: () => void;
  add: (t: Omit<Task, 'id'>) => Task;
  update: (id: string, patch: Partial<Omit<Task, 'id'>>) => void;
  toggle: (id: string) => void;
  remove: (id: string) => void;
  clearAll: () => void;
  tasksForDate: (date: string) => Task[];
  backlogTasks: (today: string) => Task[];
  completedCount: () => number;
  /** First pending task for the focus view, respecting work-mode filter. */
  focusTask: (date: string, workModeActive: boolean) => Task | null;
  /** Re-schedule every task's reminder (after a settings/language change). */
  syncAllTaskNotifications: () => void;
};

type QuietHours = { quietHoursEnabled: boolean; quietHoursStart: string; quietHoursEnd: string };

/** Pushes a notification's fire time past quiet hours, if enabled — the task itself keeps its real time, only the reminder is deferred. */
function deferPastQuietHours(date: Date, s: QuietHours): Date {
  if (!s.quietHoursEnabled) return date;
  const pushed = pushPastQuietHours(date.getHours(), date.getMinutes(), s.quietHoursStart, s.quietHoursEnd);
  const out = new Date(date);
  out.setHours(pushed.hour, pushed.minute, 0, 0);
  if (pushed.rolledOver) out.setDate(out.getDate() + 1);
  return out;
}

/** Same idea as deferPastQuietHours but for a weekly occurrence's hour/minute/weekday (no absolute Date to work with). */
function deferOccurrencePastQuietHours(o: WeeklyTaskOccurrence, s: QuietHours): WeeklyTaskOccurrence {
  if (!s.quietHoursEnabled) return o;
  const pushed = pushPastQuietHours(o.hour, o.minute, s.quietHoursStart, s.quietHoursEnd);
  if (!pushed.rolledOver && pushed.hour === o.hour && pushed.minute === o.minute) return o;
  return {
    ...o,
    hour: pushed.hour,
    minute: pushed.minute,
    weekday: pushed.rolledOver ? (o.weekday === 7 ? 1 : o.weekday + 1) : o.weekday,
  };
}

/**
 * Schedule (or cancel) the reminder(s) for a single task, honouring the current
 * notification setting and language. Both task kinds are covered:
 *   - one-off tasks fire once at their date/time (skipped if done or in the past)
 *   - weekly-recurring tasks fire on every selected weekday at their time
 * Time-box tasks additionally get an "end" reminder after their duration.
 */
function syncTaskNotification(task: Task): void {
  const s = useSettingsStore.getState();
  if (!s.taskNotificationsEnabled || !task.time) {
    void cancelTaskNotification(task.id);
    return;
  }
  const parsed = parseTimeStrict(task.time);
  if (!parsed) {
    void cancelTaskNotification(task.id);
    return;
  }
  const [hour, minute] = parsed;
  const t = getTranslations(s.language);
  const dur = task.durationMinutes ?? 30;

  if (task.recurring === 'weekly') {
    if (task.recurringDays.length === 0) {
      void cancelTaskNotification(task.id);
      return;
    }
    const occurrences: WeeklyTaskOccurrence[] = [];
    for (const day of task.recurringDays) {
      if (task.taskType === 'time-box') {
        occurrences.push({
          suffix: `s${day}`,
          weekday: toExpoWeekday(day),
          hour,
          minute,
          content: { title: t.notif.taskBoxTitle(task.title), body: t.notif.taskBoxBody(dur) },
        });
        // The end reminder may land later the same day or roll into the next.
        const endTotal = hour * 60 + minute + dur;
        const endDay = (day + Math.floor(endTotal / 1440)) % 7;
        occurrences.push({
          suffix: `e${day}`,
          weekday: toExpoWeekday(endDay),
          hour: Math.floor((endTotal % 1440) / 60),
          minute: endTotal % 60,
          content: { title: t.notif.taskEndTitle(task.title), body: t.notif.taskEndBody(dur) },
        });
      } else {
        occurrences.push({
          suffix: `s${day}`,
          weekday: toExpoWeekday(day),
          hour,
          minute,
          content: { title: t.notif.taskStartTitle(task.title), body: t.notif.taskStartBody },
        });
      }
    }
    void scheduleWeeklyTaskNotifications(
      task.id,
      occurrences.map((o) => deferOccurrencePastQuietHours(o, s))
    );
    return;
  }

  // One-off task: only schedule if not done and still in the future.
  if (task.done) {
    void cancelTaskNotification(task.id);
    return;
  }
  const start = new Date(`${task.date}T${task.time}:00`);
  if (isNaN(start.getTime()) || start.getTime() <= Date.now()) {
    void cancelTaskNotification(task.id);
    return;
  }
  if (task.taskType === 'time-box') {
    const end = new Date(start.getTime() + dur * 60 * 1000);
    void scheduleTaskNotification(
      task.id,
      deferPastQuietHours(start, s),
      { title: t.notif.taskBoxTitle(task.title), body: t.notif.taskBoxBody(dur) },
      { date: deferPastQuietHours(end, s), content: { title: t.notif.taskEndTitle(task.title), body: t.notif.taskEndBody(dur) } }
    );
  } else {
    void scheduleTaskNotification(task.id, deferPastQuietHours(start, s), {
      title: t.notif.taskStartTitle(task.title),
      body: t.notif.taskStartBody,
    });
  }
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
    const wasDone = task.done;
    get().update(id, { done: !task.done });
    if (!wasDone) useAutomationStore.getState().fireTrigger('task_completed');
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
    const dayOfWeek = new Date(date).getDay(); // 0=Sun, convert to 0=Mon
    const mon0 = (dayOfWeek + 6) % 7;
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
