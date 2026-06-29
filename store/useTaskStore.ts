/**
 * useTaskStore.ts — tasks (one-off + weekly recurring) and their reminders
 *
 * Zustand store for to-do tasks: one-off and weekly-recurring, start-at and
 * time-box types, with importance (Important/General, set by drag in app/plans.tsx),
 * a manual sortOrder within that section, and a backlog view. Owns per-task
 * notification scheduling (start, and end reminders for time-box tasks).
 *
 * Connections:
 *   Imports → lib/db, lib/dataAccess, lib/id, lib/date, lib/time, lib/notifications, lib/taskNotifications, store/useAutomationStore, store/useSettingsStore
 *   Used by → app/_layout.tsx, app/index.tsx, app/onboarding/step6.tsx, app/plans.tsx, app/settings.tsx, app/share-modal.tsx, app/shared.tsx, app/task-form.tsx, components/DayTimeline.tsx (Task type only), components/QuickAddSheet.tsx, components/SharedRequestsSection.tsx, components/TaskItem.tsx, store/useInboxStore.ts (add() only, for promoteToTask)
 *   Data    → defines a Zustand store; owns SQLite tables tasks and task_steps; schedules per-task notifications; fires the 'task_completed' automation trigger
 *
 * Edit notes:
 *   - Per-task notification scheduling lives here (syncTaskNotification); add/update auto-reschedule. Call syncAllTaskNotifications() after a settings/language change since notification copy is baked in at schedule time.
 *   - User-facing notification strings go through getTranslations(useSettingsStore.getState().language), NOT useT.
 *   - Quiet hours (AP-05) only defer the *reminder*, never the task's own date/time/duration — deferPastQuietHours/deferOccurrencePastQuietHours wrap lib/notifications.ts's pushPastQuietHours right before scheduling.
 *   - completedCount() counts done tasks in the currently loaded list (load() fetches all tasks), not a separate cumulative counter.
 *   - focusTask(today, workModeActive) returns the first pending task for focus view — sorted by time ASC NULLS LAST, then id.
 *   - New columns (e.g. importance, sort_order) go through the migrations array in lib/db.ts; never recreate tables.
 *   - reorderTasks(orderedIds) writes sort_order = array index for the given ids in one pass — used by
 *     app/plans.tsx's drag-and-drop to persist position within a task's Important/General section.
 *   - toggle() auto-saves immediately (writes through update()) and fires the 'task_completed'
 *     automation trigger on the rising edge (not-done → done) — there is no separate save/confirm step.
 *   - completeDirect() writes done=true straight to SQLite — used by the notification "Done" action.
 *   - task.steps persist straight to SQLite on every change (addStep/removeStep/toggleStep/reorderStep) —
 *     no draft/save gate, unlike the task fields above which route through useTaskDraftStore. load()
 *     loads all task_steps in one query and groups them onto their owning task in JS, same
 *     one-query-then-group approach as useMealStore.ts's dishes/ingredients.
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

export type TaskStep = { id: string; taskId: string; title: string; done: boolean; orderIndex: number };

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
  /** Manual drag-sort position within the task's Important/General section (app/plans.tsx). */
  sortOrder: number;
  steps: TaskStep[];
};

type TaskStore = {
  tasks: Task[];
  load: () => void;
  add: (t: Omit<Task, 'id' | 'steps'>) => Task;
  update: (id: string, patch: Partial<Omit<Task, 'id'>>) => void;
  toggle: (id: string) => void;
  /** Mark a task done immediately — same write path as toggle(), kept distinct for callers with no toggle state. */
  completeDirect: (id: string) => void;
  remove: (id: string) => void;
  clearAll: () => void;
  tasksForDate: (date: string) => Task[];
  backlogTasks: (today: string) => Task[];
  completedCount: () => number;
  /** First pending task for the focus view, respecting work-mode filter. */
  focusTask: (date: string, workModeActive: boolean) => Task | null;
  /** Re-schedule every task's reminder (after a settings/language change). */
  syncAllTaskNotifications: () => void;
  /** Write a new sort_order (by array position) for every id in orderedIds — drag-and-drop in app/plans.tsx. */
  reorderTasks: (orderedIds: string[]) => void;
  /** Steps persist straight to SQLite on every change — no draft/save gate. */
  addStep: (taskId: string, title: string) => TaskStep;
  removeStep: (id: string) => void;
  toggleStep: (id: string) => void;
  reorderStep: (id: string, direction: 'up' | 'down') => void;
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
    sortOrder: readInt(row, 'sort_order'),
    steps: [],
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
  sortOrder: { col: 'sort_order', to: (v) => v ?? 0 },
};

