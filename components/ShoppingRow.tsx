/**
 * ShoppingRow.tsx — single row in the shopping list with check, qty stepper, and remove.
 *
 * Presentational row for a ShoppingItem: a check toggle, name + meta (unit /
 * store / monthly-source tag), an inline qty stepper for numeric amounts, an
 * optional price, and a remove button. All actions are bubbled up via callbacks.
 *
 * Connections:
 *   Imports → constants/theme, store/useShoppingStore
 *   Used by → app/shopping.tsx
 *   Data    → consumes the ShoppingItem type from useShoppingStore; mutations happen in the parent via onToggle/onRemove/onAdjust
 *
 * Edit notes:
 *   - The stepper shows when amount is a positive integer, onAdjust is provided, and the item is unchecked. Otherwise amount+unit appear in the meta sub-row.
 *   - Price and unit always live in the meta sub-row (below the name), keeping the main row to just check + name + (stepper) + remove.
 *   - Theme arrives via the `theme` prop; the "kr" price suffix and labels (fromMonthlyLabel) are passed in pre-formatted/localized.
 *   - Checked rows recede: the whole row dims (opacity) and the name greys + strikes through, but the row STAYS visible until cleared.
 */
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ShoppingItem } from '@/store/useShoppingStore';
import { AppColors, Fonts, FontSize, Radius, Spacing } from '@/constants/theme';

type Props = {
  item: ShoppingItem;
  theme: AppColors;
  onToggle: () => void;
  onRemove: () => void;
  onAdjust?: (delta: number) => void;
  fromMonthlyLabel?: string;
  monthlyTotal?: number;
  inStockLabel?: string;
  monthlyLeftLabel?: string;
};

export default function ShoppingRow({ item, theme, onToggle, onRemove, onAdjust, fromMonthlyLabel, monthlyTotal, inStockLabel, monthlyLeftLabel }: Props) {
  const qty = parseInt(item.amount, 10);
  const isNumeric = !isNaN(qty) && qty > 0;
  const showStepper = isNumeric && !!onAdjust && !item.checked;

  const priceTotal = item.price > 0 && isNumeric ? item.price * qty : null;

  // Build meta parts: qty+unit (when no stepper), unit (when stepper active), store, inventory, monthly left, price
  const metaParts: string[] = [];
  if (!showStepper) {
    metaParts.push(`${item.amount}${item.unit ? ' ' + item.unit : ''}`);
  } else if (item.unit) {
    metaParts.push(item.unit);
  }
  if (item.price > 0) metaParts.push(`${item.price.toFixed(0)} kr/stk`);
  if (priceTotal !== null) metaParts.push(`= ${priceTotal.toFixed(0)} kr`);

  return (
    <View style={[styles.row, item.checked && styles.rowChecked]}>
      <Pressable
        style={[styles.check, { borderColor: theme.green }, item.checked && { backgroundColor: theme.green, borderColor: theme.green }]}
        onPress={onToggle}
        hitSlop={6}
      >
        {item.checked && <Text style={styles.checkMark}>✓</Text>}
      </Pressable>

      <View style={styles.content}>
        <Text style={[styles.name, { color: theme.text }, item.checked && { color: theme.gray, textDecorationLine: 'line-through' }]}>
          {item.name}
        </Text>
        {(metaParts.length > 0 || (item.monthlySourceId && fromMonthlyLabel) || item.inventoryQty > 0 || monthlyLeftLabel) && (
          <View style={styles.metaRow}>
            {metaParts.map((part, i) => (
              <Text key={i} style={[styles.meta, { color: theme.textLight }]}>{part}</Text>
            ))}
            {item.inventoryQty > 0 && inStockLabel ? (
              <Text style={[styles.meta, { color: theme.green }]}>{inStockLabel}: {item.inventoryQty}</Text>
            ) : null}
            {item.monthlySourceId && monthlyLeftLabel ? (
              <Text style={[styles.sourceTag, { color: theme.orange }]}>{monthlyLeftLabel}</Text>
            ) : null}
            {item.monthlySourceId && fromMonthlyLabel && !monthlyLeftLabel ? (
              <Text style={[styles.sourceTag, { color: theme.orange }]}>{fromMonthlyLabel}</Text>
            ) : null}
          </View>
        )}
      </View>

      {/* Amount stepper — only for numeric unchecked items */}
      {showStepper && (
        <View style={styles.stepper}>
          <Pressable
            style={[styles.stepBtn, { backgroundColor: theme.grayLight }]}
            onPress={() => onAdjust!(-1)}
            hitSlop={4}
          >
            <Text style={[styles.stepText, { color: theme.text }]}>−</Text>
          </Pressable>
          <Text style={[styles.qty, { color: theme.text }]}>{item.amount}</Text>
          <Pressable
            style={[styles.stepBtn, { backgroundColor: theme.orange }]}
            onPress={() => onAdjust!(+1)}
            hitSlop={4}
          >
            <Text style={[styles.stepText, { color: '#fff' }]}>+</Text>
          </Pressable>
        </View>
      )}

      <Pressable style={styles.remove} onPress={onRemove} hitSlop={8}>
        <Text style={[styles.removeText, { color: theme.gray }]}>×</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
  },
  rowChecked: { opacity: 0.55 },
  check: {
    width: 26,
    height: 26,
    borderRadius: Radius.full,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkMark: { color: '#fff', fontSize: FontSize.xs, fontWeight: '700' },
  content: { flex: 1, minWidth: 0 },
  name: { fontSize: FontSize.md, fontFamily: Fonts.semibold },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 2 },
  meta: { fontSize: FontSize.xs },
  sourceTag: { fontSize: FontSize.xs, fontWeight: '600' },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  stepBtn: {
    width: 26,
    height: 26,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepText: { fontSize: FontSize.md, fontWeight: '700', lineHeight: 20 },
  qty: { fontSize: FontSize.sm, fontWeight: '700', minWidth: 20, textAlign: 'center' },
  remove: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
  removeText: { fontSize: 20, lineHeight: 22 },
});
