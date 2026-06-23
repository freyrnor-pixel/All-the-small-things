/**
 * _layout.tsx — root layout & app bootstrap
 *
 * Mounts on launch: loads the rounded Nunito font (gating render until ready and
 * setting it as the global Text/TextInput default), runs initDb() + pruneOldData(),
 * then loads every Zustand store (settings, tasks, shopping, meals, health, shared,
 * habits, energy, inbox, catalog, receipts, automations, feedback). After requesting
 * notification permission it re-syncs all reminders/notifications to the loaded data
 * and language, registers the interactive "Done"/"Remind me later" notification
 * action buttons (syncNotificationCategories) and listens for taps on them
 * (onNotificationAction), and keeps the persistent "today's overview" notification
 * (if enabled) refreshed as tasks/shopping change.
 * Defines the expo-router Stack and per-screen options, redirects to onboarding
 * until setup is complete, mounts the global DebugOverlay when debug mode is on, and
 * wraps the tree in an ErrorBoundary.
 *
 * Connections:
 *   Imports → components/DebugOverlay, constants/theme, lib/date, lib/db, lib/i18n, lib/notifications, lib/reminders, lib/taskOrder, lib/taskVisual, lib/useAppTheme, store/useAutomationStore, store/useCatalogStore, store/useEnergyStore, store/useFeedbackStore, store/useHabitStore, store/useHealthStore, store/useInboxStore, store/useMealStore, store/useReceiptStore, store/useSettingsStore, store/useSharedStore, store/useShoppingStore, store/useTaskStore, store/useUpdateStore
 *   Used by → router layout — defines the Stack and per-screen options
 *   Data    → loads all stores (every SQLite table); schedules notifications via syncReminders + syncAllTaskNotifications + syncAllHabitReminders + the persistent-overview effect; toggles tasks via useTaskStore on a "Done" notification action tap
 *
 * Edit notes:
 *   - task-form, habit-form, share-modal and capture are registered here as modals (presentation: 'modal', slide_from_bottom); other screens are plain Stack pushes.
 *   - screenOptions sets a 150ms fade as the default transition (tab-switch feel for the
 *     bottom-menu sites — see lib/siteNav.ts + components/BottomNav.tsx); modal screens
 *     override it per-screen with slide_from_bottom.
 *   - The startup effect runs once ([]); store loads are sync, notification sync is deferred behind requestPermissions().finally().
 *   - The notification-action effect (AP-05) is separate from the startup effect and mounted once too — onNotificationAction's handler always reads fresh store state via .getState() rather than closing over stale props, so it doesn't need deps.
 *   - DebugOverlay is gated on `loaded && debugModeEnabled` so it never flashes before settings load and is fully absent for users who haven't enabled it in Settings.
 *   - segments are read inside the onboarding-guard effect but intentionally kept out of its deps — do not add them.
 *   - OTA updates do not auto-apply or pop up a dismissible Alert: a fetched update sets
 *     useUpdateStore's updateReady flag, and app/index.tsx shows a persistent "Restart"
 *     banner (no auto-reload, no missable tap) until the user taps it.
 *   - The persistent-overview effect re-reads tasksForDate(todayStr()) fresh on every run rather
 *     than trusting a stale closure, since it depends on the `tasks` array reference, not on the date.
 *     It shows only today's next pending task (title) plus the 2 after it (body, revealed on
 *     expand) — ordered via lib/taskOrder.ts and styled via lib/taskVisual.ts so it always
 *     matches the home screen's look and order. No longer includes the shopping list.
 *   - Also passes taskAccentColor(next, theme) as the notification's `color`, so Android
 *     tints the small notification icon to match the task's in-app accent (essential/
 *     time-box/start-at) — the one real non-text visual cue OTA-only JS can produce.
 */
import { useEffect, Component } from 'react';
import React from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import * as Updates from 'expo-updates';
import {
  useFonts,
  Nunito_400Regular,
  Nunito_500Medium,
  Nunito_600SemiBold,
  Nunito_700Bold,
  Nunito_800ExtraBold,
} from '@expo-google-fonts/nunito';
import { initDb, pruneOldData } from '@/lib/db';
import {
  requestPermissions,
  refreshPersistentNotification,
  cancelPersistentNotification,
  syncNotificationCategories,
  onNotificationAction,
  scheduleReNudge,
} from '@/lib/notifications';
import { syncReminders } from '@/lib/reminders';
import { getTranslations } from '@/lib/i18n';
import { todayStr } from '@/lib/date';
import { rankTodayTasks } from '@/lib/taskOrder';
import { describeTask, taskAccentColor } from '@/lib/taskVisual';
import { useAppTheme } from '@/lib/useAppTheme';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useTaskStore } from '@/store/useTaskStore';
import { useShoppingStore } from '@/store/useShoppingStore';
import { useMealStore } from '@/store/useMealStore';
import { useHealthStore } from '@/store/useHealthStore';
import { useSharedStore } from '@/store/useSharedStore';
import { useHabitStore } from '@/store/useHabitStore';
import { useEnergyStore } from '@/store/useEnergyStore';
import { useInboxStore } from '@/store/useInboxStore';
import { useCatalogStore } from '@/store/useCatalogStore';
import { useReceiptStore } from '@/store/useReceiptStore';
import { useAutomationStore } from '@/store/useAutomationStore';
import { useUpdateStore } from '@/store/useUpdateStore';
import { useFeedbackStore } from '@/store/useFeedbackStore';
import { Colors, Fonts } from '@/constants/theme';
import DebugOverlay from '@/components/DebugOverlay';

