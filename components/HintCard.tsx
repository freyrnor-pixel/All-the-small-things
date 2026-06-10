/**
 * HintCard.tsx — dismissible inline helper card shown on most screens.
 *
 * Renders a green-tinted card with a hint line plus an example. Returns null
 * when the user has disabled hints, so screens can mount it unconditionally.
 *
 * Connections:
 *   Imports → constants/theme, store/useSettingsStore
 *   Used by → app/habits.tsx, app/health.tsx, app/index.tsx, app/meals.tsx, app/scan.tsx, app/settings.tsx, app/shared.tsx, app/shopping.tsx, app/task-form.tsx
 *   Data    → reads showHints + colorTheme from useSettingsStore (no writes)
 *
 * Edit notes:
 *   - Gated on showHints; renders nothing when hints are off — callers should still pass text/example.
 *   - text/example are passed in already-localized; this component does not call useT() itself.
 */
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { FontSize, Radius, Spacing, getTheme } from '@/constants/theme';
import { useSettingsStore } from '@/store/useSettingsStore';

type Props = {
  text: string;
  example: string;
};

export default function HintCard({ text, example }: Props) {
  const showHints = useSettingsStore((s) => s.showHints);
  const colorTheme = useSettingsStore((s) => s.colorTheme);
  const theme = getTheme(colorTheme);

  if (!showHints) return null;

  return (
    <View style={[styles.card, { backgroundColor: theme.greenLight }]}>
      <Text style={[styles.text, { color: theme.text }]}>{text}</Text>
      <Text style={[styles.example, { color: theme.textLight }]}>{example}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.md,
    padding: Spacing.md,
    gap: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  text: {
    fontSize: FontSize.sm,
    lineHeight: 20,
    fontWeight: '500',
  },
  example: {
    fontSize: FontSize.xs,
    lineHeight: 18,
    fontStyle: 'italic',
  },
});
