/**
 * ShoppingRow.tsx — single row in the shopping list with a move/collect button and remove.
 *
 * Presentational row for a ShoppingItem: a planned/cart/purchased leading button, name + meta
 * (unit / store / price), and a remove button. All actions are bubbled up via callbacks.
 *
 * Connections:
 *   Imports → constants/theme, lib/i18n, store/useShoppingStore
 *   Used by → app/shopping.tsx
 *   Data    → consumes the ShoppingItem type from useShoppingStore; mutations happen in the parent via onToggle/onCollect/onRemove/onMoveUp/onMoveDown; scaled fontSize via useScaledStyles()
 *
 * Edit notes:
 *   - onMoveUp/onMoveDown are optional and only rendered (as a small chevron-pair)
 *     when at least one is passed — Katalog/cart/purchased call sites never pass them,
 *     so they stay untouched. The weekly-list call site passes them per-row with
 *     reorder(id, 'up'|'down') from useShoppingStore, undefined on the first/last row
 *     of that list (renders that one chevron disabled rather than hiding the column).
 *   - `variant` drives the leading button: 'planned' shows a checkbox — unchecked is an
 *     outlined "+" (calls onToggle, which flips item.checked immediately via
 *     useShoppingStore.toggleCheck — no separate confirm step); once checked it renders
 *     filled/checked with the item name struck through + dimmed, same look as the other
 *     "in cart" states below, and tapping again unchecks it. 'cart' shows the "collected" checkbox (filled
 *     checkmark + strikethrough + CHECKED_OPACITY when item.collected, calls onCollect) —
 *     moving a cart item back to planned is a separate trailing "undo" icon (calls
 *     onToggle), so collecting and un-cart-ing don't share a button any more; 'purchased'
 *     shows a static checkmark (read-only — purchased/history rows only leave via
 *     removeWithSource, never onToggle).
 *   - The trailing remove button shows the red InventoryIcon (not "×") for
 *     `item.fromCatalog` rows on 'planned'/'cart' variants — those rows originated in
 *     the standing Katalog, so the parent's onRemove should put them back to
 *     status='catalog' (useShoppingStore.putBackToInventory) instead of deleting them.
 *     'purchased' rows and non-catalog (ad-hoc) rows keep the plain "×" delete look —
 *     this component doesn't decide which store action runs, only which icon to show.
 *   - dimmed (CHECKED_OPACITY) applies to 'purchased' rows and to 'cart' rows once collected —
 *     NOT to every cart row, since "moved to cart" alone should stay fully opaque. This is the
 *     same opacity constant used by the "Shopping done" disabled state in app/shopping.tsx —
 *     reuse CHECKED_OPACITY from here rather than a new literal if another file needs it.
 *   - There is no inline qty stepper any more (amount is edited via AddItemSheet/UpdateSheet) —
 *     amount+unit always appear in the meta sub-row. The old onAdjust/fromMonthlyLabel/
 *     monthlyTotal/monthlyLeftLabel props (and the monthly-source tag they fed) were removed as
 *     dead code — no caller in app/shopping.tsx ever passed them.
 *   - Price and unit always live in the meta sub-row (below the name), keeping the main row to just move-button + name + remove.
 *   - Theme arrives via the `theme` prop; the "kr" price suffix and labels are passed in pre-formatted/localized.
 *   - `locked` (from the parent Container's padlock, components/Container.tsx) dims and
 *     disables remove/move-up/move-down at opacity 0.45 — the checkmark/collect button
 *     (onToggle/onCollect) and the cart "undo" arrow stay fully interactive regardless,
 *     since locking only gates add/remove/edit, never the done/undo action.
 */
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ShoppingItem } from '@/store/useShoppingStore';
import { AppColors, Fonts, FontSize, Radius, Spacing } from '@/constants/theme';
import { useScaledStyles } from '@/lib/useAppTheme';
import { useT } from '@/lib/i18n';
import InventoryIcon from '@/components/InventoryIcon';

type Variant = 'planned' | 'cart' | 'purchased';

/** Shared "marked as done" dim amount — reuse this anywhere an item/button needs the same reduced-opacity treatment (e.g. the disabled "Shopping done" button in app/shopping.tsx). */
export const CHECKED_OPACITY = 0.55;

type Props = {
  item: ShoppingItem;
  theme: AppColors;
  variant?: Variant;
  onToggle: () => void;
  onCollect?: () => void;
  onRemove: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  inStockLabel?: string;
  locked?: boolean;
};

export default function ShoppingRow({ item, theme, variant = 'planned', onToggle, onCollect, onRemove, onMoveUp, onMoveDown, inStockLabel, locked }: Props) {
  const styles = useScaledStyles(baseStyles);
  const t = useT();
  const qty = parseInt(item.amount, 10);
  const isNumeric = !isNaN(qty) && qty > 0;
  const dimmed = variant === 'purchased' || (variant === 'cart' && item.collected) || (variant === 'planned' && item.checked);

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
          variant === 'planned' && (item.checked
            ? { backgroundColor: theme.green, borderColor: theme.green }
            : { borderColor: theme.green }),
          variant === 'cart' && (item.collected
            ? { backgroundColor: theme.green, borderColor: theme.green }
            : { borderColor: theme.orange }),
          variant === 'purchased' && { backgroundColor: theme.green, borderColor: theme.green },
        ]}
        onPress={variant === 'cart' ? onCollect : onToggle}
        disabled={variant === 'purchased'}
        hitSlop={6}
      >
        {variant === 'planned' && (item.checked
          ? <Ionicons name="checkmark" size={14} color={theme.white} />
          : <Ionicons name="add" size={16} color={theme.green} />)}
        {variant === 'cart' && item.collected && <Ionicons name="checkmark" size={14} color={theme.white} />}
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

      {(onMoveUp || onMoveDown) && (
        <View style={[styles.moveCol, locked && styles.gated]}>
          <Pressable
            style={styles.moveBtn}
            onPress={onMoveUp}
            disabled={!onMoveUp || locked}
            hitSlop={4}
            accessibilityLabel={t.moveItemUp}
          >
            <Ionicons name="chevron-up" size={14} color={onMoveUp ? theme.textLight : theme.grayLight} />
          </Pressable>
          <Pressable
            style={styles.moveBtn}
            onPress={onMoveDown}
            disabled={!onMoveDown || locked}
            hitSlop={4}
            accessibilityLabel={t.moveItemDown}
          >
            <Ionicons name="chevron-down" size={14} color={onMoveDown ? theme.textLight : theme.grayLight} />
          </Pressable>
        </View>
      )}

      {variant === 'cart' && (
        <Pressable style={styles.undo} onPress={onToggle} hitSlop={8}>
          <Ionicons name="arrow-undo" size={18} color={theme.gray} />
        </Pressable>
      )}

      <Pressable style={[styles.remove, locked && styles.gated]} onPress={onRemove} disabled={locked} hitSlop={8}>
        {item.fromCatalog && variant !== 'purchased' ? (
          <InventoryIcon size={18} color={theme.danger} />
        ) : (
          <Text style={[styles.removeText, { color: theme.gray }]}>×</Text>
        )}
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
  rowChecked: { opacity: CHECKED_OPACITY },
  gated: { opacity: 0.45 },
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
  moveCol: { justifyContent: 'center', gap: 2 },
  moveBtn: { width: 22, height: 18, alignItems: 'center', justifyContent: 'center' },
  undo: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
  remove: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
  removeText: { fontSize: 20, lineHeight: 22 },
});
