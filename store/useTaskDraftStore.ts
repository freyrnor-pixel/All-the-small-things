/**
 * useTaskDraftStore.ts — durable "Unsaved" drafts for open/dirty Plans task Containers
 *
 * Plans' per-task edit form (components/PlanTaskCard.tsx, rendered by app/plans.tsx)
 * lives entirely in lifted screen state, not SQLite, until the user taps a save pill.
 * This store is the *durability* layer underneath that: app/plans.tsx persists a task's
 * current field snapshot + dirty-field list here on blur/Container-close/navigation-away
 * (not on every keystroke), so an abandoned edit survives leaving the screen — and even
 * an app restart — to resurface in Plans' "Unsaved" section. One row per task with a
 * live draft; deleted the moment that task is saved.
 *
 * Connections:
 *   Imports → lib/db, lib/dataAccess, store/useTaskStore (type-only: TaskType/Recurring/Importance)
 *   Used by → app/_layout.tsx (load), app/plans.tsx
 *   Data    → defines a Zustand store; owns SQLite table task_drafts (lib/db.ts migration)
 *
 * Edit notes:
 *   - saveDraft() always writes the *full* current field snapshot (not a partial patch) —
 *     app/plans.tsx's lifted edit state always carries every field from task-form's set,
 *     seeded from the real task when a Container opens, so there's never a partial row to
 *     merge against. Calling saveDraft() with an empty dirtyFields list clears the draft
 *     instead of writing a no-op row.
 *   - Upsert via INSERT ... ON CONFLICT(task_id) DO UPDATE, same shape as
 *     useEnergyStore.setToday() but over more columns — built dynamically since every
 *     field is always present here (unlike a true partial update).
 */
import { create } from 'zustand';
import db from '@/lib/db';
import { Row, FieldMap, loadAll, rowValues, readStr, readInt, readBool, readJson } from '@/lib/dataAccess';
import { TaskType, Recurring, Importance } from '@/store/useTaskStore';

export type TaskDraftFields = {
  title: string;
  date: string;
  time: string;
  timeEnabled: boolean;
  taskType: TaskType;
  durationMinutes: number;
  recurring: Recurring;
  recurringDays: number[];
  importance: Importance;
};

export type TaskDraft = {
  fields: TaskDraftFields;
  dirtyFields: string[];
  updatedAt: string;
};

type TaskDraftStore = {
  drafts: Record<string, TaskDraft>; // taskId -> draft
  load: () => void;
  saveDraft: (taskId: string, fields: TaskDraftFields, dirtyFields: string[]) => void;
  clearDraft: (taskId: string) => void;
};

const DRAFT_COLUMNS: FieldMap<TaskDraftFields> = {
  title: { col: 'title' },
  date: { col: 'date' },
  time: { col: 'time' },
  timeEnabled: { col: 'time_enabled', to: (v) => (v ? 1 : 0) },
  taskType: { col: 'task_type' },
  durationMinutes: { col: 'duration_minutes' },
  recurring: { col: 'recurring' },
  recurringDays: { col: 'recurring_days', to: (v) => JSON.stringify(v ?? []) },
  importance: { col: 'importance' },
};

function rowToDraft(row: Row): { taskId: string; draft: TaskDraft } {
  return {
    taskId: readStr(row, 'task_id'),
    draft: {
      fields: {
        title: readStr(row, 'title'),
        date: readStr(row, 'date'),
        time: readStr(row, 'time'),
        timeEnabled: readBool(row, 'time_enabled'),
        taskType: readStr(row, 'task_type', 'start-at') as TaskType,
        durationMinutes: readInt(row, 'duration_minutes'),
        recurring: readStr(row, 'recurring', 'none') as Recurring,
        recurringDays: readJson<number[]>(row, 'recurring_days', []),
        importance: readStr(row, 'importance', 'regular') as Importance,
      },
      dirtyFields: readJson<string[]>(row, 'dirty_fields', []),
      updatedAt: readStr(row, 'updated_at'),
    },
  };
}

export const useTaskDraftStore = create<TaskDraftStore>((set, get) => ({
  drafts: {},

  load() {
    const rows = loadAll('task_drafts', rowToDraft);
    const drafts: Record<string, TaskDraft> = {};
    for (const { taskId, draft } of rows) drafts[taskId] = draft;
    set({ drafts });
  },

  saveDraft(taskId, fields, dirtyFields) {
    if (dirtyFields.length === 0) {
      get().clearDraft(taskId);
      return;
    }
    const updatedAt = new Date().toISOString();
    const values: Record<string, string | number | null> = {
      task_id: taskId,
      ...rowValues(fields, DRAFT_COLUMNS),
      dirty_fields: JSON.stringify(dirtyFields),
      updated_at: updatedAt,
    };
    const cols = Object.keys(values);
    const assignments = cols.filter((c) => c !== 'task_id').map((c) => `${c} = excluded.${c}`).join(', ');
    db.runSync(
      `INSERT INTO task_drafts (${cols.join(', ')}) VALUES (${cols.map(() => '?').join(', ')})
       ON CONFLICT(task_id) DO UPDATE SET ${assignments}`,
      cols.map((c) => values[c])
    );
    set((s) => ({ drafts: { ...s.drafts, [taskId]: { fields, dirtyFields, updatedAt } } }));
  },

  clearDraft(taskId) {
    db.runSync('DELETE FROM task_drafts WHERE task_id = ?', [taskId]);
    set((s) => {
      const drafts = { ...s.drafts };
      delete drafts[taskId];
      return { drafts };
    });
  },
}));
