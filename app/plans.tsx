/**
 * plans.tsx — full-day Plans agenda screen
 *
 * The expanded counterpart to the home screen's Plans widget: shows every plan
 * for today (no 3-item cap) via the same DayTimeline component, with a header
 * matching habits.tsx/health.tsx (back + title + in-header add button) and a
 * Share button that opens /share-modal for the day's plans.
 *
 * Connections:
 *   Imports → components/DayTimeline, components/HintCard, components/ScreenBackground, components/Surface, constants/theme, lib/date, lib/i18n, lib/useAppTheme, store/useTaskStore
 *   Used by → Expo Router route "/plans" (plain push from app/index.tsx's Plans widget title)
 *   Data    → reads useTaskStore (tasks) via tasksForDate(today)
 *
 * Edit notes:
 *   - Ranking logic (undone first, then time-anchored, then essential) comes
 *     from lib/taskOrder.ts (rankTodayTasks) — shared with app/index.tsx and the
 *     persistent notification in app/_layout.tsx so all three stay in sync.
 *   - Registered as a plain Stack.Screen in app/_layout.tsx (not a modal) — this
 *     is a full screen you navigate to, not a transient sheet.
 *   - Essentials-mode filtering is intentionally NOT applied here — this is the
 *     "see everything" expansion of the home preview, distinct from the
 *     essentials-only toggle which lives on the home screen itself.
 */
import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTaskStore } from '@/store/useTaskStore';
import { useT } from '@/lib/i18n';
import DayTimeline from '@/components/DayTimeline';
import HintCard from '@/components/HintCard';
import Surface from '@/components/Surface';
import ScreenBackground from '@/components/ScreenBackground';
import { todayStr } from '@/lib/date';
import { rankTodayTasks } from '@/lib/taskOrder';
import { Colors, FontSize, Radius, Spacing } from '@/constants/theme';
import { useAppTheme, useScaledStyles } from '@/lib/useAppTheme';

export default function PlansScreen() {
  const router = useRouter();
  const theme = useAppTheme();
  const styles = useScaledStyles(baseStyles);
  const t = useT();
  const today = todayStr();

  const tasksForDate = useTaskStore((s) => s.tasksForDate);
  const tasks = useTaskStore((s) => s.tasks); // re-render trigger, see app/index.tsx edit notes

  const todayTasks = useMemo(
    () => rankTodayTasks(tasksForDate(today)),
    [tasks, tasksForDate, today]
  );

  return (
    <SafeAreaView style={styles.safe}>
      <ScreenBackground />
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <Text style={[styles.back, { color: theme.orange }]}>{t.back}</Text>
        </Pressable>
        <Text style={[styles.title, { color: theme.text }]}>{t.plansTitle}</Text>
        <View style={styles.headerActions}>
          <Pressable
            style={[styles.shareBtn, { backgroundColor: theme.greenLight }]}
            onPress={() => router.push({ pathname: '/share-modal', params: { kind: 't' } })}
            accessibilityLabel={t.shareBtnLabel}
          >
            <Text style={styles.shareBtnIcon}>⤴</Text>
          </Pressable>
          <Pressable
            style={[styles.addBtn, { backgroundColor: theme.orange }]}
            onPress={() => router.push('/task-form')}
          >
            <Text style={styles.addBtnText}>+</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.content}>
        <HintCard text={t.hints.plans.text} example={t.hints.plans.example} />

        {todayTasks.length === 0 ? (
          <Surface tint={theme.offWhite} style={styles.emptyCard}>
            <Text style={[styles.emptyText, { color: theme.textLight }]}>{t.noPlansToday}</Text>
          </Surface>
        ) : (
          <Surface style={styles.card}>
            <DayTimeline
              tasks={todayTasks}
              onPress={(task) => router.push({ pathname: '/task-form', params: { id: task.id } })}
            />
          </Surface>
        )}
      </View>
    </SafeAreaView>
  );
}

const baseStyles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
  },
  back: { fontSize: FontSize.md, fontWeight: '600' },
  title: { fontSize: FontSize.xl, fontWeight: '700' },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  shareBtn: { borderRadius: Radius.full, width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  shareBtnIcon: { fontSize: 14 },
  addBtn: {
    width: 36, height: 36, borderRadius: Radius.full,
    alignItems: 'center', justifyContent: 'center',
  },
  addBtnText: { color: Colors.white, fontSize: FontSize.xl, fontWeight: '300', lineHeight: 36 },
  content: { flex: 1, padding: Spacing.md, gap: Spacing.md },
  card: { borderRadius: Radius.md, padding: Spacing.md, borderWidth: 1 },
  emptyCard: { borderRadius: Radius.md, padding: Spacing.md, alignItems: 'center' },
  emptyText: { fontSize: FontSize.sm, textAlign: 'center' },
});
