/**
 * shared.tsx — items shared between users
 *
 * Tabbed view (shopping / tasks) of items shared in or out between users. Each
 * row can be checked off or removed; completing a shared item also acts on its
 * linked source task/shopping item when one exists (sourceTaskId / sourceItemId).
 *
 * Connections:
 *   Imports → components/HintCard, constants/theme, lib/i18n, store/useSettingsStore, store/useSharedStore, store/useShoppingStore, store/useTaskStore
 *   Used by → Expo Router route "/shared"
 *   Data    → useSharedStore (shared_tasks + shared_shopping_items tables); mirrors actions to useTaskStore (tasks) / useShoppingStore (shopping_items) via the source ids
 *
 * Edit notes:
 *   - All visible strings go through useT(); direction 'in'/'out' decides the "from X" vs "shared by you" meta label.
 *   - Checking a shared shopping item removes its source item; checking a shared task toggles its source task only when not already done.
 */
import React, { useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useSharedStore, SharedTask, SharedShoppingItem } from '@/store/useSharedStore';
import { useTaskStore } from '@/store/useTaskStore';
import { useShoppingStore } from '@/store/useShoppingStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useT } from '@/lib/i18n';
import HintCard from '@/components/HintCard';
import { Colors, FontSize, Radius, Shadow, Spacing, getTheme } from '@/constants/theme';

type Tab = 'tasks' | 'shopping';

