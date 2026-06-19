/**
 * automations.tsx — simple IFTTT-style "when X, do Y" rule builder
 *
 * Lists the user's automation rules (When … → Then …), each with an
 * active toggle and delete. The "+ New automation" form is a simple inline
 * card (not a modal route) since there are only two trigger types and two
 * action types to pick from — no need for a multi-step wizard.
 *
 * Connections:
 *   Imports → components/HintCard, constants/theme, lib/i18n, lib/useAppTheme, store/useAutomationStore
 *   Used by → Expo Router route "/automations", reached via a nav row in app/settings.tsx
 *   Data    → useAutomationStore (ifttt_rules table)
 *
 * Edit notes:
 *   - Trigger/action picker is two rows of chips, not a dropdown — only two options each today.
 *   - Saving is disabled until the action's required field (message / item name) is non-empty.
 */
import React, { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAutomationStore, AutomationRule, TriggerType, ActionType } from '@/store/useAutomationStore';
import HintCard from '@/components/HintCard';
import { useT } from '@/lib/i18n';
import { FontSize, Fonts, Radius, Shadow, Spacing } from '@/constants/theme';
import { useAppTheme } from '@/lib/useAppTheme';

function triggerLabel(t: ReturnType<typeof useT>, type: TriggerType): string {
  return type === 'task_completed' ? t.automations.triggerTaskCompleted : t.automations.triggerShoppingOpened;
}

function actionLabel(t: ReturnType<typeof useT>, type: ActionType): string {
  return type === 'show_message' ? t.automations.actionShowMessage : t.automations.actionAddShoppingItem;
}

function actionDetail(t: ReturnType<typeof useT>, rule: AutomationRule): string {
  if (rule.actionType === 'show_message') return rule.actionParams.message ?? '';
  return rule.actionParams.name ?? '';
}

