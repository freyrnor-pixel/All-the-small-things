import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ShoppingItem } from '@/store/useShoppingStore';
import { Colors, FontSize, Radius, Spacing } from '@/constants/theme';

type Props = {
  item: ShoppingItem;
  onToggle: () => void;
  onRemove: () => void;
};

export default function ShoppingRow({ item, onToggle, onRemove }: Props) {
  return (
    <View style={styles.row}>
      <Pressable
        style={[styles.check, item.checked && styles.checkDone]}
        onPress={onToggle}
      >
        {item.checked && <Text style={styles.checkMark}>✓</Text>}
      </Pressable>
      <View style={styles.content}>
        <Text style={[styles.name, item.checked && styles.done]}>
          {item.amount} {item.unit} {item.name}
        </Text>
        {item.store ? (
          <Text style={styles.store}>{item.store}</Text>
        ) : null}
      </View>
      {item.price > 0 && (
        <Text style={styles.price}>{item.price.toFixed(0)} kr</Text>
      )}
      <Pressable style={styles.remove} onPress={onRemove} hitSlop={8}>
        <Text style={styles.removeText}>×</Text>
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
    width: 22,
    height: 22,
    borderRadius: Radius.full,
    borderWidth: 2,
    borderColor: Colors.green,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkDone: {
    backgroundColor: Colors.green,
    borderColor: Colors.green,
  },
  checkMark: {
    color: Colors.white,
    fontSize: FontSize.xs,
    fontWeight: '700',
  },
  content: { flex: 1 },
  name: {
    fontSize: FontSize.md,
    color: Colors.text,
  },
  done: {
    color: Colors.gray,
    textDecorationLine: 'line-through',
  },
  store: {
    fontSize: FontSize.xs,
    color: Colors.textLight,
    marginTop: 2,
  },
  price: {
    fontSize: FontSize.sm,
    color: Colors.textLight,
    fontWeight: '500',
  },
  remove: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeText: {
    fontSize: 20,
    color: Colors.gray,
    lineHeight: 22,
  },
});
