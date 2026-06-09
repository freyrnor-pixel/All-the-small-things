import React, { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { Task } from '@/store/useTaskStore';
import { FontSize, Radius, Spacing } from '@/constants/theme';
import { useAppTheme } from '@/lib/useAppTheme';
import { useT } from '@/lib/i18n';

type Props = {
  task: Task;
  onToggle: () => void;
  onPress: () => void;
  muted?: boolean;
};

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

  const stripeColor = task.done
    ? theme.green
    : isEssential && !muted ? theme.orange : theme.grayLight;

  const checkBorderColor = muted ? theme.gray : theme.orange;

  return (
    <Pressable style={styles.row} onPress={onPress}>
      <View style={[styles.stripe, { backgroundColor: stripeColor }]} />

      <Animated.View style={{ transform: [{ scale: checkScale }] }}>
        <Pressable
          style={[
            styles.check,
            { borderColor: checkBorderColor },
            task.done && { backgroundColor: theme.orange, borderColor: theme.orange },
          ]}
          onPress={onToggle}
        >
          {task.done && <Text style={styles.checkMark}>✓</Text>}
        </Pressable>
      </Animated.View>

      <View style={styles.content}>
        <View style={styles.titleRow}>
          <Text style={[
            styles.title,
            { color: theme.text },
            muted && { color: theme.gray, fontWeight: '400' },
            task.done && { color: theme.gray, textDecorationLine: 'line-through' },
          ]}>
            {task.title}
          </Text>
          {isEssential && !task.done && (
            <Text style={styles.essentialStar}>⭐</Text>
          )}
        </View>
        <View style={styles.meta}>
          {task.time ? (
            <View style={[styles.tag, isTimebox
              ? { backgroundColor: theme.orangeLight }
              : { backgroundColor: theme.greenLight }
            ]}>
              <Text style={[styles.tagText, { color: theme.text }]}>
                {isTimebox ? `⏱ ${task.durationMinutes} min` : `🕐 ${task.time}`}
              </Text>
            </View>
          ) : null}
          {task.recurring === 'weekly' && task.recurringDays.length > 0 && (
            <View style={[styles.tagRecurring, { backgroundColor: theme.grayLight }]}>
              <Text style={[styles.tagText, { color: theme.text }]}>
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
  checkMark: {
    color: '#FFFFFF',
    fontSize: FontSize.sm,
    fontWeight: '700',
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
  },
  essentialStar: {
    fontSize: 12,
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
    paddingVertical: 2,
  },
  tagRecurring: {
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
  },
  tagText: {
    fontSize: FontSize.xs,
    fontWeight: '500',
  },
});
