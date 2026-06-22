/**
 * Badge.tsx — small status pills, selectable chips, and initial avatars.
 *
 * Exports three related primitives that share the same rounded-pill shape:
 * `Badge` (status, non-interactive), `Chip` (toggleable filter pill), and
 * `Avatar` (initials circle, e.g. shared-household members).
 *
 * Connections:
 *   Imports → constants/theme, lib/useAppTheme, components/PressableScale
 *   Used by → any screen wanting status pills, filter chips, or initials avatars
 *   Data    → none (purely presentational)
 *
 * Edit notes:
 *   - Badge variants map to existing theme colours (no new hexes introduced).
 */
import React from 'react';
import { StyleSheet, Text, View, StyleProp, ViewStyle } from 'react-native';
import { FontSize, Fonts, Radius, Spacing } from '@/constants/theme';
import { useAppTheme } from '@/lib/useAppTheme';
import PressableScale from '@/components/PressableScale';

type BadgeVariant = 'neutral' | 'success' | 'warning' | 'danger';

type BadgeProps = {
  label: string;
  variant?: BadgeVariant;
  style?: StyleProp<ViewStyle>;
};

export function Badge({ label, variant = 'neutral', style }: BadgeProps) {
  const theme = useAppTheme();
  const bg =
    variant === 'success' ? theme.greenLight :
    variant === 'warning' ? theme.orangeLight :
    variant === 'danger' ? theme.dangerLight :
    theme.grayLight;
  const fg =
    variant === 'success' ? theme.green :
    variant === 'warning' ? theme.orange :
    variant === 'danger' ? theme.danger :
    theme.textLight;

  return (
    <View style={[styles.pill, { backgroundColor: bg }, style]}>
      <Text style={[styles.pillText, { color: fg }]}>{label}</Text>
    </View>
  );
}

type ChipProps = {
  label: string;
  selected?: boolean;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
};

export function Chip({ label, selected, onPress, style }: ChipProps) {
  const theme = useAppTheme();
  return (
    <PressableScale
      onPress={onPress}
      style={[
        styles.pill,
        styles.chip,
        {
          backgroundColor: selected ? theme.orange : theme.offWhite,
          borderColor: selected ? theme.orange : theme.border,
        },
        style,
      ]}
    >
      <Text style={[styles.pillText, { color: selected ? theme.white : theme.text }]}>{label}</Text>
    </PressableScale>
  );
}

type AvatarProps = {
  name: string;
  size?: number;
  color?: string;
};

export function Avatar({ name, size = 36, color }: AvatarProps) {
  const theme = useAppTheme();
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');

  return (
    <View
      style={[
        styles.avatar,
        { width: size, height: size, borderRadius: size / 2, backgroundColor: color ?? theme.orange },
      ]}
    >
      <Text style={[styles.avatarText, { fontSize: size * 0.4, color: theme.white }]}>{initials}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: Radius.full,
    alignSelf: 'flex-start',
  },
  pillText: {
    fontSize: FontSize.xs,
    fontFamily: Fonts.semibold,
  },
  chip: {
    borderWidth: 1,
    minHeight: 32,
    justifyContent: 'center',
  },
  avatar: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontFamily: Fonts.bold,
  },
});
