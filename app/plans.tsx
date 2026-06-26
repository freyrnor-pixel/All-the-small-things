/**
 * plans.tsx — full-day Plans agenda screen
 *
 * The expanded counterpart to the home screen's Plans widget: shows every plan
 * for today (no 3-item cap) via the same DayTimeline component, with a header
 * (back + title + Share) and a floating AddFAB for adding a new task.
 *
 * Connections:
 *   Imports → components/AddFAB, components/BottomNav, components/DayTimeline, components/HintCard, components/ScreenBackground, components/ScreenHeader, components/SiteSwipeView, components/Surface, constants/theme, lib/date, lib/i18n, lib/useAppTheme, store/useEnergyStore, store/useTaskStore
 *   Used by → Expo Router route "/plans", reached via BottomNav or a swipe/push from app/index.tsx's Plans widget title
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
 *     essentials-only toggle which lives on the home screen itself. The energy-level
 *     filter (narrow to priority='high' on a 'low' energy day) IS applied here,
 *     matching app/index.tsx's visibleTodayTasks, so this screen shows the same
 *     task set the home screen's Plans preview is drawn from.
 *   - DayTimeline's onToggle calls toggle() directly — tasks auto-save immediately,
 *     no separate save step.
 */
import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTaskStore } from '@/store/useTaskStore';
import { useEnergyStore } from '@/store/useEnergyStore';
import { useT } from '@/lib/i18n';
import DayTimeline from '@/components/DayTimeline';
import HintCard from '@/components/HintCard';
import Surface from '@/components/Surface';
import ScreenBackground from '@/components/ScreenBackground';
import ScreenHeader from '@/components/ScreenHeader';
import AddFAB from '@/components/AddFAB';
import BottomNav from '@/components/BottomNav';
import SiteSwipeView from '@/components/SiteSwipeView';
import { todayStr } from '@/lib/date';
import { rankTodayTasks } from '@/lib/taskOrder';
import { FontSize, Radius, Spacing } from '@/constants/theme';
import { useAppTheme, useScaledStyles } from '@/lib/useAppTheme';

export default function PlansScreen() {
  const router = useRouter();
  const theme = useAppTheme();
  const styles = useScaledStyles(baseStyles);
  const t = useT();
  const today = todayStr();

  const tasksForDate = useTaskStore((s) => s.tasksForDate);
  const tasks = useTaskStore((s) => s.tasks); // re-render trigger, see app/index.tsx edit notes
  const toggleTask = useTaskStore((s) => s.toggle);
  const energyLevels = useEnergyStore((s) => s.levels);
  const todayEnergyLevel = energyLevels[today] ?? null;

  const todayTasks = useMemo(() => {
    const ranked = rankTodayTasks(tasksForDate(today));
    return todayEnergyLevel === 'low' ? ranked.filter((task) => task.priority === 'high') : ranked;
  }, [tasks, tasksForDate, today, todayEnergyLevel]);

  return (
    <SafeAreaView style={styles.safe}>
      <ScreenBackground />
      <ScreenHeader
        title={t.plansTitle}
        onBack={() => router.back()}
        right={
          <Pressable
            style={styles.shareBtn}
            onPress={() => router.push({ pathname: '/share-modal', params: { kind: 't' } })}
            accessibilityLabel={t.shareBtnLabel}
          >
            <Text style={[styles.shareBtnIcon, { color: theme.orange }]}>⤴</Text>
          </Pressable>
        }
      />

      <SiteSwipeView>
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
              onToggle={(task) => toggleTask(task.id)}
            />
          </Surface>
        )}
      </View>
      </SiteSwipeView>

      <AddFAB onPress={() => router.push('/task-form')} />
      <BottomNav />
    </SafeAreaView>
  );
}

const baseStyles = StyleSheet.create({
  safe: { flex: 1 },
  shareBtn: { borderRadius: Radius.full, width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  shareBtnIcon: { fontSize: 14 },
  content: { flex: 1, padding: Spacing.md, gap: Spacing.md },
  card: { borderRadius: Radius.md, padding: Spacing.md, borderWidth: 1 },
  emptyCard: { borderRadius: Radius.md, padding: Spacing.md, alignItems: 'center' },
  emptyText: { fontSize: FontSize.sm, textAlign: 'center' },
});
