/**
 * shopping.tsx — weekly & monthly shopping lists
 *
 * Tabbed shopping screen (weekly / monthly) with per-category grouping,
 * check-off, quantity adjust, and add via the catalog-backed autocomplete
 * (useCatalogStore.suggest). Monthly items can be allocated into the weekly
 * list via the add sheet's "From monthly" tab. Monthly items also run through
 * a staged → in_cart → purchased pipeline rendered as an Excel-style table;
 * weekly items keep their checked/in-cart flow but gain a purchased-by-week
 * history via "Finish shopping".
 *
 * Connections:
 *   Imports → components/CarryOverPromptModal, components/ConfirmationBanner, components/HintCard, components/MonthlyTableRow, components/PressableScale, components/ScreenBackground, components/ScreenHeader, components/SharedRequestsSection, components/ShoppingRow, components/Surface, constants/theme, lib/date, lib/haptics, lib/i18n, lib/useAppTheme, store/useAutomationStore, store/useCatalogStore, store/useMealStore, store/useSettingsStore, store/useShoppingStore
 *   Used by → Expo Router route "/shopping"
 *   Data    → useShoppingStore (shopping_items table) + useCatalogStore (store_items, for suggestions) + useSettingsStore (weeklyResetDay/monthlyResetDate/lastMonthlyReset) + useMealStore (dishes, read-only, for per-dish price lookup); fires the 'shopping_opened' automation trigger on mount; scaled fontSize via useScaledStyles()
 *
 * Edit notes:
 *   - All visible strings go through useT(); CATEGORY_ORDER is the canonical category list and ordering.
 *   - Header Share button opens the /share-modal modal with params { kind: 's' }; the link icon next to it goes to /shared (full sent/received history).
 *   - SharedRequestsSection (kind='shopping') sits above the summary row — inline accept/dismiss for items a partner asked for via the scan flow, replacing the old bubble-wheel "Shared" entry.
 *   - Weekly vs monthly are visually distinguished by the per-tab accent (green vs orange) applied to section headers + a thick accent rule.
 *   - Autocomplete suggestions render as large PressableScale chips; "clear checked" lives at the BOTTOM and reuses removeWithSource per checked item (no dedicated store action).
 *   - weeklyResetDay is 0=Mon..6=Sun; t.days is Sunday-indexed, so the label is t.days[(weeklyResetDay + 1) % 7].
 *   - Unchecked items with a dishName (pushed from app/meals.tsx) render grouped under that dish in their own cards, above the plain alphabetical list; ungroupedUnchecked feeds the latter so items aren't duplicated.
 *   - Add sheet supports swipe-down-to-close via a Gesture.Pan on the handle/title row only (not the whole sheet, so inner ScrollView/TextInput touches aren't hijacked); past 100px or a fast flick closes it, otherwise it springs back.
 *   - The 'shopping_opened' trigger fires once per mount ([] deps) — not on every re-render as items change.
 *   - Monthly "list"-status items render as an Excel-style table (MonthlyTableRow); staging is reversible (tap again) until "Save/Add to shopping list" commits staged → in_cart. "Finish shopping" then commits in_cart → purchased.
 *   - The monthly reset button + an automatic on-mount payday check both route through resetMonthlyWithCarryOver(); when temporary unpurchased items exist, CarryOverPromptModal collects per-item carry/drop decisions first. lastMonthlyReset (YYYY-MM-DD) in settings guards the automatic check to once per payday period.
 *   - weekKey for weekly "purchased" history is the YYYY-MM-DD of the most recent occurrence of weeklyResetDay; sections group by that key, newest first.
 */
