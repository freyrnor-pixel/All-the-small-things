/**
 * notifications.ts — low-level expo-notifications scheduling primitives.
 *
 * Configures the foreground notification handler and exposes language-agnostic
 * schedule/cancel helpers (weekly, monthly, per-task one-off, recurring weekly
 * task, daily/habit, persistent overview). Callers pass already-localised Content;
 * this module never builds strings itself. Uses stable identifiers so re-scheduling replaces.
 *
 * Connections:
 *   Imports → —
 *   Used by → app/_layout.tsx, app/onboarding/step5.tsx, lib/reminders.ts, store/useHabitStore.ts, store/useTaskStore.ts
 *   Data    → schedules OS notifications (no SQLite/store)
 *
 * Edit notes:
 *   - Keep notification identifiers consistent between schedule and cancel
 *     (e.g. `task-${id}`, `daily-${key}`) or cancellation silently misses.
 *   - Scheduling failures are swallowed via `ignore` — intentional, never crash the UI.
 *   - Content must already be localised by the caller; do not import i18n here.
 *   - refreshPersistentNotification uses trigger: null (fires immediately) so callers can
 *     re-invoke it on every relevant data change to keep one notification up to date;
 *     `sticky`/sound-free presentation is JS-only (no native channel changes), so it's OTA-safe
 *     but isn't a true non-dismissible Android "ongoing" notification — that needs a new build.
 */
import * as Notifications from 'expo-notifications';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

/**
 * All scheduling helpers are language-agnostic: callers pass already-localised
 * text via `Content`. Building the strings is the coordinator's job (see
 * `lib/reminders.ts` and the task/habit stores), so the user's chosen language
 * is the single source of truth.
 */
export type Content = { title: string; body: string };

export async function requestPermissions(): Promise<boolean> {
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

function ignore() {
  /* scheduling can fail silently (permissions, past dates) — never crash the UI */
}

// ── Weekly planning reminder ────────────────────────────────────────────────
export async function scheduleWeeklyReminder(
  weekday: number, // Expo weekday: 1 = Sunday … 7 = Saturday
  hour: number,
  minute: number,
  content: Content
) {
  await cancelWeeklyReminder();
  await Notifications.scheduleNotificationAsync({
    identifier: 'weekly-reminder',
    content,
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
      weekday,
      hour,
      minute,
    },
  }).catch(ignore);
}

export async function cancelWeeklyReminder() {
  await Notifications.cancelScheduledNotificationAsync('weekly-reminder').catch(ignore);
}

// ── Monthly shopping-list reset reminder ────────────────────────────────────
export async function scheduleMonthlyReminder(
  dayOfMonth: number,
  hour: number,
  minute: number,
  content: Content
) {
  await cancelMonthlyReminder();
  await Notifications.scheduleNotificationAsync({
    identifier: 'monthly-reset',
    content,
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.MONTHLY,
      day: dayOfMonth,
      hour,
      minute,
    },
  }).catch(ignore);
}

export async function cancelMonthlyReminder() {
  await Notifications.cancelScheduledNotificationAsync('monthly-reset').catch(ignore);
}

// ── Per-task reminder (one-off, fires at a specific date/time) ───────────────
export async function scheduleTaskNotification(
  id: string,
  date: Date,
  content: Content,
  end?: { date: Date; content: Content }
) {
  await cancelTaskNotification(id);
  await Notifications.scheduleNotificationAsync({
    identifier: `task-${id}`,
    content: { ...content, data: { taskId: id } },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date },
  }).catch(ignore);

  if (end) {
    await Notifications.scheduleNotificationAsync({
      identifier: `task-end-${id}`,
      content: { ...end.content, data: { taskId: id, isEnd: true } },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: end.date },
    }).catch(ignore);
  }
}

// A single weekly occurrence of a recurring task's reminder. `suffix` makes the
// identifier unique within the task (e.g. "s3" = start on day 3, "e3" = its end).
export type WeeklyTaskOccurrence = {
  suffix: string;
  weekday: number; // Expo weekday: 1 = Sunday … 7 = Saturday
  hour: number;
  minute: number;
  content: Content;
};

// Recurring task reminders: one repeating weekly trigger per occurrence.
export async function scheduleWeeklyTaskNotifications(
  id: string,
  occurrences: WeeklyTaskOccurrence[]
) {
  await cancelTaskNotification(id);
  for (const o of occurrences) {
    await Notifications.scheduleNotificationAsync({
      identifier: `task-${id}-${o.suffix}`,
      content: { ...o.content, data: { taskId: id } },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
        weekday: o.weekday,
        hour: o.hour,
        minute: o.minute,
      },
    }).catch(ignore);
  }
}

export async function cancelTaskNotification(id: string) {
  // Clears both the one-off reminders and every weekly occurrence (start + end
  // for each of the seven possible days), so it works whatever kind the task is.
  await Notifications.cancelScheduledNotificationAsync(`task-${id}`).catch(ignore);
  await Notifications.cancelScheduledNotificationAsync(`task-end-${id}`).catch(ignore);
  for (let d = 0; d < 7; d++) {
    await Notifications.cancelScheduledNotificationAsync(`task-${id}-s${d}`).catch(ignore);
    await Notifications.cancelScheduledNotificationAsync(`task-${id}-e${d}`).catch(ignore);
  }
}

// ── Daily reminder (used for habits) ────────────────────────────────────────
export async function scheduleDailyReminder(
  key: string,
  hour: number,
  minute: number,
  content: Content
) {
  await cancelDailyReminder(key);
  await Notifications.scheduleNotificationAsync({
    identifier: `daily-${key}`,
    content,
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
    },
  }).catch(ignore);
}

export async function cancelDailyReminder(key: string) {
  await Notifications.cancelScheduledNotificationAsync(`daily-${key}`).catch(ignore);
}

// ── Persistent "today's overview" notification ──────────────────────────────
// Fires immediately (trigger: null) under a stable identifier, so each call
// replaces the previous one in place rather than stacking new notifications.
export async function refreshPersistentNotification(content: Content) {
  await Notifications.scheduleNotificationAsync({
    identifier: 'persistent-overview',
    content: { ...content, sticky: true, autoDismiss: false },
    trigger: null,
  }).catch(ignore);
}

export async function cancelPersistentNotification() {
  await Notifications.dismissNotificationAsync('persistent-overview').catch(ignore);
  await Notifications.cancelScheduledNotificationAsync('persistent-overview').catch(ignore);
}