export default function SharedScreen() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('shopping');

  const t = useT();
  const colorTheme = useSettingsStore((s) => s.colorTheme);
  const theme = getTheme(colorTheme);

  const sharedTasks = useSharedStore((s) => s.tasks);
  const sharedShopping = useSharedStore((s) => s.shoppingItems);
  const toggleSharedTask = useSharedStore((s) => s.toggleTask);
  const toggleSharedShopping = useSharedStore((s) => s.toggleShopping);
  const removeSharedTask = useSharedStore((s) => s.removeTask);
  const removeSharedShopping = useSharedStore((s) => s.removeShopping);

  const toggleSourceTask = useTaskStore((s) => s.toggle);
  const toggleSourceShopping = useShoppingStore((s) => s.toggleCheck);
  const removeSourceShopping = useShoppingStore((s) => s.remove);

  function handleToggleTask(item: SharedTask) {
    toggleSharedTask(item.id);
    if (!item.done && item.sourceTaskId) {
      toggleSourceTask(item.sourceTaskId);
    }
  }

  function handleToggleShopping(item: SharedShoppingItem) {
    const becomingDone = !item.done;
    toggleSharedShopping(item.id);
    if (becomingDone && item.sourceItemId) {
      removeSourceShopping(item.sourceItemId);
    }
  }

  function handleRemoveTask(item: SharedTask) {
    removeSharedTask(item.id);
  }

  function handleRemoveShopping(item: SharedShoppingItem) {
    removeSharedShopping(item.id);
  }

  const activeTasks = sharedTasks.filter((t) => !t.done);
  const doneTasks = sharedTasks.filter((t) => t.done);
  const activeShopping = sharedShopping.filter((i) => !i.done);
  const doneShopping = sharedShopping.filter((i) => i.done);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.cream }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <Text style={[styles.back, { color: theme.orange }]}>{t.back}</Text>
        </Pressable>
        <Text style={[styles.title, { color: theme.text }]}>{t.sharedTitle}</Text>
        <View style={{ width: 60 }} />
      </View>

      <View style={[styles.tabs, { backgroundColor: theme.grayLight }]}>
        {(['shopping', 'tasks'] as Tab[]).map((tabOpt) => (
          <Pressable
            key={tabOpt}
            style={[styles.tab, tab === tabOpt && { backgroundColor: theme.white, ...Shadow.card }]}
            onPress={() => setTab(tabOpt)}
          >
            <Text style={[styles.tabText, { color: theme.textLight }, tab === tabOpt && { color: theme.text }]}>
              {tabOpt === 'shopping' ? t.sharedShoppingTab : t.sharedTasksTab}
            </Text>
          </Pressable>
        ))}
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <HintCard text={t.hints.shared.text} example={t.hints.shared.example} />

        {tab === 'shopping' ? (
          <>
            {sharedShopping.length === 0 ? (
              <View style={[styles.emptyCard, { backgroundColor: theme.offWhite }]}>
                <Text style={[styles.emptyText, { color: theme.textLight }]}>{t.noSharedItems}</Text>
              </View>
            ) : (
              <>
                {activeShopping.length > 0 && (
                  <View style={styles.section}>
                    <View style={[styles.card, { backgroundColor: theme.white }]}>
                      {activeShopping.map((item) => (
                        <SharedShoppingRow
                          key={item.id}
                          item={item}
                          onToggle={() => handleToggleShopping(item)}
                          onRemove={() => handleRemoveShopping(item)}
                          theme={theme}
                          t={t}
                        />
                      ))}
                    </View>
                  </View>
                )}
                {doneShopping.length > 0 && (
                  <View style={styles.section}>
                    <Text style={[styles.sectionLabel, { color: theme.textLight }]}>{t.sharedDone}</Text>
                    <View style={[styles.card, { backgroundColor: theme.offWhite }]}>
                      {doneShopping.map((item) => (
                        <SharedShoppingRow
                          key={item.id}
                          item={item}
                          onToggle={() => handleToggleShopping(item)}
                          onRemove={() => handleRemoveShopping(item)}
                          theme={theme}
                          t={t}
                        />
                      ))}
                    </View>
                  </View>
                )}
              </>
            )}
          </>
        ) : (
          <>
            {sharedTasks.length === 0 ? (
              <View style={[styles.emptyCard, { backgroundColor: theme.offWhite }]}>
                <Text style={[styles.emptyText, { color: theme.textLight }]}>{t.noSharedItems}</Text>
              </View>
            ) : (
              <>
                {activeTasks.length > 0 && (
                  <View style={styles.section}>
                    <View style={[styles.card, { backgroundColor: theme.white }]}>
                      {activeTasks.map((item) => (
                        <SharedTaskRow
                          key={item.id}
                          item={item}
                          onToggle={() => handleToggleTask(item)}
                          onRemove={() => handleRemoveTask(item)}
                          theme={theme}
                          t={t}
                        />
                      ))}
                    </View>
                  </View>
                )}
                {doneTasks.length > 0 && (
                  <View style={styles.section}>
                    <Text style={[styles.sectionLabel, { color: theme.textLight }]}>{t.sharedDone}</Text>
                    <View style={[styles.card, { backgroundColor: theme.offWhite }]}>
                      {doneTasks.map((item) => (
                        <SharedTaskRow
                          key={item.id}
                          item={item}
                          onToggle={() => handleToggleTask(item)}
                          onRemove={() => handleRemoveTask(item)}
                          theme={theme}
                          t={t}
                        />
                      ))}
                    </View>
                  </View>
                )}
              </>
            )}
          </>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

type AppColors = ReturnType<typeof getTheme>;
type TType = ReturnType<typeof import('@/lib/i18n').useT>;

function SharedShoppingRow({
  item, onToggle, onRemove, theme, t,
}: {
  item: SharedShoppingItem;
  onToggle: () => void;
  onRemove: () => void;
  theme: AppColors;
  t: TType;
}) {
  return (
    <View style={styles.row}>
      <Pressable
        style={[styles.doneBtn, { borderColor: theme.orange }, item.done && { backgroundColor: theme.orange }]}
        onPress={onToggle}
      >
        {item.done && <Text style={styles.doneMark}>✓</Text>}
      </Pressable>
      <View style={styles.rowContent}>
        <Text style={[styles.rowLabel, { color: theme.text }, item.done && styles.strikethrough]}>
          {item.amount} {item.unit} {item.name}
        </Text>
        <Text style={[styles.rowMeta, { color: theme.textLight }]}>
          {item.direction === 'out' ? t.sharedBySelf : t.sharedFromLabel(item.sharedBy)}
        </Text>
      </View>
      <Pressable onPress={onRemove} style={styles.removeBtn}>
        <Text style={[styles.removeText, { color: theme.textLight }]}>✕</Text>
      </Pressable>
    </View>
  );
}

function SharedTaskRow({
  item, onToggle, onRemove, theme, t,
}: {
  item: SharedTask;
  onToggle: () => void;
  onRemove: () => void;
  theme: AppColors;
  t: TType;
}) {
  return (
    <View style={styles.row}>
      <Pressable
        style={[styles.doneBtn, { borderColor: theme.orange }, item.done && { backgroundColor: theme.orange }]}
        onPress={onToggle}
      >
        {item.done && <Text style={styles.doneMark}>✓</Text>}
      </Pressable>
      <View style={styles.rowContent}>
        <Text style={[styles.rowLabel, { color: theme.text }, item.done && styles.strikethrough]}>
          {item.title}
        </Text>
        <Text style={[styles.rowMeta, { color: theme.textLight }]}>
          {item.date} · {item.direction === 'out' ? t.sharedBySelf : t.sharedFromLabel(item.sharedBy)}
        </Text>
      </View>
      <Pressable onPress={onRemove} style={styles.removeBtn}>
        <Text style={[styles.removeText, { color: theme.textLight }]}>✕</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
  },
  back: { fontSize: FontSize.md, fontWeight: '600' },
  title: { fontSize: FontSize.xl, fontWeight: '700' },
  tabs: {
    flexDirection: 'row',
    marginHorizontal: Spacing.md,
    borderRadius: Radius.md,
    padding: 3,
    marginBottom: Spacing.sm,
    gap: 3,
  },
  tab: { flex: 1, paddingVertical: Spacing.sm, borderRadius: Radius.sm, alignItems: 'center' },
  tabText: { fontSize: FontSize.sm, fontWeight: '600' },
  scroll: { flex: 1 },
  content: { padding: Spacing.md, gap: Spacing.md },
  emptyCard: { borderRadius: Radius.md, padding: Spacing.lg, alignItems: 'center' },
  emptyText: { fontSize: FontSize.sm, textAlign: 'center', lineHeight: 20 },
  section: { gap: Spacing.xs },
  sectionLabel: { fontSize: FontSize.sm, fontWeight: '600' },
  card: { borderRadius: Radius.md, padding: Spacing.md, gap: Spacing.sm, ...Shadow.card },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingVertical: 2 },
  doneBtn: {
    width: 24, height: 24, borderRadius: Radius.full, borderWidth: 2,
    alignItems: 'center', justifyContent: 'center',
  },
  doneMark: { color: Colors.white, fontSize: FontSize.xs, fontWeight: '700' },
  rowContent: { flex: 1 },
  rowLabel: { fontSize: FontSize.md },
  rowMeta: { fontSize: FontSize.xs, marginTop: 1 },
  strikethrough: { textDecorationLine: 'line-through', opacity: 0.5 },
  removeBtn: { paddingHorizontal: Spacing.xs },
  removeText: { fontSize: FontSize.md },
});
