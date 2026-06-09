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

export async function cancelTaskNotification(id: string) {
  await Notifications.cancelScheduledNotificationAsync(`task-${id}`).catch(ignore);
  await Notifications.cancelScheduledNotificationAsync(`task-end-${id}`).catch(ignore);
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
