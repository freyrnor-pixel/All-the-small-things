/**
 * shopping.tsx — Katalog (permanent inventory) & Ukeliste (weekly working list)
 *
 * Tabbed shopping screen. The "Katalog" tab is now read-mostly: a checkbox per
 * row flags items into a pinned staging tray (confirming it moves them into the
 * weekly working list), but rows aren't tappable any more — all additions,
 * removals, and quantity/price/name edits happen on the dedicated /inventory-edit
 * screen, reached via the header's pencil icon (Katalog tab only). The "Ukeliste"
 * tab is the working list — check items off into the cart, optionally tick them
 * "collected" while shopping, then "Handlingen fullført" marks everything
 * purchased, creates a shopping_trips row, and clears the list. The weekly tab's
 * "+" opens AddSourceChooser (inventory / catalogue / free entry); Katalog
 * additions are reached only via the pencil icon → /inventory-edit.
 *
 * Connections:
 *   Imports → components/AddFAB, components/AddItemSheet, components/AddSourceChooser, components/AppModal, components/BottomNav, components/ConfirmationBanner, components/EmptyState, components/ListSettingsSheet, components/ListSwitcherHeader, components/MonthlyResetSummaryModal, components/MonthlyTableRow, components/PressableScale, components/SavedListsModal, components/ScreenBackground, components/ScreenHeader, components/SharedRequestsSection, components/ShoppingRow, components/SiteSwipeView, components/Surface, constants/theme, lib/date, lib/haptics, lib/i18n, lib/siteNav, lib/useAppTheme, store/useAutomationStore, store/useMealStore, store/useSettingsStore, store/useShoppingListStore, store/useShoppingStore
 *   Used by → Expo Router route "/shopping"
 *   Data    → useShoppingStore (shopping_items + shopping_trips tables) + useShoppingListStore (shopping_lists table — the Ukeliste tab's selected list, switcher, settings sheet and saved-templates popup) + useSettingsStore (monthlyResetDate/lastMonthlyReset) + useMealStore (dishes, read-only, for per-dish price lookup); fires the 'shopping_opened' automation trigger on mount; scaled fontSize via useScaledStyles()
 *
 * Edit notes:
 *   - Added quick-action buttons for Scan (→ /scan) and Budget (→ /budget) at the top of the
 *     scroll content (both tabs). These routes are no longer in the nav bar; Shopping is their
 *     entry point. Uses t.nav.scan/t.nav.budget (already existed) rather than new i18n keys.
 *     Uses a plain router.push() (NOT goToSite()) — goToSite() replaces the current route,
 *     which would drop Shopping from the stack and send back/hardware-back to Home instead
 *     of here. scan.tsx/budget.tsx's own back arrows just call router.back().
 *   - All visible strings go through useT().
 *   - Header Share button opens the /share-modal modal with params { kind: 's' }; the link icon next to it
 *     goes to /shared via goToSite() (lib/siteNav.ts), keeping the nav stack shallow; the pencil icon
 *     (Katalog tab only) goes to /inventory-edit (a plain push, not a site).
 *   - ScrollView is wrapped in SiteSwipeView so swiping left/right moves between sites.
 *   - SharedRequestsSection (kind='shopping') sits above the summary row.
 *   - Katalog tab badge = count of pendingRestock items; Ukeliste tab badge = count of unchecked inWeeklyList items. Both hidden when 0.
 *   - The staging tray is pinned (non-scrolling) at the top of the Katalog tab content, only rendered when there's at least one pendingRestock item.
 *   - "Kjøpt denne måneden" groups purchased items by shoppingTripId (shopping_trips row), most-recent trip expanded by default.
 *   - The automatic payday-boundary reset (once per month, when today's day-of-month >= monthlyResetDate) calls buildMonthlyResetSummary() FIRST (captured into state and shown via MonthlyResetSummaryModal), then monthlyReset() — there is no carry-over prompt any more (CarryOverPromptModal was removed; isTemporary items are always purged on reset, per the redesign's simpler model).
 *   - The 'shopping_opened' trigger fires once per mount ([] deps).
 *   - showAddSheet/showAddSourceChooser are reset on every focus transition (useFocusEffect,
 *     both the on-focus body and the on-blur cleanup), not just on mount — Scan/Budget/
 *     inventory-edit/share-modal bypass goToSite() with a plain push (see below), which
 *     leaves this exact screen instance mounted-but-buried underneath them. A mount-only
 *     reset can't catch a sheet left open before navigating to one of those, since the
 *     buried instance never remounts, only re-buries/re-surfaces; don't revert this to a
 *     plain useEffect(fn, []).
 *   - Add sheet (components/AddItemSheet.tsx) supports an "also add to catalog" toggle only when opened from the Ukeliste tab — interpreted as: the new item is created directly with status='inWeeklyList', and when the toggle is on, a SECOND permanent catalog row (status='catalog', pendingRestock=false) is also created with the same name/price/targetQuantity, so it persists for future weeks without being purchased=true this trip.
 *   - Checking a weekly-tab row (toggle -> toggleCheck) flips `checked` immediately — there
 *     is no separate staging/confirm step; the row moves straight into the cart section.
 *   - The "Handlingen fullført" sticky button is always rendered on the Ukeliste tab (never
 *     conditionally hidden); when the cart (weeklyChecked) is empty it's dimmed to opacity 0.4
 *     and non-interactive (disabled + pointerEvents="none") rather than removed. handleDoneShopping
 *     also guards on weeklyChecked.length === 0 at the top, so even a stray tap can't fire it.
 *   - The "done shopping" confirmation goes through showAppModal() (components/AppModal.tsx), the shared themed popup — not a native Alert.
 *   - Removing a weekly/cart row that's `fromCatalog` calls putBackToInventory (status
 *     reverts to 'catalog') instead of removeWithSource (hard delete) via
 *     handleRemoveWeeklyItem — that single row IS the user's standing Katalog entry, so
 *     deleting it would drop it from inventory permanently. Only wired into the weekly-tab
 *     rows (dish groups, ungrouped planned, cart); the purchased-history rows keep using
 *     removeWithSource since they're past trips, not the live working list.
 *   - AddSourceChooser's inventory step now supports picking several items with a qty each
 *     before committing — onConfirmInventoryPicks receives the whole batch at once and this
 *     screen loops it through addToWeeklyFromCatalog(id, quantity), showing a combined toast
 *     for >1 item (itemsAddedToList) vs. the singular one (itemAddedToList).
 *   - The FAB sits at AddFAB's shared default position (same as every other site); the
 *     "Handlingen fullført" sticky footer stacks directly above it via AddFAB's exported
 *     FAB_DEFAULT_BOTTOM/FAB_LG_SIZE constants (+ Spacing.sm gap) rather than a locally
 *     guessed height, so the two never overlap.
 *   - Design system pass: all fontWeight string literals replaced with Fonts.* tokens;
 *     tab/quickAction/tray-confirm/done-shopping touch targets bumped to minHeight 44.
 *   - Multiple named/recurring lists (Ukeliste tab only): `selectedList` is either the
 *     list the user explicitly stepped to (selectedListId, via ListSwitcherHeader's
 *     chevrons) or useShoppingListStore.currentList(todayStr()) by default.
 *     weeklyUnchecked/weeklyChecked/ungroupedWeeklyUnchecked all additionally filter on
 *     `item.listId === selectedList?.id` — every inWeeklyList item now belongs to exactly
 *     one shopping_lists row. ungroupedWeeklyUnchecked sorts by orderIndex (not name, unlike
 *     weeklyUnchecked/dishGroups) since that's the section wired to ShoppingRow's
 *     onMoveUp/onMoveDown (useShoppingStore.reorder); dish-grouped items are never
 *     manually reordered, so dishGroups keeps inheriting weeklyUnchecked's alphabetical sort.
 *   - addToWeeklyFromCatalog (the inventory-picker path in AddSourceChooser's
 *     onConfirmInventoryPicks) and handleAddItem's weekly-tab add() both pass
 *     selectedList?.id as listId — every way of getting an item into the Ukeliste tab
 *     must attach it to the active list, or it silently wouldn't render under the
 *     now-list-scoped filters above.
 *   - advanceRecurringLists(todayStr()) runs on every mount (cheap no-op once a
 *     recurring list is already current) — it writes shopping_items rows directly via
 *     useShoppingListStore, not through useShoppingStore's own actions, so this screen
 *     explicitly calls useShoppingStore.getState().load() right after to pick up any
 *     rows it just inserted.
 *   - ListSettingsSheet/SavedListsModal are mounted unconditionally (gated by their own
 *     `visible` prop) like every other modal here, not wrapped in `tab === 'weekly'` —
 *     they're only opened from ListSwitcherHeader, which itself only renders on that tab.
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
import { useRouter, usePathname, useFocusEffect } from 'expo-router';
import { useShoppingStore, ShoppingItem, MonthlyResetSummary } from '@/store/useShoppingStore';
import { useShoppingListStore } from '@/store/useShoppingListStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useMealStore } from '@/store/useMealStore';
import { useAutomationStore } from '@/store/useAutomationStore';
import ShoppingRow from '@/components/ShoppingRow';
import MonthlyTableRow from '@/components/MonthlyTableRow';
import AddItemSheet from '@/components/AddItemSheet';
import AddSourceChooser from '@/components/AddSourceChooser';
import MonthlyResetSummaryModal from '@/components/MonthlyResetSummaryModal';
import SharedRequestsSection from '@/components/SharedRequestsSection';
import ConfirmationBanner from '@/components/ConfirmationBanner';
import { showAppModal } from '@/components/AppModal';
import PressableScale from '@/components/PressableScale';
import Surface from '@/components/Surface';
import ScreenBackground from '@/components/ScreenBackground';
import ScreenHeader from '@/components/ScreenHeader';
import EmptyState from '@/components/EmptyState';
import AddFAB, { FAB_DEFAULT_BOTTOM, FAB_LG_SIZE } from '@/components/AddFAB';
import BottomNav from '@/components/BottomNav';
import SiteSwipeView from '@/components/SiteSwipeView';
import ListSwitcherHeader from '@/components/ListSwitcherHeader';
import ListSettingsSheet from '@/components/ListSettingsSheet';
import SavedListsModal from '@/components/SavedListsModal';
import { success, heavy } from '@/lib/haptics';
import { useT } from '@/lib/i18n';
import { goToSite } from '@/lib/siteNav';
import { todayStr, dateStr } from '@/lib/date';
import { useAppTheme, useScaledStyles } from '@/lib/useAppTheme';
import { Fonts, FontSize, Radius, Shadow, Spacing } from '@/constants/theme';

type Tab = 'weekly' | 'catalog';

export default function ShoppingScreen() {
  const router = useRouter();
  const pathname = usePathname();
  const theme = useAppTheme();
  const styles = useScaledStyles(baseStyles);
  const [tab, setTab] = useState<Tab>('weekly');
  const [showAddSheet, setShowAddSheet] = useState(false);
  const [showAddSourceChooser, setShowAddSourceChooser] = useState(false);
  const [confirm, setConfirm] = useState<string | null>(null);
  const [purchasedExpanded, setPurchasedExpanded] = useState<string | null>(null);
  const [resetSummary, setResetSummary] = useState<MonthlyResetSummary | null>(null);
  const [selectedListId, setSelectedListId] = useState<string | undefined>(undefined);
  const [showListSettings, setShowListSettings] = useState(false);
  const [showSavedLists, setShowSavedLists] = useState(false);

  const items = useShoppingStore((s) => s.items);
  const trips = useShoppingStore((s) => s.trips);
  const add = useShoppingStore((s) => s.add);
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
  const currentList = useShoppingListStore((s) => s.currentList);
  const renameList = useShoppingListStore((s) => s.rename);
  const setListRecurring = useShoppingListStore((s) => s.setRecurring);
  const advanceRecurringLists = useShoppingListStore((s) => s.advanceRecurringLists);
  const saveListAsTemplate = useShoppingListStore((s) => s.saveAsTemplate);
  const instantiateTemplate = useShoppingListStore((s) => s.instantiateTemplate);
  const reorderItem = useShoppingStore((s) => s.reorder);

  const nonTemplateLists = useMemo(() => lists.filter((l) => !l.isTemplate), [lists]);
  const templateLists = useMemo(() => lists.filter((l) => l.isTemplate), [lists]);
  const selectedList = selectedListId
    ? nonTemplateLists.find((l) => l.id === selectedListId)
    : currentList(todayStr());

  // Fire the 'shopping_opened' automation trigger once per screen visit.
  // Also ensure sheets are closed on mount to prevent state from persisting across navigations
  useEffect(() => {
    setShowAddSheet(false);
    setShowAddSourceChooser(false);
    useAutomationStore.getState().fireTrigger('shopping_opened');
  }, []);

  // Close both add sheets on every focus transition (gaining OR losing focus), not
  // just mount: Scan/Budget/inventory-edit/share-modal intentionally bypass goToSite()
  // with a plain router.push() so their own back arrow returns straight to this exact
  // screen instance — it stays mounted, buried, underneath them. A mount-only reset
  // never re-runs for an already-mounted instance that merely regains focus, so a
  // sheet left open before navigating to one of those screens could resurface later.
  useFocusEffect(
    useCallback(() => {
      setShowAddSheet(false);
      setShowAddSourceChooser(false);
      return () => {
        setShowAddSheet(false);
        setShowAddSourceChooser(false);
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

  const weeklyUnchecked = useMemo(
    () => items.filter((i) => i.status === 'inWeeklyList' && !i.checked && i.listId === selectedList?.id).sort((a, b) => a.name.localeCompare(b.name)),
    [items, selectedList]
  );
  const weeklyChecked = useMemo(
    () => items.filter((i) => i.status === 'inWeeklyList' && i.checked && i.listId === selectedList?.id).sort((a, b) => a.name.localeCompare(b.name)),
    [items, selectedList]
  );

  const purchasedByTrip = useMemo(() => {
    const purchased = items.filter((i) => i.status === 'purchased' && i.shoppingTripId);
    return trips
      .map((trip) => ({ trip, tripItems: purchased.filter((i) => i.shoppingTripId === trip.id) }))
      .filter((g) => g.tripItems.length > 0);
  }, [items, trips]);

  const katalogBadge = stagedItems.length;
  const ukelisteBadge = weeklyUnchecked.length;

  // Items pushed from a dish (app/meals.tsx), grouped under that dish's name.
  const dishGroups = useMemo(() => {
    const map = new Map<string, ShoppingItem[]>();
    for (const item of weeklyUnchecked) {
      if (!item.dishName) continue;
      const group = map.get(item.dishName);
      if (group) group.push(item);
      else map.set(item.dishName, [item]);
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [weeklyUnchecked]);

  // Sorted by orderIndex (not name, unlike weeklyUnchecked) so reorder() via the
  // ShoppingRow move buttons below actually changes the visible order.
  const ungroupedWeeklyUnchecked = useMemo(
    () =>
      items
        .filter((i) => i.status === 'inWeeklyList' && !i.checked && !i.dishName && i.listId === selectedList?.id)
        .sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0)),
    [items, selectedList]
  );

  function handleConfirmTray() {
    if (stagedItems.length === 0) return;
    confirmStagingTray();
    success();
    setConfirm(t.confirmStagingBtn(stagedItems.length));
  }

  // Weekly/cart rows that came from the Katalog go back to inventory instead of
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

  function handleDoneShopping() {
    if (weeklyChecked.length === 0 || !selectedList) return;
    showAppModal(
      t.doneShoppingDialogTitle,
      t.doneShoppingDialogBody,
      [
        { text: t.cancelBtn, style: 'cancel' },
        {
          text: t.doneShoppingConfirmBtn,
          onPress: () => {
            doneShopping(selectedList.id, t.tripLabel(dateStr(new Date())), monthlyResetDate);
            heavy();
            setConfirm(t.doneShoppingSuccessText);
          },
        },
      ]
    );
  }

  function handleAddItem(input: { name: string; price: number; targetQuantity: number; isTemporary: boolean; alsoAddToCatalog: boolean }) {
    if (tab === 'catalog') {
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
        listId: selectedList?.id,
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
    setShowAddSheet(false);
    success();
    setConfirm(tab === 'catalog' ? t.itemAddedToInventory(input.name) : t.itemAddedToList(input.name));
  }

  const tabAccent = tab === 'weekly' ? theme.green : theme.orange;

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
            {tab === 'catalog' && (
              <Pressable onPress={() => router.push('/inventory-edit')} hitSlop={8}>
                <Ionicons name="create-outline" size={20} color={theme.textLight} />
              </Pressable>
            )}
            <Pressable onPress={() => goToSite(router, pathname, '/shared')} hitSlop={8}>
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
          {/* Quick actions */}
          <View style={styles.quickActions}>
            <Pressable
              onPress={() => router.push('/scan')}
              style={[styles.quickAction, { backgroundColor: theme.white }]}
              accessibilityLabel={t.nav.scan}
            >
              <Ionicons name="camera-outline" size={22} color={theme.textLight} />
              <Text style={[styles.quickActionLabel, { color: theme.text }]}>{t.nav.scan}</Text>
            </Pressable>

            <Pressable
              onPress={() => router.push('/budget')}
              style={[styles.quickAction, { backgroundColor: theme.white }]}
              accessibilityLabel={t.nav.budget}
            >
              <Ionicons name="wallet-outline" size={22} color={theme.textLight} />
              <Text style={[styles.quickActionLabel, { color: theme.text }]}>{t.nav.budget}</Text>
            </Pressable>
          </View>

          <SharedRequestsSection kind="shopping" />

          {/* ----- KATALOG TAB ----- */}
          {tab === 'catalog' && (
            <>
              <View style={[styles.banner, { backgroundColor: theme.orangeLight }]}>
                <Text style={[styles.bannerText, { color: theme.orange }]}>
                  {t.catalogResetBanner(String(monthlyResetDate))}
                </Text>
              </View>

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
                    <Text style={[styles.sectionLabel, { color: tabAccent }]}>{t.catalogHeader(catalogItems.length)}</Text>
                    <View style={[styles.sectionRule, { backgroundColor: tabAccent }]} />
                  </View>
                  <View style={[styles.card, { backgroundColor: theme.white }]}>
                    {restItems.map((item, idx) => (
                      <View key={item.id}>
                        <MonthlyTableRow
                          item={item}
                          theme={theme}
                          onTogglePending={() => setPendingRestock(item.id, !item.pendingRestock)}
                          temporaryLabel={t.temporaryBadge}
                        />
                        {idx < restItems.length - 1 && (
                          <View style={[styles.rowDivider, { backgroundColor: theme.grayLight }]} />
                        )}
                      </View>
                    ))}
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
            </>
          )}

          {/* ----- UKELISTE TAB ----- */}
          {tab === 'weekly' && (
            <>
              <ListSwitcherHeader
                theme={theme}
                lists={nonTemplateLists}
                selectedList={selectedList}
                onSelectList={setSelectedListId}
                onRename={(name) => selectedList && renameList(selectedList.id, name)}
                onOpenSettings={() => setShowListSettings(true)}
                onOpenSavedLists={() => setShowSavedLists(true)}
              />

              {dishGroups.length === 0 && ungroupedWeeklyUnchecked.length === 0 && weeklyChecked.length === 0 && (
                <>
                  <EmptyState text={t.weeklyEmptyTitle} />
                  <View style={styles.weeklyEmptyExtra}>
                    <Text style={[styles.weeklyEmptySubtitle, { color: theme.textLight }]}>{t.weeklyEmptySubtitle}</Text>
                    <Pressable onPress={() => setTab('catalog')}>
                      <Text style={[styles.goToCatalogText, { color: theme.orange }]}>{t.goToCatalogBtn}</Text>
                    </Pressable>
                  </View>
                </>
              )}

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
                              onRemove={() => handleRemoveWeeklyItem(item)}
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

              {ungroupedWeeklyUnchecked.length > 0 && (
                <View style={styles.section}>
                  <View style={styles.sectionHeaderRow}>
                    <Text style={[styles.sectionLabel, { color: tabAccent }]}>{t.inWeeklyListSection}</Text>
                    <View style={[styles.sectionRule, { backgroundColor: tabAccent }]} />
                  </View>
                  <View style={[styles.card, styles.cardAccent, { backgroundColor: theme.white, borderLeftColor: tabAccent }]}>
                    {ungroupedWeeklyUnchecked.map((item, idx) => (
                      <View key={item.id}>
                        <ShoppingRow
                          item={item}
                          theme={theme}
                          variant="planned"
                          onToggle={() => toggle(item.id)}
                          onRemove={() => handleRemoveWeeklyItem(item)}
                          onMoveUp={idx > 0 ? () => reorderItem(item.id, 'up') : undefined}
                          onMoveDown={idx < ungroupedWeeklyUnchecked.length - 1 ? () => reorderItem(item.id, 'down') : undefined}
                          inStockLabel={t.inStockLabel}
                        />
                        {idx < ungroupedWeeklyUnchecked.length - 1 && (
                          <View style={[styles.rowDivider, { backgroundColor: theme.grayLight }]} />
                        )}
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {weeklyChecked.length > 0 && (
                <View style={styles.section}>
                  <Text style={[styles.sectionLabel, { color: theme.textLight }]}>{t.inKurvenSection(weeklyChecked.length)}</Text>
                  <Surface style={styles.card}>
                    {weeklyChecked.map((item, idx) => (
                      <View key={item.id}>
                        <ShoppingRow
                          item={item}
                          theme={theme}
                          variant="cart"
                          onToggle={() => toggle(item.id)}
                          onCollect={() => toggleCollected(item.id)}
                          onRemove={() => handleRemoveWeeklyItem(item)}
                        />
                        {idx < weeklyChecked.length - 1 && (
                          <View style={[styles.rowDivider, { backgroundColor: theme.grayLight }]} />
                        )}
                      </View>
                    ))}
                  </Surface>
                </View>
              )}
            </>
          )}

          <View style={{ height: 100 }} />
        </ScrollView>
        </SiteSwipeView>
      </KeyboardAvoidingView>

      {/* Sticky "Handlingen fullført" button — Ukeliste tab only, always rendered; dimmed + non-interactive when the cart is empty */}
      {tab === 'weekly' && (
        <View style={[styles.stickyFooter, { bottom: FAB_DEFAULT_BOTTOM + FAB_LG_SIZE + Spacing.sm, paddingBottom: Spacing.md }]}>
          <PressableScale
            style={[
              styles.doneShoppingBtn,
              { backgroundColor: theme.green },
              weeklyChecked.length === 0 && { opacity: 0.4 },
            ]}
            onPress={handleDoneShopping}
            disabled={weeklyChecked.length === 0}
            pointerEvents={weeklyChecked.length === 0 ? 'none' : 'auto'}
          >
            <Text style={styles.doneShoppingText}>{t.doneShoppingBtn}</Text>
          </PressableScale>
        </View>
      )}

      {/* FAB — Ukeliste tab only; Katalog additions via pencil icon → /inventory-edit */}
      {tab === 'weekly' && (
        <AddFAB onPress={() => setShowAddSourceChooser(true)} />
      )}

      <AddItemSheet
        visible={showAddSheet}
        origin={tab === 'weekly' ? 'weekly' : 'catalog'}
        theme={theme}
        onClose={() => setShowAddSheet(false)}
        onAdd={handleAddItem}
      />

      <AddSourceChooser
        visible={showAddSourceChooser}
        theme={theme}
        catalogItems={catalogItems}
        onClose={() => setShowAddSourceChooser(false)}
        onConfirmInventoryPicks={(picks) => {
          // Capture item names BEFORE updating status
          const pickNames = picks.map(p => {
            const item = items.find(i => i.id === p.id);
            return item?.name;
          });

          for (const pick of picks) {
            addToWeeklyFromCatalog(pick.id, pick.quantity, selectedList?.id);
          }
          success();
          if (picks.length === 1 && pickNames[0]) {
            setConfirm(t.itemAddedToList(pickNames[0]));
          } else if (picks.length > 1) {
            setConfirm(t.itemsAddedToList(picks.length));
          }
        }}
        onOpenAddSheet={() => setShowAddSheet(true)}
      />

      <MonthlyResetSummaryModal
        visible={resetSummary !== null}
        summary={resetSummary}
        theme={theme}
        onClose={() => setResetSummary(null)}
      />

      <ListSettingsSheet
        visible={showListSettings}
        theme={theme}
        list={selectedList}
        onClose={() => setShowListSettings(false)}
        onSetRecurring={(isRecurring, intervalWeeks) =>
          selectedList && setListRecurring(selectedList.id, isRecurring, intervalWeeks)
        }
      />

      <SavedListsModal
        visible={showSavedLists}
        theme={theme}
        templates={templateLists}
        onClose={() => setShowSavedLists(false)}
        onSelectTemplate={(id) => {
          const newId = instantiateTemplate(id, todayStr());
          if (newId) {
            useShoppingStore.getState().load();
            setSelectedListId(newId);
            success();
            setConfirm(t.templateAppliedToast);
          }
        }}
        onSaveCurrentAsTemplate={() => {
          if (!selectedList) return;
          saveListAsTemplate(selectedList.id);
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
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
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

  quickActions: { flexDirection: 'row', gap: Spacing.sm },
  quickAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 44,
    paddingVertical: Spacing.xs + 2,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.full,
    ...Shadow.card,
  },
  quickActionLabel: { fontSize: FontSize.sm, fontFamily: Fonts.semibold },

  banner: { borderRadius: Radius.md, padding: Spacing.sm },
  bannerText: { fontSize: FontSize.xs, fontFamily: Fonts.semibold },

  trayCard: { borderRadius: Radius.md, borderWidth: 2, padding: Spacing.md, gap: Spacing.xs },
  trayHeader: { fontSize: FontSize.sm, fontFamily: Fonts.bold, marginBottom: Spacing.xs },
  trayRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 4 },
  trayItemName: { flex: 1, fontSize: FontSize.sm },
  trayConfirmBtn: { borderRadius: Radius.md, paddingVertical: Spacing.sm, alignItems: 'center', marginTop: Spacing.sm, minHeight: 44, justifyContent: 'center' },
  trayConfirmText: { color: '#fff', fontFamily: Fonts.bold, fontSize: FontSize.sm },

  card: { borderRadius: Radius.md, paddingHorizontal: Spacing.md, ...Shadow.card },
  cardAccent: { borderLeftWidth: 3 },
  rowDivider: { height: 1 },
  section: { gap: Spacing.xs },
  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: Spacing.sm },
  sectionRule: { flex: 1, height: 2, borderRadius: Radius.full, opacity: 0.4 },
  sectionLabel: { fontSize: FontSize.xs, fontFamily: Fonts.bold, textTransform: 'uppercase', letterSpacing: 0.5 },
  dishGroupHeader: { paddingTop: Spacing.sm, paddingBottom: 2 },
  dishGroupName: { fontSize: FontSize.sm, fontFamily: Fonts.semibold },
  dishGroupMeta: { fontSize: FontSize.xs, marginTop: 1 },

  disclosureChevron: { fontSize: FontSize.sm, fontFamily: Fonts.bold },
  weekLabel: { fontSize: FontSize.xs, fontFamily: Fonts.bold, textTransform: 'uppercase', letterSpacing: 0.5 },

  weeklyEmptyExtra: { alignItems: 'center', gap: Spacing.sm, marginTop: -Spacing.lg },
  weeklyEmptySubtitle: { fontSize: FontSize.sm, textAlign: 'center' },
  goToCatalogText: { fontSize: FontSize.sm, fontFamily: Fonts.bold },

  stickyFooter: {
    position: 'absolute',
    left: 0, right: 0,
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
  },
  doneShoppingBtn: { borderRadius: Radius.md, paddingVertical: Spacing.md, alignItems: 'center', minHeight: 44, ...Shadow.fab },
  doneShoppingText: { color: '#fff', fontFamily: Fonts.bold, fontSize: FontSize.md },
});
