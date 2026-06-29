/**
 * CoverHabitsSection.tsx — habit progress glance for the cover screen
 *
 * Shows up to 4 habits as icon + filled/empty dot indicating goal met, plus a
 * summary "X/Y done" line. Designed for the ~360×374dp Galaxy Z Flip cover
 * display — fixed layout, no scroll.
 *
 * Connections:
 *   Imports → react-native, constants/theme, lib/i18n, store/useHabitStore, components/Surface
 *   Used by → components/cover/CoverScreen
 *   Data    → receives habit summaries as props; scaled fontSize via useScaledStyles()
 */
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { AppColors, FontSize, Radius, Spacing } from '@/constants/theme';
import { Translations } from '@/lib/i18n';
import { useScaledStyles } from '@/lib/useAppTheme';
import Surface from '@/components/Surface';

export type HabitSummary = {
  id: string;
  icon: string;
  goalMet: boolean;
};

type Props = {
  habits: HabitSummary[];
  theme: AppColors;
  t: Translations;
};

export default function CoverHabitsSection({ habits, theme, t }: Props) {
  const styles = useScaledStyles(baseStyles);
  if (habits.length === 0) return null;

  const visible = habits.slice(0, 4);
  const done = visible.filter((h) => h.goalMet).length;

  return (
    <Surface tint={theme.offWhite} style={[styles.container, { marginHorizontal: Spacing.sm }]}>
      <View style={styles.header}>
        <Text style={[styles.label, { color: theme.text }]}>{t.cover.habitsToday}</Text>
        <Text style={[styles.summary, { color: theme.textLight }]}>
          {t.cover.habitsSummary(done, visible.length)}
        </Text>
      </View>
      <View style={styles.row}>
        {visible.map((h) => (
          <View key={h.id} style={styles.habitItem}>
            <Text style={styles.icon}>{h.icon}</Text>
            <View
              style={[
                styles.dot,
                { backgroundColor: h.goalMet ? theme.green : theme.grayLight },
              ]}
            />
          </View>
        ))}
      </View>
    </Surface>
  );
}

const baseStyles = StyleSheet.create({
  container: {
    borderRadius: Radius.md,
    padding: Spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.xs,
  },
  label: {
    fontSize: FontSize.sm,
    fontWeight: '600',
  },
  summary: {
    fontSize: FontSize.xs,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  habitItem: {
    alignItems: 'center',
    gap: 4,
  },
  icon: {
    fontSize: FontSize.lg,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: Radius.full,
  },
});
