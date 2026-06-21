/**
 * habitNotifications.ts — build & (re)schedule a habit's daily reminder.
 *
 * Extracted from store/useHabitStore.ts so the store no longer reads the settings
 * store directly to schedule: the caller passes the active language in. Content is
 * localised here; scheduling goes through lib/notifications (id `habit-<id>`).
 *
 * Connections:
 *   Imports → lib/notifications, lib/i18n (+ Habit/Language types)
 *   Used by → store/useHabitStore.ts
 *   Data    → schedules OS notifications (no SQLite/store access)
 */
import type { Habit } from '@/store/useHabitStore';
import type { Language } from '@/store/useSettingsStore';
import { getTranslations } from '@/lib/i18n';
import { scheduleDailyReminder, cancelDailyReminder } from '@/lib/notifications';

/** Schedule (or cancel) a habit's daily reminder, honouring the given language. */
export function syncHabitReminder(habit: Habit, language: Language): void {
  if (!habit.notificationEnabled || !habit.active) {
    void cancelDailyReminder(`habit-${habit.id}`);
    return;
  }
  const [h, m] = (habit.notificationTime || '08:00').split(':').map((n) => parseInt(n, 10));
  const hour = Number.isFinite(h) ? h : 8;
  const minute = Number.isFinite(m) ? m : 0;
  const t = getTranslations(language);
  void scheduleDailyReminder(`habit-${habit.id}`, hour, minute, {
    title: t.notif.habitReminderTitle(habit.title),
    body: t.notif.habitReminderBody,
  });
}
