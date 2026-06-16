/**
 * plans.tsx — full-day "Plans" list (the home screen's expanded destination)
 *
 * Dedicated screen for today's complete agenda: every task for today, ranked
 * the same way as the home "Plans" widget (undone first, time-anchored rises,
 * essentials rise), rendered via the shared DayTimeline agenda view — no
 * preview cap here, this always shows the whole day.
 *
 * Connections:
 *   Imports → components/DayTimeline, constants/theme, lib/date, lib/i18n, lib/useAppTheme, store/useSettingsStore, store/useTaskStore
 *   Used by → Expo Router route "/plans" (opened by tapping the home "Plans" title)
 *   Data    → useTaskStore (tasks, tasksForDate, toggle); essentialsModeEnabled via useSettingsStore (read-only)
 *
 * Edit notes:
 *   - Ranking logic is intentionally duplicated from app/index.tsx (allTodayTasks)
 *     rather than shared via a hook — keeping it inline keeps both call sites simple;
 *     if it drifts, move it to lib/.
 *   - Swipe-down-to-go-back + drag handle mirrors app/shopping.tsx's pattern.
 */
import React, { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import DayTimeline from '@/components/DayTimeline';
import { useTaskStore } from '@/store/useTaskStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { todayStr } from '@/lib/date';
import { useT } from '@/lib/i18n';
import { useAppTheme } from '@/lib/useAppTheme';
import { FontSize, Radius, Spacing } from '@/constants/theme';

export default function PlansScreen() {
  const router = useRouter();
  const theme = useAppTheme();
  const t = useT();
  const today = todayStr();

  const tasks = useTaskStore((s) => s.tasks);
  const tasksForDate = useTaskStore((s) => s.tasksForDate);
  const settings = useSettingsStore();

  const swipeDown = Gesture.Pan().onEnd((e) => {
    if (e.translationY > 80 && Math.abs(e.translationX) < 60) {
      runOnJS(router.back)();
    }
  });

  const allTodayTasks = useMemo(() => {
    const list = tasksForDate(today);
    const rank = (task: typeof list[number]) => {
      let r = 0;
      if (task.done) r += 1000;
      if (task.taskType === 'time-box' || task.time) r -= 100;
      if (task.importance === 'essential') r -= 10;
      return r;
    };
    return [...list].sort((a, b) => {
      const dr = rank(a) - rank(b);
      if (dr !== 0) return dr;
      if (a.time && b.time) return a.time.localeCompare(b.time);
      if (a.time) return -1;
      if (b.time) return 1;
      return 0;
    });
  }, [tasks, tasksForDate, today]);

  const visibleTodayTasks = settings.essentialsModeEnabled
    ? allTodayTasks.filter((task) => task.importance === 'essential')
    : allTodayTasks;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.cream }]}>
      <GestureDetector gesture={swipeDown}>
        <View style={[styles.dragHandle, { backgroundColor: theme.white }]}>
          <View style={[styles.dragBar, { backgroundColor: theme.grayLight }]} />
        </View>
      </GestureDetector>

      <View style={[styles.header, { backgroundColor: theme.white, borderBottomColor: theme.grayLight }]}>
        <Pressable onPress={() => router.back()}>
          <Text style={[styles.back, { color: theme.orange }]}>{t.back}</Text>
        </Pressable>
        <Text style={[styles.title, { color: theme.text }]}>
          {settings.essentialsModeEnabled ? t.essentialPlansTitle : t.plansTitle}
        </Text>
        <Pressable
          style={[styles.shareHeaderBtn, { backgroundColor: theme.greenLight }]}
          onPress={() => router.push({ pathname: '/share-modal', params: { kind: 't' } })}
        >
          <Text style={[styles.shareHeaderBtnText, { color: theme.text }]}>{t.shareBtnLabel}</Text>
        </Pressable>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        {visibleTodayTasks.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: theme.offWhite }]}>
            <Text style={[styles.emptyText, { color: theme.textLight }]}>
              {settings.essentialsModeEnabled ? t.noEssentialPlansToday : t.noPlansToday}
            </Text>
          </View>
        ) : (
          <View style={[styles.card, { backgroundColor: theme.white, borderColor: theme.border }]}>
            <DayTimeline
              tasks={visibleTodayTasks}
              onPress={(task) => router.push({ pathname: '/task-form', params: { id: task.id } })}
            />
          </View>
        )}
      </ScrollView>

      <Pressable
        style={[styles.fab, { backgroundColor: theme.orange }]}
        onPress={() => router.push('/task-form')}
      >
        <Text style={styles.fabText}>{t.addNew}</Text>
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  dragHandle: { alignItems: 'center', paddingVertical: Spacing.sm },
  dragBar: { width: 40, height: 4, borderRadius: Radius.full },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
    borderBottomWidth: 1,
  },
  back: { fontSize: FontSize.md, fontWeight: '600' },
  title: { fontSize: FontSize.xl, fontWeight: '700' },
  shareHeaderBtn: { borderRadius: Radius.full, paddingHorizontal: Spacing.sm, paddingVertical: Spacing.xs },
  shareHeaderBtnText: { fontSize: FontSize.sm, fontWeight: '600' },
  scroll: { flex: 1 },
  content: { padding: Spacing.md, paddingBottom: Spacing.xl * 2 },
  card: { borderRadius: Radius.md, padding: Spacing.md, borderWidth: 1 },
  emptyCard: { borderRadius: Radius.md, padding: Spacing.md, alignItems: 'center' },
  emptyText: { fontSize: FontSize.sm, textAlign: 'center' },
  fab: {
    position: 'absolute', right: Spacing.md, bottom: Spacing.lg,
    borderRadius: Radius.full, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm,
  },
  fabText: { color: '#fff', fontWeight: '700', fontSize: FontSize.md },
});