import React, { useEffect, useMemo, useState } from 'react';
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
import { Ionicons } from '@expo/vector-icons';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Reanimated, { useSharedValue, useAnimatedStyle, withSpring, withTiming, runOnJS } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { useShoppingStore, getCarryOverCandidates } from '@/store/useShoppingStore';
import { useCatalogStore } from '@/store/useCatalogStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useMealStore } from '@/store/useMealStore';
import { useAutomationStore } from '@/store/useAutomationStore';
import ShoppingRow from '@/components/ShoppingRow';
import MonthlyTableRow from '@/components/MonthlyTableRow';
import CarryOverPromptModal from '@/components/CarryOverPromptModal';
import SharedRequestsSection from '@/components/SharedRequestsSection';
import HintCard from '@/components/HintCard';
import ConfirmationBanner from '@/components/ConfirmationBanner';
import PressableScale from '@/components/PressableScale';
import Surface from '@/components/Surface';
import ScreenBackground from '@/components/ScreenBackground';
import ScreenHeader from '@/components/ScreenHeader';
import { success, selection, heavy } from '@/lib/haptics';
import { useT } from '@/lib/i18n';
import { todayStr, dateStr } from '@/lib/date';
import { useAppTheme, useAccessibility, useScaledStyles } from '@/lib/useAppTheme';
import { Colors, Fonts, FontSize, Radius, Shadow, Spacing } from '@/constants/theme';

/** YYYY-MM-DD of the most recent occurrence of weeklyResetDay (0=Mon..6=Sun), inclusive of today. */
function currentWeekKey(weeklyResetDay: number): string {
  const now = new Date();
  const jsDay = (now.getDay() + 6) % 7; // convert Sunday-indexed JS day to Monday-indexed
  const back = (jsDay - weeklyResetDay + 7) % 7;
  const start = new Date(now);
  start.setDate(now.getDate() - back);
  return dateStr(start);
}

const CATEGORY_ORDER = [
  'produce', 'dairy', 'meat', 'fish', 'bread', 'frozen',
  'canned', 'dry', 'snacks', 'drinks', 'cleaning', 'personal', 'other',
] as const;
type Category = typeof CATEGORY_ORDER[number];

type Tab = 'weekly' | 'monthly';

