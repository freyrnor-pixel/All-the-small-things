import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ShoppingItem } from '@/store/useShoppingStore';
import { AppColors, FontSize, Radius, Spacing } from '@/constants/theme';

type Props = {
  item: ShoppingItem;
  theme: AppColors;
  onToggle: () => void;
  onRemove: () => void;
  onAdjust?: (delta: number) => void;
  fromMonthlyLabel?: string;
};

export default function ShoppingRow({ item, theme, onToggle, onRemove, onAdjust, fromMonthlyLabel }: Props) {
  const qty = parseInt(item.amount, 10);
  const isNumeric = !isNaN(qty) && qty > 0;

  return (
    <View style={styles.row}>
      <Pressable
        style={[styles.check, { borderColor: theme.green }, item.checked && { backgroundColor: theme.green, borderColor: theme.green }]}
        onPress={onToggle}
        hitSlop={4}
      >
        {item.checked && <Text style={styles.checkMark}>✓</Text>}
      </Pressable>

      <View style={styles.content}>
        <Text style={[styles.name, { color: theme.text }, item.checked && { color: theme.gray, textDecorationLine: 'line-through' }]}>
          {item.name}
        </Text>
        <View style={styles.metaRow}>
          {item.unit ? (
            <Text style={[styles.meta, { color: theme.textLight }]}>{item.unit}</Text>
          ) : null}
          {item.store ? (
            <Text style={[styles.meta, { color: theme.textLight }]}>{item.store}</Text>
          ) : null}
          {item.monthlySourceId && fromMonthlyLabel ? (
            <Text style={[styles.sourceTag, { color: theme.orange }]}>{fromMonthlyLabel}</Text>
          ) : null}
        </View>
      </View>

      {/* Amount stepper */}
      {isNumeric && onAdjust && !item.checked ? (
        <View style={styles.stepper}>
          <Pressable
            style={[styles.stepBtn, { backgroundColor: theme.grayLight }]}
            onPress={() => onAdjust(-1)}
            hitSlop={4}
          >
            <Text style={[styles.stepText, { color: theme.text }]}>−</Text>
          </Pressable>
          <Text style={[styles.qty, { color: theme.text }]}>{item.amount}</Text>
          <Pressable
            style={[styles.stepBtn, { backgroundColor: theme.orange }]}
            onPress={() => onAdjust(+1)}
            hitSlop={4}
          >
            <Text style={[styles.stepText, { color: '#fff' }]}>+</Text>
          </Pressable>
        </View>
      ) : (
        <Text style={[styles.staticQty, { color: theme.textLight }]}>
          {item.amount}{item.unit ? ` ${item.unit}` : ''}
        </Text>
      )}

      {item.price > 0 && (
        <Text style={[styles.price, { color: theme.textLight }]}>{item.price.toFixed(0)} kr</Text>
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
  check: {
    width: 24,
    height: 24,
    borderRadius: Radius.full,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkMark: { color: '#fff', fontSize: FontSize.xs, fontWeight: '700' },
  content: { flex: 1, minWidth: 0 },
  name: { fontSize: FontSize.md },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 1 },
  meta: { fontSize: FontSize.xs },
  sourceTag: { fontSize: FontSize.xs, fontWeight: '600' },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  stepBtn: {
    width: 26,
    height: 26,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepText: { fontSize: FontSize.md, fontWeight: '700', lineHeight: 20 },
  qty: { fontSize: FontSize.sm, fontWeight: '700', minWidth: 20, textAlign: 'center' },
  staticQty: { fontSize: FontSize.sm },
  price: { fontSize: FontSize.xs, fontWeight: '500' },
  remove: { width: 24, height: 24, alignItems: 'center', justifyContent: 'center' },
  removeText: { fontSize: 20, lineHeight: 22 },
});