function RuleCard({ rule, onToggle, onDelete }: {
  rule: AutomationRule;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const t = useT();
  const theme = useAppTheme();

  function confirmDelete() {
    Alert.alert(t.automations.deleteTitle, t.automations.deleteBody, [
      { text: t.cancel, style: 'cancel' },
      { text: t.automations.deleteBtn, style: 'destructive', onPress: () => onDelete(rule.id) },
    ]);
  }

  return (
    <View style={[styles.ruleCard, { backgroundColor: theme.white, ...Shadow.card }]}>
      <View style={styles.ruleTextWrap}>
        <Text style={[styles.ruleSummary, { color: theme.text }]}>
          {t.automations.ruleSummary(triggerLabel(t, rule.triggerType), actionLabel(t, rule.actionType))}
        </Text>
        {!!actionDetail(t, rule) && (
          <Text style={[styles.ruleDetail, { color: theme.textLight }]} numberOfLines={1}>
            {actionDetail(t, rule)}
          </Text>
        )}
      </View>
      <Switch
        value={rule.active}
        onValueChange={() => onToggle(rule.id)}
        trackColor={{ false: theme.grayLight, true: theme.orangeLight }}
        thumbColor={rule.active ? theme.orange : theme.gray}
      />
      <Pressable onPress={confirmDelete} hitSlop={8} style={styles.deleteBtn}>
        <Ionicons name="close" size={18} color={theme.textLight} />
      </Pressable>
    </View>
  );
}

function NewRuleForm({ onSave, onCancel }: { onSave: (triggerType: TriggerType, actionType: ActionType, params: Record<string, string>) => void; onCancel: () => void }) {
  const t = useT();
  const theme = useAppTheme();
  const [triggerType, setTriggerType] = useState<TriggerType>('task_completed');
  const [actionType, setActionType] = useState<ActionType>('show_message');
  const [message, setMessage] = useState('');
  const [itemName, setItemName] = useState('');

  const canSave = actionType === 'show_message' ? message.trim().length > 0 : itemName.trim().length > 0;

  function save() {
    if (!canSave) return;
    const params: Record<string, string> = actionType === 'show_message' ? { message: message.trim() } : { name: itemName.trim() };
    onSave(triggerType, actionType, params);
  }

  return (
    <View style={[styles.formCard, { backgroundColor: theme.white, ...Shadow.card }]}>
      <Text style={[styles.formLabel, { color: theme.textLight }]}>{t.automations.whenLabel}</Text>
      <View style={styles.chipRow}>
        {(['task_completed', 'shopping_opened'] as TriggerType[]).map((type) => (
          <Pressable
            key={type}
            style={[
              styles.chip,
              { borderColor: theme.grayLight },
              triggerType === type && { backgroundColor: theme.orange, borderColor: theme.orange },
            ]}
            onPress={() => setTriggerType(type)}
          >
            <Text style={[styles.chipText, { color: triggerType === type ? theme.white : theme.text }]}>
              {triggerLabel(t, type)}
            </Text>
          </Pressable>
        ))}
      </View>

      <Text style={[styles.formLabel, { color: theme.textLight }]}>{t.automations.thenLabel}</Text>
      <View style={styles.chipRow}>
        {(['show_message', 'add_shopping_item'] as ActionType[]).map((type) => (
          <Pressable
            key={type}
            style={[
              styles.chip,
              { borderColor: theme.grayLight },
              actionType === type && { backgroundColor: theme.orange, borderColor: theme.orange },
            ]}
            onPress={() => setActionType(type)}
          >
            <Text style={[styles.chipText, { color: actionType === type ? theme.white : theme.text }]}>
              {actionLabel(t, type)}
            </Text>
          </Pressable>
        ))}
      </View>

      {actionType === 'show_message' ? (
        <TextInput
          style={[styles.input, { borderColor: theme.grayLight, color: theme.text }]}
          value={message}
          onChangeText={setMessage}
          placeholder={t.automations.messagePlaceholder}
          placeholderTextColor={theme.gray}
        />
      ) : (
        <TextInput
          style={[styles.input, { borderColor: theme.grayLight, color: theme.text }]}
          value={itemName}
          onChangeText={setItemName}
          placeholder={t.automations.itemNamePlaceholder}
          placeholderTextColor={theme.gray}
        />
      )}

      <View style={styles.formActions}>
        <Pressable onPress={onCancel} style={styles.formCancelBtn}>
          <Text style={[styles.formCancelText, { color: theme.textLight }]}>{t.cancel}</Text>
        </Pressable>
        <Pressable
          onPress={save}
          disabled={!canSave}
          style={[styles.formSaveBtn, { backgroundColor: canSave ? theme.orange : theme.grayLight }]}
        >
          <Text style={[styles.formSaveText, { color: canSave ? theme.white : theme.textLight }]}>
            {t.automations.saveBtn}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

export default function AutomationsScreen() {
  const router = useRouter();
  const t = useT();
  const theme = useAppTheme();
  const rules = useAutomationStore((s) => s.rules);
  const addRule = useAutomationStore((s) => s.add);
  const toggleActive = useAutomationStore((s) => s.toggleActive);
  const removeRule = useAutomationStore((s) => s.remove);
  const [showForm, setShowForm] = useState(false);

  function save(triggerType: TriggerType, actionType: ActionType, params: Record<string, string>) {
    addRule(triggerType, actionType, params);
    setShowForm(false);
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.cream }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <Text style={[styles.back, { color: theme.orange }]}>{t.back}</Text>
        </Pressable>
        <Text style={[styles.title, { color: theme.text }]}>{t.automations.title}</Text>
        <Pressable
          style={[styles.addBtn, { backgroundColor: theme.orange }]}
          onPress={() => setShowForm((v) => !v)}
        >
          <Text style={styles.addBtnText}>+</Text>
        </Pressable>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <HintCard text={t.hints.automations.text} example={t.hints.automations.example} />

        {showForm && <NewRuleForm onSave={save} onCancel={() => setShowForm(false)} />}

        {rules.length === 0 ? (
          <Text style={[styles.empty, { color: theme.textLight }]}>{t.automations.emptyState}</Text>
        ) : (
          rules.map((rule) => (
            <RuleCard key={rule.id} rule={rule} onToggle={toggleActive} onDelete={removeRule} />
          ))
        )}

        <View style={{ height: 120 }} />
      </ScrollView>
    </SafeAreaView>
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
  addBtn: {
    width: 36, height: 36, borderRadius: Radius.full,
    alignItems: 'center', justifyContent: 'center',
  },
  addBtnText: { color: '#fff', fontSize: FontSize.xl, fontWeight: '300', lineHeight: 36 },
  scroll: { flex: 1 },
  content: { padding: Spacing.md, gap: Spacing.sm },
  empty: { fontSize: FontSize.sm, textAlign: 'center', paddingVertical: Spacing.lg },

  ruleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    borderRadius: Radius.md,
    padding: Spacing.md,
  },
  ruleTextWrap: { flex: 1 },
  ruleSummary: { fontSize: FontSize.sm, fontFamily: Fonts.semibold },
  ruleDetail: { fontSize: FontSize.xs, marginTop: 2 },
  deleteBtn: { padding: Spacing.xs },

  formCard: {
    borderRadius: Radius.md,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  formLabel: { fontSize: FontSize.xs, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs },
  chip: {
    borderWidth: 1.5,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
  },
  chipText: { fontSize: FontSize.sm, fontWeight: '600' },
  input: {
    borderWidth: 1.5,
    borderRadius: Radius.md,
    padding: Spacing.sm,
    fontSize: FontSize.sm,
  },
  formActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: Spacing.md, marginTop: Spacing.xs },
  formCancelBtn: { paddingVertical: Spacing.sm, paddingHorizontal: Spacing.sm },
  formCancelText: { fontSize: FontSize.sm, fontWeight: '600' },
  formSaveBtn: { borderRadius: Radius.md, paddingVertical: Spacing.sm, paddingHorizontal: Spacing.md },
  formSaveText: { fontSize: FontSize.sm, fontWeight: '700' },
});
