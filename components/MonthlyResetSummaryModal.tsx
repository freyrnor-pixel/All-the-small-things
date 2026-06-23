/**
 * MonthlyResetSummaryModal.tsx — read-only recap shown right after the payday-boundary reset.
 *
 * Displays the MonthlyResetSummary snapshot useShoppingStore.buildMonthlyResetSummary()
 * captured just before monthlyReset() wiped purchasedAt/shoppingTripId off the items it
 * read: inventory-sourced spend vs the full inventory's standing value, and a separate
 * chronological list of ad-hoc (non-inventory) purchases. Entirely non-editable — no
 * delete/edit affordances, this is a recap, not a list to manage (use the Katalog tab or
 * /inventory-edit for that).
 *
 * Connections:
 *   Imports → constants/theme, lib/i18n, lib/useAppTheme, store/useShoppingStore (types only)
 *   Used by → app/shopping.tsx
 *   Data    → none directly — renders the MonthlyResetSummary object passed in by the parent
 *
 * Edit notes:
 *   - Both inventoryItems and adHocItems arrive already sorted chronologically by
 *     purchasedAt (oldest first) from the store — don't re-sort here.
 *   - purchasedAt is a full ISO datetime (doneShopping stamps it via `new Date().toISOString()`),
 *     so this only ever renders its first 10 chars (the YYYY-MM-DD date portion).
 */
import React from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { AppColors, FontSize, Radius, Shadow, Spacing } from '@/constants/theme';
import { useScaledStyles } from '@/lib/useAppTheme';
import { useT } from '@/lib/i18n';
import { MonthlyResetSummary } from '@/store/useShoppingStore';

type Props = {
  visible: boolean;
  summary: MonthlyResetSummary | null;
  theme: AppColors;
  onClose: () => void;
};

export default function MonthlyResetSummaryModal({ visible, summary, theme, onClose }: Props) {
  const styles = useScaledStyles(baseStyles);
  const t = useT();

  if (!summary) return null;
  const isEmpty = summary.inventoryItems.length === 0 && summary.adHocItems.length === 0;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={[styles.sheet, { backgroundColor: theme.white }]}>
        <View style={[styles.handle, { backgroundColor: theme.grayLight }]} />
        <Text style={[styles.title, { color: theme.text }]}>{t.monthlyResetSummaryTitle}</Text>

        {isEmpty ? (
          <Text style={[styles.emptyText, { color: theme.textLight }]}>{t.monthlyResetSummaryEmpty}</Text>
        ) : (
          <ScrollView style={styles.scroll}>
            <View style={styles.section}>
              <Text style={[styles.sectionLabel, { color: theme.orange }]}>{t.monthlyResetSummaryInventorySection}</Text>
              <View style={styles.totalsRow}>
                <Text style={[styles.spentText, { color: theme.text }]}>
                  {t.monthlyResetSummarySpentLabel(summary.inventorySpent.toFixed(0))}
                </Text>
                <Text style={[styles.ofTotalText, { color: theme.textLight }]}>
                  {t.monthlyResetSummaryOfTotalLabel(summary.inventoryTotalValue.toFixed(0))}
                </Text>
              </View>
              {summary.inventoryItems.map((item) => (
                <View key={item.id} style={styles.itemRow}>
                  <Text style={[styles.itemName, { color: theme.text }]} numberOfLines={1}>{item.name}</Text>
                  <Text style={[styles.itemMeta, { color: theme.textLight }]}>{item.purchasedAt.slice(0, 10)}</Text>
                  {item.price > 0 && (
                    <Text style={[styles.itemPrice, { color: theme.textLight }]}>{item.price.toFixed(0)} kr</Text>
                  )}
                </View>
              ))}
            </View>

            {summary.adHocItems.length > 0 && (
              <View style={styles.section}>
                <Text style={[styles.sectionLabel, { color: theme.textLight }]}>{t.monthlyResetSummaryAdHocSection}</Text>
                {summary.adHocItems.map((item) => (
                  <View key={item.id} style={styles.itemRow}>
                    <Text style={[styles.itemName, { color: theme.text }]} numberOfLines={1}>{item.name}</Text>
                    <Text style={[styles.itemMeta, { color: theme.textLight }]}>{item.purchasedAt.slice(0, 10)}</Text>
                    {item.price > 0 && (
                      <Text style={[styles.itemPrice, { color: theme.textLight }]}>{item.price.toFixed(0)} kr</Text>
                    )}
                  </View>
                ))}
              </View>
            )}
          </ScrollView>
        )}

        <Pressable style={[styles.closeBtn, { backgroundColor: theme.orange }]} onPress={onClose}>
          <Text style={styles.closeBtnText}>{t.monthlyResetSummaryCloseBtn}</Text>
        </Pressable>
      </View>
    </Modal>
  );
}

const baseStyles = StyleSheet.create({
  backdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: {
    position: 'absolute',
    left: 0, right: 0, bottom: 0,
    maxHeight: '80%',
    borderTopLeftRadius: Radius.lg,
    borderTopRightRadius: Radius.lg,
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.xl,
    gap: Spacing.xs,
    ...Shadow.fab,
  },
  handle: { alignSelf: 'center', width: 40, height: 4, borderRadius: Radius.full, marginBottom: Spacing.sm },
  title: { fontSize: FontSize.lg, fontWeight: '700', marginBottom: Spacing.sm },
  scroll: { marginBottom: Spacing.sm },
  section: { marginBottom: Spacing.md },
  sectionLabel: { fontSize: FontSize.xs, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: Spacing.xs },
  totalsRow: { flexDirection: 'row', alignItems: 'baseline', gap: Spacing.xs, marginBottom: Spacing.xs },
  spentText: { fontSize: FontSize.md, fontWeight: '700' },
  ofTotalText: { fontSize: FontSize.sm },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingVertical: 4 },
  itemName: { flex: 1, fontSize: FontSize.sm },
  itemMeta: { fontSize: FontSize.xs },
  itemPrice: { fontSize: FontSize.xs, minWidth: 50, textAlign: 'right' },
  emptyText: { fontSize: FontSize.sm, textAlign: 'center', paddingVertical: Spacing.lg },
  closeBtn: { borderRadius: Radius.md, paddingVertical: Spacing.sm, alignItems: 'center' },
  closeBtnText: { color: '#fff', fontWeight: '700', fontSize: FontSize.md },
});
