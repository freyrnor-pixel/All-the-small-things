/**
 * inventory-edit.tsx — the ONLY place Katalog (inventory) items get added, removed, or
 * have their target quantity/price/name/temporary flag changed.
 *
 * The Katalog tab in app/shopping.tsx is read-mostly: rows there only flag
 * pendingRestock via their leading checkbox and aren't tappable. This screen is the
 * "Edit inventory" entry point that opens from that tab's header — every catalog row
 * here opens UpdateSheet on tap, and the FAB opens AddItemSheet (origin='catalog', so
 * it never shows the weekly-only "also add to catalog" toggle).
 *
 * Connections:
 *   Imports → components/AddFAB, components/AddItemSheet, components/EmptyState, components/MonthlyTableRow, components/ScreenBackground, components/ScreenHeader, components/UpdateSheet, constants/theme, lib/haptics, lib/i18n, lib/useAppTheme, store/useShoppingStore
 *   Used by → Expo Router route "/inventory-edit"; app/shopping.tsx (Katalog tab header button)
 *   Data    → useShoppingStore (shopping_items, status === 'catalog' rows only)
 *
 * Edit notes:
 *   - All visible strings go through useT().
 *   - This is a plain Stack push (full screen), not a modal — registered as a bare
 *     `<Stack.Screen name="inventory-edit" />` in app/_layout.tsx.
 */
import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useShoppingStore, ShoppingItem } from '@/store/useShoppingStore';
import MonthlyTableRow from '@/components/MonthlyTableRow';
import UpdateSheet from '@/components/UpdateSheet';
import AddItemSheet from '@/components/AddItemSheet';
import ScreenBackground from '@/components/ScreenBackground';
import ScreenHeader from '@/components/ScreenHeader';
import EmptyState from '@/components/EmptyState';
import AddFAB from '@/components/AddFAB';
import { success, heavy } from '@/lib/haptics';
import { useT } from '@/lib/i18n';
import { useAppTheme, useScaledStyles } from '@/lib/useAppTheme';
import { Radius, Shadow, Spacing } from '@/constants/theme';

export default function InventoryEditScreen() {
  const router = useRouter();
  const theme = useAppTheme();
  const styles = useScaledStyles(baseStyles);
  const t = useT();

  const items = useShoppingStore((s) => s.items);
  const add = useShoppingStore((s) => s.add);
  const update = useShoppingStore((s) => s.update);
  const removeWithSource = useShoppingStore((s) => s.removeWithSource);
  const setPendingRestock = useShoppingStore((s) => s.setPendingRestock);

  const [showAddSheet, setShowAddSheet] = useState(false);
  const [updateItem, setUpdateItem] = useState<ShoppingItem | null>(null);

  const catalogItems = useMemo(
    () => items.filter((i) => i.status === 'catalog').sort((a, b) => a.name.localeCompare(b.name)),
    [items]
  );

  function handleAddItem(input: { name: string; price: number; targetQuantity: number; isTemporary: boolean; alsoAddToCatalog: boolean }) {
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
    setShowAddSheet(false);
    success();
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
      <ScreenHeader title={t.inventoryEditTitle} onBack={() => router.back()} bordered />

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        {catalogItems.length === 0 ? (
          <EmptyState text={t.emptyMonthlyList} />
        ) : (
          <View style={[styles.card, { backgroundColor: theme.white }]}>
            {catalogItems.map((item, idx) => (
              <View key={item.id}>
                <MonthlyTableRow
                  item={item}
                  theme={theme}
                  onTogglePending={() => setPendingRestock(item.id, !item.pendingRestock)}
                  onPress={() => setUpdateItem(item)}
                  temporaryLabel={t.temporaryBadge}
                />
                {idx < catalogItems.length - 1 && (
                  <View style={[styles.rowDivider, { backgroundColor: theme.grayLight }]} />
                )}
              </View>
            ))}
          </View>
        )}
        <View style={{ height: 100 }} />
      </ScrollView>

      <AddFAB onPress={() => setShowAddSheet(true)} bottom={Spacing.xl} />

      <AddItemSheet
        visible={showAddSheet}
        origin="catalog"
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
  scroll: { flex: 1 },
  content: { padding: Spacing.md },
  card: { borderRadius: Radius.md, paddingHorizontal: Spacing.md, ...Shadow.card },
  rowDivider: { height: 1 },
});
