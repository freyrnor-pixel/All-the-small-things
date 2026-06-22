/**
 * UnFocus — Feedback Components
 * TaskItem · ProgressBar
 */

import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Checkbox } from '@/components/forms/FormComponents';
import { useTheme } from '@/components/ThemeProvider';
import { FontFamily, FontSize, FontWeight, Radius, Spacing } from '@/constants/theme';

// ── Task shape ────────────────────────────────────────────────────────────────

export interface Task {
  id:               number | string;
  title:            string;
  done:             boolean;
  importance?:      'essential' | 'normal';
  taskType?:        'start-at' | 'time-box' | 'anytime';
  time?:            string;          // e.g. "15:00"
  durationMinutes?: number;
  recurring?:       string;          // e.g. "weekly"
}

// ── TaskItem ──────────────────────────────────────────────────────────────────

/**
 * To-do list row.
 *   Left:   custom Checkbox (20×20)
 *   Middle: title + optional time/meta line
 *   Right:  essential star indicator
 *
 * When done: title gets strikethrough + opacity 0.5.
 * Use inside a Card with noPadding, then give each row paddingHorizontal.
 */
interface TaskItemProps {
  task:     Task;
  onToggle: () => void;
  onPress?: () => void;   // tap title → navigate to detail
}

export function TaskItem({ task, onToggle, onPress }: TaskItemProps) {
  const { colors } = useTheme();
  const t = task;

  const meta: string[] = [];
  if (t.time)            meta.push(t.time);
  if (t.durationMinutes) meta.push(`${t.durationMinutes} min`);
  if (t.recurring)       meta.push(t.recurring);

  return (
    <View style={[styles.row, { borderBottomColor: colors.borderDivider }]}>
      <Checkbox checked={t.done} onChange={onToggle} />

      <Pressable
        style={styles.middle}
        onPress={onPress}
        accessibilityRole="button"
      >
        <Text
          style={[
            styles.title,
            { color: t.done ? colors.textMuted : colors.textBody },
            t.done && styles.strikethrough,
          ]}
          numberOfLines={2}
        >
          {t.title}
        </Text>
        {meta.length > 0 && (
          <View style={styles.metaRow}>
            {t.time && (
              <>
                <Ionicons name="time-outline" size={11} color={colors.textMuted} />
                <Text style={[styles.meta, { color: colors.textMuted }]}>{t.time}</Text>
              </>
            )}
            {t.durationMinutes && (
              <>
                <Ionicons name="timer-outline" size={11} color={colors.textMuted} />
                <Text style={[styles.meta, { color: colors.textMuted }]}>{t.durationMinutes} min</Text>
              </>
            )}
            {t.recurring && (
              <>
                <Ionicons name="repeat-outline" size={11} color={colors.textMuted} />
                <Text style={[styles.meta, { color: colors.textMuted }]}>{t.recurring}</Text>
              </>
            )}
          </View>
        )}
      </Pressable>

      {t.importance === 'essential' && !t.done && (
        <Ionicons name="star" size={13} color={colors.primary} />
      )}
    </View>
  );
}

// ── ProgressBar ───────────────────────────────────────────────────────────────

/**
 * Slim horizontal progress bar.
 * value: 0–1 (proportion complete).
 * Fill colour = primary; track = surfaceSunken.
 * Height 4px by default; no animation on discrete updates.
 */
interface ProgressBarProps {
  value:   number;   // 0–1
  height?: number;
  label?:  string;   // e.g. "23/50 today", shown above the bar
}

export function ProgressBar({ value, height = 4, label }: ProgressBarProps) {
  const { colors } = useTheme();
  const pct = `${Math.round(Math.min(1, Math.max(0, value)) * 100)}%`;

  return (
    <View>
      {label && (
        <Text style={[styles.pbLabel, { color: colors.textMuted }]}>{label}</Text>
      )}
      <View style={[styles.pbTrack, { height, backgroundColor: colors.surfaceSunken }]}>
        <View style={[styles.pbFill, { width: pct, backgroundColor: colors.primary }]} />
      </View>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  // TaskItem
  row: {
    flexDirection:  'row',
    alignItems:     'center',
    gap:            Spacing.s12,
    paddingVertical: Spacing.s12,
    paddingHorizontal: Spacing.s12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  middle: {
    flex: 1,
    gap: Spacing.s4,
  },
  title: {
    fontFamily:  FontFamily.sans,
    fontWeight:  FontWeight.medium,
    fontSize:    FontSize.base,
    lineHeight:  FontSize.base * 1.4,
    includeFontPadding: false,
  },
  strikethrough: {
    textDecorationLine: 'line-through',
    opacity: 0.5,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.s4,
    flexWrap: 'wrap',
  },
  meta: {
    fontFamily: FontFamily.sans,
    fontSize:   FontSize.xs,
    includeFontPadding: false,
  },

  // ProgressBar
  pbLabel: {
    fontFamily: FontFamily.sans,
    fontSize:   FontSize.smmd,
    marginBottom: Spacing.s4,
    includeFontPadding: false,
  },
  pbTrack: {
    width: '100%',
    borderRadius: Radius.full,
    overflow: 'hidden',
  },
  pbFill: {
    height: '100%',
    borderRadius: Radius.full,
  },
});
