/**
 * share-modal.tsx — QR share sheet
 *
 * Modal that lets the user pick shopping items or upcoming tasks (kind 's' / 't'
 * from the route param) and encodes the selection into a QR payload for another
 * user to scan. Also records the selection as outbound shared items locally.
 *
 * Connections:
 *   Imports → components/QRCodeDisplay, components/ScreenBackground, components/Surface, constants/theme, lib/date, lib/i18n, lib/share, store/useSettingsStore, store/useSharedStore, store/useShoppingStore, store/useTaskStore
 *   Used by → Expo Router route "/share-modal" (presented as a modal — see app/_layout.tsx)
 *   Data    → reads useShoppingStore (shopping_items) / useTaskStore (tasks); writes outbound rows to useSharedStore (shared_shopping_items / shared_tasks); scaled fontSize via useScaledStyles()
 *
 * Edit notes:
 *   - All visible strings go through useT(); kind param ('t' = tasks, anything else = shopping) drives the whole sheet.
 *   - Source lists are filtered to unchecked shopping / future-dated undone tasks (today via todayStr()); payload built with encodeSharePayload.
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
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useShoppingStore } from '@/store/useShoppingStore';
import { useTaskStore } from '@/store/useTaskStore';
import { useSharedStore } from '@/store/useSharedStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useT } from '@/lib/i18n';
import { encodeSharePayload } from '@/lib/share';
import QRCodeDisplay from '@/components/QRCodeDisplay';
import Surface from '@/components/Surface';
import ScreenBackground from '@/components/ScreenBackground';
import { todayStr } from '@/lib/date';
import { Colors, FontSize, Radius, Shadow, Spacing } from '@/constants/theme';
import { useAppTheme, useScaledStyles } from '@/lib/useAppTheme';

export default function ShareModal() {
  const router = useRouter();
  const params = useLocalSearchParams<{ kind?: string }>();
  const kind = params.kind === 't' ? 't' : 's';

  const t = useT();
  const userName = useSettingsStore((s) => s.userName);
  const theme = useAppTheme();
  const styles = useScaledStyles(baseStyles);

  const shoppingItems = useShoppingStore((s) => s.items);
  const tasks = useTaskStore((s) => s.tasks);
  const addSharedShopping = useSharedStore((s) => s.addSharedShopping);
  const addSharedTasks = useSharedStore((s) => s.addSharedTasks);

  const today = todayStr();

  const sourceItems = useMemo(() => {
    if (kind === 's') {
      return shoppingItems
        .filter((i) => !i.checked)
        .map((i) => ({ id: i.id, label: `${i.amount} ${i.unit} ${i.name}`.trim(), sub: '' }));
    }
    return tasks
      .filter((t) => t.date >= today && !t.done)
      .map((t) => ({ id: t.id, label: t.title, sub: t.date }));
  }, [kind, shoppingItems, tasks, today]);

  const [selected, setSelected] = useState<Set<string>>(() => new Set(sourceItems.map((i) => i.id)));
  const [shared, setShared] = useState(false);

  const allSelected = selected.size === sourceItems.length;

  function toggleItem(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (allSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(sourceItems.map((i) => i.id)));
    }
  }

  const qrPayload = useMemo(() => {
    const by = userName || 'UnFocus';
    if (kind === 's') {
      const selectedItems = shoppingItems
        .filter((i) => selected.has(i.id))
        .map((i) => ({ n: i.name, a: i.amount, u: i.unit }));
      if (selectedItems.length === 0) return '';
      return encodeSharePayload({ v: 1, k: 's', b: by, i: selectedItems });
    }
    const selectedTasks = tasks
      .filter((t) => selected.has(t.id))
      .map((t) => ({ n: t.title, d: t.date }));
    if (selectedTasks.length === 0) return '';
    return encodeSharePayload({ v: 1, k: 't', b: by, i: selectedTasks });
  }, [kind, selected, shoppingItems, tasks, userName]);

  function confirmShare() {
    if (!qrPayload || shared) return;
    const by = userName || 'UnFocus';
    if (kind === 's') {
      const selectedItems = shoppingItems.filter((i) => selected.has(i.id));
      addSharedShopping(
        selectedItems.map((i) => ({
          sourceItemId: i.id,
          name: i.name,
          amount: i.amount,
          unit: i.unit,
          direction: 'out',
          sharedBy: by,
        }))
      );
    } else {
      const selectedTasks = tasks.filter((t) => selected.has(t.id));
      addSharedTasks(
        selectedTasks.map((task) => ({
          sourceTaskId: task.id,
          title: task.title,
          date: task.date,
          direction: 'out',
          sharedBy: by,
        }))
      );
    }
    setShared(true);
  }

  const title = kind === 's' ? t.sharedShopping : t.sharedTasks;

  return (
    <SafeAreaView style={styles.safe}>
      <ScreenBackground />
      <View style={[styles.header, { backgroundColor: theme.white, borderBottomColor: theme.grayLight }]}>
        <Pressable onPress={() => router.back()}>
          <Text style={[styles.back, { color: theme.orange }]}>{t.back}</Text>
        </Pressable>
        <Text style={[styles.title, { color: theme.text }]}>{t.shareTitle}</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        {!shared ? (
          <>
            <Surface style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={[styles.cardTitle, { color: theme.text }]}>{title}</Text>
                <Pressable onPress={toggleAll}>
                  <Text style={[styles.toggleAll, { color: theme.orange }]}>
                    {allSelected ? t.deselectAll : t.selectAll}
                  </Text>
                </Pressable>
              </View>
              {sourceItems.length === 0 ? (
                <Text style={[styles.emptyText, { color: theme.textLight }]}>{t.noSharedItems}</Text>
              ) : (
                sourceItems.map((item) => (
                  <Pressable
                    key={item.id}
                    style={styles.itemRow}
                    onPress={() => toggleItem(item.id)}
                  >
                    <View style={[
                      styles.checkbox,
                      { borderColor: theme.orange },
                      selected.has(item.id) && { backgroundColor: theme.orange },
                    ]}>
                      {selected.has(item.id) && <Text style={styles.checkMark}>✓</Text>}
                    </View>
                    <View style={styles.itemText}>
                      <Text style={[styles.itemLabel, { color: theme.text }]}>{item.label}</Text>
                      {item.sub ? <Text style={[styles.itemSub, { color: theme.textLight }]}>{item.sub}</Text> : null}
                    </View>
                  </Pressable>
                ))
              )}
            </Surface>

            {selected.size > 0 && qrPayload && (
              <Pressable
                style={[styles.shareBtn, { backgroundColor: theme.orange }]}
                onPress={confirmShare}
              >
                <Text style={styles.shareBtnText}>
                  {t.shareSelected} ({selected.size})
                </Text>
              </Pressable>
            )}
          </>
        ) : (
          <>
            <Surface style={styles.qrCard}>
              <Text style={[styles.qrTitle, { color: theme.text }]}>{t.shareTitle}</Text>
              <Text style={[styles.qrInstructions, { color: theme.textLight }]}>{t.shareInstructions}</Text>
              <View style={styles.qrWrap}>
                <QRCodeDisplay data={qrPayload} size={260} />
              </View>
            </Surface>

            <Pressable
              style={[styles.doneBtn, { backgroundColor: theme.greenLight }]}
              onPress={() => router.replace('/shared')}
            >
              <Text style={[styles.doneBtnText, { color: theme.green }]}>{t.sharedTitle} →</Text>
            </Pressable>
          </>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const baseStyles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
    borderBottomWidth: 1,
  },
  back: { fontSize: FontSize.md, fontWeight: '600' },
  title: { fontSize: FontSize.xl, fontWeight: '700' },
  scroll: { flex: 1 },
  content: { padding: Spacing.md, gap: Spacing.md },
  card: {
    borderRadius: Radius.md,
    padding: Spacing.md,
    gap: Spacing.sm,
    ...Shadow.card,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.xs,
  },
  cardTitle: { fontSize: FontSize.md, fontWeight: '700' },
  toggleAll: { fontSize: FontSize.sm, fontWeight: '600' },
  emptyText: { fontSize: FontSize.sm, textAlign: 'center', paddingVertical: Spacing.md },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingVertical: Spacing.xs },
  checkbox: {
    width: 22, height: 22, borderRadius: Radius.full, borderWidth: 2,
    alignItems: 'center', justifyContent: 'center',
  },
  checkMark: { color: Colors.white, fontSize: FontSize.xs, fontWeight: '700' },
  itemText: { flex: 1 },
  itemLabel: { fontSize: FontSize.md },
  itemSub: { fontSize: FontSize.xs, marginTop: 1 },
  shareBtn: {
    borderRadius: Radius.md,
    padding: Spacing.md,
    alignItems: 'center',
    ...Shadow.card,
  },
  shareBtnText: { color: Colors.white, fontWeight: '700', fontSize: FontSize.md },
  qrCard: {
    borderRadius: Radius.md,
    padding: Spacing.lg,
    alignItems: 'center',
    gap: Spacing.md,
    ...Shadow.card,
  },
  qrTitle: { fontSize: FontSize.xl, fontWeight: '700' },
  qrInstructions: { fontSize: FontSize.sm, textAlign: 'center', lineHeight: 20 },
  qrWrap: {
    borderRadius: Radius.md,
    overflow: 'hidden',
    marginVertical: Spacing.sm,
    ...Shadow.card,
  },
  doneBtn: {
    borderRadius: Radius.md,
    padding: Spacing.md,
    alignItems: 'center',
  },
  doneBtnText: { fontSize: FontSize.md, fontWeight: '700' },
});
