/**
 * habitNotifications.ts — build & (re)schedule a habit's daily reminders.
 *
 * Extracted from store/useHabitStore.ts so the store no longer reads the settings
 * store directly to schedule: the caller passes the active language in. Content is
 * localised here; scheduling goes through lib/notifications. A habit can have
 * several reminders a day — each time in notificationTimes gets its own daily
 * trigger under id `habit-<id>-<i>` (legacy single reminders used `habit-<id>`).
 *
 * Connections:
 *   Imports → lib/notifications, lib/i18n (+ Habit/Language types)
 *   Used by → store/useHabitStore.ts
 *   Data    → schedules OS notifications (no SQLite/store access)
 *
 * Edit notes:
 *   - Always cancel via cancelHabitReminders() before rescheduling so removed
 *     occurrences (and any legacy `habit-<id>` key) don't linger.
 */
import type { Habit } from '@/store/useHabitStore';
import type { Language } from '@/store/useSettingsStore';
import { getTranslations } from '@/lib/i18n';
import { scheduleDailyReminder, cancelDailyReminder } from '@/lib/notifications';

/** Upper bound on reminders-per-habit we schedule/cancel — keeps the cancel loop finite. */
const MAX_HABIT_REMINDERS = 24;

/** Cancel every reminder occurrence for a habit (indexed keys + the legacy single key). */
export async function cancelHabitReminders(habitId: string): Promise<void> {
  await cancelDailyReminder(`habit-${habitId}`); // legacy single-reminder key
  for (let i = 0; i < MAX_HABIT_REMINDERS; i++) {
    await cancelDailyReminder(`habit-${habitId}-${i}`);
  }
}

/** Schedule (or cancel) a habit's daily reminders, honouring the given language and global setting. */
export function syncHabitReminder(habit: Habit, language: Language, habitNotificationsEnabled: boolean): void {
  void cancelHabitReminders(habit.id);
  if (!habitNotificationsEnabled || !habit.notificationEnabled || !habit.active) return;

  // Prefer the explicit list; fall back to the single legacy time for old habits.
  const times = habit.notificationTimes.length
    ? habit.notificationTimes
    : habit.notificationTime
      ? [habit.notificationTime]
      : [];
  if (times.length === 0) return;

  const t = getTranslations(language);
  times.slice(0, MAX_HABIT_REMINDERS).forEach((time, i) => {
    const [h, m] = (time || '08:00').split(':').map((n) => parseInt(n, 10));
    const hour = Number.isFinite(h) ? h : 8;
    const minute = Number.isFinite(m) ? m : 0;
    void scheduleDailyReminder(`habit-${habit.id}-${i}`, hour, minute, {
      title: t.notif.habitReminderTitle(habit.title),
      body: t.notif.habitReminderBody,
    });
  });
}
