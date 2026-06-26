/**
 * taskVisual.ts — plain-text representation of a task for persistent notification.
 *
 * Provides minimal task name (no metadata) for the all-day "today's overview"
 * notification in app/_layout.tsx, matching the notification redesign (Option C:
 * title = task name only, metadata in body only). The accent color tinting
 * (taskAccentColor) still mirrors TaskItem.tsx's essential/type priority.
 *
 * Connections:
 *   Imports → constants/theme (AppColors, FeatureColors), lib/i18n (Translations type), store/useTaskStore (Task type)
 *   Used by → app/_layout.tsx
 *   Data    → pure function, no store/DB access
 *
 * Edit notes:
 *   - describeTask now returns task name only (no emoji metadata, no time/recurrence).
 *   - taskAccentColor still needs to mirror TaskItem.tsx's essential/type priority
 *     so the notification's Android accent tint stays in sync.
 */
import { Task } from '@/store/useTaskStore';
import { AppColors, FeatureColors } from '@/constants/theme';

export function describeTask(task: Task): string {
  return task.title;
}

export function taskAccentColor(task: Task, theme: AppColors): string {
  if (task.importance === 'essential') return theme.orange;
  return task.taskType === 'time-box' ? FeatureColors.task : FeatureColors.shared;
}
