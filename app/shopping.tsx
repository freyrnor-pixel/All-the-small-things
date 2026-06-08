import React, { useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
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
import ShoppingRow from '@/components/ShoppingRow';
import HintCard from '@/components/HintCard';
import { useT } from '@/lib/i18n';
import { Colors, FontSize, Radius, Shadow, Spacing } from '@/constants/theme';

const CATEGORY_ORDER = [
  'produce', 'dairy', 'meat', 'fish', 'bread', 'frozen',
  'canned', 'dry', 'snacks', 'drinks', 'cleaning', 'personal', 'other',
] as const;
type Category = typeof CATEGORY_ORDER[number];

type Tab = 'weekly' | 'monthly';

export default function ShoppingScreen() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('weekly');
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [newAmount, setNewAmount] = useState('1');
  const [newUnit, setNewUnit] = useState('');
  const [newCategory, setNewCategory] = useState<Category>('other');

  const items = useShoppingStore((s) => s.items);
  const add = useShoppingStore((s) => s.add);
  const toggle = useShoppingStore((s) => s.toggleCheck);
  const remove = useShoppingStore((s) => s.remove);
  const resetWeekly = useShoppingStore((s) => s.resetWeekly);
  const t = useT();

  const filtered = items.filter((i) => i.listType === tab);
  const unchecked = filtered.filter((i) => !i.checked);
  const checked = filtered.filter((i) => i.checked);

  const groupedUnchecked = useMemo(() =>
    CATEGORY_ORDER
      .map((cat) => ({ cat, items: unchecked.filter((i) => (i.category || 'other') === cat) }))
      .filter((g) => g.items.length > 0),
    [unchecked]
  );

  function addItem() {
    if (!newName.trim()) return;
    add({ name: newName.trim(), amount: newAmount, unit: newUnit, listType: tab, store: '', price: 0, category: newCategory });
    setNewName('');
    setNewAmount('1');
    setNewUnit('');
    setNewCategory('other');
    setAdding(false);
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.back}>{t.back}</Text>
        </Pressable>
        <Text style={styles.title}>{t.shoppingTitle}</Text>
        <View style={{ width: 60 }} />
      </View>

      <View style={styles.tabs}>
        {(['weekly', 'monthly'] as Tab[]).map((tabOption) => (
          <Pressable
            key={tabOption}
            style={[styles.tab, tab === tabOption && styles.tabActive]}
            onPress={() => setTab(tabOption)}
          >
            <Text style={[styles.tabText, tab === tabOption && styles.tabActiveText]}>
              {tabOption === 'weekly' ? t.weekly : t.monthly}
            </Text>
          </Pressable>
        ))}
      </View>

      <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <HintCard text={t.hints.shopping.text} example={t.hints.shopping.example} />

          <View style={styles.summaryChip}>
            <Text style={styles.summaryText}>
              {t.shoppingRemaining(unchecked.length, checked.length)}
            </Text>
          </View>

          {adding ? (
            <View style={styles.addCard}>
              <TextInput
                style={styles.addInput}
                value={newName}
                onChangeText={setNewName}
                placeholder={t.shoppingItemPlaceholder}
                placeholderTextColor={Colors.gray}
                autoFocus
                returnKeyType="done"
                onSubmitEditing={addItem}
              />
              <View style={styles.addRow}>
                <TextInput
                  style={[styles.addInput, { width: 70 }]}
                  value={newAmount}
                  onChangeText={setNewAmount}
                  keyboardType="decimal-pad"
                  placeholder={t.shoppingAmountPlaceholder}
                  placeholderTextColor={Colors.gray}
                />
                <TextInput
                  style={[styles.addInput, { flex: 1 }]}
                  value={newUnit}
                  onChangeText={setNewUnit}
                  placeholder={t.shoppingUnitPlaceholder}
                  placeholderTextColor={Colors.gray}
                />
              </View>
              <Text style={styles.categoryLabel}>{t.category}</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.categoryRow}>
                  {CATEGORY_ORDER.map((cat) => (
                    <Pressable
                      key={cat}
                      style={[styles.categoryChip, newCategory === cat && styles.categoryChipActive]}
                      onPress={() => setNewCategory(cat)}
                    >
                      <Text style={[styles.categoryChipText, newCategory === cat && styles.categoryChipTextActive]}>
                        {t.shoppingCategories[cat]}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </ScrollView>
              <View style={styles.addActions}>
                <Pressable style={styles.cancelBtn} onPress={() => setAdding(false)}>
                  <Text style={styles.cancelBtnText}>{t.cancel}</Text>
                </Pressable>
                <Pressable style={styles.confirmBtn} onPress={addItem}>
                  <Text style={styles.confirmBtnText}>{t.addItemBtn}</Text>
                </Pressable>
              </View>
            </View>
          ) : (
            <Pressable style={styles.addTrigger} onPress={() => setAdding(true)}>
              <Text style={styles.addTriggerText}>{t.addItemTrigger}</Text>
            </Pressable>
          )}

          {groupedUnchecked.map(({ cat, items: catItems }) => (
            <View key={cat} style={styles.categoryGroup}>
              <Text style={styles.categoryHeader}>{t.shoppingCategories[cat]}</Text>
              <View style={styles.card}>
                {catItems.map((item) => (
                  <ShoppingRow
                    key={item.id}
                    item={item}
                    onToggle={() => toggle(item.id)}
                    onRemove={() => remove(item.id)}
                  />
                ))}
              </View>
            </View>
          ))}

          {checked.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>{t.inCart}</Text>
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

          {tab === 'weekly' && filtered.length > 0 && (
            <Pressable style={styles.resetBtn} onPress={resetWeekly}>
              <Text style={styles.resetBtnText}>{t.resetWeekly}</Text>
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
  categoryLabel: { fontSize: FontSize.xs, color: Colors.textLight, fontWeight: '600' },
  categoryRow: { flexDirection: 'row', gap: Spacing.xs, paddingVertical: Spacing.xs },
  categoryChip: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: Radius.full,
    backgroundColor: Colors.grayLight,
  },
  categoryChipActive: { backgroundColor: Colors.orange },
  categoryChipText: { fontSize: FontSize.xs, color: Colors.text, fontWeight: '600' },
  categoryChipTextActive: { color: Colors.white },
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
  categoryGroup: { gap: Spacing.xs },
  categoryHeader: {
    fontSize: FontSize.xs,
    color: Colors.textLight,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
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
