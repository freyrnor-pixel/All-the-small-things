/**
 * shopping.tsx — weekly & monthly shopping lists
 *
 * Tabbed shopping screen (weekly / monthly) with per-category grouping,
 * check-off, quantity adjust, and add via the catalog-backed autocomplete
 * (useCatalogStore.suggest). Monthly items can be allocated into the weekly
 * list through the MonthlyPickerSheet.
 *
 * Connections:
 *   Imports → components/ConfirmationBanner, components/HintCard, components/MonthlyPickerSheet, components/PressableScale, components/ShoppingRow, constants/theme, lib/haptics, lib/i18n, lib/useAppTheme, store/useCatalogStore, store/useSettingsStore, store/useShoppingStore
 *   Used by → Expo Router route "/shopping"
 *   Data    → useShoppingStore (shopping_items table) + useCatalogStore (store_items, for suggestions) + useSettingsStore (weeklyResetDay, read-only)
 *
 * Edit notes:
 *   - All visible strings go through useT(); CATEGORY_ORDER is the canonical category list and ordering.
 *   - Header Share button opens the /share-modal modal with params { kind: 's' }.
 *   - Weekly vs monthly are visually distinguished by the per-tab accent (green vs orange) applied to section headers + a thick accent rule.
 *   - Autocomplete suggestions render as large PressableScale chips; "clear checked" lives at the BOTTOM and reuses removeWithSource per checked item (no dedicated store action).
 *   - weeklyResetDay is 0=Mon..6=Sun; t.days is Sunday-indexed, so the label is t.days[(weeklyResetDay + 1) % 7].
 */
import React, { useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useShoppingStore } from '@/store/useShoppingStore';
import { useCatalogStore } from '@/store/useCatalogStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import ShoppingRow from '@/components/ShoppingRow';
import MonthlyPickerSheet from '@/components/MonthlyPickerSheet';
import HintCard from '@/components/HintCard';
import ConfirmationBanner from '@/components/ConfirmationBanner';
import PressableScale from '@/components/PressableScale';
import { success } from '@/lib/haptics';
import { useT } from '@/lib/i18n';
import { useAppTheme } from '@/lib/useAppTheme';
import { Colors, Fonts, FontSize, Radius, Shadow, Spacing } from '@/constants/theme';

const CATEGORY_ORDER = [
  'produce', 'dairy', 'meat', 'fish', 'bread', 'frozen',
  'canned', 'dry', 'snacks', 'drinks', 'cleaning', 'personal', 'other',
] as const;
type Category = typeof CATEGORY_ORDER[number];

type Tab = 'weekly' | 'monthly';

