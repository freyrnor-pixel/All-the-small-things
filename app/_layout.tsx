/**
 * _layout.tsx — root layout & app bootstrap
 *
 * Mounts on launch: loads the rounded Nunito font (gating render until ready and
 * setting it as the global Text/TextInput default), runs initDb() + pruneOldData(),
 * then loads every Zustand store (settings, tasks, shopping, meals, health, shared,
 * habits, catalog). After requesting notification permission it re-syncs all
 * reminders/notifications to the loaded data and language. Defines the expo-router
 * Stack and per-screen options, redirects to onboarding until setup is complete,
 * and wraps the tree in an ErrorBoundary.
 *
 * Connections:
 *   Imports → constants/theme, lib/db, lib/i18n, lib/notifications, lib/reminders, store/useCatalogStore, store/useHabitStore, store/useHealthStore, store/useMealStore, store/useSettingsStore, store/useSharedStore, store/useShoppingStore, store/useTaskStore
 *   Used by → router layout — defines the Stack and per-screen options
 *   Data    → loads all stores (every SQLite table); schedules notifications via syncReminders + syncAllTaskNotifications + syncAllHabitReminders
 *
 * Edit notes:
 *   - task-form, habit-form and share-modal are registered here as modals (presentation: 'modal', slide_from_bottom); other screens are plain Stack pushes.
 *   - The startup effect runs once ([]); store loads are sync, notification sync is deferred behind requestPermissions().finally().
 *   - segments are read inside the onboarding-guard effect but intentionally kept out of its deps — do not add them.
 */
import { useEffect, Component } from 'react';
import React from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Alert, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
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
import { requestPermissions } from '@/lib/notifications';
import { syncReminders } from '@/lib/reminders';
import { getTranslations } from '@/lib/i18n';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useTaskStore } from '@/store/useTaskStore';
import { useShoppingStore } from '@/store/useShoppingStore';
import { useMealStore } from '@/store/useMealStore';
import { useHealthStore } from '@/store/useHealthStore';
import { useSharedStore } from '@/store/useSharedStore';
import { useHabitStore } from '@/store/useHabitStore';
import { useCatalogStore } from '@/store/useCatalogStore';
import { Colors, Fonts } from '@/constants/theme';

/**
 * Apply the rounded Nunito family as the app-wide default for <Text>/<TextInput>
 * so most copy inherits it without per-screen edits. Explicit `fontFamily` in a
 * component's style still wins (use the Fonts.* tokens for weighted text). Runs
 * once; merges rather than stacking onto any existing default style.
 */
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
  const loadCatalog = useCatalogStore((s) => s.load);

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
    loadCatalog();

    // Notifications: ask once, then bring all scheduled reminders in line with
    // the loaded settings, tasks and habits (and the user's chosen language).
    requestPermissions().finally(() => {
      syncReminders();
      useTaskStore.getState().syncAllTaskNotifications();
      useHabitStore.getState().syncAllHabitReminders();
    });
  }, []);

  useEffect(() => {
    if (!Updates.isEnabled) return;
    (async () => {
      try {
        const check = await Updates.checkForUpdateAsync();
        if (!check.isAvailable) return;
        await Updates.fetchUpdateAsync();
        const t = getTranslations();
        Alert.alert(t.updateAvailableTitle, t.updateAvailableBody, [
          { text: t.updateLater, style: 'cancel' },
          { text: t.updateRestart, onPress: () => Updates.reloadAsync() },
        ]);
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
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: Colors.cream } }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="shopping" />
        <Stack.Screen name="plans" />
        <Stack.Screen name="meals" />
        <Stack.Screen name="health" />
        <Stack.Screen name="scan" />
        <Stack.Screen name="settings" />
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="shared" />
        <Stack.Screen name="habits" />
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
      </Stack>
    </GestureHandlerRootView>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.cream },
});
