/**
 * shopping.tsx — Monthly list (permanent inventory) & Week lists (weekly working lists)
 *
 * Tabbed shopping screen, rebuilt around the padlock-gated Container pattern
 * (components/Container.tsx). The "Monthly list" tab is a single Container: locked
 * (the default) shows today's read-mostly view — a checkbox per row stages items into
 * the pinned staging tray, rows aren't tappable; unlocked folds in /inventory-edit's
 * add/edit/remove logic in-place (rows become tappable → UpdateSheet, plus an inline
 * "+" → AddItemSheet). The "Week lists" tab renders one Container per non-template
 * shopping_lists row (components/WeekListCard.tsx) instead of stepping through a single
 * "selected" list — every list is visible and independently lockable at once. Each
 * list's "Shopping done!" button opens a 3-choice receipt pop-up (Scan / Upload / Skip);
 * all three commit the trip via doneShopping(...), Scan/Upload then route to /scan.
 *
 * Connections:
 *   Imports → components/AddFAB, components/AddItemSheet, components/AddSourceChooser, components/AppModal, components/BottomNav, components/ConfirmationBanner, components/Container, components/EmptyState, components/ListSettingsSheet, components/MonthlyResetSummaryModal, components/MonthlyTableRow, components/PressableScale, components/SavedListsModal, components/ScreenBackground, components/ScreenHeader, components/SharedRequestsSection, components/ShoppingRow, components/SiteSwipeView, components/Surface, components/UpdateSheet, components/WeekListCard, constants/theme, lib/date, lib/haptics, lib/i18n, lib/useAppTheme, store/useAutomationStore, store/useMealStore, store/useSettingsStore, store/useShoppingListStore, store/useShoppingStore
 *   Used by → Expo Router route "/shopping"
 *   Data    → useShoppingStore (shopping_items + shopping_trips tables) + useShoppingListStore (shopping_lists table, incl. each list's `locked` padlock state) + useSettingsStore (monthlyResetDate/lastMonthlyReset) + useMealStore (dishes, read-only, for per-dish price lookup); fires the 'shopping_opened' automation trigger on mount; scaled fontSize via useScaledStyles()
 *
 * Edit notes:
 *   - All visible strings go through useT().
 *   - Header keeps only the Share pill (→ /share-modal) — the old pencil icon
 *     (→ /inventory-edit) and link icon (→ /shared via goToSite) are both removed: the
 *     pencil's job is now the Monthly Container's own padlock, and the link icon had no
 *     replacement in this redesign.
 *   - ScrollView is wrapped in SiteSwipeView so swiping left/right moves between sites.
 *   - SharedRequestsSection (kind='shopping') sits above the tab content.
 *   - Monthly tab badge = count of pendingRestock items; Week lists tab badge = count of
 *     unchecked inWeeklyList items across every non-template list. Both hidden when 0.
 *   - The staging tray and the purchased-this-month history both render inside the
 *     Monthly Container regardless of its lock state — staging-for-restock is that tab's
 *     checkmark-equivalent (never gated), and history is read-only either way. Only the
 *     row tap-to-edit (→ UpdateSheet) and the inline "+" (→ AddItemSheet) are lock-gated,
 *     via MonthlyTableRow's optional onPress (undefined while locked).
 *   - `catalogLocked` is local component state (not persisted) — the Monthly Container
 *     resets to locked on every screen visit, the safe default for a rarely-edited
 *     catalog. Week list locks persist per-row in shopping_lists.locked instead.
 *   - addItemTarget (discriminated on `origin: 'weekly' | 'catalog'`) replaces the old
 *     single showAddSheet boolean + `tab === 'catalog'` branching — it's what lets
 *     handleAddItem know which list a newly-added weekly item belongs to now that
 *     several Week list Containers can be open/unlocked at once. Monthly's inline "+"
 *     sets it directly (no chooser, same as the old inventory-edit.tsx); a Week list's
 *     inline "+" goes through AddSourceChooser first (addSourceChooserListId), whose
 *     "search or type" option seeds addItemTarget from that same id.
 *   - settingsSheetListId/savedListsListId track which Week list Container's
 *     options/bookmark icon was tapped, so ListSettingsSheet/SavedListsModal open scoped
 *     to that list rather than one screen-wide "current" list — there's no single
 *     selected list any more, every Container is independent.
 *   - computeListGroups(items, listId) (module-level, not memoized — same cost as the
 *     old per-screen filters, just re-run once per list) buckets one list's
 *     inWeeklyList items into dish groups / ungrouped unchecked (orderIndex-sorted, for
 *     the move buttons) / checked, mirroring the old single-list dishGroups/
 *     ungroupedWeeklyUnchecked/weeklyChecked logic.
 *   - unlockedListCount feeds the "Unsaved" banner atop the Week lists tab — Shopping
 *     has no draft buffer to abandon (every mutation commits to SQLite immediately via
 *     useShoppingStore/useShoppingListStore), so this is just a lightweight "you left N
 *     list(s) unlocked" nudge, not a persisted draft model.
 *   - Removing a weekly/cart row that's `fromCatalog` calls putBackToInventory (status
 *     reverts to 'catalog') instead of removeWithSource (hard delete) via
 *     handleRemoveWeeklyItem — that single row IS the user's standing Monthly-list
 *     entry, so deleting it would drop it from inventory permanently. The
 *     purchased-history rows keep using removeWithSource since they're past trips.
 *   - AddSourceChooser's inventory step supports picking several items with a qty each
 *     before committing — onConfirmInventoryPicks receives the whole batch at once and
 *     this screen loops it through addToWeeklyFromCatalog(id, quantity, listId), showing
 *     a combined toast for >1 item (itemsAddedToList) vs. the singular one
 *     (itemAddedToList).
 *   - The automatic payday-boundary reset (once per month, when today's day-of-month >=
 *     monthlyResetDate) calls buildMonthlyResetSummary() FIRST (captured into state and
 *     shown via MonthlyResetSummaryModal), then monthlyReset() — isTemporary items are
 *     always purged on reset, no carry-over prompt.
 *   - The 'shopping_opened' trigger fires once per mount ([] deps).
 *   - addItemTarget/addSourceChooserListId are reset on every focus transition
 *     (useFocusEffect, both the on-focus body and the on-blur cleanup), not just on
 *     mount — the receipt pop-up's Scan/Upload choices and the old pencil-icon nav both
 *     bypass goToSite() with a plain push, which leaves this exact screen instance
 *     mounted-but-buried underneath them. A mount-only reset can't catch a sheet left
 *     open before navigating away like that; don't revert this to a plain useEffect(fn, []).
 *   - advanceRecurringLists(todayStr()) runs on every mount (cheap no-op once a
 *     recurring list is already current) — it writes shopping_items rows directly via
 *     useShoppingListStore, not through useShoppingStore's own actions, so this screen
 *     explicitly calls useShoppingStore.getState().load() right after to pick up any
 *     rows it just inserted.
 *   - Every ShoppingRow inside a WeekListCard gets locked={list.locked} (handled inside
 *     WeekListCard itself); the checkmark/collect/undo buttons stay interactive
 *     regardless of lock state, since locking only gates add/remove/edit.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { useShoppingStore, ShoppingItem, MonthlyResetSummary } from '@/store/useShoppingStore';
import { useShoppingListStore, ShoppingList } from '@/store/useShoppingListStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useMealStore } from '@/store/useMealStore';
import { useAutomationStore } from '@/store/useAutomationStore';
import ShoppingRow from '@/components/ShoppingRow';
import MonthlyTableRow from '@/components/MonthlyTableRow';
import AddItemSheet from '@/components/AddItemSheet';
import AddSourceChooser from '@/components/AddSourceChooser';
import UpdateSheet from '@/components/UpdateSheet';
import MonthlyResetSummaryModal from '@/components/MonthlyResetSummaryModal';
import SharedRequestsSection from '@/components/SharedRequestsSection';
import ConfirmationBanner from '@/components/ConfirmationBanner';
import { showAppModal } from '@/components/AppModal';
import PressableScale from '@/components/PressableScale';
import Surface from '@/components/Surface';
import ScreenBackground from '@/components/ScreenBackground';
import ScreenHeader from '@/components/ScreenHeader';
import EmptyState from '@/components/EmptyState';
import AddFAB from '@/components/AddFAB';
import BottomNav from '@/components/BottomNav';
import SiteSwipeView from '@/components/SiteSwipeView';
import Container from '@/components/Container';
import WeekListCard from '@/components/WeekListCard';
import ListSettingsSheet from '@/components/ListSettingsSheet';
import SavedListsModal from '@/components/SavedListsModal';
import { success, heavy } from '@/lib/haptics';
import { useT } from '@/lib/i18n';
import { todayStr, dateStr } from '@/lib/date';
import { useAppTheme, useScaledStyles } from '@/lib/useAppTheme';
import { Fonts, FontSize, Radius, Shadow, Spacing } from '@/constants/theme';

type Tab = 'weekly' | 'catalog';

/** What a tapped inline "+" should add to: a specific Week list, or the Monthly catalog. */
type AddItemTarget = { origin: 'weekly'; listId: string } | { origin: 'catalog' };