export default function ShoppingScreen() {
  const router = useRouter();
  const theme = useAppTheme();
  const { bottom: bottomInset } = useSafeAreaInsets();
  const [tab, setTab] = useState<Tab>('weekly');
  const [showAddSheet, setShowAddSheet] = useState(false);
  const [addSheetTab, setAddSheetTab] = useState<'freely' | 'monthly'>('freely');
  const [showMonthlyPicker, setShowMonthlyPicker] = useState(false);
  const [categoryExpanded, setCategoryExpanded] = useState(false);
  const [newName, setNewName] = useState('');
  const [newAmount, setNewAmount] = useState('1');
  const [newUnit, setNewUnit] = useState('');
  const [newCategory, setNewCategory] = useState<Category>('other');
  const [newPrice, setNewPrice] = useState(0);
  const [confirm, setConfirm] = useState<string | null>(null);

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
  const weeklyResetDay = useSettingsStore((s) => s.weeklyResetDay);
  const t = useT();

  // weeklyResetDay is 0=Mon..6=Sun; t.days is Sunday-indexed (0=Sun).
  const resetDayLabel = t.days[(weeklyResetDay + 1) % 7];

  const suggestions = useMemo(() => {
    const exact = newName.trim().toLowerCase();
    if (!exact) {
      // Show popular seed items as quick picks when input is empty
      const alreadyAdded = new Set(items.map((i) => i.name.toLowerCase()));
      return catalog
        .filter((i) => !alreadyAdded.has(i.name.toLowerCase()))
        .slice(0, 10);
    }
    return suggest(newName).filter((s) => s.name.toLowerCase() !== exact);
  }, [newName, catalog, suggest, items]);

  function pickSuggestion(name: string, category: string, price: number) {
    setNewName(name);
    setNewCategory((CATEGORY_ORDER as readonly string[]).includes(category) ? (category as Category) : 'other');
    setNewPrice(price);
    setCategoryExpanded(false);
  }

  const weeklyItems = items.filter((i) => i.listType === 'weekly');
  const monthlyItems = items.filter((i) => i.listType === 'monthly');
  const filtered = tab === 'weekly' ? weeklyItems : monthlyItems;
  const unchecked = filtered.filter((i) => !i.checked);
  const checked = filtered.filter((i) => i.checked);

  // Alphabetically sorted unchecked items for current tab
  const sortedUnchecked = useMemo(
    () => [...unchecked].sort((a, b) => a.name.localeCompare(b.name)),
    [unchecked]
  );

  // Monthly items that still have remaining quantity (available to add to weekly)
  const monthlyAvailable = useMemo(
    () => monthlyItems
      .filter((i) => !i.checked && (parseInt(i.amount, 10) || 1) - i.monthlyAllocated > 0)
      .sort((a, b) => a.name.localeCompare(b.name)),
    [monthlyItems]
  );

  function addItem() {
    if (!newName.trim()) return;
    add({
      name: newName.trim(),
      amount: newAmount || '1',
      unit: newUnit,
      listType: tab,
      store: '',
      price: newPrice,
      category: newCategory,
      inventoryQty: 0,
    });
    setNewName('');
    setNewAmount('1');
    setNewUnit('');
    setNewCategory('other');
    setNewPrice(0);
    setShowAddSheet(false);
    setCategoryExpanded(false);
  }

  function handleMonthlyPickerConfirm(selections: { id: string; qty: number }[]) {
    for (const { id, qty } of selections) {
      addFromMonthly(id, qty);
    }
    setShowMonthlyPicker(false);
  }

  // Clear only the checked-off items in the current tab. Reuses removeWithSource
  // so monthly allocations get released; there is no dedicated store action.
  function clearChecked() {
    if (checked.length === 0) return;
    const n = checked.length;
    checked.forEach((item) => removeWithSource(item.id));
    success();
    setConfirm(t.clearCheckedItems(n));
  }

  // Per-tab accent colour
  const tabAccent = tab === 'weekly' ? theme.green : theme.orange;
  const tabAccentLight = tab === 'weekly' ? theme.greenLight : theme.orangeLight;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.cream }]}>
      <ConfirmationBanner message={confirm} onDismiss={() => setConfirm(null)} />
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


      <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <HintCard text={t.hints.shopping.text} example={t.hints.shopping.example} />

          {/* Summary + reset-day row */}
          <View style={styles.summaryRow}>
            <View style={[styles.summaryChip, { backgroundColor: tabAccentLight }]}>
              <Text style={[styles.summaryText, { color: theme.text }]}>
                {t.shoppingRemaining(unchecked.length, checked.length)}
              </Text>
            </View>
            {tab === 'weekly' && (
              <View style={[styles.resetDayChip, { backgroundColor: theme.greenLight }]}>
                <Text style={[styles.resetDayText, { color: theme.green }]}>
                  {t.weeklyResetsOnShort(resetDayLabel)}
                </Text>
              </View>
            )}
          </View>

          {/* no inline add form — use FAB button below */}

          {/* Weekly tab: Monthly-source section + Weekly items */}
          {tab === 'weekly' && monthlyAvailable.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeaderRow}>
                <Text style={[styles.sectionLabel, { color: theme.textLight }]}>{t.monthlySourceSection}</Text>
                <Pressable onPress={() => setShowMonthlyPicker(true)} hitSlop={8}>
                  <Text style={[styles.addAllBtn, { color: theme.orange }]}>{t.addFromMonthly}</Text>
                </Pressable>
              </View>
              <View style={[styles.card, { backgroundColor: theme.white }]}>
                {monthlyAvailable.map((item, idx) => {
                  const remaining = (parseInt(item.amount, 10) || 1) - item.monthlyAllocated;
                  return (
                    <View key={item.id}>
                      <View style={styles.monthlySourceRow}>
                        <View style={styles.monthlySourceInfo}>
                          <Text style={[styles.monthlySourceName, { color: theme.text }]} numberOfLines={1}>
                            {item.name}
                          </Text>
                          <Text style={[styles.monthlySourceMeta, { color: theme.textLight }]}>
                            {t.monthlyRemaining(remaining, item.unit)}
                          </Text>
                        </View>
                        <Pressable
                          style={[styles.monthlyAddBtn, { backgroundColor: theme.orange }]}
                          onPress={() => addFromMonthly(item.id, 1)}
                        >
                          <Text style={styles.monthlyAddBtnText}>{t.addOneToWeekly}</Text>
                        </Pressable>
                      </View>
                      {idx < monthlyAvailable.length - 1 && (
                        <View style={[styles.rowDivider, { backgroundColor: theme.grayLight }]} />
                      )}
                    </View>
                  );
                })}
              </View>
            </View>
          )}

          {/* Alphabetical unchecked items — header coloured per list (green weekly / orange monthly) */}
          {sortedUnchecked.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeaderRow}>
                <Text style={[styles.sectionLabel, { color: tabAccent }]}>
                  {tab === 'weekly' ? t.weeklyItemsSection : t.monthlyTabLabel}
                </Text>
                <View style={[styles.sectionRule, { backgroundColor: tabAccent }]} />
              </View>
              <View style={[styles.card, styles.cardAccent, { backgroundColor: theme.white, borderLeftColor: tabAccent }]}>
                {sortedUnchecked.map((item, idx) => (
                  <View key={item.id}>
                    <ShoppingRow
                      item={item}
                      theme={theme}
                      onToggle={() => toggle(item.id)}
                      onRemove={() => removeWithSource(item.id)}
                      onAdjust={(d) => adjustAmount(item.id, d)}
                      fromMonthlyLabel={item.monthlySourceId ? t.fromMonthlyLabel : undefined}
                      inStockLabel={t.inStockLabel}
                      monthlyLeftLabel={item.monthlySourceId ? t.fromMonthlyLabel : undefined}
                    />
                    {idx < sortedUnchecked.length - 1 && (
                      <View style={[styles.rowDivider, { backgroundColor: theme.grayLight }]} />
                    )}
                  </View>
                ))}
              </View>
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

          {/* Clear checked items — bottom of the list, only removes in-cart items */}
          {checked.length > 0 && (
            <PressableScale
              style={[styles.clearCheckedBtn, { backgroundColor: theme.greenLight }]}
              onPress={clearChecked}
            >
              <Text style={[styles.clearCheckedText, { color: theme.green }]}>
                {t.clearCheckedItems(checked.length)}
              </Text>
            </PressableScale>
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

      {/* FAB */}
      <Pressable
        style={[styles.fab, { backgroundColor: tabAccent }]}
        onPress={() => { setAddSheetTab('freely'); setShowAddSheet(true); }}
      >
        <Text style={styles.fabText}>+</Text>
      </Pressable>

      {/* Add sheet modal */}
      <Modal visible={showAddSheet} animationType="slide" transparent presentationStyle="overFullScreen" onRequestClose={() => setShowAddSheet(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setShowAddSheet(false)} />
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.sheetWrapper}>
          <View style={[styles.addSheet, { backgroundColor: theme.white, paddingBottom: Math.max(Spacing.xl, bottomInset + Spacing.md) }]}>
            <View style={styles.sheetHandle} />
            <Text style={[styles.sheetTitle, { color: theme.text }]}>{t.addSheetTitle}</Text>

            {/* Sheet tabs */}
            <View style={[styles.sheetTabRow, { backgroundColor: theme.grayLight }]}>
              {(['freely', 'monthly'] as const).map((st) => (
                <Pressable
                  key={st}
                  style={[styles.sheetTab, addSheetTab === st && { backgroundColor: theme.white }]}
                  onPress={() => setAddSheetTab(st)}
                >
                  <Text style={[styles.sheetTabText, { color: addSheetTab === st ? tabAccent : theme.textLight }]}>
                    {st === 'freely' ? t.addFreelyTab : t.addFromMonthlyTab}
                  </Text>
                </Pressable>
              ))}
            </View>

            {addSheetTab === 'freely' && (
              <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                <View style={{ gap: Spacing.sm }}>
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
                    <>
                      <Text style={[styles.suggestLabel, { color: theme.textLight }]}>{t.suggestions}</Text>
                      <View style={styles.suggestWrap}>
                        {suggestions.map((s) => (
                          <PressableScale
                            key={s.id}
                            style={[styles.suggestChip, { backgroundColor: theme.greenLight }]}
                            onPress={() => pickSuggestion(s.name, s.category, s.price)}
                          >
                            <Text style={[styles.suggestText, { color: theme.text }]}>{s.name}</Text>
                            {s.price > 0 && (
                              <Text style={[styles.suggestPrice, { color: theme.textLight }]}>
                                {t.lastPaid(`${s.price.toFixed(2)} kr`)}
                              </Text>
                            )}
                          </PressableScale>
                        ))}
                      </View>
                    </>
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
                  <Pressable
                    style={[styles.categoryToggleBtn, { backgroundColor: theme.grayLight }]}
                    onPress={() => setCategoryExpanded((v) => !v)}
                  >
                    <Text style={[styles.categoryToggleText, { color: theme.textLight }]}>
                      {t.category}: {t.shoppingCategories[newCategory as Category]}
                    </Text>
                    <Text style={[styles.categoryToggleChevron, { color: theme.textLight }]}>
                      {categoryExpanded ? '▲' : '▼'}
                    </Text>
                  </Pressable>
                  {categoryExpanded && (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                      <View style={styles.categoryRow}>
                        {CATEGORY_ORDER.map((cat) => (
                          <Pressable
                            key={cat}
                            style={[styles.categoryChip, { backgroundColor: newCategory === cat ? tabAccent : theme.grayLight }]}
                            onPress={() => { setNewCategory(cat); setCategoryExpanded(false); }}
                          >
                            <Text style={[styles.categoryChipText, { color: newCategory === cat ? '#fff' : theme.text }]}>
                              {t.shoppingCategories[cat]}
                            </Text>
                          </Pressable>
                        ))}
                      </View>
                    </ScrollView>
                  )}
                  <View style={styles.addActions}>
                    <Pressable style={styles.cancelBtn} onPress={() => setShowAddSheet(false)}>
                      <Text style={[styles.cancelBtnText, { color: theme.textLight }]}>{t.cancel}</Text>
                    </Pressable>
                    <Pressable style={[styles.confirmBtn, { backgroundColor: tabAccent }]} onPress={addItem}>
                      <Text style={styles.confirmBtnText}>{t.addItemBtn}</Text>
                    </Pressable>
                  </View>
                </View>
              </ScrollView>
            )}

            {addSheetTab === 'monthly' && (
              <ScrollView showsVerticalScrollIndicator={false}>
                {monthlyAvailable.length === 0 ? (
                  <Text style={[styles.suggestLabel, { color: theme.textLight, textAlign: 'center', paddingVertical: Spacing.lg }]}>
                    {t.noMonthlyItems}
                  </Text>
                ) : (
                  monthlyAvailable.map((item, idx) => {
                    const remaining = (parseInt(item.amount, 10) || 1) - item.monthlyAllocated;
                    return (
                      <View key={item.id}>
                        <View style={styles.monthlySourceRow}>
                          <View style={styles.monthlySourceInfo}>
                            <Text style={[styles.monthlySourceName, { color: theme.text }]} numberOfLines={1}>
                              {item.name}
                            </Text>
                            <Text style={[styles.monthlySourceMeta, { color: theme.textLight }]}>
                              {t.monthlyRemaining(remaining, item.unit)}
                            </Text>
                          </View>
                          <Pressable
                            style={[styles.monthlyAddBtn, { backgroundColor: theme.orange }]}
                            onPress={() => { addFromMonthly(item.id, 1); success(); }}
                          >
                            <Text style={styles.monthlyAddBtnText}>{t.addOneToWeekly}</Text>
                          </Pressable>
                        </View>
                        {idx < monthlyAvailable.length - 1 && (
                          <View style={[styles.rowDivider, { backgroundColor: theme.grayLight }]} />
                        )}
                      </View>
                    );
                  })
                )}
              </ScrollView>
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>

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

  scroll: { flex: 1 },
  content: { padding: Spacing.md, gap: Spacing.md },

  summaryRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: Spacing.sm },
  summaryChip: {
    borderRadius: Radius.full,
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
  },
  summaryText: { fontSize: FontSize.sm, fontWeight: '500' },
  resetDayChip: {
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
  },
  resetDayText: { fontSize: FontSize.sm, fontFamily: Fonts.semibold },

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
  suggestLabel: { fontSize: FontSize.xs, fontWeight: '600' },
  suggestWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, paddingVertical: 2 },
  suggestChip: {
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
  },
  suggestText: { fontSize: FontSize.sm, fontFamily: Fonts.semibold },
  suggestPrice: { fontSize: FontSize.xs, marginTop: 1 },
  categoryToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  categoryToggleText: { fontSize: FontSize.xs, fontWeight: '600' },
  categoryToggleChevron: { fontSize: FontSize.xs, fontWeight: '700' },
  categoryRow: { flexDirection: 'row', gap: Spacing.xs, paddingVertical: Spacing.xs },
  categoryChip: { paddingHorizontal: Spacing.sm, paddingVertical: 4, borderRadius: Radius.full },
  categoryChipText: { fontSize: FontSize.xs, fontWeight: '600' },
  addActions: { flexDirection: 'row', gap: Spacing.sm, justifyContent: 'flex-end' },
  cancelBtn: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm },
  cancelBtnText: { fontSize: FontSize.md },
  confirmBtn: { borderRadius: Radius.full, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm },
  confirmBtnText: { color: '#fff', fontWeight: '700', fontSize: FontSize.md },

  card: { borderRadius: Radius.md, paddingHorizontal: Spacing.md, ...Shadow.card },
  cardAccent: { borderLeftWidth: 3 },
  rowDivider: { height: 1 },
  section: { gap: Spacing.xs },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  sectionRule: { flex: 1, height: 2, borderRadius: Radius.full, opacity: 0.4 },
  sectionLabel: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  addAllBtn: { fontSize: FontSize.xs, fontWeight: '700' },
  monthlySourceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
  },
  monthlySourceInfo: { flex: 1 },
  monthlySourceName: { fontSize: FontSize.md, fontWeight: '600' },
  monthlySourceMeta: { fontSize: FontSize.xs, marginTop: 2 },
  monthlyAddBtn: {
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
  },
  monthlyAddBtnText: { color: '#fff', fontWeight: '700', fontSize: FontSize.xs },

  clearCheckedBtn: { borderRadius: Radius.md, padding: Spacing.md, alignItems: 'center' },
  clearCheckedText: { fontFamily: Fonts.bold, fontSize: FontSize.md },
  resetBtn: { borderRadius: Radius.md, padding: Spacing.md, alignItems: 'center' },
  resetBtnText: { fontWeight: '600', fontSize: FontSize.md },

  fab: {
    position: 'absolute',
    right: Spacing.xl,
    bottom: Spacing.xl,
    width: 56,
    height: 56,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  fabText: { color: '#fff', fontSize: 28, fontWeight: '700', lineHeight: 32 },
  modalOverlay: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheetWrapper: { justifyContent: 'flex-end' },
  addSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: Spacing.lg,
    gap: Spacing.md,
    paddingBottom: Spacing.xl,
    maxHeight: '85%',
  },
  sheetHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#ccc', alignSelf: 'center', marginBottom: 4 },
  sheetTitle: { fontSize: FontSize.lg, fontWeight: '700' },
  sheetTabRow: { flexDirection: 'row', borderRadius: Radius.sm, padding: 3 },
  sheetTab: { flex: 1, paddingVertical: Spacing.sm, alignItems: 'center', borderRadius: Radius.sm - 1 },
  sheetTabText: { fontSize: FontSize.sm, fontWeight: '600' },
});
