/**
 * UnFocus — Badge
 *
 * Small pill label for counts or status tags.
 * Variants: primary, success, warning, error, neutral.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/components/ThemeProvider';
import { FontFamily, FontSize, FontWeight, Radius, Spacing } from '@/constants/theme';

type BadgeVariant = 'primary' | 'success' | 'warning' | 'error' | 'neutral';

interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
}

export function Badge({ variant = 'primary', children }: BadgeProps) {
  const { colors } = useTheme();

  const bg = variant === 'primary' ? colors.primarySoft
           : variant === 'success' ? colors.successSoft
           : variant === 'warning' ? colors.warningSoft
           : variant === 'error'   ? colors.errorSoft
           : colors.surfaceChip;

  const textColor = variant === 'primary' ? colors.primary
                  : variant === 'success' ? colors.success
                  : variant === 'warning' ? colors.warning
                  : variant === 'error'   ? colors.error
                  : colors.textMuted;

  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <Text style={[styles.text, { color: textColor }]}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderRadius:   Radius.full,
    paddingHorizontal: Spacing.s8,
    paddingVertical:   2,
    alignSelf: 'flex-start',
  },
  text: {
    fontFamily:  FontFamily.sans,
    fontWeight:  FontWeight.semibold,
    fontSize:    FontSize.xs,
    includeFontPadding: false,
  },
});

// ─────────────────────────────────────────────────────────────────────────────

/**
 * UnFocus — Chip
 *
 * Selectable toggle pill, used in segmented groups or multi-selects.
 * When selected: filled primary background. Unselected: border + muted text.
 */

import { Pressable } from 'react-native';

interface ChipProps {
  label:    string;
  selected: boolean;
  onPress:  () => void;
}

export function Chip({ label, selected, onPress }: ChipProps) {
  const { colors } = useTheme();

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        borderRadius:   Radius.full,
        paddingHorizontal: Spacing.s12,
        paddingVertical:   Spacing.s6,
        backgroundColor: selected ? colors.primary : 'transparent',
        borderWidth: 1,
        borderColor: selected ? colors.primary : colors.borderInput,
        opacity: pressed ? 0.8 : 1,
      })}
      accessibilityRole="button"
      accessibilityState={{ selected }}
    >
      <Text style={{
        fontFamily: FontFamily.sans,
        fontWeight: FontWeight.medium,
        fontSize:   FontSize.smmd,
        color: selected ? colors.onPrimary : colors.textBody,
        includeFontPadding: false,
      }}>
        {label}
      </Text>
    </Pressable>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

/**
 * UnFocus — Avatar
 *
 * Circular user avatar. Shows an image if src is provided, otherwise renders
 * two-character initials centred on the primary colour.
 */

import { Image } from 'react-native';

type AvatarSize = 'sm' | 'md' | 'lg';
const AVATAR_PX: Record<AvatarSize, number> = { sm: 32, md: 40, lg: 56 };
const AVATAR_FONT: Record<AvatarSize, number> = { sm: FontSize.smmd, md: FontSize.base, lg: FontSize.xl };

interface AvatarProps {
  src?:      string;
  initials?: string;
  size?:     AvatarSize;
}

export function Avatar({ src, initials = '?', size = 'md' }: AvatarProps) {
  const { colors } = useTheme();
  const px = AVATAR_PX[size];

  if (src) {
    return (
      <Image
        source={{ uri: src }}
        style={{ width: px, height: px, borderRadius: px / 2 }}
      />
    );
  }

  return (
    <View style={{
      width: px, height: px, borderRadius: px / 2,
      backgroundColor: colors.primary,
      alignItems: 'center', justifyContent: 'center',
    }}>
      <Text style={{
        fontFamily: FontFamily.sans,
        fontWeight: FontWeight.extrabold,
        fontSize:   AVATAR_FONT[size],
        color: colors.onPrimary,
        includeFontPadding: false,
      }}>
        {initials.slice(0, 2).toUpperCase()}
      </Text>
    </View>
  );
}
