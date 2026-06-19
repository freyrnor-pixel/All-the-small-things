/**
 * CoverTasksSection.tsx — today's tasks for the cover screen
 *
 * Shows up to 2 pending task rows with large tap-target checkmarks, a count
 * badge, overflow hint, and a quick-add button. Designed for the ~360×374dp
 * Galaxy Z Flip cover display — fixed layout, no scroll.
 *
 * Connections:
 *   Imports → react-native, constants/theme, lib/i18n, store/useTaskStore
 *   Used by → components/cover/CoverScreen
 *   Data    → receives tasks + callbacks as props; scaled fontSize via useScaledStyles()
 */
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AppColors, FontSize, Radius, Spacing } from '@/constants/theme';
import { Translations } from '@/lib/i18n';
import { Task } from '@/store/useTaskStore';
import { useScaledStyles } from '@/lib/useAppTheme';

type Props = {
  tasks: Task[];
  totalPendingCount: number;
  onToggle: (id: string) => void;
  onQuickAdd: () => void;
  theme: AppColors;
  t: Translations;
};

export default function CoverTasksSection({
  tasks,
  totalPendingCount,
  onToggle,
  onQuickAdd,
  theme,
  t,
}: Props) {
  const styles = useScaledStyles(baseStyles);
  const visible = tasks.slice(0, 2);
  const overflow = totalPendingCount - visible.length;

  return (
    <View style={[styles.container, { backgroundColor: theme.white, borderColor: theme.grayLight }]}>
      <View style={styles.header}>
        <Text style={[styles.label, { color: theme.text }]}>{t.cover.tasksToday}</Text>
        <View style={[styles.badge, { backgroundColor: theme.orange }]}>
          <Text style={styles.badgeText}>{t.cover.taskCount(totalPendingCount)}</Text>
        </View>
      </View>

      {visible.length === 0 ? (
        <Text style={[styles.emptyText, { color: theme.textLight }]}>{t.cover.noTasks}</Text>
      ) : (
        visible.map((task) => (
          <Pressable
            key={task.id}
            style={styles.taskRow}
            onPress={() => onToggle(task.id)}
            accessibilityLabel={task.title}
            accessibilityRole="checkbox"
          >
            <View style={[styles.check, { borderColor: theme.orange }]}>
              {task.done && <View style={[styles.checkFill, { backgroundColor: theme.orange }]} />}
            </View>
            <Text
              style={[styles.taskTitle, { color: theme.text }, task.done && { color: theme.textLight }]}
              numberOfLines={1}
            >
              {task.title}
            </Text>
          </Pressable>
        ))
      )}

      {overflow > 0 && (
        <Text style={[styles.overflow, { color: theme.textLight }]}>
          {t.cover.moreTasksHint(overflow)}
        </Text>
      )}

      <Pressable
        style={[styles.addBtn, { backgroundColor: theme.greenLight }]}
        onPress={onQuickAdd}
      >
        <Text style={[styles.addBtnText, { color: theme.green }]}>{t.cover.quickAdd}</Text>
      </Pressable>
    </View>
  );
}

const baseStyles = StyleSheet.create({
  container: {
    borderRadius: Radius.md,
    borderWidth: 1,
    marginHorizontal: Spacing.sm,
    padding: Spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.xs,
  },
  label: {
    fontSize: FontSize.sm,
    fontWeight: '600',
  },
  badge: {
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
  },
  badgeText: {
    fontSize: FontSize.xs,
    color: '#fff',
    fontWeight: '600',
  },
  emptyText: {
    fontSize: FontSize.sm,
    textAlign: 'center',
    paddingVertical: Spacing.sm,
  },
  taskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.xs + 2,
    minHeight: 44,
  },
  check: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.sm,
    flexShrink: 0,
  },
  checkFill: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  taskTitle: {
    fontSize: FontSize.md,
    flex: 1,
  },
  overflow: {
    fontSize: FontSize.xs,
    textAlign: 'right',
    marginTop: 2,
  },
  addBtn: {
    borderRadius: Radius.sm,
    paddingVertical: Spacing.xs,
    alignItems: 'center',
    marginTop: Spacing.xs,
  },
  addBtnText: {
    fontSize: FontSize.sm,
    fontWeight: '600',
  },
});
