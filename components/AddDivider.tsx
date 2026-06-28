/**
 * AddDivider.tsx — small grey "+" flanked by divider lines.
 *
 * Replaces the orange AddFAB at inline "add a row here" spots inside a list/stack
 * (as opposed to AddFAB's own screen-level floating-action role, which is untouched).
 * The flanking lines make it double as a visual separator between adjacent cards,
 * so the same component can be dropped once per item (Plans/Health, one per card)
 * or once per list (Shopping's existing single add-row spots).
 *
 * Connections:
 *   Imports → constants/theme, lib/useAppTheme
 *   Used by → app/plans.tsx, app/health.tsx, components/WeekListCard.tsx, app/shopping.tsx
 *   Data    → none — purely presentational, fires onPress
 */
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '@/lib/useAppTheme';
import { Fonts, Radius, Spacing } from '@/constants/theme';

type Props = { onPress: () => void; disabled?: boolean };

export default function AddDivider({ onPress, disabled }: Props) {
  const theme = useAppTheme();
  return (
    <View style={[styles.row, disabled && styles.gated]} pointerEvents={disabled ? 'none' : 'auto'}>
      <View style={[styles.line, { backgroundColor: theme.grayLight }]} />
      <Pressable onPress={onPress} style={[styles.button, { backgroundColor: theme.grayLight }]} hitSlop={6}>
        <Text style={[styles.plus, { color: theme.textLight }]}>+</Text>
      </Pressable>
      <View style={[styles.line, { backgroundColor: theme.grayLight }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingVertical: Spacing.xs },
  line: { flex: 1, height: 1 },
  button: { width: 24, height: 24, borderRadius: Radius.full, alignItems: 'center', justifyContent: 'center' },
  plus: { fontSize: 14, fontFamily: Fonts.bold },
  gated: { opacity: 0.45 },
});
