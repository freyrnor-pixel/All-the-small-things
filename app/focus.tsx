/**
 * focus.tsx — Full-screen "one thing now" focus view
 *
 * Shows a single task at a time: the first non-completed task for today ordered
 * by time ASC NULLS LAST, then id ASC. Tapping Done marks it complete; Skip
 * advances a local pointer without marking done. Respects workModeActive: when
 * true only work-importance tasks show (tasks with importance 'essential'); when
 * false all tasks show in time/id order.
 *
 * Connections:
 *   Imports → components/HintCard, constants/theme, lib/date, lib/i18n, store/useSettingsStore, store/useTaskStore, lib/useAppTheme
 *   Used by → Expo Router route "/focus", BubbleMenu (nav.focus bubble)
 *   Data    → useTaskStore (tasksForDate, toggle); useSettingsStore (workModeEnabled, workModeSessionOverride)
 *
 * Edit notes:
 *   - focusTask selector: from today's tasks, exclude done, filter by work mode, sort time-first.
 *   - skipIndex is local component state; never touches the DB.
 *   - All strings through useT().
 */
import React, { useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTaskStore } from '@/store/useTaskStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useT } from '@/lib/i18n';
import { useAppTheme } from '@/lib/useAppTheme';
import HintCard from '@/components/HintCard';
import { todayStr } from '@/lib/date';
import { FontSize, Radius, Shadow, Spacing } from '@/constants/theme';

export default function FocusScreen() {
  const router = useRouter();
  const today = todayStr();
  const t = useT();
  const theme = useAppTheme();
  const settings = useSettingsStore();
  const tasksForDate = useTaskStore((s) => s.tasksForDate);
  const toggle = useTaskStore((s) => s.toggle);
  const completedCountFn = useTaskStore((s) => s.completedCount);

  const [skipIndex, setSkipIndex] = useState(0);

  const workModeActive = settings.workModeEnabled && !settings.workModeSessionOverride;

  const candidates = useMemo(() => {
    const all = tasksForDate(today);
    const pending = all.filter((t) => {
      if (t.done) return false;
      if (workModeActive && t.importance !== 'essential') return false;
      return true;
    });
    // Sort: tasks with a time come first (ascending), then no-time tasks, then by id.
    return pending.sort((a, b) => {
      if (a.time && b.time) return a.time.localeCompare(b.time);
      if (a.time) return -1;
      if (b.time) return 1;
      return a.id.localeCompare(b.id);
    });
  }, [tasksForDate, today, workModeActive]);

  // Clamp skip so it never exceeds candidate length.
  const effectiveSkip = Math.min(skipIndex, candidates.length);
  const task = candidates[effectiveSkip] ?? null;
  const completedCount = completedCountFn();

  function handleDone() {
    if (!task) return;
    toggle(task.id);
    // After marking done, the task disappears from candidates so we reset to 0.
    setSkipIndex(0);
  }

  function handleSkip() {
    setSkipIndex((i) => Math.min(i + 1, candidates.length));
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.cream }]}>
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <Pressable onPress={() => router.back()}>
          <Text style={[styles.back, { color: theme.orange }]}>{t.back}</Text>
        </Pressable>
        <Text style={[styles.headerTitle, { color: theme.text }]}>
          {t.focusView.currentTask}
        </Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <HintCard text={t.hints.focus.text} example={t.hints.focus.example} />

        {task ? (
          <View style={styles.taskContainer}>
            <View style={[styles.taskCard, { backgroundColor: theme.white, borderColor: theme.border }]}>
              {task.time ? (
                <Text style={[styles.taskTime, { color: theme.orange }]}>{task.time}</Text>
              ) : null}
              <Text style={[styles.taskTitle, { color: theme.text }]}>{task.title}</Text>
              {task.durationMinutes ? (
                <Text style={[styles.taskMeta, { color: theme.textLight }]}>
                  {task.durationMinutes} min
                </Text>
              ) : null}
            </View>

            <Pressable
              style={[styles.doneBtn, { backgroundColor: theme.green }]}
              onPress={handleDone}
            >
              <Text style={styles.doneBtnText}>{t.focusView.done}</Text>
            </Pressable>

            {candidates.length > effectiveSkip + 1 && (
              <Pressable onPress={handleSkip} style={styles.skipLink}>
                <Text style={[styles.skipText, { color: theme.textLight }]}>
                  {t.focusView.skip}
                </Text>
              </Pressable>
            )}

            {effectiveSkip > 0 && (
              <Text style={[styles.progressText, { color: theme.textLight }]}>
                {effectiveSkip + 1} / {candidates.length}
              </Text>
            )}
          </View>
        ) : (
          <View style={[styles.allDoneCard, { backgroundColor: theme.greenLight }]}>
            <Text style={styles.allDoneEmoji}>🌿</Text>
            <Text style={[styles.allDoneTitle, { color: theme.text }]}>
              {t.focusView.allDone}
            </Text>
            <Text style={[styles.allDoneSub, { color: theme.textLight }]}>
              {t.focusView.allDoneSubtitle(completedCount)}
            </Text>
          </View>
        )}
      </ScrollView>
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
    borderBottomWidth: 1,
  },
  back: { fontSize: FontSize.md, fontWeight: '600', width: 60 },
  headerTitle: { fontSize: FontSize.lg, fontWeight: '700' },
  content: {
    flexGrow: 1,
    padding: Spacing.lg,
    justifyContent: 'center',
    gap: Spacing.xl,
  },
  taskContainer: {
    alignItems: 'center',
    gap: Spacing.lg,
  },
  taskCard: {
    width: '100%',
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: Spacing.xl,
    alignItems: 'center',
    gap: Spacing.sm,
    ...Shadow.card,
  },
  taskTime: {
    fontSize: FontSize.md,
    fontWeight: '600',
  },
  taskTitle: {
    fontSize: FontSize.xxl,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 36,
  },
  taskMeta: {
    fontSize: FontSize.sm,
    fontStyle: 'italic',
  },
  doneBtn: {
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.xxl,
    paddingVertical: Spacing.md,
    ...Shadow.fab,
  },
  doneBtnText: {
    color: '#fff',
    fontSize: FontSize.xl,
    fontWeight: '700',
  },
  skipLink: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
  },
  skipText: {
    fontSize: FontSize.md,
    textDecorationLine: 'underline',
  },
  progressText: {
    fontSize: FontSize.xs,
    fontStyle: 'italic',
  },
  allDoneCard: {
    borderRadius: Radius.lg,
    padding: Spacing.xl,
    alignItems: 'center',
    gap: Spacing.md,
  },
  allDoneEmoji: {
    fontSize: 64,
  },
  allDoneTitle: {
    fontSize: FontSize.xxl,
    fontWeight: '700',
    textAlign: 'center',
  },
  allDoneSub: {
    fontSize: FontSize.md,
    textAlign: 'center',
    lineHeight: 22,
  },
});
