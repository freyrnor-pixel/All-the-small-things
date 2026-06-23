/**
 * shopping.tsx — Katalog (permanent inventory) & Ukeliste (weekly working list)
 *
 * Tabbed shopping screen. The "Katalog" tab is the permanent household
 * inventory: a checkbox per row flags items into a pinned staging tray;
 * confirming the tray moves them into the weekly working list. The "Ukeliste"
 * tab is that working list — check items off as you shop, then "Handlingen
 * fullført" marks everything purchased, creates a shopping_trips row, and
 * clears the list. Both screens share AddItemSheet (free-add) and Katalog
 * additionally uses UpdateSheet (edit/delete a single item) via
 * MonthlyTableRow's tap-to-open.
 *
 * Connections:
 *   Imports → components/AddItemSheet, components/ConfirmationBanner, components/EmptyState, components/HintCard, components/MonthlyTableRow, components/PressableScale, components/ScreenBackground, components/ScreenHeader, components/SharedRequestsSection, components/ShoppingRow, components/Surface, components/UpdateSheet, constants/theme, lib/date, lib/haptics, lib/i18n, lib/useAppTheme, store/useAutomationStore, store/useMealStore, store/useSettingsStore, store/useShoppingStore
 *   Used by → Expo Router route "/shopping"
 *   Data    → useShoppingStore (shopping_items + shopping_trips tables) + useSettingsStore (monthlyResetDate/lastMonthlyReset) + useMealStore (dishes, read-only, for per-dish price lookup); fires the 'shopping_opened' automation trigger on mount; scaled fontSize via useScaledStyles()
 *
 * Edit notes:
 *   - All visible strings go through useT().
 *   - Header Share button opens the /share-modal modal with params { kind: 's' }; the link icon next to it goes to /shared.
 *   - SharedRequestsSection (kind='shopping') sits above the summary row.
 *   - Katalog tab badge = count of pendingRestock items; Ukeliste tab badge = count of unchecked inWeeklyList items. Both hidden when 0.
 *   - The staging tray is pinned (non-scrolling) at the top of the Katalog tab content, only rendered when there's at least one pendingRestock item.
 *   - "Kjøpt denne måneden" groups purchased items by shoppingTripId (shopping_trips row), most-recent trip expanded by default.
 *   - The automatic payday-boundary reset (once per month, when today's day-of-month >= monthlyResetDate) calls monthlyReset() directly — there is no carry-over prompt any more (CarryOverPromptModal was removed; isTemporary items are always purged on reset, per the redesign's simpler model).
 *   - The 'shopping_opened' trigger fires once per mount ([] deps).
 *   - Add sheet (components/AddItemSheet.tsx) supports an "also add to catalog" toggle only when opened from the Ukeliste tab — interpreted as: the new item is created directly with status='inWeeklyList', and when the toggle is on, a SECOND permanent catalog row (status='catalog', pendingRestock=false) is also created with the same name/price/targetQuantity, so it persists for future weeks without being purchased=true this trip.
 */
import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useShoppingStore, ShoppingItem } from '@/store/useShoppingStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useMealStore } from '@/store/useMealStore';
import { useAutomationStore } from '@/store/useAutomationStore';
import ShoppingRow from '@/components/ShoppingRow';
import MonthlyTableRow from '@/components/MonthlyTableRow';
import UpdateSheet from '@/components/UpdateSheet';
import AddItemSheet from '@/components/AddItemSheet';
import SharedRequestsSection from '@/components/SharedRequestsSection';
import HintCard from '@/components/HintCard';
import ConfirmationBanner from '@/components/ConfirmationBanner';
import PressableScale from '@/components/PressableScale';
import Surface from '@/components/Surface';
import ScreenBackground from '@/components/ScreenBackground';
import ScreenHeader from '@/components/ScreenHeader';
import EmptyState from '@/components/EmptyState';
import { success, heavy } from '@/lib/haptics';
import { useT } from '@/lib/i18n';
import { todayStr, dateStr } from '@/lib/date';
import { useAppTheme, useAccessibility, useScaledStyles } from '@/lib/useAppTheme';
import { Fonts, FontSize, Radius, Shadow, Spacing } from '@/constants/theme';

