/**
 * MonthlyTableRow.tsx — Excel-style row for the monthly shopping list.
 *
 * Renders one monthly item as Item / Price / Total / Amount columns, with a
 * leading circle that stages the item (grey + strikethrough) for the
 * "Save / Add to shopping list" commit step, an amount stepper, and remove.
 *
 * Connections:
 *   Imports → constants/theme, store/useShoppingStore
 *   Used by → app/shopping.tsx
 *   Data    → consumes the ShoppingItem type from useShoppingStore; mutations happen in the parent via onStage/onRemove/onAdjust; scaled fontSize via useScaledStyles()
 *
 * Edit notes:
 *   - Total = price * amount; amount falls back to 1 when not a positive integer.
 *   - Staged rows (status 'staged') render grey + strikethrough, mirroring ShoppingRow's checked styling.
 *   - A small "Temporary" tag renders for isTemporary items so they read as distinct from static staples.
 */
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ShoppingItem } from '@/store/useShoppingStore';
import { AppColors, Fonts, FontSize, Radius, Spacing } from '@/constants/theme';
import { useScaledStyles } from '@/lib/useAppTheme';

type Props = {
  item: ShoppingItem;
  theme: AppColors;
  onStage: () => void;
  onRemove: () => void;
  onAdjust: (delta: number) => void;
  temporaryLabel?: string;
};

export default function MonthlyTableRow({ item, theme, onStage, onRemove, onAdjust, temporaryLabel }: Props) {
  const styles = useScaledStyles(baseStyles);
  const qty = parseInt(item.amount, 10) || 1;
  const staged = item.status === 'staged';
  const total = item.price * qty;

  return (
    <View style={[styles.row, staged && styles.rowStaged]}>
      <Pressable
        style={[styles.check, { borderColor: theme.orange }, staged && { backgroundColor: theme.orange, borderColor: theme.orange }]}
        onPress={onStage}
        hitSlop={6}
      >
        {staged && <Ionicons name="checkmark" size={14} color={theme.white} />}
      </Pressable>

      <View style={styles.itemCol}>
        <Text
          style={[styles.name, { color: theme.text }, staged && { color: theme.gray, textDecorationLine: 'line-through' }]}
          numberOfLines={1}
        >
          {item.name}
        </Text>
        {item.isTemporary && temporaryLabel && (
          <Text style={[styles.tempTag, { color: theme.orange }]}>{temporaryLabel}</Text>
        )}
      </View>

      <Text style={[styles.priceCol, { color: theme.textLight }]}>{item.price > 0 ? `${item.price.toFixed(0)} kr` : '—'}</Text>
      <Text style={[styles.totalCol, { color: theme.text }]}>{total > 0 ? `${total.toFixed(0)} kr` : '—'}</Text>

      <View style={styles.stepper}>
        <Pressable style={[styles.stepBtn, { backgroundColor: theme.grayLight }]} onPress={() => onAdjust(-1)} hitSlop={4}>
          <Text style={[styles.stepText, { color: theme.text }]}>−</Text>
        </Pressable>
        <Text style={[styles.qty, { color: theme.text }]}>{qty}</Text>
        <Pressable style={[styles.stepBtn, { backgroundColor: theme.orange }]} onPress={() => onAdjust(+1)} hitSlop={4}>
          <Text style={[styles.stepText, { color: '#fff' }]}>+</Text>
        </Pressable>
      </View>

      <Pressable style={styles.remove} onPress={onRemove} hitSlop={8}>
        <Text style={[styles.removeText, { color: theme.gray }]}>×</Text>
      </Pressable>
    </View>
  );
}

const baseStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.sm, gap: Spacing.xs },
  rowStaged: { opacity: 0.55 },
  check: { width: 24, height: 24, borderRadius: Radius.full, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  itemCol: { flex: 2, minWidth: 0 },
  name: { fontSize: FontSize.sm, fontFamily: Fonts.semibold },
  tempTag: { fontSize: 10, fontWeight: '700', marginTop: 1 },
  priceCol: { flex: 1, fontSize: FontSize.xs, textAlign: 'right' },
  totalCol: { flex: 1, fontSize: FontSize.xs, fontWeight: '700', textAlign: 'right' },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  stepBtn: { width: 22, height: 22, borderRadius: Radius.full, alignItems: 'center', justifyContent: 'center' },
  stepText: { fontSize: FontSize.sm, fontWeight: '700', lineHeight: 16 },
  qty: { fontSize: FontSize.xs, fontWeight: '700', minWidth: 16, textAlign: 'center' },
  remove: { width: 22, height: 22, alignItems: 'center', justifyContent: 'center' },
  removeText: { fontSize: 18, lineHeight: 20 },
});
