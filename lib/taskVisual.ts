/**
 * taskVisual.ts — plain-text "look" of a task, mirrored from components/TaskItem.tsx.
 *
 * Notifications can't render React Native icons, so this turns the same visual
 * cues TaskItem.tsx shows (timer vs. clock icon, essential star, recurring badge)
 * into a single emoji-prefixed line of text. Used by the persistent overview
 * notification in app/_layout.tsx to keep its "look" in step with the home screen.
 *
 * Connections:
 *   Imports → constants/theme (AppColors, FeatureColors), lib/i18n (Translations type), store/useTaskStore (Task type)
 *   Used by → app/_layout.tsx
 *   Data    → pure function, no store/DB access
 *
 * Edit notes:
 *   - If TaskItem.tsx's icon/accent choices change (timer-outline/time-outline,
 *     star, repeat, typeAccent), mirror the change here so the notification
 *     stays visually in sync — both describeTask (text) and taskAccentColor
 *     (the notification's native Android accent-color tint).
 */
import { Task } from '@/store/useTaskStore';
import { Translations } from '@/lib/i18n';
import { AppColors, FeatureColors } from '@/constants/theme';

export function describeTask(task: Task, t: Translations): string {
  const parts: string[] = [task.title];
  if (task.taskType === 'time-box') {
    parts.push(`⏱ ${task.durationMinutes ?? 30}min`);
  } else if (task.time) {
    parts.push(`🕐 ${task.time}`);
  }
  if (task.recurring === 'weekly') {
    parts.push(
      task.recurringDays.length > 0
        ? `🔁 ${task.recurringDays.map((d) => t.dayLabels[d]).join(', ')}`
        : '🔁'
    );
  }
  const line = parts.join(' • ');
  return task.importance === 'essential' ? `⭐ ${line}` : line;
}

// Android lets a notification tint its small icon with one accent color — mirrors
// TaskItem.tsx's stripeColor/typeAccent priority (essential first, then type).
export function taskAccentColor(task: Task, theme: AppColors): string {
  if (task.importance === 'essential') return theme.orange;
  return task.taskType === 'time-box' ? FeatureColors.task : FeatureColors.shared;
}
