/**
 * InboxSection.tsx — home-screen list of captured quick-capture items (AP-02)
 *
 * Shows whatever's currently sitting in the inbox (store/useInboxStore.ts) so a
 * captured thought doesn't get forgotten: each row offers a one-tap "→ Task"
 * promotion (sensible defaults, no intermediate form) or a "Discard" dismiss.
 * Renders nothing when the inbox is empty — mirrors app/index.tsx's Backlog
 * section (incidental leftover data, not a permanent fixture like Plans/Shopping).
 *
 * Connections:
 *   Imports → components/PressableScale, components/Surface, constants/theme, expo-router, lib/date, lib/haptics, lib/i18n, lib/useAppTheme, store/useInboxStore
 *   Used by → app/index.tsx
 *   Data    → reads/writes useInboxStore (inbox_items); promoteToTask() also writes useTaskStore; Edit routes to /capture?id= to edit a row
 *
 * Edit notes:
 *   - Promotion defaults: today's date, start-at type, no recurrence, regular
 *     importance, medium priority — deliberately skips task-form so capture stays
 *     frictionless; the user can still open the resulting task to fine-tune it later.
 *   - success() fires on promote (haptic={false} on that button so it doesn't also
 *     fire PressableScale's default tap()); discard keeps PressableScale's default
 *     tap() — dismissing a quick note isn't a destructive confirmation flow.
 */
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useT } from '@/lib/i18n';
import { todayStr } from '@/lib/date';
import { success } from '@/lib/haptics';
import { useAppTheme, useScaledStyles } from '@/lib/useAppTheme';
import PressableScale from '@/components/PressableScale';
import Surface from '@/components/Surface';
import { FontSize, Radius, Spacing } from '@/constants/theme';
import { useInboxStore } from '@/store/useInboxStore';

export default function InboxSection() {
  const t = useT();
  const router = useRouter();
  const theme = useAppTheme();
  const styles = useScaledStyles(baseStyles);
  const items = useInboxStore((s) => s.items);
  const promoteToTask = useInboxStore((s) => s.promoteToTask);
  const remove = useInboxStore((s) => s.remove);

  if (items.length === 0) return null;

  function handlePromote(id: string, text: string) {
    success();
    promoteToTask(id, {
      title: text,
      date: todayStr(),
      taskType: 'start-at',
      done: false,
      recurring: 'none',
      recurringDays: [],
      importance: 'regular',
      priority: 'medium',
    });
  }

  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: theme.text }]}>{t.inbox.sectionTitle}</Text>
      <Surface tint={theme.offWhite} style={styles.card}>
        {items.map((item, i) => (
          <View key={item.id} style={[styles.row, i > 0 && { borderTopColor: theme.grayLight, borderTopWidth: 1, paddingTop: Spacing.sm }]}>
            <Text style={[styles.itemText, { color: theme.text }]} numberOfLines={2}>
              {item.text}
            </Text>
            <View style={styles.actions}>
              <PressableScale
                style={[styles.actionBtn, { backgroundColor: theme.orangeLight }]}
                onPress={() => handlePromote(item.id, item.text)}
                haptic={false}
              >
                <Text style={[styles.actionBtnText, { color: theme.orange }]}>{t.inbox.promote}</Text>
              </PressableScale>
              <PressableScale
                style={[styles.actionBtn, { backgroundColor: theme.grayLight }]}
                onPress={() => router.push({ pathname: '/capture', params: { id: item.id } })}
              >
                <Text style={[styles.actionBtnText, { color: theme.textLight }]}>{t.inbox.edit}</Text>
              </PressableScale>
              <PressableScale
                style={[styles.actionBtn, { backgroundColor: theme.grayLight }]}
                onPress={() => remove(item.id)}
              >
                <Text style={[styles.actionBtnText, { color: theme.textLight }]}>{t.inbox.discard}</Text>
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