type Tab = 'weekly' | 'monthly';

export default function ShoppingScreen() {
  const router = useRouter();
  const theme = useAppTheme();
  const styles = useScaledStyles(baseStyles);
  const { bottom: bottomInset } = useSafeAreaInsets();
  const [tab, setTab] = useState<Tab>('weekly');
  const [showAddSheet, setShowAddSheet] = useState(false);
  const [confirm, setConfirm] = useState<string | null>(null);
  const [updateItem, setUpdateItem] = useState<ShoppingItem | null>(null);
  const [purchasedExpanded, setPurchasedExpanded] = useState<string | null>(null);

  const items = useShoppingStore((s) => s.items);
  const trips = useShoppingStore((s) => s.trips);
  const add = useShoppingStore((s) => s.add);
  const update = useShoppingStore((s) => s.update);
  const toggle = useShoppingStore((s) => s.toggleCheck);
  const removeWithSource = useShoppingStore((s) => s.removeWithSource);
  const setPendingRestock = useShoppingStore((s) => s.setPendingRestock);
  const confirmStagingTray = useShoppingStore((s) => s.confirmStagingTray);
  const doneShopping = useShoppingStore((s) => s.doneShopping);
  const monthlyReset = useShoppingStore((s) => s.monthlyReset);
  const shoppingPendingCount = useShoppingStore((s) => s.getPendingCount());
  const confirmShoppingPending = useShoppingStore((s) => s.confirmPending);
  const monthlyResetDate = useSettingsStore((s) => s.monthlyResetDate);
  const lastMonthlyReset = useSettingsStore((s) => s.lastMonthlyReset);
  const updateSettings = useSettingsStore((s) => s.update);
  const dishes = useMealStore((s) => s.dishes);
  const { reducedMotion } = useAccessibility();
  const t = useT();

  // Fire the 'shopping_opened' automation trigger once per screen visit.
  useEffect(() => {
    useAutomationStore.getState().fireTrigger('shopping_opened');
  }, []);

  // Automatic payday-boundary reset: once per period, when today's day-of-month
  // has reached monthlyResetDate and we haven't already reset for this period.
  // No carry-over prompt any more — monthlyReset() always purges temporary items.
  useEffect(() => {
    const today = todayStr();
    const periodKey = today.slice(0, 7); // YYYY-MM
    if (lastMonthlyReset.slice(0, 7) === periodKey) return;
    if (new Date().getDate() < monthlyResetDate) return;
    monthlyReset();
    updateSettings({ lastMonthlyReset: today });
  }, [lastMonthlyReset, monthlyResetDate, monthlyReset, updateSettings]);

  const catalogItems = useMemo(
    () => items.filter((i) => i.status === 'catalog').sort((a, b) => a.name.localeCompare(b.name)),
    [items]
  );
  const stagedItems = useMemo(() => catalogItems.filter((i) => i.pendingRestock), [catalogItems]);
  const restItems = useMemo(() => catalogItems.filter((i) => !i.pendingRestock), [catalogItems]);

  const weeklyUnchecked = useMemo(
    () => items.filter((i) => i.status === 'inWeeklyList' && !i.checked).sort((a, b) => a.name.localeCompare(b.name)),
    [items]
  );
  const weeklyChecked = useMemo(
    () => items.filter((i) => i.status === 'inWeeklyList' && i.checked).sort((a, b) => a.name.localeCompare(b.name)),
    [items]
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

  const ungroupedWeeklyUnchecked = useMemo(
    () => weeklyUnchecked.filter((i) => !i.dishName),
    [weeklyUnchecked]
  );

  function handleConfirmTray() {
    if (stagedItems.length === 0) return;
    confirmStagingTray();
    success();
    setConfirm(t.confirmStagingBtn(stagedItems.length));
  }

  function handleDoneShopping() {
    if (weeklyUnchecked.length === 0 && weeklyChecked.length === 0) return;
    Alert.alert(
      t.doneShoppingDialogTitle,
      t.doneShoppingDialogBody,
      [
        { text: t.cancelBtn, style: 'cancel' },
        {
          text: t.doneShoppingConfirmBtn,
          onPress: () => {
            doneShopping(t.tripLabel(dateStr(new Date())), monthlyResetDate);
            heavy();
            setConfirm(t.doneShoppingSuccessText);
          },
        },
      ]
    );
  }

  function handleAddItem(input: { name: string; price: number; targetQuantity: number; isTemporary: boolean; alsoAddToCatalog: boolean }) {
    if (tab === 'monthly') {
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
    setConfirm(t.itemAddedToList(input.name));
  }

  function handleUpdateSave(patch: { name: string; price: number; targetQuantity: number; isTemporary: boolean }) {
    if (!updateItem) return;
    update(updateItem.id, patch);
    setUpdateItem(null);
    success();
    setConfirm(t.itemAddedToList(patch.name));
  }

  function handleUpdateDelete() {
    if (!updateItem) return;
    removeWithSource(updateItem.id);
    setUpdateItem(null);
    heavy();
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

      {/* Tabs */}
      <View style={[styles.tabsContainer, { backgroundColor: theme.white, borderBottomColor: theme.grayLight }]}>
        {(['weekly', 'monthly'] as Tab[]).map((tabOption) => {
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
        <ScrollView style={styles.scroll} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <HintCard text={t.hints.shopping.text} example={t.hints.shopping.example} />

          <SharedRequestsSection kind="shopping" />

          {/* ----- KATALOG TAB ----- */}
          {tab === 'monthly' && (
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
                          onPress={() => setUpdateItem(item)}
                          onDelete={() => removeWithSource(item.id)}
                          temporaryLabel={t.temporaryBadge}
                          reducedMotion={reducedMotion}
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
              {dishGroups.length === 0 && ungroupedWeeklyUnchecked.length === 0 && weeklyChecked.length === 0 && (
                <EmptyState text={t.weeklyEmptyTitle} />
              )}
              {dishGroups.length === 0 && ungroupedWeeklyUnchecked.length === 0 && weeklyChecked.length === 0 && (
                <View style={styles.weeklyEmptyExtra}>
                  <Text style={[styles.weeklyEmptySubtitle, { color: theme.textLight }]}>{t.weeklyEmptySubtitle}</Text>
                  <Pressable onPress={() => setTab('monthly')}>
                    <Text style={[styles.goToCatalogText, { color: theme.orange }]}>{t.goToCatalogBtn}</Text>
                  </Pressable>
                </View>
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
                              onRemove={() => removeWithSource(item.id)}
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
                          onRemove={() => removeWithSource(item.id)}
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
                        <ShoppingRow item={item} theme={theme} variant="cart" onToggle={() => toggle(item.id)} onRemove={() => removeWithSource(item.id)} />
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

          {shoppingPendingCount > 0 && (
            <View style={[styles.saveButtonSection, { paddingBottom: Spacing.md }]}>
              <Pressable
                style={[styles.saveButton, { backgroundColor: theme.green }]}
                onPress={confirmShoppingPending}
              >
                <Text style={styles.saveButtonText}>{t.save}</Text>
                <Text style={styles.saveButtonCount}>({shoppingPendingCount})</Text>
              </Pressable>
            </View>
          )}

          <View style={{ height: 100 }} />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Sticky "Handlingen fullført" button — Ukeliste tab only, visible when there's anything on the list */}
      {tab === 'weekly' && (weeklyUnchecked.length > 0 || weeklyChecked.length > 0) && (
        <View style={[styles.stickyFooter, { paddingBottom: Math.max(Spacing.md, bottomInset) }]}>
          <PressableScale
            style={[styles.doneShoppingBtn, { backgroundColor: theme.green }]}
            onPress={handleDoneShopping}
          >
            <Text style={styles.doneShoppingText}>{t.doneShoppingBtn}</Text>
          </PressableScale>
        </View>
      )}

      {/* FAB */}
      <Pressable
        style={[styles.fab, { backgroundColor: tabAccent, bottom: tab === 'weekly' && (weeklyUnchecked.length > 0 || weeklyChecked.length > 0) ? Spacing.xl + 64 : Spacing.xl }]}
        onPress={() => setShowAddSheet(true)}
      >
        <Text style={styles.fabText}>+</Text>
      </Pressable>

      <AddItemSheet
        visible={showAddSheet}
        origin={tab === 'weekly' ? 'weekly' : 'catalog'}
        theme={theme}
        onClose={() => setShowAddSheet(false)}
        onAdd={handleAddItem}
      />

      <UpdateSheet
        visible={updateItem !== null}
        item={updateItem}
        theme={theme}
        onClose={() => setUpdateItem(null)}
        onSave={handleUpdateSave}
        onDelete={handleUpdateDelete}
      />
    </SafeAreaView>
  );
}

const baseStyles = StyleSheet.create({
  safe: { flex: 1 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  shareHeaderBtn: { borderRadius: Radius.full, paddingHorizontal: Spacing.sm, paddingVertical: Spacing.xs },
  shareHeaderBtnText: { fontSize: FontSize.sm, fontWeight: '600' },

  tabsContainer: { flexDirection: 'row', borderBottomWidth: 1, paddingHorizontal: Spacing.md },
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
  tabBadge: { minWidth: 18, height: 18, borderRadius: Radius.full, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  tabBadgeText: { fontSize: 10, fontWeight: '700' },

  scroll: { flex: 1 },
  content: { padding: Spacing.md, gap: Spacing.md },

  banner: { borderRadius: Radius.md, padding: Spacing.sm },
  bannerText: { fontSize: FontSize.xs, fontWeight: '600' },

  trayCard: { borderRadius: Radius.md, borderWidth: 2, padding: Spacing.md, gap: Spacing.xs },
  trayHeader: { fontSize: FontSize.sm, fontWeight: '700', marginBottom: Spacing.xs },
  trayRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 4 },
  trayItemName: { flex: 1, fontSize: FontSize.sm },
  trayConfirmBtn: { borderRadius: Radius.md, paddingVertical: Spacing.sm, alignItems: 'center', marginTop: Spacing.sm },
  trayConfirmText: { color: '#fff', fontWeight: '700', fontSize: FontSize.sm },

  card: { borderRadius: Radius.md, paddingHorizontal: Spacing.md, ...Shadow.card },
  cardAccent: { borderLeftWidth: 3 },
  rowDivider: { height: 1 },
  section: { gap: Spacing.xs },
  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: Spacing.sm },
  sectionRule: { flex: 1, height: 2, borderRadius: Radius.full, opacity: 0.4 },
  sectionLabel: { fontSize: FontSize.xs, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  dishGroupHeader: { paddingTop: Spacing.sm, paddingBottom: 2 },
  dishGroupName: { fontSize: FontSize.sm, fontFamily: Fonts.semibold },
  dishGroupMeta: { fontSize: FontSize.xs, marginTop: 1 },

  disclosureChevron: { fontSize: FontSize.sm, fontWeight: '700' },
  weekLabel: { fontSize: FontSize.xs, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },

  weeklyEmptyExtra: { alignItems: 'center', gap: Spacing.sm, marginTop: -Spacing.lg },
  weeklyEmptySubtitle: { fontSize: FontSize.sm, textAlign: 'center' },
  goToCatalogText: { fontSize: FontSize.sm, fontWeight: '700' },

  stickyFooter: {
    position: 'absolute',
    left: 0, right: 0, bottom: 0,
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
  },
  doneShoppingBtn: { borderRadius: Radius.md, paddingVertical: Spacing.md, alignItems: 'center', ...Shadow.fab },
  doneShoppingText: { color: '#fff', fontWeight: '700', fontSize: FontSize.md },

  fab: {
    position: 'absolute',
    right: Spacing.xl,
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

  saveButtonSection: { paddingHorizontal: Spacing.md },
  saveButton: { borderRadius: Radius.md, paddingVertical: Spacing.md, paddingHorizontal: Spacing.lg, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: Spacing.xs },
  saveButtonText: { color: '#fff', fontWeight: '700', fontSize: FontSize.md },
  saveButtonCount: { color: '#fff', fontWeight: '600', fontSize: FontSize.sm },
});
