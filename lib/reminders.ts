/**
 * reminders.ts — coordinator that turns settings into scheduled weekly/monthly reminders.
 *
 * syncReminders() reads the settings store + active language, builds localised
 * Content, and (re)schedules or cancels the weekly planning nudge and monthly
 * shopping-reset reminder via lib/notifications. Call after any reminder/language
 * setting change or on app start.
 *
 * Connections:
 *   Imports → lib/i18n, lib/notifications, store/useSettingsStore
 *   Used by → app/_layout.tsx, app/onboarding/step5.tsx, app/settings.tsx
 *   Data    → reads settings store; schedules OS notifications
 *
 * Edit notes:
 *   - Weekday conversion: app stores 0=Mon..6=Sun, Expo wants 1=Sun..7=Sat
 *     (toExpoWeekday) — keep this mapping if you touch weekly scheduling.
 *   - parseHM falls back to 08:00 on malformed "HH:MM"; preserve that guard.
 */
import { useSettingsStore } from '@/store/useSettingsStore';
import { getTranslations } from '@/lib/i18n';
import {
  scheduleWeeklyReminder,
  cancelWeeklyReminder,
  scheduleMonthlyReminder,
  cancelMonthlyReminder,
} from '@/lib/notifications';

/** Parse "HH:MM" into [hour, minute], falling back to 08:00 on bad input. */
function parseHM(time: string): [number, number] {
  const [h, m] = (time || '').split(':').map((n) => parseInt(n, 10));
  const hour = Number.isFinite(h) ? Math.min(Math.max(h, 0), 23) : 8;
  const minute = Number.isFinite(m) ? Math.min(Math.max(m, 0), 59) : 0;
  return [hour, minute];
}

/** App weekday (0 = Mon … 6 = Sun) → Expo weekday (1 = Sun … 7 = Sat). */
function toExpoWeekday(mon0: number): number {
  return ((mon0 + 1) % 7) + 1;
}

/**
 * Re-schedule the weekly planning nudge and the monthly shopping-reset reminder
 * from the current settings. Call after changing any reminder-related setting,
 * the language, or on app start.
 */
export async function syncReminders() {
  const s = useSettingsStore.getState();
  const t = getTranslations(s.language);

  if (!s.remindersEnabled) {
    await cancelWeeklyReminder();
    await cancelMonthlyReminder();
    return;
  }

  const [hour, minute] = parseHM(s.reminderTime);
  await scheduleWeeklyReminder(toExpoWeekday(s.weeklyResetDay), hour, minute, {
    title: t.notif.weeklyTitle,
    body: t.notif.weeklyBody,
  });
  await scheduleMonthlyReminder(s.monthlyResetDate, hour, minute, {
    title: t.notif.monthlyTitle,
    body: t.notif.monthlyBody,
  });
}
