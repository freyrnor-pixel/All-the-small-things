/**
 * DayTimeline.tsx — vertical "today at a glance" agenda strip
 *
 * Renders today's time-anchored tasks (those with a `time` set) in chronological
 * order along a vertical line, with a live "now" marker inserted at its correct
 * position so the user can see what's happening now and what's coming up next
 * at a glance. Time-box tasks show their start–end span; start-at tasks show a
 * single time. Essential tasks get a small star indicator — regular tasks get none.
 *
 * Connections:
 *   Imports → constants/theme, lib/useAppTheme, lib/i18n, store/useTaskStore (Task type only)
 *   Used by → app/index.tsx
 *   Data    → pure presentational component; reads no stores directly, takes today's tasks as a prop
 *
 * Edit notes:
 *   - Only tasks with a `time` are shown here — untimed tasks stay in the regular
 *     today's-tasks list below; this is an at-a-glance agenda, not the full list.
 *   - The "now" marker re-renders on a 60s interval (see useNowMinutes) — cheap
 *     enough for a home-screen-resident component, no need to debounce further.
 *   - Done tasks are muted (not hidden) so the day's shape stays visible.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Task } from '@/store/useTaskStore';
import { FontSize, Radius, Spacing } from '@/constants/theme';
import { useAppTheme } from '@/lib/useAppTheme';
import { useT } from '@/lib/i18n';

type Props = {
  tasks: Task[];
  onPress: (task: Task) => void;
};

function toMinutes(time: string): number | null {
  const [h, m] = time.split(':').map((n) => parseInt(n, 10));
  if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
  return h * 60 + m;
}

function minutesToLabel(mins: number): string {
  const h = Math.floor(((mins % 1440) + 1440) % 1440 / 60);
  const m = ((mins % 60) + 60) % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/** Re-renders every 60s so the "now" marker drifts along the timeline live. */
function useNowMinutes(): number {
  const [now, setNow] = useState(() => {
    const d = new Date();
    return d.getHours() * 60 + d.getMinutes();
  });
  useEffect(() => {
    const id = setInterval(() => {
      const d = new Date();
      setNow(d.getHours() * 60 + d.getMinutes());
    }, 60000);
    return () => clearInterval(id);
  }, []);
  return now;
}

export default function DayTimeline({ tasks, onPress }: Props) {
  const theme = useAppTheme();
  const t = useT();
  const nowMinutes = useNowMinutes();

  const entries = useMemo(() => {
    return tasks
      .filter((task) => !!task.time)
      .map((task) => {
        const start = toMinutes(task.time!) ?? 0;
        const end = task.taskType === 'time-box' ? start + (task.durationMinutes ?? 30) : start;
        return { task, start, end };
      })
      .sort((a, b) => a.start - b.start);
  }, [tasks]);

  if (entries.length === 0) {
    return (
      <View style={[styles.emptyCard, { backgroundColor: theme.offWhite }]}>
        <Text style={[styles.emptyText, { color: theme.textLight }]}>{t.timelineEmpty}</Text>
      </View>
    );
  }

  // Index of the first entry that hasn't started yet — the "now" marker is
  // inserted right before it (or at the end if the whole day has started).
  const nowInsertIndex = entries.findIndex((e) => e.start > nowMinutes);
  const insertAt = nowInsertIndex === -1 ? entries.length : nowInsertIndex;

  return (
    <View style={styles.wrap}>
      {entries.map((entry, idx) => {
        const { task, start, end } = entry;
        const effectiveEnd = task.taskType === 'time-box' ? end : start + 30;
        const isHappeningNow = !task.done && nowMinutes >= start && nowMinutes < effectiveEnd;
        const isPast = !isHappeningNow && nowMinutes >= effectiveEnd;
        const isEssential = task.importance === 'essential';
        const dimmed = task.done || isPast;

        return (
          <React.Fragment key={task.id}>
            {idx === insertAt && (
              <View style={styles.nowRow}>
                <View style={[styles.nowDot, { backgroundColor: theme.orange }]} />
                <View style={[styles.nowLine, { backgroundColor: theme.orange }]} />
                <Text style={[styles.nowLabel, { color: theme.orange }]}>
                  {t.timelineNow} · {minutesToLabel(nowMinutes)}
                </Text>
              </View>
            )}
            <Pressable style={styles.row} onPress={() => onPress(task)}>
              <View style={styles.timeCol}>
                <Text style={[styles.timeText, { color: dimmed ? theme.textLight : theme.text }]}>
                  {task.time}
                </Text>
                {task.taskType === 'time-box' && (
                  <Text style={[styles.timeEndText, { color: theme.textLight }]}>
                    {minutesToLabel(end)}
                  </Text>
                )}
              </View>
              <View style={styles.lineCol}>
                <View
                  style={[
                    styles.dot,
                    { borderColor: isHappeningNow ? theme.orange : theme.grayLight },
                    isHappeningNow && { backgroundColor: theme.orange },
                  ]}
                />
                {idx < entries.length - 1 && <View style={[styles.connector, { backgroundColor: theme.grayLight }]} />}
              </View>
              <View style={styles.contentCol}>
                <View style={styles.titleRow}>
                  <Text
                    numberOfLines={1}
                    style={[
                      styles.title,
                      { color: dimmed ? theme.textLight : theme.text },
                      task.done && { textDecorationLine: 'line-through' },
                    ]}
                  >
                    {task.title}
                  </Text>
                  {isEssential && !task.done && (
                    <Ionicons name="star" size={12} color={theme.orange} />
                  )}
                </View>
              </View>
            </Pressable>
          </React.Fragment>
        );
      })}
      {insertAt === entries.length && (
        <View style={styles.nowRow}>
          <View style={[styles.nowDot, { backgroundColor: theme.orange }]} />
          <View style={[styles.nowLine, { backgroundColor: theme.orange }]} />
          <Text style={[styles.nowLabel, { color: theme.orange }]}>
            {t.timelineNow} · {minutesToLabel(nowMinutes)}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingVertical: Spacing.xs },
  emptyCard: { borderRadius: Radius.md, padding: Spacing.md, alignItems: 'center' },
  emptyText: { fontSize: FontSize.sm, textAlign: 'center' },
  row: { flexDirection: 'row', alignItems: 'flex-start' },
  timeCol: { width: 48, alignItems: 'flex-end', paddingTop: 1, paddingRight: Spacing.sm },
  timeText: { fontSize: FontSize.sm, fontWeight: '600' },
  timeEndText: { fontSize: FontSize.xs, marginTop: 1 },
  lineCol: { alignItems: 'center', width: 16 },
  dot: { width: 10, height: 10, borderRadius: Radius.full, borderWidth: 2 },
  connector: { width: 2, flex: 1, minHeight: Spacing.lg, marginVertical: 2 },
  contentCol: { flex: 1, paddingLeft: Spacing.sm, paddingBottom: Spacing.md },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  title: { fontSize: FontSize.md, fontWeight: '500', flexShrink: 1 },
  nowRow: { flexDirection: 'row', alignItems: 'center', marginLeft: 48 + Spacing.sm, marginVertical: 2 },
  nowDot: { width: 6, height: 6, borderRadius: Radius.full, marginRight: 6 },
  nowLine: { flex: 1, height: 1.5, opacity: 0.6 },
  nowLabel: { fontSize: FontSize.xs, fontWeight: '700', marginLeft: 6 },
});
