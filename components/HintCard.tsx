/**
 * HintCard.tsx — dismissible inline helper card shown on most screens.
 *
 * Renders a flat, bordered hint with an info icon and a left accent bar —
 * deliberately flatter than the elevated/material function cards so hints
 * read as "explanation", not "content". Returns null when the user has
 * disabled hints, so screens can mount it unconditionally.
 *
 * Connections:
 *   Imports → constants/theme, store/useSettingsStore
 *   Used by → app/habits.tsx, app/health.tsx, app/index.tsx, app/meals.tsx, app/plans.tsx, app/scan.tsx, app/settings.tsx, app/shared.tsx, app/shopping.tsx, app/task-form.tsx
 *   Data    → reads showHints + colorTheme from useSettingsStore (no writes)
 *
 * Edit notes:
 *   - Gated on showHints; renders nothing when hints are off — callers should still pass text/example.
 *   - text/example are passed in already-localized; this component does not call useT() itself.
 *   - Uses theme.hintBg/hintBorder/hintAccent (derived from the theme's own primary colour),
 *     not greenLight — keeps the hint surface in tune with whichever theme/colour is active.
 */
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FontSize, Radius, Spacing } from '@/constants/theme';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useAppTheme } from '@/lib/useAppTheme';

type Props = {
  text: string;
  example?: string;
};

export default function HintCard({ text, example }: Props) {
  const showHints = useSettingsStore((s) => s.showHints);
  const theme = useAppTheme();

  if (!showHints) return null;

  return (
    <View style={[styles.card, { backgroundColor: theme.hintBg, borderColor: theme.hintBorder }]}>
      <View style={[styles.accentBar, { backgroundColor: theme.hintAccent }]} />
      <Ionicons name="information-circle-outline" size={16} color={theme.hintAccent} style={styles.icon} />
      <View style={styles.body}>
        <Text style={[styles.text, { color: theme.text }]}>{text}</Text>
        {example ? <Text style={[styles.example, { color: theme.textLight }]}>{example}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderRadius: Radius.sm,
    borderWidth: 1,
    overflow: 'hidden',
    paddingVertical: Spacing.sm,
    paddingRight: Spacing.md,
    marginBottom: Spacing.sm,
  },
  accentBar: {
    width: 3,
    alignSelf: 'stretch',
    marginRight: Spacing.sm,
  },
  icon: {
    marginTop: 2,
    marginRight: Spacing.xs,
  },
  body: {
    flex: 1,
    gap: Spacing.xs,
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
