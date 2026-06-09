import React, { useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useShoppingStore } from '@/store/useShoppingStore';
import { useCatalogStore } from '@/store/useCatalogStore';
import ShoppingRow from '@/components/ShoppingRow';
import MonthlyPickerSheet from '@/components/MonthlyPickerSheet';
import HintCard from '@/components/HintCard';
import { useT } from '@/lib/i18n';
import { useAppTheme } from '@/lib/useAppTheme';
import { Colors, FontSize, Radius, Shadow, Spacing } from '@/constants/theme';

const CATEGORY_ORDER = [
  'produce', 'dairy', 'meat', 'fish', 'bread', 'frozen',
  'canned', 'dry', 'snacks', 'drinks', 'cleaning', 'personal', 'other',
] as const;
type Category = typeof CATEGORY_ORDER[number];

type Tab = 'weekly' | 'monthly';

export default function ShoppingScreen() {
  const router = useRouter();
  const theme = useAppTheme();
  const [tab, setTab] = useState<Tab>('weekly');
  const [adding, setAdding] = useState(false);
  const [showMonthlyPicker, setShowMonthlyPicker] = useState(false);
  const [newName, setNewName] = useState('');
  const [newAmount, setNewAmount] = useState('1');
  const [newUnit, setNewUnit] = useState('');
  const [newCategory, setNewCategory] = useState<Category>('other');

  const items = useShoppingStore((s) => s.items);
  const add = useShoppingStore((s) => s.add);
  const toggle = useShoppingStore((s) => s.toggleCheck);
  const removeWithSource = useShoppingStore((s) => s.removeWithSource);
  const adjustAmount = useShoppingStore((s) => s.adjustAmount);
  const addFromMonthly = useShoppingStore((s) => s.addFromMonthly);
  const resetWeekly = useShoppingStore((s) => s.resetWeekly);
  const resetMonthly = useShoppingStore((s) => s.resetMonthly);
  const suggest = useCatalogStore((s) => s.suggest);
  const catalog = useCatalogStore((s) => s.items);
  const t = useT();

  const suggestions = useMemo(() => {
    const exact = newName.trim().toLowerCase();
    if (!exact) return [];
    return suggest(newName).filter((s) => s.name.toLowerCase() !== exact);
  }, [newName, catalog, suggest]);

  function pickSuggestion(name: string, category: string) {
    setNewName(name);
    setNewCategory((CATEGORY_ORDER as readonly string[]).includes(category) ? (category as Category) : 'other');
  }

  const weeklyItems = items.filter((i) => i.listType === 'weekly');
  const monthlyItems = items.filter((i) => i.listType === 'monthly');
  const filtered = tab === 'weekly' ? weeklyItems : monthlyItems;
  const unchecked = filtered.filter((i) => !i.checked);
  const checked = filtered.filter((i) => i.checked);

  type Group = { cat: Category; items: typeof unchecked };
  const groupedUnchecked = useMemo((): Group[] =>
    CATEGORY_ORDER
      .map((cat) => ({ cat, items: unchecked.filter((i) => (i.category || 'other') === cat) }))
      .filter((g) => g.items.length > 0),
    [unchecked]
  );

  // Monthly items that still have remaining quantity (available to add to weekly)
  const monthlyAvailable = monthlyItems.filter((i) => {
    const total = parseInt(i.amount, 10) || 1;
    return total - i.monthlyAllocated > 0;
  });

  function addItem() {
    if (!newName.trim()) return;
    add({
      name: newName.trim(),
      amount: newAmount || '1',
      unit: newUnit,
      listType: tab,
      store: '',
      price: 0,
      category: newCategory,
    });
    setNewName('');
    setNewAmount('1');
    setNewUnit('');
    setNewCategory('other');
    setAdding(false);
  }

  function handleMonthlyPickerConfirm(selections: { id: string; qty: number }[]) {
    for (const { id, qty } of selections) {
      addFromMonthly(id, qty);
    }
    setShowMonthlyPicker(false);
  }

  // Per-tab accent colour
  const tabAccent = tab === 'weekly' ? theme.green : theme.orange;
  const tabAccentLight = tab === 'weekly' ? theme.greenLight : theme.orangeLight;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.cream }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.white, borderBottomColor: theme.grayLight }]}>
        <Pressable onPress={() => router.back()}>
          <Text style={[styles.back, { color: theme.orange }]}>{t.back}</Text>
        </Pressable>
        <Text style={[styles.title, { color: theme.text }]}>{t.shoppingTitle}</Text>
        <Pressable
          style={[styles.shareHeaderBtn, { backgroundColor: theme.greenLight }]}
          onPress={() => router.push({ pathname: '/share-modal', params: { kind: 's' } })}
        >
          <Text style={[styles.shareHeaderBtnText, { color: theme.text }]}>{t.shareBtnLabel}</Text>
        </Pressable>
      </View>

      {/* Tabs — styled per tab */}
      <View style={[styles.tabsContainer, { backgroundColor: theme.white, borderBottomColor: theme.grayLight }]}>
        {(['weekly', 'monthly'] as Tab[]).map((tabOption) => {
          const isActive = tab === tabOption;
          const accent = tabOption === 'weekly' ? theme.green : theme.orange;
          const accentLight = tabOption === 'weekly' ? theme.greenLight : theme.orangeLight;
          const count = tabOption === 'weekly' ? weeklyItems.filter(i => !i.checked).length : monthlyItems.filter(i => !i.checked).length;
          return (
            <Pressable
              key={tabOption}
              style={[
                styles.tab,
                isActive && { borderBottomColor: accent, borderBottomWidth: 2 },
              ]}
              onPress={() => setTab(tabOption)}
            >
              <Text style={[
                styles.tabText,
                { color: isActive ? accent : theme.textLight },
                isActive && { fontWeight: '700' },
              ]}>
                {tabOption === 'weekly' ? t.weeklyTabLabel : t.monthlyTabLabel}
              </Text>
              {count > 0 && (
                <View style={[styles.tabBadge, { backgroundColor: isActive ? accent : theme.grayLight }]}>
                  <Text style={[styles.tabBadgeText, { color: isActive ? '#fff' : theme.textLight }]}>
                    {count}
                  </Text>
                </View>
              )}
            </Pressable>
          );
        })}
      </View>

      {/* "Add from monthly" action bar — weekly tab only */}
      {tab === 'weekly' && monthlyAvailable.length > 0 && (
        <Pressable
          style={[styles.fromMonthlyBar, { backgroundColor: theme.orangeLight }]}
          onPress={() => setShowMonthlyPicker(true)}
        >
          <Text style={[styles.fromMonthlyText, { color: theme.brown }]}>
            {t.addFromMonthly}  ·  {monthlyAvailable.length} {t.monthlyTabLabel.toLowerCase()}
          </Text>
        </Pressable>
      )}

      <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <HintCard text={t.hints.shopping.text} example={t.hints.shopping.example} />

          {/* Summary pill */}
          <View style={[styles.summaryChip, { backgroundColor: tabAccentLight }]}>
            <Text style={[styles.summaryText, { color: theme.text }]}>
              {t.shoppingRemaining(unchecked.length, checked.length)}
            </Text>
          </View>

          {/* Add item form / trigger */}
          {adding ? (
            <View style={[styles.addCard, { backgroundColor: theme.white }]}>
              <TextInput
                style={[styles.addInput, { backgroundColor: theme.offWhite, color: theme.text }]}
                value={newName}
                onChangeText={setNewName}
                placeholder={t.shoppingItemPlaceholder}
                placeholderTextColor={theme.gray}
                autoFocus
                returnKeyType="done"
                onSubmitEditing={addItem}
              />
              {suggestions.length > 0 && (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                  <View style={styles.suggestRow}>
                    {suggestions.map((s) => (
                      <Pressable
                        key={s.id}
                        style={[styles.suggestChip, { backgroundColor: theme.greenLight }]}
                        onPress={() => pickSuggestion(s.name, s.category)}
                      >
                        <Text style={[styles.suggestText, { color: theme.text }]}>{s.name}</Text>
                        {s.price > 0 && (
                          <Text style={[styles.suggestPrice, { color: theme.textLight }]}>
                            {t.lastPaid(`${s.price.toFixed(2)} kr`)}
                          </Text>
                        )}
                      </Pressable>
                    ))}
                  </View>
                </ScrollView>
              )}
              <View style={styles.addRow}>
                <View style={styles.stepperInline}>
                  <Pressable
                    style={[styles.inlineStepBtn, { backgroundColor: theme.grayLight }]}
                    onPress={() => setNewAmount(String(Math.max(1, (parseInt(newAmount, 10) || 1) - 1)))}
                  >
                    <Text style={[styles.inlineStepText, { color: theme.text }]}>−</Text>
                  </Pressable>
                  <TextInput
                    style={[styles.amountInput, { backgroundColor: theme.offWhite, color: theme.text }]}
                    value={newAmount}
                    onChangeText={setNewAmount}
                    keyboardType="decimal-pad"
                    placeholder="1"
                    placeholderTextColor={theme.gray}
                    selectTextOnFocus
                  />
                  <Pressable
                    style={[styles.inlineStepBtn, { backgroundColor: theme.orange }]}
                    onPress={() => setNewAmount(String((parseInt(newAmount, 10) || 1) + 1))}
                  >
                    <Text style={[styles.inlineStepText, { color: '#fff' }]}>+</Text>
                  </Pressable>
                </View>
                <TextInput
                  style={[styles.addInput, { flex: 1, backgroundColor: theme.offWhite, color: theme.text }]}
                  value={newUnit}
                  onChangeText={setNewUnit}
                  placeholder={t.shoppingUnitPlaceholder}
                  placeholderTextColor={theme.gray}
                />
              </View>
              <Text style={[styles.categoryLabel, { color: theme.textLight }]}>{t.category}</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.categoryRow}>
                  {CATEGORY_ORDER.map((cat) => (
                    <Pressable
                      key={cat}
                      style={[
                        styles.categoryChip,
                        { backgroundColor: newCategory === cat ? tabAccent : theme.grayLight },
                      ]}
                      onPress={() => setNewCategory(cat)}
                    >
                      <Text style={[
                        styles.categoryChipText,
                        { color: newCategory === cat ? '#fff' : theme.text },
                      ]}>
                        {t.shoppingCategories[cat]}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </ScrollView>
              <View style={styles.addActions}>
                <Pressable style={styles.cancelBtn} onPress={() => setAdding(false)}>
                  <Text style={[styles.cancelBtnText, { color: theme.textLight }]}>{t.cancel}</Text>
                </Pressable>
                <Pressable style={[styles.confirmBtn, { backgroundColor: tabAccent }]} onPress={addItem}>
                  <Text style={styles.confirmBtnText}>{t.addItemBtn}</Text>
                </Pressable>
              </View>
            </View>
          ) : (
            <Pressable
              style={[styles.addTrigger, { borderColor: tabAccent }]}
              onPress={() => setAdding(true)}
            >
              <Text style={[styles.addTriggerText, { color: tabAccent }]}>{t.addItemTrigger}</Text>
            </Pressable>
          )}

          {/* Grouped unchecked items */}
          {groupedUnchecked.map(({ cat, items: catItems }: Group) => (
            <View key={cat} style={styles.categoryGroup}>
              <Text style={[styles.categoryHeader, { color: theme.textLight }]}>
                {t.shoppingCategories[cat as keyof typeof t.shoppingCategories]}
              </Text>
              <View style={[styles.card, { backgroundColor: theme.white }]}>
                {catItems.map((item, idx) => (
                  <View key={item.id}>
                    <ShoppingRow
                      item={item}
                      theme={theme}
                      onToggle={() => toggle(item.id)}
                      onRemove={() => removeWithSource(item.id)}
                      onAdjust={(d) => adjustAmount(item.id, d)}
                      fromMonthlyLabel={item.monthlySourceId ? t.fromMonthlyLabel : undefined}
                    />
                    {idx < catItems.length - 1 && (
                      <View style={[styles.rowDivider, { backgroundColor: theme.grayLight }]} />
                    )}
                  </View>
                ))}
              </View>
            </View>
          ))}

          {/* Monthly items: allocation status */}
          {tab === 'monthly' && unchecked.length > 0 && (
            <View style={[styles.monthlyInfoBar, { backgroundColor: theme.orangeLight }]}>
              <Text style={[styles.monthlyInfoText, { color: theme.brown }]}>
                {unchecked.filter(i => i.monthlyAllocated > 0).length > 0
                  ? `${unchecked.filter(i => i.monthlyAllocated > 0).length} varer planlagt i ukeliste`
                  : 'Ingen varer planlagt i ukeliste ennå'}
              </Text>
            </View>
          )}

          {/* Checked / In cart */}
          {checked.length > 0 && (
            <View style={styles.section}>
              <Text style={[styles.sectionLabel, { color: theme.textLight }]}>{t.inCart}</Text>
              <View style={[styles.card, { backgroundColor: theme.white }]}>
                {checked.map((item, idx) => (
                  <View key={item.id}>
                    <ShoppingRow
                      item={item}
                      theme={theme}
                      onToggle={() => toggle(item.id)}
                      onRemove={() => removeWithSource(item.id)}
                    />
                    {idx < checked.length - 1 && (
                      <View style={[styles.rowDivider, { backgroundColor: theme.grayLight }]} />
                    )}
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Reset buttons */}
          {tab === 'weekly' && filtered.length > 0 && (
            <Pressable
              style={[styles.resetBtn, { backgroundColor: theme.dangerLight }]}
              onPress={resetWeekly}
            >
              <Text style={[styles.resetBtnText, { color: theme.danger }]}>{t.resetWeekly}</Text>
            </Pressable>
          )}
          {tab === 'monthly' && filtered.length > 0 && (
            <Pressable
              style={[styles.resetBtn, { backgroundColor: theme.dangerLight }]}
              onPress={resetMonthly}
            >
              <Text style={[styles.resetBtnText, { color: theme.danger }]}>{t.resetMonthly}</Text>
            </Pressable>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Monthly picker sheet */}
      <MonthlyPickerSheet
        visible={showMonthlyPicker}
        monthlyItems={monthlyItems}
        categoryLabels={t.shoppingCategories as Record<string, string>}
        onConfirm={handleMonthlyPickerConfirm}
        onClose={() => setShowMonthlyPicker(false)}
        theme={theme}
        t={{
          monthlyPickerTitle: t.monthlyPickerTitle,
          monthlyPickerConfirm: t.monthlyPickerConfirm,
          noMonthlyItems: t.noMonthlyItems,
          monthlyRemaining: t.monthlyRemaining,
          monthlyInWeekly: t.monthlyInWeekly,
          cancel: t.cancel,
        }}
      />
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
    borderBottomWidth: 1,
  },
  back: { fontSize: FontSize.md, fontWeight: '600' },
  title: { fontSize: FontSize.xl, fontWeight: '700' },
  shareHeaderBtn: { borderRadius: Radius.full, paddingHorizontal: Spacing.sm, paddingVertical: Spacing.xs },
  shareHeaderBtnText: { fontSize: FontSize.sm, fontWeight: '600' },

  tabsContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    paddingHorizontal: Spacing.md,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.sm + 2,
    gap: Spacing.xs,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabText: { fontSize: FontSize.sm, fontWeight: '600' },
  tabBadge: {
    minWidth: 18,
    height: 18,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  tabBadgeText: { fontSize: 10, fontWeight: '700' },

  fromMonthlyBar: {
    marginHorizontal: Spacing.md,
    marginTop: Spacing.sm,
    borderRadius: Radius.md,
    padding: Spacing.sm,
    alignItems: 'center',
  },
  fromMonthlyText: { fontSize: FontSize.sm, fontWeight: '700' },

  scroll: { flex: 1 },
  content: { padding: Spacing.md, gap: Spacing.md },

  summaryChip: {
    borderRadius: Radius.full,
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
  },
  summaryText: { fontSize: FontSize.sm, fontWeight: '500' },

  addTrigger: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderRadius: Radius.md,
    padding: Spacing.md,
    alignItems: 'center',
  },
  addTriggerText: { fontSize: FontSize.md, fontWeight: '600' },
  addCard: { borderRadius: Radius.md, padding: Spacing.md, gap: Spacing.sm, ...Shadow.card },
  addInput: { borderRadius: Radius.sm, padding: Spacing.sm, fontSize: FontSize.md },
  addRow: { flexDirection: 'row', gap: Spacing.sm, alignItems: 'center' },
  stepperInline: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  inlineStepBtn: {
    width: 30,
    height: 30,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inlineStepText: { fontSize: FontSize.lg, fontWeight: '700', lineHeight: 22 },
  amountInput: {
    width: 50,
    borderRadius: Radius.sm,
    padding: Spacing.xs,
    fontSize: FontSize.md,
    textAlign: 'center',
  },
  suggestRow: { flexDirection: 'row', gap: Spacing.xs, paddingVertical: 2 },
  suggestChip: {
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    alignItems: 'center',
  },
  suggestText: { fontSize: FontSize.xs, fontWeight: '600' },
  suggestPrice: { fontSize: 9 },
  categoryLabel: { fontSize: FontSize.xs, fontWeight: '600' },
  categoryRow: { flexDirection: 'row', gap: Spacing.xs, paddingVertical: Spacing.xs },
  categoryChip: { paddingHorizontal: Spacing.sm, paddingVertical: 4, borderRadius: Radius.full },
  categoryChipText: { fontSize: FontSize.xs, fontWeight: '600' },
  addActions: { flexDirection: 'row', gap: Spacing.sm, justifyContent: 'flex-end' },
  cancelBtn: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm },
  cancelBtnText: { fontSize: FontSize.md },
  confirmBtn: { borderRadius: Radius.full, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm },
  confirmBtnText: { color: '#fff', fontWeight: '700', fontSize: FontSize.md },

  categoryGroup: { gap: Spacing.xs },
  categoryHeader: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  card: { borderRadius: Radius.md, paddingHorizontal: Spacing.md, ...Shadow.card },
  rowDivider: { height: 1 },

  section: { gap: Spacing.xs },
  sectionLabel: { fontSize: FontSize.sm, fontWeight: '600' },

  monthlyInfoBar: {
    borderRadius: Radius.md,
    padding: Spacing.sm,
    alignItems: 'center',
  },
  monthlyInfoText: { fontSize: FontSize.xs, fontWeight: '600' },

  resetBtn: { borderRadius: Radius.md, padding: Spacing.md, alignItems: 'center' },
  resetBtnText: { fontWeight: '600', fontSize: FontSize.md },
});
