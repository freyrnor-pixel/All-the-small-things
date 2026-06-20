/**
 * NextTaskCard.tsx — "Up next" single-task suggestion
 *
 * Shows the one task lib/taskSuggestion.ts picked as the best next thing to do
 * right now, with a one-tap "Mark done" action — or a gentle "caught up" empty
 * state when there's no suggestion. Mounted unconditionally by the caller.
 *
 * Connections:
 *   Imports → components/PressableScale, constants/theme, lib/haptics, lib/i18n, lib/useAppTheme, store/useTaskStore
 *   Used by → app/index.tsx
 *   Data    → none directly; takes a Task via props and writes through useTaskStore's toggle()
 *
 * Edit notes:
 *   - Uses theme.hintBg/hintBorder/hintAccent (the same "soft card surface" tokens
 *     as HintCard) rather than a new colour — keeps it in tune with the active theme.
 *   - Mark-done calls useTaskStore's toggle() directly and fires success() here for
 *     feedback, but deliberately adds no completion glow/scale animation of its own —
 *     if the same task is also visible as a TaskItem row elsewhere on screen, that
 *     component already animates the rising edge of "done"; a second effect here
 *     would double it up.
 */
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useT } from '@/lib/i18n';
import { success } from '@/lib/haptics';
import { useAppTheme, useScaledStyles } from '@/lib/useAppTheme';
import PressableScale from '@/components/PressableScale';
import { Colors, FontSize, Radius, Spacing } from '@/constants/theme';
import { useTaskStore, Task } from '@/store/useTaskStore';

type Props = {
  task: Task | null;
};

export default function NextTaskCard({ task }: Props) {
  const t = useT();
  const theme = useAppTheme();
  const styles = useScaledStyles(baseStyles);
  const toggle = useTaskStore((s) => s.toggle);

  if (!task) {
    return (
      <View style={[styles.card, { backgroundColor: theme.hintBg, borderColor: theme.hintBorder }]}>
        <View style={[styles.accentBar, { backgroundColor: theme.hintAccent }]} />
        <Text style={[styles.emptyText, { color: theme.textLight }]}>{t.nextTask.empty}</Text>
      </View>
    );
  }

  return (
    <View style={[styles.card, { backgroundColor: theme.hintBg, borderColor: theme.hintBorder }]}>
      <View style={[styles.accentBar, { backgroundColor: theme.hintAccent }]} />
      <View style={styles.body}>
        <Text style={[styles.label, { color: theme.hintAccent }]}>{t.nextTask.title}</Text>
        <Text style={[styles.taskTitle, { color: theme.text }]} numberOfLines={1}>{task.title}</Text>
        {task.time ? <Text style={[styles.taskTime, { color: theme.textLight }]}>{task.time}</Text> : null}
      </View>
      <PressableScale
        style={[styles.doneBtn, { backgroundColor: theme.hintAccent }]}
        scaleTo={0.95}
        onPress={() => {
          success();
          toggle(task.id);
        }}
        hitSlop={8}
      >
        <Ionicons name="checkmark" size={16} color={theme.white} />
        <Text style={styles.doneBtnText}>{t.nextTask.markDone}</Text>
      </PressableScale>
    </View>
  );
}

const baseStyles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radius.md,
    borderWidth: 1,
    overflow: 'hidden',
    paddingVertical: Spacing.sm,
    paddingRight: Spacing.sm,
    marginBottom: Spacing.md,
  },
  accentBar: { width: 3, alignSelf: 'stretch', marginRight: Spacing.sm },
  body: { flex: 1, gap: 2 },
  emptyText: { flex: 1, fontSize: FontSize.sm, fontStyle: 'italic', paddingHorizontal: Spacing.sm },
  label: { fontSize: FontSize.xs, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  taskTitle: { fontSize: FontSize.sm, fontWeight: '600' },
  taskTime: { fontSize: FontSize.xs },
  doneBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: Spacing.sm,
    borderRadius: Radius.full,
  },
  doneBtnText: { fontSize: FontSize.xs, fontWeight: '700', color: Colors.white },
});