/**
 * Apply the rounded Nunito family as the app-wide default for <Text>/<TextInput>
 * so most copy inherits it without per-screen edits. Explicit `fontFamily` in a
 * component's style still wins (use the Fonts.* tokens for weighted text). Runs
 * once; merges rather than stacking onto any existing default style.
 */
/** How long a "Remind me later" tap defers a task notification (AP-05 re-nudge). */
const RENUDGE_DELAY_MS = 15 * 60 * 1000;

let fontDefaultsApplied = false;
function applyDefaultFontFamily() {
  if (fontDefaultsApplied) return;
  fontDefaultsApplied = true;
  for (const Comp of [Text, TextInput] as unknown as { defaultProps?: { style?: unknown } }[]) {
    Comp.defaultProps = Comp.defaultProps || {};
    Comp.defaultProps.style = [{ fontFamily: Fonts.regular }, Comp.defaultProps.style];
  }
}

class ErrorBoundary extends Component<
  { children: React.ReactNode },
  { error: Error | null }
> {
  state = { error: null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  render() {
    if (this.state.error) {
      const err = this.state.error as Error;
      return (
        <View style={{ flex: 1, backgroundColor: '#FDF6EC', padding: 24, paddingTop: 60 }}>
          <Text style={{ fontSize: 18, fontWeight: '700', color: '#c0392b', marginBottom: 12 }}>
            {getTranslations().errorTitle}
          </Text>
          <ScrollView>
            <Text style={{ fontSize: 13, color: '#333', fontFamily: 'monospace' }}>
              {err.message}{'\n\n'}{err.stack}
            </Text>
          </ScrollView>
        </View>
      );
    }
    return this.props.children;
  }
}

export default function RootLayout() {
  const router = useRouter();
  const segments = useSegments();
  const [fontsLoaded, fontError] = useFonts({
    Nunito_400Regular,
    Nunito_500Medium,
    Nunito_600SemiBold,
    Nunito_700Bold,
    Nunito_800ExtraBold,
  });
  const loadSettings = useSettingsStore((s) => s.load);
  const setupComplete = useSettingsStore((s) => s.setupComplete);
  const loaded = useSettingsStore((s) => s.loaded);
  const loadTasks = useTaskStore((s) => s.load);
  const loadShopping = useShoppingStore((s) => s.load);
  const loadMeals = useMealStore((s) => s.load);
  const loadHealth = useHealthStore((s) => s.load);
  const loadShared = useSharedStore((s) => s.load);
  const loadHabits = useHabitStore((s) => s.load);
  const loadEnergy = useEnergyStore((s) => s.load);
  const loadInbox = useInboxStore((s) => s.load);
  const loadCatalog = useCatalogStore((s) => s.load);
  const loadReceipts = useReceiptStore((s) => s.load);
  const loadAutomations = useAutomationStore((s) => s.load);
  const loadFeedback = useFeedbackStore((s) => s.load);
  const persistentNotifEnabled = useSettingsStore((s) => s.persistentNotifEnabled);
  const debugModeEnabled = useSettingsStore((s) => s.debugModeEnabled);
  const language = useSettingsStore((s) => s.language);
  const tasks = useTaskStore((s) => s.tasks);
  const theme = useAppTheme();

  useEffect(() => {
    try { initDb(); } catch { /* DB init failed — proceed anyway */ }
    try { pruneOldData(); } catch { /* keep going if cleanup fails */ }
    loadSettings();
    loadTasks();
    loadShopping();
    loadMeals();
    loadHealth();
    loadShared();
    loadHabits();
    loadEnergy();
    loadInbox();
    loadCatalog();
    loadReceipts();
    loadAutomations();
    loadFeedback();

    // Notifications: ask once, then bring all scheduled reminders in line with
    // the loaded settings, tasks and habits (and the user's chosen language).
    requestPermissions().finally(() => {
      syncReminders();
      useTaskStore.getState().syncAllTaskNotifications();
      useHabitStore.getState().syncAllHabitReminders();
      const t = getTranslations(useSettingsStore.getState().language);
      void syncNotificationCategories(t.notif.actionDone, t.notif.actionRemindLater);
    });
  }, []);

  // Interactive notification action buttons (AP-05): "Done" toggles the task in
  // place; "Remind me later" snoozes a follow-up via scheduleReNudge. Mounted
  // once — onNotificationAction reads fresh store state per tap, not a closure.
  useEffect(() => {
    return onNotificationAction((action, taskId) => {
      if (action === 'done') {
        useTaskStore.getState().toggle(taskId);
        return;
      }
      const task = useTaskStore.getState().tasks.find((tk) => tk.id === taskId);
      if (!task) return;
      const t = getTranslations(useSettingsStore.getState().language);
      void scheduleReNudge(taskId, RENUDGE_DELAY_MS, {
        title: t.notif.renudgeTitle(task.title),
        body: t.notif.renudgeBody,
      });
    });
  }, []);

  // Keep the persistent "today's overview" notification in sync with today's
  // pending tasks, refreshing it in place (same identifier) on every relevant
  // data change. Shows the next task (collapsed) with the look mirrored from
  // TaskItem.tsx via lib/taskVisual.ts, and the 2 after it on expand (body text),
  // both ordered the same way as the home screen via lib/taskOrder.ts.
  useEffect(() => {
    if (!loaded) return;
    if (!persistentNotifEnabled) {
      void cancelPersistentNotification();
      return;
    }
    const t = getTranslations(language);
    const pending = rankTodayTasks(useTaskStore.getState().tasksForDate(todayStr())).filter(
      (task) => !task.done
    );
    const [next, ...upcoming] = pending;
    if (!next) {
      void refreshPersistentNotification({
        title: t.notif.overviewTitle,
        body: t.notif.overviewBodyNoTasks,
      });
      return;
    }
    void refreshPersistentNotification({
      title: describeTask(next, t),
      body: upcoming.slice(0, 2).map((task) => describeTask(task, t)).join('\n') || t.notif.overviewNothingElse,
      color: taskAccentColor(next, theme),
    });
  }, [loaded, persistentNotifEnabled, language, tasks, theme]);

  useEffect(() => {
    if (!Updates.isEnabled) return;
    (async () => {
      try {
        const check = await Updates.checkForUpdateAsync();
        if (!check.isAvailable) return;
        await Updates.fetchUpdateAsync();
        // Flag it instead of auto-reloading or popping an Alert — the home
        // screen shows a persistent "Restart" banner until the user taps it.
        useUpdateStore.getState().setUpdateReady(true);
      } catch {
        /* silently ignore — update check must never crash the app */
      }
    })();
  }, []);

  useEffect(() => {
    if (!loaded || setupComplete) return;
    // Read segments inside the effect as a guard — intentionally not in deps
    // to avoid re-triggering every render (useSegments returns a new array each time)
    if (segments[0] !== 'onboarding') {
      router.replace('/onboarding/language');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded, setupComplete]);

  // Hold the UI until the rounded font is ready (or has definitively failed) so
  // text doesn't flash in the system font first. Apply it as the global default.
  if (!fontsLoaded && !fontError) return null;
  applyDefaultFontFamily();

  return (
    <ErrorBoundary>
    <GestureHandlerRootView style={styles.root}>
      {/* backgroundColor is an Android-only runtime prop not in expo-status-bar types */}
      {/* eslint-disable-next-line @typescript-eslint/ban-ts-comment */}
      {/* @ts-expect-error */}
      <StatusBar style="dark" backgroundColor={Colors.cream} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: Colors.cream },
          // Bottom-menu sites are switched far more often than they're "drilled into" —
          // a quick fade reads as a tab switch, not a push (see ANIMATION_GUIDELINES.md §1's
          // "Tab switch: 150–200ms" row vs. the default stack-push transition). Modal screens
          // below override this with their own slide_from_bottom.
          animation: 'fade',
          animationDuration: 150,
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="plans" />
        <Stack.Screen name="shopping" />
        <Stack.Screen name="meals" />
        <Stack.Screen name="health" />
        <Stack.Screen name="scan" />
        <Stack.Screen name="budget" />
        <Stack.Screen name="settings" />
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="shared" />
        <Stack.Screen name="habits" />
        <Stack.Screen name="automations" />
        <Stack.Screen
          name="habit-form"
          options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
        />
        <Stack.Screen
          name="share-modal"
          options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
        />
        <Stack.Screen
          name="task-form"
          options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
        />
        <Stack.Screen
          name="capture"
          options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
        />
      </Stack>
      {loaded && debugModeEnabled && <DebugOverlay />}
    </GestureHandlerRootView>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.cream },
});
