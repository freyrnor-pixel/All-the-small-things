import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function requestPermissions(): Promise<boolean> {
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

export async function scheduleWeeklyReminder(
  dayOfWeek: number,
  hour: number,
  minute: number
) {
  await cancelWeeklyReminder();
  await Notifications.scheduleNotificationAsync({
    identifier: 'weekly-reminder',
    content: {
      title: 'Tid for ukesplanlegging!',
      body: 'Hei! La oss ta en titt på hva som skal skje denne uken. Du klarer det!',
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
      weekday: dayOfWeek + 1, // Expo uses 1=Sun
      hour,
      minute,
    },
  });
}

export async function cancelWeeklyReminder() {
  await Notifications.cancelScheduledNotificationAsync('weekly-reminder').catch(
    () => {}
  );
}

export async function scheduleTaskNotification(
  id: string,
  title: string,
  date: Date,
  isTimebox: boolean,
  durationMinutes?: number
) {
  await Notifications.scheduleNotificationAsync({
    identifier: `task-${id}`,
    content: {
      title: isTimebox ? `Start: ${title}` : `Påminnelse: ${title}`,
      body: isTimebox
        ? `Du har ${durationMinutes} minutter til denne oppgaven. God innsats!`
        : 'Tid for å komme i gang!',
      data: { taskId: id, isTimebox },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date,
    },
  });

  if (isTimebox && durationMinutes) {
    const endDate = new Date(date.getTime() + durationMinutes * 60 * 1000);
    await Notifications.scheduleNotificationAsync({
      identifier: `task-end-${id}`,
      content: {
        title: `Ferdig: ${title}`,
        body: `${durationMinutes} minutter er over. Bra jobbet! Du kan stoppe nå.`,
        data: { taskId: id, isEnd: true },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: endDate,
      },
    });
  }
}

export async function cancelTaskNotification(id: string) {
  await Notifications.cancelScheduledNotificationAsync(`task-${id}`).catch(
    () => {}
  );
  await Notifications.cancelScheduledNotificationAsync(`task-end-${id}`).catch(
    () => {}
  );
}

export async function scheduleMonthlyResetReminder(dayOfMonth: number) {
  await Notifications.cancelScheduledNotificationAsync('monthly-reset').catch(
    () => {}
  );
  await Notifications.scheduleNotificationAsync({
    identifier: 'monthly-reset',
    content: {
      title: 'Månedlig handleliste nullstilling',
      body: 'Hei! Det er tid for å sjekke hva du har hjemme og oppdatere månedslisten din.',
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.MONTHLY,
      day: dayOfMonth,
      hour: 9,
      minute: 0,
    },
  });
}
