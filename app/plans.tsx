/**
 * plans.tsx — full-day Plans agenda screen
 *
 * The expanded counterpart to the home screen's Plans widget: shows every plan
 * for today (no 3-item cap) via the same DayTimeline component, with a header
 * matching habits.tsx/health.tsx (back + title + in-header add button) and a
 * Share button that opens /share-modal for the day's plans.
 *
 * Connections:
 *   Imports → components/DayTimeline, components/HintCard, constants/theme, lib/date, lib/i18n, lib/useAppTheme, store/useTaskStore
 *   Used by → Expo Router route "/plans" (plain push from app/index.tsx's Plans widget title)
 *   Data    → reads useTaskStore (tasks) via tasksForDate(today)
 *
 * Edit notes:
 *   - Ranking logic (undone first, then time-anchored, then essential) is
 *     intentionally duplicated from app/index.tsx rather than shared — see the
 *     edit note there for the same rationale (small, self-contained, screen-local).
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
import { todayStr } from '@/lib/date';
import { Colors, FontSize, Radius, Spacing } from '@/constants/theme';
import { useAppTheme } from '@/lib/useAppTheme';

export default function PlansScreen() {
  const router = useRouter();
  const theme = useAppTheme();
  const t = useT();
  const today = todayStr();

  const tasksForDate = useTaskStore((s) => s.tasksForDate);
  const tasks = useTaskStore((s) => s.tasks); // re-render trigger, see app/index.tsx edit notes

  const todayTasks = useMemo(() => {
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tasks, tasksForDate, today]);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.cream }]}>
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
          <View style={[styles.emptyCard, { backgroundColor: theme.offWhite }]}>
            <Text style={[styles.emptyText, { color: theme.textLight }]}>{t.noPlansToday}</Text>
          </View>
        ) : (
          <View style={[styles.card, { backgroundColor: theme.white, borderColor: theme.border }]}>
            <DayTimeline
              tasks={todayTasks}
              onPress={(task) => router.push({ pathname: '/task-form', params: { id: task.id } })}
            />
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
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
