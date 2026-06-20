/**
 * taskSuggestion.ts — "what's the one next thing?" suggestion
 *
 * Pure function picking the single best next task to surface on the home
 * screen (components/NextTaskCard.tsx). Deliberately separate from
 * lib/taskOrder.ts's rankTodayTasks() (orders the *whole* day for display)
 * and useTaskStore's focusTask() (importance/time only, no priority/energy
 * awareness) — this folds in the AP-03 priority field and energy check-in.
 *
 * Connections:
 *   Imports → store/useEnergyStore (EnergyLevel type only), store/useTaskStore (Task type only)
 *   Used by → app/index.tsx, components/NextTaskCard.tsx
 *   Data    → pure function, no store/DB access
 *
 * Edit notes:
 *   - `date` guards out one-time tasks not actually scheduled for that day (a
 *     no-op when fed tasksForDate(date), but keeps the function safe if ever
 *     handed a broader list); weekly-recurring tasks bypass the check since
 *     their stored `date` is their creation date, not the occurrence date.
 *   - Sort/tie-break mirrors focusTask()'s style: time ascending (nulls last),
 *     then id — with a priority rank (high → medium → low) ahead of it.
 */
import { Task } from '@/store/useTaskStore';
import { EnergyLevel } from '@/store/useEnergyStore';

const PRIORITY_RANK: Record<Task['priority'], number> = { high: 0, medium: 1, low: 2 };

export function suggestNextTask(
  tasks: Task[],
  date: string,
  energy: EnergyLevel | null,
  workModeActive: boolean
): Task | null {
  let candidates = tasks.filter((task) => {
    if (task.done) return false;
    if (task.recurring === 'none' && task.date !== date) return false;
    return true;
  });
  if (workModeActive) candidates = candidates.filter((task) => task.importance === 'essential');
  if (energy === 'low') candidates = candidates.filter((task) => task.priority === 'high');

  const sorted = [...candidates].sort((a, b) => {
    const pr = PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
    if (pr !== 0) return pr;
    if (a.time && b.time) return a.time.localeCompare(b.time);
    if (a.time) return -1;
    if (b.time) return 1;
    return a.id.localeCompare(b.id);
  });
  return sorted[0] ?? null;
}
