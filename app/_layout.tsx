import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StyleSheet } from 'react-native';
import { initDb } from '@/lib/db';
import { seedStoreItems } from '@/lib/seed';
import '@/lib/notifications';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useTaskStore } from '@/store/useTaskStore';
import { useShoppingStore } from '@/store/useShoppingStore';
import { useMealStore } from '@/store/useMealStore';
import { useHealthStore } from '@/store/useHealthStore';
import { Colors } from '@/constants/theme';

export default function RootLayout() {
  const router = useRouter();
  const segments = useSegments();
  const loadSettings = useSettingsStore((s) => s.load);
  const setupComplete = useSettingsStore((s) => s.setupComplete);
  const loaded = useSettingsStore((s) => s.loaded);
  const loadTasks = useTaskStore((s) => s.load);
  const loadShopping = useShoppingStore((s) => s.load);
  const loadMeals = useMealStore((s) => s.load);
  const loadHealth = useHealthStore((s) => s.load);

  useEffect(() => {
    initDb();
    seedStoreItems();
    loadSettings();
    loadTasks();
    loadShopping();
    loadMeals();
    loadHealth();
  }, []);

  useEffect(() => {
    if (!loaded) return;
    const inOnboarding = segments[0] === 'onboarding';
    if (!setupComplete && !inOnboarding) {
      router.replace('/onboarding/language');
    }
  }, [loaded, setupComplete, segments]);

  return (
    <GestureHandlerRootView style={styles.root}>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="shopping" />
        <Stack.Screen name="meals" />
        <Stack.Screen name="health" />
        <Stack.Screen name="scan" />
        <Stack.Screen name="settings" />
        <Stack.Screen name="onboarding" />
        <Stack.Screen
          name="task-form"
          options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
        />
      </Stack>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