function rowToTaskStep(row: Row): TaskStep {
  return {
    id: readStr(row, 'id'),
    taskId: readStr(row, 'task_id'),
    title: readStr(row, 'title'),
    done: readBool(row, 'done'),
    orderIndex: readInt(row, 'order_index'),
  };
}

/** Field → column mapping for task steps. */
const TASK_STEP_COLUMNS: FieldMap<TaskStep> = {
  id: { col: 'id' },
  taskId: { col: 'task_id' },
  title: { col: 'title' },
  done: { col: 'done', to: (v) => (v ? 1 : 0) },
  orderIndex: { col: 'order_index' },
};

export const useTaskStore = create<TaskStore>((set, get) => ({
  tasks: [],

  load() {
    const tasks = loadAll('tasks', rowToTask, { orderBy: 'task_date, task_time' });

    // Group steps onto their owning task in a single pass (one query, not N+1).
    const byTask = new Map<string, TaskStep[]>();
    for (const step of loadAll('task_steps', rowToTaskStep, { orderBy: 'order_index' })) {
      const list = byTask.get(step.taskId);
      if (list) list.push(step);
      else byTask.set(step.taskId, [step]);
    }

    set({ tasks: tasks.map((t) => ({ ...t, steps: byTask.get(t.id) ?? [] })) });
  },

  add(t) {
    const id = generateId();
    const task: Task = { ...t, id, done: false, steps: [] };
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
    const willBeDone = !task.done;
    get().update(id, { done: willBeDone });
    if (willBeDone) {
      useAutomationStore.getState().fireTrigger('task_completed');
    }
  },

  completeDirect(id) {
    const task = get().tasks.find((t) => t.id === id);
    if (!task || task.done) return;
    get().update(id, { done: true });
    useAutomationStore.getState().fireTrigger('task_completed');
  },

  remove(id) {
    db.runSync('DELETE FROM tasks WHERE id = ?', [id]);
    void cancelTaskNotification(id);
    set((s) => ({ tasks: s.tasks.filter((t) => t.id !== id) }));
  },

  reorderTasks(orderedIds) {
    const order = new Map(orderedIds.map((id, i) => [id, i]));
    orderedIds.forEach((id, i) => updateRow('tasks', { sort_order: i }, 'id = ?', [id]));
    set((s) => ({
      tasks: s.tasks.map((t) => (order.has(t.id) ? { ...t, sortOrder: order.get(t.id)! } : t)),
    }));
  },

  addStep(taskId, title) {
    const existingSteps = get().tasks.find((t) => t.id === taskId)?.steps ?? [];
    const orderIndex = existingSteps.length === 0 ? 0 : Math.max(...existingSteps.map((s) => s.orderIndex)) + 1;
    const step: TaskStep = { id: generateId(), taskId, title, done: false, orderIndex };
    insertRow('task_steps', rowValues(step, TASK_STEP_COLUMNS));
    set((s) => ({
      tasks: s.tasks.map((t) => (t.id === taskId ? { ...t, steps: [...t.steps, step] } : t)),
    }));
    return step;
  },

  removeStep(id) {
    db.runSync('DELETE FROM task_steps WHERE id = ?', [id]);
    set((s) => ({
      tasks: s.tasks.map((t) => ({ ...t, steps: t.steps.filter((step) => step.id !== id) })),
    }));
  },

  toggleStep(id) {
    const owner = get().tasks.find((t) => t.steps.some((step) => step.id === id));
    const step = owner?.steps.find((s) => s.id === id);
    if (!owner || !step) return;
    const done = !step.done;
    updateRow('task_steps', { done: done ? 1 : 0 }, 'id = ?', [id]);
    set((s) => ({
      tasks: s.tasks.map((t) =>
        t.id === owner.id ? { ...t, steps: t.steps.map((st) => (st.id === id ? { ...st, done } : st)) } : t
      ),
    }));
  },

  reorderStep(id, direction) {
    const owner = get().tasks.find((t) => t.steps.some((step) => step.id === id));
    if (!owner) return;
    const sorted = [...owner.steps].sort((a, b) => a.orderIndex - b.orderIndex);
    const idx = sorted.findIndex((s) => s.id === id);
    if (idx < 0) return;
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= sorted.length) return;
    const a = sorted[idx];
    const b = sorted[swapIdx];
    updateRow('task_steps', { order_index: b.orderIndex }, 'id = ?', [a.id]);
    updateRow('task_steps', { order_index: a.orderIndex }, 'id = ?', [b.id]);
    set((s) => ({
      tasks: s.tasks.map((t) =>
        t.id === owner.id
          ? {
              ...t,
              steps: t.steps.map((step) => {
                if (step.id === a.id) return { ...step, orderIndex: b.orderIndex };
                if (step.id === b.id) return { ...step, orderIndex: a.orderIndex };
                return step;
              }),
            }
          : t
      ),
    }));
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
