/**
 * MonthlyTableRow.tsx — Katalog row (permanent inventory item).
 *
 * Renders one Katalog item: a leading checkbox that flags pendingRestock
 * (stages it into the weekly staging tray, independent of `status`), the
 * name (with a "Midlertidig" pill badge when isTemporary), the target
 * quantity, and the estimated price. Tapping the row body (not the checkbox)
 * opens the Update Sheet. Swipe left to reveal delete (with an inline confirm
 * step) instead of an always-visible ×.
 *
 * Connections:
 *   Imports → constants/theme, lib/haptics, store/useShoppingStore
 *   Used by → app/shopping.tsx
 *   Data    → consumes the ShoppingItem type from useShoppingStore; mutations happen in the parent via onTogglePending/onPress/onDelete; scaled fontSize via useScaledStyles()
 *
 * Edit notes:
 *   - There is no inline +/- stepper any more — targetQuantity is only ever
 *     edited via the Update Sheet (components/UpdateSheet.tsx).
 *   - Swipe-to-delete uses a Reanimated translateX + a revealed delete button;
 *     tapping that button arms an inline "Er du sikker?" confirm before calling onDelete.
 */
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Reanimated, { useSharedValue, useAnimatedStyle, withSpring, withTiming, runOnJS } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { ShoppingItem } from '@/store/useShoppingStore';
import { AppColors, Fonts, FontSize, Radius, Spacing } from '@/constants/theme';
import { useScaledStyles } from '@/lib/useAppTheme';
import { selection } from '@/lib/haptics';

type Props = {
  item: ShoppingItem;
  theme: AppColors;
  onTogglePending: () => void;
  onPress: () => void;
  onDelete: () => void;
  temporaryLabel?: string;
  reducedMotion?: boolean;
};

const SWIPE_REVEAL = -72;

export default function MonthlyTableRow({ item, theme, onTogglePending, onPress, onDelete, temporaryLabel, reducedMotion }: Props) {
  const styles = useScaledStyles(baseStyles);
  const [deleteArmed, setDeleteArmed] = useState(false);
  const translateX = useSharedValue(0);

  const panGesture = Gesture.Pan()
    .onUpdate((e) => {
      if (e.translationX < 0) translateX.value = Math.max(e.translationX, SWIPE_REVEAL * 1.4);
    })
    .onEnd((e) => {
      if (e.translationX < SWIPE_REVEAL / 2) {
        translateX.value = reducedMotion ? SWIPE_REVEAL : withSpring(SWIPE_REVEAL, { damping: 18, stiffness: 200 });
        runOnJS(selection)();
      } else {
        translateX.value = reducedMotion ? 0 : withSpring(0, { damping: 18, stiffness: 200 });
      }
    });

  const rowAnimStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  function handleDeletePress() {
    if (deleteArmed) {
      onDelete();
    } else {
      setDeleteArmed(true);
    }
  }

  function resetSwipe() {
    setDeleteArmed(false);
    translateX.value = reducedMotion ? 0 : withTiming(0, { duration: 150 });
  }

  return (
    <View style={styles.wrap}>
      <View style={[styles.deleteReveal, { backgroundColor: deleteArmed ? theme.danger : theme.dangerLight }]}>
        <Pressable style={styles.deleteBtn} onPress={handleDeletePress}>
          <Ionicons name="trash" size={18} color={deleteArmed ? '#fff' : theme.danger} />
        </Pressable>
      </View>

      <GestureDetector gesture={panGesture}>
        <Reanimated.View style={[styles.row, rowAnimStyle, { backgroundColor: theme.white }]}>
          <Pressable
            style={[styles.check, { borderColor: theme.orange }, item.pendingRestock && { backgroundColor: theme.orange, borderColor: theme.orange }]}
            onPress={onTogglePending}
            hitSlop={6}
          >
            {item.pendingRestock && <Ionicons name="checkmark" size={14} color={theme.white} />}
          </Pressable>

          <Pressable style={styles.itemCol} onPress={() => { resetSwipe(); onPress(); }}>
            <Text style={[styles.name, { color: theme.text }]} numberOfLines={1}>
              {item.name}
            </Text>
            <View style={styles.metaRow}>
              {item.isTemporary && temporaryLabel && (
                <View style={[styles.tempPill, { backgroundColor: theme.orangeLight }]}>
                  <Text style={[styles.tempPillText, { color: theme.orange }]}>{temporaryLabel}</Text>
                </View>
              )}
              <Text style={[styles.qtyMeta, { color: theme.textLight }]}>×{item.targetQuantity}</Text>
            </View>
          </Pressable>

          <Text style={[styles.priceCol, { color: theme.textLight }]}>
            {item.price > 0 ? `${item.price.toFixed(0)} kr` : '—'}
          </Text>
        </Reanimated.View>
      </GestureDetector>
    </View>
  );
}

const baseStyles = StyleSheet.create({
  wrap: { position: 'relative' },
  deleteReveal: {
    position: 'absolute',
    top: 0, right: 0, bottom: 0,
    width: 72,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.sm,
  },
  deleteBtn: { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.sm, gap: Spacing.sm },
  check: { width: 24, height: 24, borderRadius: Radius.full, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  itemCol: { flex: 1, minWidth: 0 },
  name: { fontSize: FontSize.sm, fontFamily: Fonts.semibold },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  tempPill: { borderRadius: Radius.full, paddingHorizontal: 6, paddingVertical: 1 },
  tempPillText: { fontSize: 10, fontWeight: '700' },
  qtyMeta: { fontSize: FontSize.xs },
  priceCol: { fontSize: FontSize.xs, textAlign: 'right', minWidth: 50 },
});
