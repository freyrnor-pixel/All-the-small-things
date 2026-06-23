/**
 * ShoppingRow.tsx — single row in the shopping list with a move button and remove.
 *
 * Presentational row for a ShoppingItem: a planned/cart/purchased move button, name + meta
 * (unit / store / price), and a remove button. All actions are bubbled up via callbacks.
 *
 * Connections:
 *   Imports → constants/theme, store/useShoppingStore
 *   Used by → app/shopping.tsx
 *   Data    → consumes the ShoppingItem type from useShoppingStore; mutations happen in the parent via onToggle/onRemove; scaled fontSize via useScaledStyles()
 *
 * Edit notes:
 *   - `variant` drives the move button: 'planned' shows a "+" (move into cart, calls onToggle),
 *     'cart' shows a "−" (move back out, calls onToggle), 'purchased' shows a static checkmark
 *     (read-only — purchased/history rows only leave via removeWithSource, never onToggle).
 *   - There is no inline qty stepper any more (amount is edited via AddItemSheet/UpdateSheet) —
 *     amount+unit always appear in the meta sub-row. The old onAdjust/fromMonthlyLabel/
 *     monthlyTotal/monthlyLeftLabel props (and the monthly-source tag they fed) were removed as
 *     dead code — no caller in app/shopping.tsx ever passed them.
 *   - Price and unit always live in the meta sub-row (below the name), keeping the main row to just move-button + name + remove.
 *   - Theme arrives via the `theme` prop; the "kr" price suffix and labels are passed in pre-formatted/localized.
 *   - Cart/purchased rows recede: the whole row dims (opacity) and the name greys + strikes through, but the row STAYS visible until moved/cleared.
 */
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ShoppingItem } from '@/store/useShoppingStore';
import { AppColors, Fonts, FontSize, Radius, Spacing } from '@/constants/theme';
import { useScaledStyles } from '@/lib/useAppTheme';

type Variant = 'planned' | 'cart' | 'purchased';

type Props = {
  item: ShoppingItem;
  theme: AppColors;
  variant?: Variant;
  onToggle: () => void;
  onRemove: () => void;
  inStockLabel?: string;
};

export default function ShoppingRow({ item, theme, variant = 'planned', onToggle, onRemove, inStockLabel }: Props) {
  const styles = useScaledStyles(baseStyles);
  const qty = parseInt(item.amount, 10);
  const isNumeric = !isNaN(qty) && qty > 0;
  const dimmed = variant !== 'planned';

  const priceTotal = item.price > 0 && isNumeric ? item.price * qty : null;

  // Build meta parts: qty+unit, price
  const metaParts: string[] = [];
  metaParts.push(`${item.amount}${item.unit ? ' ' + item.unit : ''}`);
  if (item.price > 0) metaParts.push(`${item.price.toFixed(0)} kr/stk`);
  if (priceTotal !== null) metaParts.push(`= ${priceTotal.toFixed(0)} kr`);

  return (
    <View style={[styles.row, dimmed && styles.rowChecked]}>
      <Pressable
        style={[
          styles.check,
          variant === 'planned' && { borderColor: theme.green },
          variant === 'cart' && { borderColor: theme.orange },
          variant === 'purchased' && { backgroundColor: theme.green, borderColor: theme.green },
        ]}
        onPress={onToggle}
        disabled={variant === 'purchased'}
        hitSlop={6}
      >
        {variant === 'planned' && <Ionicons name="add" size={16} color={theme.green} />}
        {variant === 'cart' && <Ionicons name="remove" size={16} color={theme.orange} />}
        {variant === 'purchased' && <Ionicons name="checkmark" size={14} color={theme.white} />}
      </Pressable>

      <View style={styles.content}>
        <Text style={[styles.name, { color: theme.text }, dimmed && { color: theme.gray, textDecorationLine: 'line-through' }]}>
          {item.name}
        </Text>
        {(metaParts.length > 0 || item.inventoryQty > 0) && (
          <View style={styles.metaRow}>
            {metaParts.map((part, i) => (
              <Text key={i} style={[styles.meta, { color: theme.textLight }]}>{part}</Text>
            ))}
            {item.inventoryQty > 0 && inStockLabel ? (
              <Text style={[styles.meta, { color: theme.green }]}>{inStockLabel}: {item.inventoryQty}</Text>
            ) : null}
          </View>
        )}
      </View>

      <Pressable style={styles.remove} onPress={onRemove} hitSlop={8}>
        <Text style={[styles.removeText, { color: theme.gray }]}>×</Text>
      </Pressable>
    </View>
  );
}

const baseStyles = StyleSheet.create({
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
  content: { flex: 1, minWidth: 0 },
  name: { fontSize: FontSize.md, fontFamily: Fonts.semibold },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 2 },
  meta: { fontSize: FontSize.xs },
  remove: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
  removeText: { fontSize: 20, lineHeight: 22 },
});