export default function ShoppingScreen() {
  const router = useRouter();
  const theme = useAppTheme();
  const styles = useScaledStyles(baseStyles);
  const { bottom: bottomInset } = useSafeAreaInsets();
  const [tab, setTab] = useState<Tab>('weekly');
  const [showAddSheet, setShowAddSheet] = useState(false);
  const [addSheetTab, setAddSheetTab] = useState<'freely' | 'monthly'>('freely');
  const [categoryExpanded, setCategoryExpanded] = useState(false);
  const [newName, setNewName] = useState('');
  const [newAmount, setNewAmount] = useState('1');
  const [newUnit, setNewUnit] = useState('');
  const [newCategory, setNewCategory] = useState<Category>('other');
  const [newPrice, setNewPrice] = useState(0);
  const [addAsTemporary, setAddAsTemporary] = useState(false);
  const [confirm, setConfirm] = useState<string | null>(null);
  const [carryOverVisible, setCarryOverVisible] = useState(false);

  const items = useShoppingStore((s) => s.items);
  const add = useShoppingStore((s) => s.add);
  const toggle = useShoppingStore((s) => s.toggleCheck);
  const removeWithSource = useShoppingStore((s) => s.removeWithSource);
  const adjustAmount = useShoppingStore((s) => s.adjustAmount);
  const addFromMonthly = useShoppingStore((s) => s.addFromMonthly);
  const resetWeekly = useShoppingStore((s) => s.resetWeekly);
  const stageItem = useShoppingStore((s) => s.stageItem);
  const commitStaged = useShoppingStore((s) => s.commitStaged);
  const finishShopping = useShoppingStore((s) => s.finishShopping);
  const resetMonthlyWithCarryOver = useShoppingStore((s) => s.resetMonthlyWithCarryOver);
  const suggest = useCatalogStore((s) => s.suggest);
  const catalog = useCatalogStore((s) => s.items);
  const weeklyResetDay = useSettingsStore((s) => s.weeklyResetDay);
  const monthlyResetDate = useSettingsStore((s) => s.monthlyResetDate);
  const lastMonthlyReset = useSettingsStore((s) => s.lastMonthlyReset);
  const updateSettings = useSettingsStore((s) => s.update);
  const dishes = useMealStore((s) => s.dishes);
  const { reducedMotion } = useAccessibility();
  const t = useT();

  // weeklyResetDay is 0=Mon..6=Sun; t.days is Sunday-indexed (0=Sun).
  const resetDayLabel = t.days[(weeklyResetDay + 1) % 7];

  // Fire the 'shopping_opened' automation trigger once per screen visit.
  useEffect(() => {
    useAutomationStore.getState().fireTrigger('shopping_opened');
  }, []);

  // Automatic payday-boundary reset: once per period, when today's day-of-month
  // has reached monthlyResetDate and we haven't already reset for this period.
  useEffect(() => {
    const today = todayStr();
    const periodKey = today.slice(0, 7); // YYYY-MM
    if (lastMonthlyReset.slice(0, 7) === periodKey) return;
    if (new Date().getDate() < monthlyResetDate) return;
    const candidates = getCarryOverCandidates(useShoppingStore.getState().items);
    if (candidates.length > 0) {
      setCarryOverVisible(true);
    } else {
      resetMonthlyWithCarryOver([], []);
      updateSettings({ lastMonthlyReset: today });
    }
  }, [lastMonthlyReset, monthlyResetDate, resetMonthlyWithCarryOver, updateSettings]);

  function handleCarryOverConfirm(carryIds: string[], dropIds: string[]) {
    resetMonthlyWithCarryOver(carryIds, dropIds);
    updateSettings({ lastMonthlyReset: todayStr() });
    setCarryOverVisible(false);
  }

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

  const weeklyItems = items.filter((i) => i.listType === 'weekly' && i.status !== 'purchased');
  const monthlyItemsAll = items.filter((i) => i.listType === 'monthly');
  const monthlyItems = monthlyItemsAll.filter((i) => i.status !== 'purchased');
  const filtered = tab === 'weekly' ? weeklyItems : monthlyItems;
  const unchecked = tab === 'weekly' ? filtered.filter((i) => !i.checked) : filtered.filter((i) => i.status === 'list' || i.status === 'staged');
  const checked = tab === 'weekly' ? filtered.filter((i) => i.checked) : filtered.filter((i) => i.status === 'in_cart');

  // Monthly-only: purchased history (kept for review, collapsible)
  const monthlyPurchased = useMemo(
    () => monthlyItemsAll.filter((i) => i.status === 'purchased'),
    [monthlyItemsAll]
  );
  const [purchasedExpanded, setPurchasedExpanded] = useState(false);

  // Monthly-only: items currently staged (for the "Save/Add to shopping list" commit step)
  const stagedCount = monthlyItems.filter((i) => i.status === 'staged').length;

  // Monthly grand total — sum of price * amount over the visible main-list rows
  const monthlyGrandTotal = useMemo(
    () => unchecked
      .filter((i) => i.status === 'list')
      .reduce((sum, i) => sum + i.price * (parseInt(i.amount, 10) || 1), 0),
    [unchecked]
  );

  // Weekly-only: purchased history grouped by week, newest first
  const weeklyPurchasedByWeek = useMemo(() => {
    const purchased = items.filter((i) => i.listType === 'weekly' && i.status === 'purchased');
    const map = new Map<string, typeof purchased>();
    for (const item of purchased) {
      const key = item.weekKey ?? 'unknown';
      const group = map.get(key);
      if (group) group.push(item);
      else map.set(key, [item]);
    }
    return Array.from(map.entries()).sort((a, b) => b[0].localeCompare(a[0]));
  }, [items]);
  const [weeklyHistoryExpanded, setWeeklyHistoryExpanded] = useState(false);

  // Alphabetically sorted unchecked items for current tab
  const sortedUnchecked = useMemo(
    () => [...unchecked].sort((a, b) => a.name.localeCompare(b.name)),
    [unchecked]
  );

  // Items pushed from a dish (app/meals.tsx) are grouped under that dish's name;
  // everything else stays in the plain alphabetical list below.
  const dishGroups = useMemo(() => {
    const map = new Map<string, typeof sortedUnchecked>();
    for (const item of sortedUnchecked) {
      if (!item.dishName) continue;
      const group = map.get(item.dishName);
      if (group) group.push(item);
      else map.set(item.dishName, [item]);
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [sortedUnchecked]);

  const ungroupedUnchecked = useMemo(
    () => sortedUnchecked.filter((i) => !i.dishName),
    [sortedUnchecked]
  );

  // Monthly items that still have remaining quantity (available to add to weekly)
  const monthlyAvailable = useMemo(
    () => monthlyItems
      .filter((i) => !i.checked && (parseInt(i.amount, 10) || 1) - i.monthlyAllocated > 0)
      .sort((a, b) => a.name.localeCompare(b.name)),
    [monthlyItems]
  );

  // Swipe-down-to-close on the add sheet's drag handle
  const sheetTranslateY = useSharedValue(0);
  const sheetCloseArmed = useSharedValue(false);
  useEffect(() => {
    if (showAddSheet) {
      sheetTranslateY.value = 0;
      sheetCloseArmed.value = false;
    }
  }, [showAddSheet, sheetTranslateY, sheetCloseArmed]);

  function closeAddSheet() {
    setShowAddSheet(false);
  }

  const sheetPanGesture = Gesture.Pan()
    .onUpdate((e) => {
      if (e.translationY > 0) sheetTranslateY.value = e.translationY;
      // One-shot tick the moment the drag crosses the close threshold — not on every frame.
      if (e.translationY > 100) {
        if (!sheetCloseArmed.value) {
          sheetCloseArmed.value = true;
          runOnJS(selection)();
        }
      } else {
        sheetCloseArmed.value = false;
      }
    })
    .onEnd((e) => {
      if (e.translationY > 100 || e.velocityY > 800) {
        sheetTranslateY.value = reducedMotion ? 600 : withTiming(600, { duration: 180 });
        runOnJS(heavy)();
        runOnJS(closeAddSheet)();
      } else {
        sheetTranslateY.value = reducedMotion ? 0 : withSpring(0, { damping: 16, stiffness: 180 });
      }
    });

  const sheetAnimStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: sheetTranslateY.value }],
  }));

  function addItem() {
    if (!newName.trim()) return;
    const name = newName.trim();
    add({
      name,
      amount: newAmount || '1',
      unit: newUnit,
      listType: tab,
      store: '',
      price: newPrice,
      category: newCategory,
      inventoryQty: 0,
      isTemporary: tab === 'monthly' ? addAsTemporary : false,
    });
    setNewName('');
    setNewAmount('1');
    setNewUnit('');
    setNewCategory('other');
    setNewPrice(0);
    setAddAsTemporary(false);
    setShowAddSheet(false);
    setCategoryExpanded(false);
    success();
    setConfirm(t.itemAddedToList(name));
  }

  function openUpdateInventory() {
    setAddAsTemporary(true);
    setAddSheetTab('freely');
    setShowAddSheet(true);
  }

  function handleSaveToCart() {
    if (stagedCount === 0) return;
    commitStaged();
    success();
    setConfirm(t.saveAddToShoppingListBtn);
  }

  function handleFinishShopping() {
    if (checked.length === 0) return;
    if (tab === 'monthly') {
      finishShopping('monthly');
    } else {
      finishShopping('weekly', currentWeekKey(weeklyResetDay));
    }
    success();
    setConfirm(t.finishShoppingBtn);
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
    <SafeAreaView style={styles.safe}>
      <ScreenBackground />
      <ConfirmationBanner message={confirm} onDismiss={() => setConfirm(null)} />
      {/* Header */}
      <ScreenHeader
        title={t.shoppingTitle}
        onBack={() => router.back()}
        bordered
        right={
          <View style={styles.headerActions}>
            <Pressable onPress={() => router.push('/shared')} hitSlop={8}>
              <Ionicons name="link-outline" size={20} color={theme.textLight} />
            </Pressable>
            <Pressable
              style={[styles.shareHeaderBtn, { backgroundColor: theme.greenLight }]}
              onPress={() => router.push({ pathname: '/share-modal', params: { kind: 's' } })}
            >
              <Text style={[styles.shareHeaderBtnText, { color: theme.text }]}>{t.shareBtnLabel}</Text>
            </Pressable>
          </View>
        }
      />

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

          <SharedRequestsSection kind="shopping" />

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

          {/* Monthly tab: action row — update inventory + commit staged items to cart */}
          {tab === 'monthly' && (
            <View style={styles.actionRow}>
              <Pressable style={[styles.actionBtn, { backgroundColor: theme.orange }]} onPress={openUpdateInventory}>
                <Text style={[styles.actionBtnText, { color: '#fff' }]}>{t.updateInventoryBtn}</Text>
              </Pressable>
              {stagedCount > 0 && (
                <Pressable style={[styles.actionBtn, { backgroundColor: theme.orange }]} onPress={handleSaveToCart}>
                  <Text style={[styles.actionBtnText, { color: '#fff' }]}>{t.saveAddToShoppingListBtn}</Text>
                </Pressable>
              )}
            </View>
          )}

          {/* Items pushed from a dish (app/meals.tsx), grouped under that dish's name */}
          {dishGroups.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeaderRow}>
                <Text style={[styles.sectionLabel, { color: tabAccent }]}>{t.fromMealsSection}</Text>
                <View style={[styles.sectionRule, { backgroundColor: tabAccent }]} />
              </View>
              {dishGroups.map(([dishName, groupItems]) => {
                const dish = dishes.find((d) => d.name === dishName);
                return (
                  <View key={dishName} style={[styles.card, styles.cardAccent, { backgroundColor: theme.white, borderLeftColor: tabAccent }]}>
                    <View style={styles.dishGroupHeader}>
                      <Text style={[styles.dishGroupName, { color: theme.text }]} numberOfLines={1}>{dishName}</Text>
                      <Text style={[styles.dishGroupMeta, { color: theme.textLight }]}>
                        {t.ingredientsCount(groupItems.length)}
                        {dish && dish.estimatedPriceNok > 0 ? ` · ${t.dishPriceLabel(String(dish.estimatedPriceNok))}` : ''}
                      </Text>
                    </View>
                    {groupItems.map((item, idx) => (
                      <View key={item.id}>
                        <ShoppingRow
                          item={item}
                          theme={theme}
                          variant="planned"
                          onToggle={() => toggle(item.id)}
                          onRemove={() => removeWithSource(item.id)}
                          onAdjust={(d) => adjustAmount(item.id, d)}
                          inStockLabel={t.inStockLabel}
                        />
                        {idx < groupItems.length - 1 && (
                          <View style={[styles.rowDivider, { backgroundColor: theme.grayLight }]} />
                        )}
                      </View>
                    ))}
                  </View>
                );
              })}
            </View>
          )}

          {/* Alphabetical unchecked items — weekly keeps the card list; monthly renders an Excel-style table */}
          {ungroupedUnchecked.length > 0 && tab === 'weekly' && (
            <View style={styles.section}>
              <View style={styles.sectionHeaderRow}>
                <Text style={[styles.sectionLabel, { color: tabAccent }]}>{t.weeklyItemsSection}</Text>
                <View style={[styles.sectionRule, { backgroundColor: tabAccent }]} />
              </View>
              <View style={[styles.card, styles.cardAccent, { backgroundColor: theme.white, borderLeftColor: tabAccent }]}>
                {ungroupedUnchecked.map((item, idx) => (
                  <View key={item.id}>
                    <ShoppingRow
                      item={item}
                      theme={theme}
                      variant="planned"
                      onToggle={() => toggle(item.id)}
                      onRemove={() => removeWithSource(item.id)}
                      onAdjust={(d) => adjustAmount(item.id, d)}
                      fromMonthlyLabel={item.monthlySourceId ? t.fromMonthlyLabel : undefined}
                      inStockLabel={t.inStockLabel}
                      monthlyLeftLabel={item.monthlySourceId ? t.fromMonthlyLabel : undefined}
                    />
                    {idx < ungroupedUnchecked.length - 1 && (
                      <View style={[styles.rowDivider, { backgroundColor: theme.grayLight }]} />
                    )}
                  </View>
                ))}
              </View>
            </View>
          )}

          {ungroupedUnchecked.length > 0 && tab === 'monthly' && (
            <View style={styles.section}>
              <View style={styles.sectionHeaderRow}>
                <Text style={[styles.sectionLabel, { color: tabAccent }]}>{t.monthlyTabLabel}</Text>
                <View style={[styles.sectionRule, { backgroundColor: tabAccent }]} />
              </View>
              <View style={[styles.card, styles.cardAccent, { backgroundColor: theme.white, borderLeftColor: tabAccent }]}>
                <View style={styles.tableHeaderRow}>
                  <Text style={[styles.tableHeaderCheck]} />
                  <Text style={[styles.tableHeaderItem, { color: theme.textLight }]}>{t.tableHeaderItem}</Text>
                  <Text style={[styles.tableHeaderPrice, { color: theme.textLight }]}>{t.tableHeaderPrice}</Text>
                  <Text style={[styles.tableHeaderTotal, { color: theme.textLight }]}>{t.tableHeaderTotal}</Text>
                  <Text style={[styles.tableHeaderAmount, { color: theme.textLight }]}>{t.tableHeaderAmount}</Text>
                </View>
                {ungroupedUnchecked.map((item, idx) => (
                  <View key={item.id}>
                    <MonthlyTableRow
                      item={item}
                      theme={theme}
                      onStage={() => stageItem(item.id)}
                      onRemove={() => removeWithSource(item.id)}
                      onAdjust={(d) => adjustAmount(item.id, d)}
                      temporaryLabel={t.temporaryItemTag}
                    />
                    {idx < ungroupedUnchecked.length - 1 && (
                      <View style={[styles.rowDivider, { backgroundColor: theme.grayLight }]} />
                    )}
                  </View>
                ))}
                <View style={[styles.grandTotalRow, { borderTopColor: theme.grayLight }]}>
                  <Text style={[styles.grandTotalText, { color: theme.text }]}>{t.grandTotalLabel(monthlyGrandTotal)}</Text>
                </View>
              </View>
            </View>
          )}

          {/* Checked / In cart */}
          {checked.length > 0 && (
            <View style={styles.section}>
              <Text style={[styles.sectionLabel, { color: theme.textLight }]}>{t.inCartSection}</Text>
              <Surface style={styles.card}>
                {checked.map((item, idx) => (
                  <View key={item.id}>
                    <ShoppingRow
                      item={item}
                      theme={theme}
                      variant="cart"
                      onToggle={() => toggle(item.id)}
                      onRemove={() => removeWithSource(item.id)}
                    />
                    {idx < checked.length - 1 && (
                      <View style={[styles.rowDivider, { backgroundColor: theme.grayLight }]} />
                    )}
                  </View>
                ))}
              </Surface>
            </View>
          )}

          {/* Weekly tab: clear checked + finish shopping; Monthly tab: finish shopping only (in-cart items move to Purchased, not cleared) */}
          {tab === 'weekly' && checked.length > 0 && (
            <PressableScale
              style={[styles.clearCheckedBtn, { backgroundColor: theme.greenLight }]}
              onPress={clearChecked}
            >
              <Text style={[styles.clearCheckedText, { color: theme.green }]}>
                {t.clearCheckedItems(checked.length)}
              </Text>
            </PressableScale>
          )}

          {checked.length > 0 && (
            <PressableScale
              style={[styles.clearCheckedBtn, { backgroundColor: theme.orangeLight }]}
              onPress={handleFinishShopping}
            >
              <Text style={[styles.clearCheckedText, { color: theme.orange }]}>
                {t.finishShoppingBtn}
              </Text>
            </PressableScale>
          )}

          {/* Purchased history */}
          {tab === 'monthly' && monthlyPurchased.length > 0 && (
            <View style={styles.section}>
              <Pressable style={styles.sectionHeaderRow} onPress={() => setPurchasedExpanded((v) => !v)}>
                <Text style={[styles.sectionLabel, { color: theme.textLight }]}>{t.purchasedCount(monthlyPurchased.length)}</Text>
                <Text style={[styles.disclosureChevron, { color: theme.textLight }]}>{purchasedExpanded ? '▲' : '▼'}</Text>
              </Pressable>
              {purchasedExpanded && (
                <Surface style={styles.card}>
                  {monthlyPurchased.map((item, idx) => (
                    <View key={item.id}>
                      <ShoppingRow item={item} theme={theme} variant="purchased" onToggle={() => {}} onRemove={() => removeWithSource(item.id)} />
                      {idx < monthlyPurchased.length - 1 && (
                        <View style={[styles.rowDivider, { backgroundColor: theme.grayLight }]} />
                      )}
                    </View>
                  ))}
                </Surface>
              )}
            </View>
          )}

          {tab === 'weekly' && weeklyPurchasedByWeek.length > 0 && (
            <View style={styles.section}>
              <Pressable style={styles.sectionHeaderRow} onPress={() => setWeeklyHistoryExpanded((v) => !v)}>
                <Text style={[styles.sectionLabel, { color: theme.textLight }]}>{t.purchasedCount(weeklyPurchasedByWeek.reduce((n, [, g]) => n + g.length, 0))}</Text>
                <Text style={[styles.disclosureChevron, { color: theme.textLight }]}>{weeklyHistoryExpanded ? '▲' : '▼'}</Text>
              </Pressable>
              {weeklyHistoryExpanded && weeklyPurchasedByWeek.map(([weekKey, weekItems]) => (
                <View key={weekKey} style={{ gap: Spacing.xs }}>
                  <Text style={[styles.weekLabel, { color: theme.textLight }]}>{t.weekOfLabel(weekKey)}</Text>
                  <Surface style={styles.card}>
                    {weekItems.map((item, idx) => (
                      <View key={item.id}>
                        <ShoppingRow item={item} theme={theme} variant="purchased" onToggle={() => {}} onRemove={() => removeWithSource(item.id)} />
                        {idx < weekItems.length - 1 && (
                          <View style={[styles.rowDivider, { backgroundColor: theme.grayLight }]} />
                        )}
                      </View>
                    ))}
                  </Surface>
                </View>
              ))}
            </View>
          )}

          {/* Reset buttons */}
          {tab === 'weekly' && filtered.length > 0 && (
            <Pressable
              style={[styles.resetBtn, { backgroundColor: theme.dangerLight }]}
              onPress={resetWeekly}
            >
              <Text style={[styles.resetBtnText, { color: theme.danger }]}>{t.moveBackToMonthly}</Text>
            </Pressable>
          )}
          {tab === 'monthly' && filtered.length > 0 && (
            <Pressable
              style={[styles.resetBtn, { backgroundColor: theme.dangerLight }]}
              onPress={() => {
                const candidates = getCarryOverCandidates(monthlyItemsAll);
                if (candidates.length > 0) setCarryOverVisible(true);
                else resetMonthlyWithCarryOver([], []);
              }}
            >
              <Text style={[styles.resetBtnText, { color: theme.danger }]}>{t.monthlyResetBtnLabel}</Text>
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
          <Reanimated.View style={[styles.addSheet, sheetAnimStyle, { backgroundColor: theme.white, paddingBottom: Math.max(Spacing.xl, bottomInset + Spacing.md) }]}>
            <GestureDetector gesture={sheetPanGesture}>
              <View style={styles.sheetDragArea}>
                <View style={styles.sheetHandle} />
                <Text style={[styles.sheetTitle, { color: theme.text }]}>{t.addSheetTitle}</Text>
              </View>
            </GestureDetector>

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
                  {tab === 'monthly' && (
                    <Pressable
                      style={[styles.temporaryToggle, { borderColor: theme.orange }, addAsTemporary && { backgroundColor: theme.orange }]}
                      onPress={() => setAddAsTemporary((v) => !v)}
                    >
                      <Text style={[styles.temporaryToggleText, { color: addAsTemporary ? '#fff' : theme.orange }]}>
                        {t.temporaryItemTag}
                      </Text>
                    </Pressable>
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
          </Reanimated.View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Carry-over prompt — payday-boundary monthly reset with leftover temporary items */}
      <CarryOverPromptModal
        visible={carryOverVisible}
        candidates={getCarryOverCandidates(monthlyItemsAll)}
        onConfirm={handleCarryOverConfirm}
        theme={theme}
        t={{
          carryOverPromptTitle: t.carryOverPromptTitle,
          carryOverPromptBody: t.carryOverPromptBody,
          carryOverItemCarry: t.carryOverItemCarry,
          carryOverItemDrop: t.carryOverItemDrop,
          carryOverAllCarry: t.carryOverAllCarry,
          carryOverAllDrop: t.carryOverAllDrop,
          carryOverConfirmBtn: t.carryOverConfirmBtn,
        }}
      />
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
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
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
  temporaryToggle: {
    alignSelf: 'flex-start',
    borderWidth: 2,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    marginTop: Spacing.xs,
  },
  temporaryToggleText: { fontSize: FontSize.xs, fontWeight: '700' },
  categoryRow: { flexDirection: 'row', gap: Spacing.xs, paddingVertical: Spacing.xs },
  categoryChip: { paddingHorizontal: Spacing.sm, paddingVertical: 4, borderRadius: Radius.full },
  categoryChipText: { fontSize: FontSize.xs, fontWeight: '600' },
  addActions: { flexDirection: 'row', gap: Spacing.sm, justifyContent: 'flex-end' },
  cancelBtn: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm },
  cancelBtnText: { fontSize: FontSize.md },
  confirmBtn: { borderRadius: Radius.md, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm },
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
  dishGroupHeader: { paddingTop: Spacing.sm, paddingBottom: 2 },
  dishGroupName: { fontSize: FontSize.sm, fontFamily: Fonts.semibold },
  dishGroupMeta: { fontSize: FontSize.xs, marginTop: 1 },
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

  actionRow: { flexDirection: 'row', gap: Spacing.sm },
  actionBtn: { flex: 1, borderRadius: Radius.md, paddingVertical: Spacing.sm, alignItems: 'center' },
  actionBtnText: { fontSize: FontSize.sm, fontWeight: '700' },

  tableHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.xs,
    gap: Spacing.xs,
  },
  tableHeaderCheck: { width: 24 },
  tableHeaderItem: { flex: 2, fontSize: FontSize.xs, fontWeight: '700', textTransform: 'uppercase' },
  tableHeaderPrice: { flex: 1, fontSize: FontSize.xs, fontWeight: '700', textTransform: 'uppercase', textAlign: 'right' },
  tableHeaderTotal: { flex: 1, fontSize: FontSize.xs, fontWeight: '700', textTransform: 'uppercase', textAlign: 'right' },
  tableHeaderAmount: { fontSize: FontSize.xs, fontWeight: '700', textTransform: 'uppercase', minWidth: 70, textAlign: 'center' },

  grandTotalRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
  },
  grandTotalText: { fontSize: FontSize.md, fontWeight: '700' },

  disclosureChevron: { fontSize: FontSize.sm, fontWeight: '700' },
  weekLabel: { fontSize: FontSize.xs, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },

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
  sheetDragArea: { paddingBottom: Spacing.xs },
  sheetHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#ccc', alignSelf: 'center', marginBottom: 4 },
  sheetTitle: { fontSize: FontSize.lg, fontWeight: '700' },
  sheetTabRow: { flexDirection: 'row', borderRadius: Radius.sm, padding: 3 },
  sheetTab: { flex: 1, paddingVertical: Spacing.sm, alignItems: 'center', borderRadius: Radius.sm - 1 },
  sheetTabText: { fontSize: FontSize.sm, fontWeight: '600' },
});
