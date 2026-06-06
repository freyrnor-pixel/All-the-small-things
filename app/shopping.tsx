import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useShoppingStore } from '@/store/useShoppingStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import ShoppingRow from '@/components/ShoppingRow';
import { Colors, FontSize, Radius, Shadow, Spacing } from '@/constants/theme';

type Tab = 'weekly' | 'monthly';

export default function ShoppingScreen() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('weekly');
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [newAmount, setNewAmount] = useState('1');
  const [newUnit, setNewUnit] = useState('');

  const items = useShoppingStore((s) => s.items);
  const add = useShoppingStore((s) => s.add);
  const toggle = useShoppingStore((s) => s.toggleCheck);
  const remove = useShoppingStore((s) => s.remove);
  const resetWeekly = useShoppingStore((s) => s.resetWeekly);

  const filtered = items.filter((i) => i.listType === tab);
  const unchecked = filtered.filter((i) => !i.checked);
  const checked = filtered.filter((i) => i.checked);

  function addItem() {
    if (!newName.trim()) return;
    add({ name: newName.trim(), amount: newAmount, unit: newUnit, listType: tab, store: '', price: 0 });
    setNewName('');
    setNewAmount('1');
    setNewUnit('');
    setAdding(false);
  }

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.back}>← Hjem</Text>
        </Pressable>
        <Text style={styles.title}>Handleliste</Text>
        <View style={{ width: 60 }} />
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        {(['weekly', 'monthly'] as Tab[]).map((t) => (
          <Pressable
            key={t}
            style={[styles.tab, tab === t && styles.tabActive]}
            onPress={() => setTab(t)}
          >
            <Text style={[styles.tabText, tab === t && styles.tabActiveText]}>
              {t === 'weekly' ? 'Ukentlig' : 'Månedlig'}
            </Text>
          </Pressable>
        ))}
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          {/* Summary chip */}
          <View style={styles.summaryChip}>
            <Text style={styles.summaryText}>
              {unchecked.length} gjenstår · {checked.length} i kurven
            </Text>
          </View>

          {/* Add form */}
          {adding ? (
            <View style={styles.addCard}>
              <TextInput
                style={styles.addInput}
                value={newName}
                onChangeText={setNewName}
                placeholder="Vare"
                placeholderTextColor={Colors.gray}
                autoFocus
                returnKeyType="done"
                onSubmitEditing={addItem}
              />
              <View style={styles.addRow}>
                <TextInput
                  style={[styles.addInput, { width: 60 }]}
                  value={newAmount}
                  onChangeText={setNewAmount}
                  keyboardType="decimal-pad"
                  placeholder="Antall"
                  placeholderTextColor={Colors.gray}
                />
                <TextInput
                  style={[styles.addInput, { flex: 1 }]}
                  value={newUnit}
                  onChangeText={setNewUnit}
                  placeholder="Enhet (stk, kg, l…)"
                  placeholderTextColor={Colors.gray}
                />
              </View>
              <View style={styles.addActions}>
                <Pressable style={styles.cancelBtn} onPress={() => setAdding(false)}>
                  <Text style={styles.cancelBtnText}>Avbryt</Text>
                </Pressable>
                <Pressable style={styles.confirmBtn} onPress={addItem}>
                  <Text style={styles.confirmBtnText}>Legg til</Text>
                </Pressable>
              </View>
            </View>
          ) : (
            <Pressable style={styles.addTrigger} onPress={() => setAdding(true)}>
              <Text style={styles.addTriggerText}>+ Legg til vare</Text>
            </Pressable>
          )}

          {/* Unchecked items */}
          {unchecked.length > 0 && (
            <View style={styles.card}>
              {unchecked.map((item) => (
                <ShoppingRow
                  key={item.id}
                  item={item}
                  onToggle={() => toggle(item.id)}
                  onRemove={() => remove(item.id)}
                />
              ))}
            </View>
          )}

          {/* Checked items */}
          {checked.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>I kurven</Text>
              <View style={styles.card}>
                {checked.map((item) => (
                  <ShoppingRow
                    key={item.id}
                    item={item}
                    onToggle={() => toggle(item.id)}
                    onRemove={() => remove(item.id)}
                  />
                ))}
              </View>
            </View>
          )}

          {/* Reset button */}
          {tab === 'weekly' && filtered.length > 0 && (
            <Pressable style={styles.resetBtn} onPress={resetWeekly}>
              <Text style={styles.resetBtnText}>Nullstill ukesliste</Text>
            </Pressable>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.cream },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
  },
  back: { fontSize: FontSize.md, color: Colors.orange, fontWeight: '600' },
  title: { fontSize: FontSize.xl, fontWeight: '700', color: Colors.text },
  tabs: {
    flexDirection: 'row',
    marginHorizontal: Spacing.md,
    backgroundColor: Colors.grayLight,
    borderRadius: Radius.md,
    padding: 3,
    marginBottom: Spacing.sm,
    gap: 3,
  },
  tab: { flex: 1, paddingVertical: Spacing.sm, borderRadius: Radius.sm, alignItems: 'center' },
  tabActive: { backgroundColor: Colors.white, ...Shadow.card },
  tabText: { fontSize: FontSize.sm, color: Colors.textLight, fontWeight: '600' },
  tabActiveText: { color: Colors.text },
  scroll: { flex: 1 },
  content: { padding: Spacing.md, gap: Spacing.md },
  summaryChip: {
    backgroundColor: Colors.greenLight,
    borderRadius: Radius.full,
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
  },
  summaryText: { fontSize: FontSize.sm, color: Colors.text, fontWeight: '500' },
  addTrigger: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: Colors.orange,
    borderRadius: Radius.md,
    padding: Spacing.md,
    alignItems: 'center',
  },
  addTriggerText: { fontSize: FontSize.md, color: Colors.orange, fontWeight: '600' },
  addCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    padding: Spacing.md,
    gap: Spacing.sm,
    ...Shadow.card,
  },
  addInput: {
    backgroundColor: Colors.offWhite,
    borderRadius: Radius.sm,
    padding: Spacing.sm,
    fontSize: FontSize.md,
    color: Colors.text,
  },
  addRow: { flexDirection: 'row', gap: Spacing.sm },
  addActions: { flexDirection: 'row', gap: Spacing.sm, justifyContent: 'flex-end' },
  cancelBtn: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm },
  cancelBtnText: { color: Colors.textLight, fontSize: FontSize.md },
  confirmBtn: {
    backgroundColor: Colors.orange,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  confirmBtnText: { color: Colors.white, fontWeight: '700', fontSize: FontSize.md },
  card: {
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    padding: Spacing.md,
    ...Shadow.card,
  },
  section: { gap: Spacing.xs },
  sectionLabel: { fontSize: FontSize.sm, color: Colors.textLight, fontWeight: '600' },
  resetBtn: {
    backgroundColor: Colors.dangerLight,
    borderRadius: Radius.md,
    padding: Spacing.md,
    alignItems: 'center',
  },
  resetBtnText: { color: Colors.danger, fontWeight: '600', fontSize: FontSize.md },
});
