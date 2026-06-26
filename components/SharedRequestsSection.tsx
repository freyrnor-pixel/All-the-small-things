/**
 * SharedRequestsSection.tsx — inline "incoming shared item" prompts (replaces the bubble-wheel Shared entry)
 *
 * Shows whatever's been scanned in from a partner (store/useSharedStore.ts, direction='in',
 * not yet done) right inside the screen the item actually belongs to: shopping requests on
 * app/shopping.tsx, task requests on app/index.tsx. Accept adds a real local item and marks
 * the shared row done; Dismiss removes the shared row outright. Renders nothing when there's
 * nothing pending — mirrors components/InboxSection.tsx's pattern.
 *
 * Connections:
 *   Imports → components/PressableScale, components/Surface, constants/theme, lib/haptics, lib/i18n, lib/useAppTheme, store/useSharedStore, store/useShoppingStore, store/useTaskStore
 *   Used by → app/shopping.tsx (kind='shopping'), app/index.tsx (kind='task')
 *   Data    → reads/removes useSharedStore rows; writes useShoppingStore/useTaskStore on accept
 *
 * Edit notes:
 *   - This is the per-screen replacement for the old "Shared" bubble — full history (sent +
 *     received, done or not) still lives at app/shared.tsx; that screen is unchanged.
 *   - Accept defaults are deliberately minimal (today's date / weekly list) so there's no
 *     intermediate form, same rationale as InboxSection's task-promotion defaults.
 */
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useT } from '@/lib/i18n';
import { todayStr } from '@/lib/date';
import { success } from '@/lib/haptics';
import { useAppTheme, useScaledStyles } from '@/lib/useAppTheme';
import PressableScale from '@/components/PressableScale';
import Surface from '@/components/Surface';
import { FontSize, Radius, Spacing } from '@/constants/theme';
import { useSharedStore } from '@/store/useSharedStore';
import { useShoppingStore } from '@/store/useShoppingStore';
import { useTaskStore } from '@/store/useTaskStore';

type Props = {
  kind: 'shopping' | 'task';
};

export default function SharedRequestsSection({ kind }: Props) {
  const t = useT();
  const theme = useAppTheme();
  const styles = useScaledStyles(baseStyles);
  const sharedShoppingItems = useSharedStore((s) => s.shoppingItems);
  const sharedTasks = useSharedStore((s) => s.tasks);
  const toggleShopping = useSharedStore((s) => s.toggleShopping);
  const toggleTask = useSharedStore((s) => s.toggleTask);
  const removeShopping = useSharedStore((s) => s.removeShopping);
  const removeTask = useSharedStore((s) => s.removeTask);
  const addShoppingItem = useShoppingStore((s) => s.add);
  const addTask = useTaskStore((s) => s.add);

  const pending =
    kind === 'shopping'
      ? sharedShoppingItems.filter((i) => i.direction === 'in' && !i.done)
      : sharedTasks.filter((i) => i.direction === 'in' && !i.done);

  if (pending.length === 0) return null;

  function acceptShopping(id: string, name: string, amount: string, unit: string) {
    success();
    addShoppingItem({ name, amount, unit, listType: 'weekly', store: '', price: 0, category: undefined, inventoryQty: 0, status: 'inWeeklyList' });
    toggleShopping(id);
  }

  function acceptTask(id: string, title: string) {
    success();
    addTask({
      title,
      date: todayStr(),
      taskType: 'start-at',
      done: false,
      recurring: 'none',
      recurringDays: [],
      importance: 'regular',
      priority: 'medium',
    });
    toggleTask(id);
  }

  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: theme.text }]}>{t.sharedRequests.sectionTitle}</Text>
      <Surface tint={theme.offWhite} style={styles.card}>
        {kind === 'shopping'
          ? sharedShoppingItems
              .filter((i) => i.direction === 'in' && !i.done)
              .map((item, i) => (
                <View key={item.id} style={[styles.row, i > 0 && { borderTopColor: theme.grayLight, borderTopWidth: 1, paddingTop: Spacing.sm }]}>
                  <Text style={[styles.itemText, { color: theme.text }]} numberOfLines={2}>
                    {t.sharedRequests.fromLabel(item.sharedBy)} {item.name}
                  </Text>
                  <View style={styles.actions}>
                    <PressableScale
                      style={[styles.actionBtn, { backgroundColor: theme.orangeLight }]}
                      onPress={() => acceptShopping(item.id, item.name, item.amount, item.unit)}
                      haptic={false}
                    >
                      <Text style={[styles.actionBtnText, { color: theme.orange }]}>{t.sharedRequests.accept}</Text>
                    </PressableScale>
                    <PressableScale
                      style={[styles.actionBtn, { backgroundColor: theme.grayLight }]}
                      onPress={() => removeShopping(item.id)}
                    >
                      <Text style={[styles.actionBtnText, { color: theme.textLight }]}>{t.sharedRequests.dismiss}</Text>
                    </PressableScale>
                  </View>
                </View>
              ))
          : sharedTasks
              .filter((i) => i.direction === 'in' && !i.done)
              .map((item, i) => (
                <View key={item.id} style={[styles.row, i > 0 && { borderTopColor: theme.grayLight, borderTopWidth: 1, paddingTop: Spacing.sm }]}>
                  <Text style={[styles.itemText, { color: theme.text }]} numberOfLines={2}>
                    {t.sharedRequests.fromLabel(item.sharedBy)} {item.title}
                  </Text>
                  <View style={styles.actions}>
                    <PressableScale
                      style={[styles.actionBtn, { backgroundColor: theme.orangeLight }]}
                      onPress={() => acceptTask(item.id, item.title)}
                      haptic={false}
                    >
                      <Text style={[styles.actionBtnText, { color: theme.orange }]}>{t.sharedRequests.accept}</Text>
                    </PressableScale>
                    <PressableScale
                      style={[styles.actionBtn, { backgroundColor: theme.grayLight }]}
                      onPress={() => removeTask(item.id)}
                    >
                      <Text style={[styles.actionBtnText, { color: theme.textLight }]}>{t.sharedRequests.dismiss}</Text>
                    </PressableScale>
                  </View>
                </View>
              ))}
      </Surface>
    </View>
  );
}

const baseStyles = StyleSheet.create({
  section: { marginBottom: Spacing.md, gap: Spacing.sm },
  sectionTitle: { fontSize: FontSize.md, fontWeight: '700' },
  card: { borderRadius: Radius.md, padding: Spacing.sm, gap: Spacing.sm },
  row: { gap: Spacing.xs },
  itemText: { fontSize: FontSize.sm },
  actions: { flexDirection: 'row', gap: Spacing.sm },
  actionBtn: { paddingVertical: 6, paddingHorizontal: Spacing.sm, borderRadius: Radius.full },
  actionBtnText: { fontSize: FontSize.xs, fontWeight: '700' },
});
