/**
 * CoverScreen.tsx — full cover-screen layout for Samsung Galaxy Z Flip
 *
 * Orchestrates the three cover sections (header, tasks, habits) inside a
 * SafeAreaView. Rendered by app/index.tsx when useCoverScreen() returns true.
 * All data is received as props so this stays a presentational component;
 * store subscriptions live in the parent (HomeScreen).
 *
 * Connections:
 *   Imports → react-native, react-native-safe-area-context, constants/theme, lib/i18n, lib/useAppTheme, store/useHabitStore, store/useTaskStore, components/cover/CoverHeader, components/cover/CoverHabitsSection, components/cover/CoverTasksSection, components/QuickAddSheet
 *   Used by → app/index.tsx
 *   Data    → receives tasks + habits + callbacks as props
 */
import React, { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppTheme } from '@/lib/useAppTheme';
import { useT } from '@/lib/i18n';
import { useSettingsStore } from '@/store/useSettingsStore';
import { todayStr } from '@/lib/date';
import { Task } from '@/store/useTaskStore';
import { Habit, HabitLog } from '@/store/useHabitStore';
import QuickAddSheet from '@/components/QuickAddSheet';
import CoverHeader from './CoverHeader';
import CoverTasksSection from './CoverTasksSection';
import CoverHabitsSection, { HabitSummary } from './CoverHabitsSection';
import { Spacing } from '@/constants/theme';

type Props = {
  todayTasks: Task[];
  toggleTask: (id: string) => void;
  habits: Habit[];
  logs: HabitLog[];
};

export default function CoverScreen({ todayTasks, toggleTask, habits, logs }: Props) {
  const theme = useAppTheme();
  const t = useT();
  const userName = useSettingsStore((s) => s.userName);
  const today = todayStr();
  const [quickAddVisible, setQuickAddVisible] = useState(false);

  const pendingTasks = useMemo(
    () => todayTasks.filter((task) => !task.done),
    [todayTasks]
  );

  const habitSummaries: HabitSummary[] = useMemo(() => {
    return habits.slice(0, 4).map((habit) => {
      const todayLog = logs.find((l) => l.habitId === habit.id && l.logDate === today);
      const count = todayLog?.count ?? 0;
      return { id: habit.id, icon: habit.icon, goalMet: count >= habit.dailyGoal };
    });
  }, [habits, logs, today]);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.cream }]}>
      <View style={styles.content}>
        <CoverHeader theme={theme} t={t} userName={userName} />
        <CoverTasksSection
          tasks={pendingTasks}
          totalPendingCount={pendingTasks.length}
          onToggle={toggleTask}
          onQuickAdd={() => setQuickAddVisible(true)}
          theme={theme}
          t={t}
        />
        <View style={styles.gap} />
        <CoverHabitsSection habits={habitSummaries} theme={theme} t={t} />
      </View>

      <QuickAddSheet
        visible={quickAddVisible}
        onClose={() => setQuickAddVisible(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.xs,
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  gap: {
    height: Spacing.xs,
  },
});
