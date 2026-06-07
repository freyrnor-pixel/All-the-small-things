import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Task } from '@/store/useTaskStore';
import { Colors, FontSize, Radius, Spacing } from '@/constants/theme';

type Props = {
  task: Task;
  onToggle: () => void;
  onPress: () => void;
  muted?: boolean;
};

const DAY_LABELS = ['Man', 'Tir', 'Ons', 'Tor', 'Fre', 'Lør', 'Søn'];

export default function TaskItem({ task, onToggle, onPress, muted }: Props) {
  const isTimebox = task.taskType === 'time-box';
  const isEssential = task.importance === 'essential';

  return (
    <Pressable
      style={[styles.row, isEssential && !muted && styles.rowEssential]}
      onPress={onPress}
    >
      {isEssential && !muted && <View style={styles.essentialStripe} />}

      <Pressable
        style={[styles.check, muted && styles.checkMuted, task.done && styles.checkDone]}
        onPress={onToggle}
      >
        {task.done && <Text style={styles.checkMark}>✓</Text>}
      </Pressable>

      <View style={styles.content}>
        <View style={styles.titleRow}>
          <Text style={[styles.title, muted && styles.titleMuted, task.done && styles.done]}>
            {task.title}
          </Text>
          {isEssential && !task.done && (
            <Text style={styles.essentialStar}>⭐</Text>
          )}
        </View>
        <View style={styles.meta}>
          {task.time ? (
            <View style={[styles.tag, isTimebox ? styles.tagTimebox : styles.tagStartAt]}>
              <Text style={styles.tagText}>
                {isTimebox ? `⏱ ${task.durationMinutes} min` : `🕐 ${task.time}`}
              </Text>
            </View>
          ) : null}
          {task.recurring === 'weekly' && task.recurringDays.length > 0 && (
            <View style={styles.tagRecurring}>
              <Text style={styles.tagText}>
                {task.recurringDays.map((d) => DAY_LABELS[d]).join(', ')}
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
  rowEssential: {
    paddingLeft: 0,
  },
  essentialStripe: {
    width: 3,
    alignSelf: 'stretch',
    backgroundColor: Colors.orange,
    borderRadius: Radius.full,
    marginRight: Spacing.xs,
  },
  check: {
    width: 24,
    height: 24,
    borderRadius: Radius.full,
    borderWidth: 2,
    borderColor: Colors.orange,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  checkDone: {
    backgroundColor: Colors.orange,
    borderColor: Colors.orange,
  },
  checkMark: {
    color: Colors.white,
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
    color: Colors.text,
    fontWeight: '500',
    flex: 1,
  },
  titleMuted: {
    color: Colors.gray,
    fontWeight: '400',
  },
  checkMuted: {
    borderColor: Colors.gray,
  },
  done: {
    color: Colors.gray,
    textDecorationLine: 'line-through',
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
  tagStartAt: { backgroundColor: Colors.greenLight },
  tagTimebox: { backgroundColor: Colors.orangeLight },
  tagRecurring: {
    backgroundColor: Colors.grayLight,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
  },
  tagText: {
    fontSize: FontSize.xs,
    color: Colors.text,
    fontWeight: '500',
  },
});
