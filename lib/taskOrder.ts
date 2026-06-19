/**
 * taskOrder.ts — shared "today's priority order" ranking for tasks.
 *
 * Single source of truth for how today's tasks are ordered on the home screen
 * (undone first, then time-anchored, then essentials, then by time). Anything
 * that needs to show "today's tasks in the app's order" — the home list, the
 * persistent notification's next-task preview — should sort through this
 * instead of re-deriving the ranking, so the two stay in sync by construction.
 *
 * Connections:
 *   Imports → store/useTaskStore (Task type only)
 *   Used by → app/index.tsx, app/_layout.tsx
 *   Data    → pure function, no store/DB access
 *
 * Edit notes:
 *   - If this ranking changes, the home screen and the persistent notification
 *     both pick it up automatically — no separate update needed.
 */
import { Task } from '@/store/useTaskStore';

export function rankTodayTasks(list: Task[]): Task[] {
  const rank = (task: Task) => {
    let r = 0;
    if (task.done) r += 1000; // done sinks to the bottom
    if (task.taskType === 'time-box' || task.time) r -= 100; // time-anchored rises
    if (task.importance === 'essential') r -= 10; // essentials rise
    return r;
  };
  return [...list].sort((a, b) => {
    const dr = rank(a) - rank(b);
    if (dr !== 0) return dr;
    // Within the same rank, order by time when present (earliest first).
    if (a.time && b.time) return a.time.localeCompare(b.time);
    if (a.time) return -1;
    if (b.time) return 1;
    return 0;
  });
}
