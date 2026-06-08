import { useEffect, Component } from 'react';
import React from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { initDb } from '@/lib/db';
import { seedStoreItems } from '@/lib/seed';
import '@/lib/notifications';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useTaskStore } from '@/store/useTaskStore';
import { useShoppingStore } from '@/store/useShoppingStore';
import { useMealStore } from '@/store/useMealStore';
import { useHealthStore } from '@/store/useHealthStore';
import { Colors } from '@/constants/theme';

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
            Noe gikk galt
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
  const loadSettings = useSettingsStore((s) => s.load);
  const setupComplete = useSettingsStore((s) => s.setupComplete);
  const loaded = useSettingsStore((s) => s.loaded);
  const loadTasks = useTaskStore((s) => s.load);
  const loadShopping = useShoppingStore((s) => s.load);
  const loadMeals = useMealStore((s) => s.load);
  const loadHealth = useHealthStore((s) => s.load);

  useEffect(() => {
    try { initDb(); } catch { /* DB init failed — proceed anyway */ }
    try { seedStoreItems(); } catch { /* Seed failed */ }
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
    <ErrorBoundary>
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
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.cream },
});
