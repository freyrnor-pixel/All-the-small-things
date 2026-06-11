/**
 * TaskItem.tsx — single task row on the home list with check, tags, and animations.
 *
 * Renders one Task: accent stripe, animated check toggle, title (with muted /
 * done states + essential star), and time / recurring-day tags. Tap toggles
 * done; press opens the task. Fully theme-aware via useAppTheme.
 *
 * Connections:
 *   Imports → constants/theme, lib/i18n, lib/useAppTheme, store/useTaskStore
 *   Used by → app/index.tsx
 *   Data    → consumes the Task type from useTaskStore; toggle/open handled by parent callbacks (no direct store writes)
 *
 * Edit notes:
 *   - All colors come from useAppTheme() and are applied inline — do NOT reintroduce static Colors/* (broke dark mode; see OLD comments inline).
 *   - Recurring-day abbreviations use t.dayLabels (localized); never hardcode day names.
 *   - The check "pop" animation runs whenever task.done becomes true (effect keyed on task.done).
 */
import React, { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Task } from '@/store/useTaskStore';
// OLD: import { Colors, FontSize, Radius, Spacing } from '@/constants/theme';
//      Colors was used for hardcoded warm-theme values that ignored the user's
//      chosen colour theme and broke dark mode (dark text on dark backgrounds).
import { FontSize, Radius, Spacing } from '@/constants/theme';
import { useAppTheme } from '@/lib/useAppTheme';
import { useT } from '@/lib/i18n';

type Props = {
  task: Task;
  onToggle: () => void;
  onPress: () => void;
  muted?: boolean;
};

// OLD: const DAY_LABELS = ['Man', 'Tir', 'Ons', 'Tor', 'Fre', 'Lør', 'Søn'];
//      Hardcoded Norwegian — English users saw Norwegian day abbreviations on
//      recurring task tags. Now uses t.dayLabels which respects the language setting.

export default function TaskItem({ task, onToggle, onPress, muted }: Props) {
  const theme = useAppTheme();
  const t = useT();
  const isTimebox = task.taskType === 'time-box';
  const isEssential = task.importance === 'essential';
  const checkScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (task.done) {
      Animated.sequence([
        Animated.timing(checkScale, { toValue: 1.35, duration: 120, useNativeDriver: true }),
        Animated.spring(checkScale, { toValue: 1, friction: 4, useNativeDriver: true }),
      ]).start();
    }
  }, [task.done]);

  // OLD: const stripeColor = task.done
  //        ? '#6BAA75'
  //        : isEssential && !muted ? Colors.orange : Colors.grayLight;
  //      '#6BAA75' is the warm-theme green hardcoded; Colors.orange ignores theme.
  const stripeColor = task.done
    ? theme.green
    : isEssential && !muted ? theme.orange : theme.grayLight;

  const checkBorderColor = muted ? theme.gray : theme.orange;

  return (
    <Pressable style={styles.row} onPress={onPress}>
      <View style={[styles.stripe, { backgroundColor: stripeColor }]} />

      <Animated.View style={{ transform: [{ scale: checkScale }] }}>
        <Pressable
          // OLD: style={[styles.check, muted && styles.checkMuted, task.done && styles.checkDone]}
          //      checkMuted and checkDone were StyleSheet entries with Colors.orange/gray hardcoded.
          style={[
            styles.check,
            { borderColor: checkBorderColor },
            task.done && { backgroundColor: theme.orange, borderColor: theme.orange },
          ]}
          onPress={onToggle}
        >
          {task.done && <Ionicons name="checkmark" size={14} color="#FFFFFF" />}
        </Pressable>
      </Animated.View>

      <View style={styles.content}>
        <View style={styles.titleRow}>
          <Text
            // OLD: style={[styles.title, muted && styles.titleMuted, task.done && styles.done]}
            //      titleMuted and done were static StyleSheet entries using Colors.gray/Colors.text,
            //      which are always light-mode warm values regardless of theme or dark mode.
            style={[
              styles.title,
              { color: theme.text },
              muted && { color: theme.gray, fontWeight: '400' },
              task.done && { color: theme.gray, textDecorationLine: 'line-through' },
            ]}
          >
            {task.title}
          </Text>
          {isEssential && !task.done && (
            <Ionicons name="star" size={14} color={theme.orange} />
          )}
        </View>
        <View style={styles.meta}>
          {task.time ? (
            <View
              // OLD: style={[styles.tag, isTimebox ? styles.tagTimebox : styles.tagStartAt]}
              //      tagTimebox used Colors.orangeLight, tagStartAt used Colors.greenLight — both hardcoded.
              style={[styles.tag, isTimebox
                ? { backgroundColor: theme.orangeLight }
                : { backgroundColor: theme.greenLight }
              ]}
            >
              <View style={styles.tagContent}>
                <Ionicons
                  name={isTimebox ? 'timer-outline' : 'time-outline'}
                  size={11}
                  color={theme.text}
                />
                <Text style={[styles.tagText, { color: theme.text }]}>
                  {isTimebox ? `${task.durationMinutes} min` : task.time}
                </Text>
              </View>
            </View>
          ) : null}
          {task.recurring === 'weekly' && task.recurringDays.length > 0 && (
            <View style={[styles.tagRecurring, { backgroundColor: theme.grayLight }]}>
              <Text style={[styles.tagText, { color: theme.text }]}>
                {/* OLD: {task.recurringDays.map((d) => DAY_LABELS[d]).join(', ')} */}
                {task.recurringDays.map((d) => t.dayLabels[d]).join(', ')}
              </Text>
            </View>
          )}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
  },
  stripe: {
    width: 3,
    alignSelf: 'stretch',
    borderRadius: Radius.full,
  },
  check: {
    width: 24,
    height: 24,
    borderRadius: Radius.full,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  content: { flex: 1 },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  title: {
    fontSize: FontSize.md,
    fontWeight: '500',
    flex: 1,
    // OLD: color: Colors.text   — removed; applied inline above via theme.text
  },
  meta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
    marginTop: 4,
  },
  tag: {
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
  },
  tagContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  tagRecurring: {
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    // OLD: backgroundColor: Colors.grayLight — removed; applied inline via theme.grayLight
  },
  tagText: {
    fontSize: FontSize.xs,
    fontWeight: '500',
    // OLD: color: Colors.text — removed; applied inline above via theme.text
  },
});