/** Buckets one list's inWeeklyList items into dish groups / ungrouped (orderIndex-sorted) / checked. */
function computeListGroups(items: ShoppingItem[], listId: string) {
  const unchecked = items.filter((i) => i.status === 'inWeeklyList' && !i.checked && i.listId === listId);
  const checked = items
    .filter((i) => i.status === 'inWeeklyList' && i.checked && i.listId === listId)
    .sort((a, b) => a.name.localeCompare(b.name));

  const dishMap = new Map<string, ShoppingItem[]>();
  const ungroupedUnchecked: ShoppingItem[] = [];
  for (const item of unchecked) {
    if (item.dishName) {
      const group = dishMap.get(item.dishName);
      if (group) group.push(item);
      else dishMap.set(item.dishName, [item]);
    } else {
      ungroupedUnchecked.push(item);
    }
  }
  const dishGroups = Array.from(dishMap.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  ungroupedUnchecked.sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0));

  return { dishGroups, ungroupedUnchecked, checked };
}

export default function ShoppingScreen() {
  const router = useRouter();
  const theme = useAppTheme();
  const styles = useScaledStyles(baseStyles);
  const [tab, setTab] = useState<Tab>('weekly');
  const [addItemTarget, setAddItemTarget] = useState<AddItemTarget | null>(null);
  const [addSourceChooserListId, setAddSourceChooserListId] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<string | null>(null);
  const [purchasedExpanded, setPurchasedExpanded] = useState<string | null>(null);
  const [resetSummary, setResetSummary] = useState<MonthlyResetSummary | null>(null);
  const [settingsSheetListId, setSettingsSheetListId] = useState<string | null>(null);
  const [savedListsListId, setSavedListsListId] = useState<string | null>(null);
  const [catalogLocked, setCatalogLocked] = useState(true);
  const [updateItem, setUpdateItem] = useState<ShoppingItem | null>(null);

  const items = useShoppingStore((s) => s.items);
  const trips = useShoppingStore((s) => s.trips);
  const add = useShoppingStore((s) => s.add);
  const update = useShoppingStore((s) => s.update);
  const toggle = useShoppingStore((s) => s.toggleCheck);
  const toggleCollected = useShoppingStore((s) => s.toggleCollected);
  const addToWeeklyFromCatalog = useShoppingStore((s) => s.addToWeeklyFromCatalog);
  const putBackToInventory = useShoppingStore((s) => s.putBackToInventory);
  const removeWithSource = useShoppingStore((s) => s.removeWithSource);
  const setPendingRestock = useShoppingStore((s) => s.setPendingRestock);
  const confirmStagingTray = useShoppingStore((s) => s.confirmStagingTray);
  const doneShopping = useShoppingStore((s) => s.doneShopping);
  const monthlyReset = useShoppingStore((s) => s.monthlyReset);
  const buildMonthlyResetSummary = useShoppingStore((s) => s.buildMonthlyResetSummary);
  const monthlyResetDate = useSettingsStore((s) => s.monthlyResetDate);
  const lastMonthlyReset = useSettingsStore((s) => s.lastMonthlyReset);
  const updateSettings = useSettingsStore((s) => s.update);
  const dishes = useMealStore((s) => s.dishes);
  const t = useT();

  const lists = useShoppingListStore((s) => s.lists);
  const renameList = useShoppingListStore((s) => s.rename);
  const toggleListLocked = useShoppingListStore((s) => s.toggleLocked);
  const setListRecurring = useShoppingListStore((s) => s.setRecurring);
  const advanceRecurringLists = useShoppingListStore((s) => s.advanceRecurringLists);
  const saveListAsTemplate = useShoppingListStore((s) => s.saveAsTemplate);
  const instantiateTemplate = useShoppingListStore((s) => s.instantiateTemplate);
  const reorderItem = useShoppingStore((s) => s.reorder);

  const nonTemplateLists = useMemo(() => lists.filter((l) => !l.isTemplate), [lists]);
  const templateLists = useMemo(() => lists.filter((l) => l.isTemplate), [lists]);

  // Fire the 'shopping_opened' automation trigger once per screen visit.
  // Also ensure sheets are closed on mount to prevent state from persisting across navigations
  useEffect(() => {
    setAddItemTarget(null);
    setAddSourceChooserListId(null);
    useAutomationStore.getState().fireTrigger('shopping_opened');
  }, []);

  // Close both add sheets on every focus transition (gaining OR losing focus), not
  // just mount: the receipt pop-up's Scan/Upload choices intentionally bypass
  // goToSite() with a plain router.push() so /scan's own back arrow returns straight to
  // this exact screen instance — it stays mounted, buried, underneath it. A mount-only
  // reset never re-runs for an already-mounted instance that merely regains focus, so a
  // sheet left open before navigating to /scan could resurface later.
  useFocusEffect(
    useCallback(() => {
      setAddItemTarget(null);
      setAddSourceChooserListId(null);
      return () => {
        setAddItemTarget(null);
        setAddSourceChooserListId(null);
      };
    }, [])
  );

  // Automatic payday-boundary reset: once per period, when today's day-of-month
  // has reached monthlyResetDate and we haven't already reset for this period.
  // No carry-over prompt any more — monthlyReset() always purges temporary items.
  useEffect(() => {
    const today = todayStr();
    const periodKey = today.slice(0, 7); // YYYY-MM
    if (lastMonthlyReset.slice(0, 7) === periodKey) return;
    if (new Date().getDate() < monthlyResetDate) return;
    setResetSummary(buildMonthlyResetSummary());
    monthlyReset();
    updateSettings({ lastMonthlyReset: today });
  }, [lastMonthlyReset, monthlyResetDate, monthlyReset, updateSettings, buildMonthlyResetSummary]);

  // Rolls any overdue recurring list forward to the period containing today. A
  // no-op once every recurring list is already current, so it's safe to run on
  // every mount rather than gating it behind a once-per-period flag like the
  // monthly reset above. advanceRecurringLists() writes shopping_items rows
  // directly via useShoppingListStore, not through useShoppingStore, so its
  // items need an explicit refresh here.
  useEffect(() => {
    advanceRecurringLists(todayStr());
    useShoppingStore.getState().load();
  }, [advanceRecurringLists]);

  const catalogItems = useMemo(
    () => items.filter((i) => i.status === 'catalog').sort((a, b) => a.name.localeCompare(b.name)),
    [items]
  );
  const stagedItems = useMemo(() => catalogItems.filter((i) => i.pendingRestock), [catalogItems]);
  const restItems = useMemo(() => catalogItems.filter((i) => !i.pendingRestock), [catalogItems]);

  const purchasedByTrip = useMemo(() => {
    const purchased = items.filter((i) => i.status === 'purchased' && i.shoppingTripId);
    return trips
      .map((trip) => ({ trip, tripItems: purchased.filter((i) => i.shoppingTripId === trip.id) }))
      .filter((g) => g.tripItems.length > 0);
  }, [items, trips]);

  const katalogBadge = stagedItems.length;
  const ukelisteBadge = useMemo(
    () =>
      items.filter(
        (i) => i.status === 'inWeeklyList' && !i.checked && nonTemplateLists.some((l) => l.id === i.listId)
      ).length,
    [items, nonTemplateLists]
  );
  const unlockedListCount = useMemo(() => nonTemplateLists.filter((l) => !l.locked).length, [nonTemplateLists]);

  function handleConfirmTray() {
    if (stagedItems.length === 0) return;
    confirmStagingTray();
    success();
    setConfirm(t.confirmStagingBtn(stagedItems.length));
  }

  // Weekly/cart rows that came from the Monthly list go back to inventory instead of
  // being deleted outright (their single row IS the standing catalog entry).
  function handleRemoveWeeklyItem(item: ShoppingItem) {
    if (item.fromCatalog) {
      putBackToInventory(item.id);
      success();
      setConfirm(t.itemPutBackToInventory(item.name));
    } else {
      removeWithSource(item.id);
    }
  }

  function handleDoneShopping(list: ShoppingList, checkedCount: number) {
    if (checkedCount === 0) return;
    const label = t.tripLabel(dateStr(new Date()));
    showAppModal(t.doneShoppingReceiptTitle, t.doneShoppingReceiptBody, [
      {
        text: t.scanReceiptBtn,
        onPress: () => {
          doneShopping(list.id, label, monthlyResetDate);
          router.push({ pathname: '/scan', params: { autoCapture: 'camera' } });
        },
      },
      {
        text: t.uploadPhotoBtn,
        onPress: () => {
          doneShopping(list.id, label, monthlyResetDate);
          router.push({ pathname: '/scan', params: { autoCapture: 'library' } });
        },
      },
      {
        text: t.skipBtn,
        style: 'cancel',
        onPress: () => {
          doneShopping(list.id, label, monthlyResetDate);
          heavy();
          setConfirm(t.doneShoppingSuccessText);
        },
      },
    ]);
  }

  function handleAddItem(input: { name: string; price: number; targetQuantity: number; isTemporary: boolean; alsoAddToCatalog: boolean }) {
    if (!addItemTarget) return;
    if (addItemTarget.origin === 'catalog') {
      add({
        name: input.name,
        amount: '1',
        unit: '',
        listType: 'monthly',
        store: '',
        price: input.price,
        inventoryQty: 0,
        isTemporary: input.isTemporary,
        targetQuantity: input.targetQuantity,
        status: 'catalog',
      });
    } else {
      add({
        name: input.name,
        amount: '1',
        unit: '',
        listType: 'weekly',
        store: '',
        price: input.price,
        inventoryQty: 0,
        isTemporary: input.isTemporary,
        targetQuantity: input.targetQuantity,
        status: 'inWeeklyList',
        listId: addItemTarget.listId,
      });
      if (input.alsoAddToCatalog) {
        add({
          name: input.name,
          amount: '1',
          unit: '',
          listType: 'monthly',
          store: '',
          price: input.price,
          inventoryQty: 0,
          isTemporary: input.isTemporary,
          targetQuantity: input.targetQuantity,
          status: 'catalog',
        });
      }
    }
    const origin = addItemTarget.origin;
    setAddItemTarget(null);
    success();
    setConfirm(origin === 'catalog' ? t.itemAddedToInventory(input.name) : t.itemAddedToList(input.name));
  }

  function handleUpdateSave(patch: { name: string; price: number; targetQuantity: number; isTemporary: boolean }) {
    if (!updateItem) return;
    update(updateItem.id, patch);
    setUpdateItem(null);
    success();
  }

  function handleUpdateDelete() {
    if (!updateItem) return;
    removeWithSource(updateItem.id);
    setUpdateItem(null);
    heavy();
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScreenBackground />
      <ConfirmationBanner message={confirm} onDismiss={() => setConfirm(null)} />
      {/* Header */}
      <ScreenHeader
        title={t.shoppingTitle}
        bordered
        right={
          <Pressable
            style={[styles.shareHeaderBtn, { backgroundColor: theme.greenLight }]}
            onPress={() => router.push({ pathname: '/share-modal', params: { kind: 's' } })}
          >
            <Text style={[styles.shareHeaderBtnText, { color: theme.text }]}>{t.shareBtnLabel}</Text>
          </Pressable>
        }
      />

      {/* Tabs */}
      <View style={[styles.tabsContainer, { backgroundColor: theme.white, borderBottomColor: theme.grayLight }]}>
        {(['weekly', 'catalog'] as Tab[]).map((tabOption) => {
          const isActive = tab === tabOption;
          const accent = tabOption === 'weekly' ? theme.green : theme.orange;
          const count = tabOption === 'weekly' ? ukelisteBadge : katalogBadge;
          return (
            <Pressable
              key={tabOption}
              style={[styles.tab, isActive && { borderBottomColor: accent, borderBottomWidth: 2 }]}
              onPress={() => setTab(tabOption)}
            >
              <Text style={[
                styles.tabText,
                { color: isActive ? accent : theme.textLight },
                isActive && { fontFamily: Fonts.bold },
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
        <SiteSwipeView>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <SharedRequestsSection kind="shopping" />

          {/* ----- MONTHLY LIST TAB ----- */}
          {tab === 'catalog' && (
            <Container
              title={t.monthlyTabLabel}
              locked={catalogLocked}
              onToggleLock={() => setCatalogLocked((v) => !v)}
              accentColor={theme.orange}
            >
              <View style={styles.bodyGap}>
                {stagedItems.length > 0 && (
                  <View style={[styles.trayCard, { backgroundColor: theme.white, borderColor: theme.orange }]}>
                    <Text style={[styles.trayHeader, { color: theme.orange }]}>
                      {t.stagingTrayHeader(stagedItems.length)}
                    </Text>
                    {stagedItems.map((item) => (
                      <View key={item.id} style={styles.trayRow}>
                        <Text style={[styles.trayItemName, { color: theme.text }]} numberOfLines={1}>{item.name}</Text>
                        <Pressable onPress={() => setPendingRestock(item.id, false)} hitSlop={6}>
                          <Ionicons name="close-circle" size={20} color={theme.gray} />
                        </Pressable>
                      </View>
                    ))}
                    <PressableScale
                      style={[styles.trayConfirmBtn, { backgroundColor: theme.orange }]}
                      onPress={handleConfirmTray}
                    >
                      <Text style={styles.trayConfirmText}>{t.confirmStagingBtn(stagedItems.length)}</Text>
                    </PressableScale>
                  </View>
                )}

                {catalogItems.length === 0 ? (
                  <EmptyState text={t.emptyMonthlyList} />
                ) : (
                  <View style={styles.section}>
                    <View style={styles.sectionHeaderRow}>
                      <Text style={[styles.sectionLabel, { color: theme.orange }]}>{t.catalogHeader(catalogItems.length)}</Text>
                      <View style={[styles.sectionRule, { backgroundColor: theme.orange }]} />
                    </View>
                    <View style={[styles.card, { backgroundColor: theme.white }]}>
                      {restItems.map((item, idx) => (
                        <View key={item.id}>
                          <MonthlyTableRow
                            item={item}
                            theme={theme}
                            onTogglePending={() => setPendingRestock(item.id, !item.pendingRestock)}
                            onPress={!catalogLocked ? () => setUpdateItem(item) : undefined}
                            temporaryLabel={t.temporaryBadge}
                          />
                          {idx < restItems.length - 1 && (
                            <View style={[styles.rowDivider, { backgroundColor: theme.grayLight }]} />
                          )}
                        </View>
                      ))}
                    </View>
                    <View style={[styles.addRow, catalogLocked && styles.gated]} pointerEvents={catalogLocked ? 'none' : 'auto'}>
                      <AddFAB size="sm" onPress={() => setAddItemTarget({ origin: 'catalog' })} />
                    </View>
                  </View>
                )}

                {purchasedByTrip.length > 0 && (
                  <View style={styles.section}>
                    <Text style={[styles.sectionLabel, { color: theme.textLight }]}>{t.purchasedThisMonthSection}</Text>
                    {purchasedByTrip.map(({ trip, tripItems }) => {
                      const expanded = purchasedExpanded === trip.id;
                      return (
                        <View key={trip.id}>
                          <Pressable
                            style={styles.sectionHeaderRow}
                            onPress={() => setPurchasedExpanded(expanded ? null : trip.id)}
                          >
                            <Text style={[styles.weekLabel, { color: theme.textLight }]}>{trip.label}</Text>
                            <Text style={[styles.disclosureChevron, { color: theme.textLight }]}>{expanded ? '▲' : '▼'}</Text>
                          </Pressable>
                          {expanded && (
                            <Surface style={styles.card}>
                              {tripItems.map((item, idx) => (
                                <View key={item.id}>
                                  <ShoppingRow item={item} theme={theme} variant="purchased" onToggle={() => {}} onRemove={() => removeWithSource(item.id)} />
                                  {idx < tripItems.length - 1 && (
                                    <View style={[styles.rowDivider, { backgroundColor: theme.grayLight }]} />
                                  )}
                                </View>
                              ))}
                            </Surface>
                          )}
                        </View>
                      );
                    })}
                  </View>
                )}
              </View>
            </Container>
          )}

          {/* ----- WEEK LISTS TAB ----- */}
          {tab === 'weekly' && (
            <>
              {unlockedListCount > 0 && (
                <View style={[styles.unsavedBanner, { backgroundColor: theme.orangeLight }]}>
                  <Ionicons name="lock-open-outline" size={16} color={theme.orange} />
                  <Text style={[styles.unsavedBannerText, { color: theme.orange }]}>
                    {t.unsavedShoppingBanner(unlockedListCount)}
                  </Text>
                </View>
              )}

              {nonTemplateLists.length === 0 ? (
                <>
                  <EmptyState text={t.weeklyEmptyTitle} />
                  <View style={styles.weeklyEmptyExtra}>
                    <Text style={[styles.weeklyEmptySubtitle, { color: theme.textLight }]}>{t.weeklyEmptySubtitle}</Text>
                  </View>
                </>
              ) : (
                nonTemplateLists.map((list) => {
                  const { dishGroups, ungroupedUnchecked, checked } = computeListGroups(items, list.id);
                  return (
                    <WeekListCard
                      key={list.id}
                      list={list}
                      theme={theme}
                      dishGroups={dishGroups}
                      dishes={dishes}
                      ungroupedUnchecked={ungroupedUnchecked}
                      checked={checked}
                      onToggleLock={() => toggleListLocked(list.id)}
                      onRename={(name) => renameList(list.id, name)}
                      onOpenSettings={() => setSettingsSheetListId(list.id)}
                      onOpenSavedLists={() => setSavedListsListId(list.id)}
                      onToggleItem={(item) => toggle(item.id)}
                      onCollectItem={(item) => toggleCollected(item.id)}
                      onRemoveItem={handleRemoveWeeklyItem}
                      onMoveItem={(item, direction) => reorderItem(item.id, direction)}
                      onAddPress={() => setAddSourceChooserListId(list.id)}
                      onDoneShopping={() => handleDoneShopping(list, checked.length)}
                    />
                  );
                })
              )}
            </>
          )}

          <View style={{ height: 100 }} />
        </ScrollView>
        </SiteSwipeView>
      </KeyboardAvoidingView>

      <AddItemSheet
        visible={addItemTarget !== null}
        origin={addItemTarget?.origin ?? 'weekly'}
        theme={theme}
        onClose={() => setAddItemTarget(null)}
        onAdd={handleAddItem}
      />

      <AddSourceChooser
        visible={addSourceChooserListId !== null}
        theme={theme}
        catalogItems={catalogItems}
        onClose={() => setAddSourceChooserListId(null)}
        onConfirmInventoryPicks={(picks) => {
          if (!addSourceChooserListId) return;
          // Capture item names BEFORE updating status
          const pickNames = picks.map((p) => {
            const item = items.find((i) => i.id === p.id);
            return item?.name;
          });

          for (const pick of picks) {
            addToWeeklyFromCatalog(pick.id, pick.quantity, addSourceChooserListId);
          }
          success();
          if (picks.length === 1 && pickNames[0]) {
            setConfirm(t.itemAddedToList(pickNames[0]));
          } else if (picks.length > 1) {
            setConfirm(t.itemsAddedToList(picks.length));
          }
        }}
        onOpenAddSheet={() => {
          if (addSourceChooserListId) setAddItemTarget({ origin: 'weekly', listId: addSourceChooserListId });
        }}
      />

      <UpdateSheet
        visible={updateItem !== null}
        item={updateItem}
        theme={theme}
        onClose={() => setUpdateItem(null)}
        onSave={handleUpdateSave}
        onDelete={handleUpdateDelete}
      />

      <MonthlyResetSummaryModal
        visible={resetSummary !== null}
        summary={resetSummary}
        theme={theme}
        onClose={() => setResetSummary(null)}
      />

      <ListSettingsSheet
        visible={settingsSheetListId !== null}
        theme={theme}
        list={nonTemplateLists.find((l) => l.id === settingsSheetListId)}
        onClose={() => setSettingsSheetListId(null)}
        onSetRecurring={(isRecurring, intervalWeeks) =>
          settingsSheetListId && setListRecurring(settingsSheetListId, isRecurring, intervalWeeks)
        }
      />

      <SavedListsModal
        visible={savedListsListId !== null}
        theme={theme}
        templates={templateLists}
        onClose={() => setSavedListsListId(null)}
        onSelectTemplate={(id) => {
          const newId = instantiateTemplate(id, todayStr());
          if (newId) {
            useShoppingStore.getState().load();
            success();
            setConfirm(t.templateAppliedToast);
          }
        }}
        onSaveCurrentAsTemplate={() => {
          if (!savedListsListId) return;
          saveListAsTemplate(savedListsListId);
          success();
          setConfirm(t.listSavedAsTemplateToast);
        }}
      />

      <BottomNav />
    </SafeAreaView>
  );
}

const baseStyles = StyleSheet.create({
  safe: { flex: 1 },
  shareHeaderBtn: { borderRadius: Radius.full, paddingHorizontal: Spacing.sm, paddingVertical: Spacing.xs },
  shareHeaderBtnText: { fontSize: FontSize.sm, fontFamily: Fonts.semibold },

  tabsContainer: { flexDirection: 'row', borderBottomWidth: 1, paddingHorizontal: Spacing.md },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
    paddingVertical: Spacing.sm + 2,
    gap: Spacing.xs,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabText: { fontSize: FontSize.sm, fontFamily: Fonts.semibold },
  tabBadge: { minWidth: 18, height: 18, borderRadius: Radius.full, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  tabBadgeText: { fontSize: 10, fontFamily: Fonts.bold },

  scroll: { flex: 1 },
  content: { padding: Spacing.md, gap: Spacing.md },

  bodyGap: { gap: Spacing.md },
  addRow: { alignItems: 'flex-start' },
  gated: { opacity: 0.45 },

  unsavedBanner: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, borderRadius: Radius.md, padding: Spacing.sm },
  unsavedBannerText: { flex: 1, fontSize: FontSize.sm, fontFamily: Fonts.semibold },

  trayCard: { borderRadius: Radius.md, borderWidth: 2, padding: Spacing.md, gap: Spacing.xs },
  trayHeader: { fontSize: FontSize.sm, fontFamily: Fonts.bold, marginBottom: Spacing.xs },
  trayRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 4 },
  trayItemName: { flex: 1, fontSize: FontSize.sm },
  trayConfirmBtn: { borderRadius: Radius.md, paddingVertical: Spacing.sm, alignItems: 'center', marginTop: Spacing.sm, minHeight: 44, justifyContent: 'center' },
  trayConfirmText: { color: '#fff', fontFamily: Fonts.bold, fontSize: FontSize.sm },

  card: { borderRadius: Radius.md, paddingHorizontal: Spacing.md, ...Shadow.card },
  rowDivider: { height: 1 },
  section: { gap: Spacing.xs },
  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: Spacing.sm },
  sectionRule: { flex: 1, height: 2, borderRadius: Radius.full, opacity: 0.4 },
  sectionLabel: { fontSize: FontSize.xs, fontFamily: Fonts.bold, textTransform: 'uppercase', letterSpacing: 0.5 },

  disclosureChevron: { fontSize: FontSize.sm, fontFamily: Fonts.bold },
  weekLabel: { fontSize: FontSize.xs, fontFamily: Fonts.bold, textTransform: 'uppercase', letterSpacing: 0.5 },

  weeklyEmptyExtra: { alignItems: 'center', gap: Spacing.sm, marginTop: -Spacing.lg },
  weeklyEmptySubtitle: { fontSize: FontSize.sm, textAlign: 'center' },
});
