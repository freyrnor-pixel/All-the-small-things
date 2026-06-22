/**
 * UnFocus — Button
 *
 * Primary action button. Three variants × three sizes × optional disabled state.
 * Follows the design handoff spec exactly:
 *   - filled primary (default), outline secondary, text-only ghost
 *   - min height 44px (HIT_TARGET); Nunito Bold
 *   - active opacity 0.8 on press, no ripple
 *
 * Usage:
 *   <Button onPress={save}>Save</Button>
 *   <Button variant="secondary" size="sm" onPress={cancel}>Cancel</Button>
 *   <Button variant="primary" size="lg" full iconRight="arrow-forward" onPress={next}>
 *     Get started
 *   </Button>
 */

import React from 'react';
import { Pressable, Text, StyleSheet, View, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/components/ThemeProvider';
import { FontFamily, FontSize, FontWeight, Radius, Spacing, HIT_TARGET } from '@/constants/theme';

type Variant = 'primary' | 'secondary' | 'ghost';
type Size    = 'sm' | 'md' | 'lg';

interface ButtonProps {
  variant?:  Variant;
  size?:     Size;
  full?:     boolean;
  disabled?: boolean;
  loading?:  boolean;
  icon?:     keyof typeof Ionicons.glyphMap;
  iconRight?: keyof typeof Ionicons.glyphMap;
  onPress?:  () => void;
  children:  React.ReactNode;
}

const HEIGHT: Record<Size, number> = { sm: 36, md: HIT_TARGET, lg: 52 };
const FONT:   Record<Size, number> = { sm: FontSize.smmd, md: FontSize.base, lg: FontSize.lg };
const PH:     Record<Size, number> = { sm: Spacing.s16,  md: Spacing.s24,   lg: Spacing.s32 };
const ICON:   Record<Size, number> = { sm: 16,           md: 18,            lg: 20 };

export function Button({
  variant  = 'primary',
  size     = 'md',
  full     = false,
  disabled = false,
  loading  = false,
  icon,
  iconRight,
  onPress,
  children,
}: ButtonProps) {
  const { colors, shadows } = useTheme();

  const bg = variant === 'primary'   ? colors.primary
           : variant === 'secondary' ? colors.primarySoft
           : 'transparent';

  const textColor = variant === 'primary'   ? colors.onPrimary
                  : variant === 'secondary' ? colors.primary
                  : colors.primary;

  const borderStyle = variant === 'secondary'
    ? { borderWidth: 1, borderColor: colors.primary }
    : {};

  return (
    <Pressable
      onPress={!disabled && !loading ? onPress : undefined}
      style={({ pressed }) => [
        styles.base,
        {
          height: HEIGHT[size],
          paddingHorizontal: PH[size],
          backgroundColor: bg,
          opacity: disabled ? 0.45 : pressed ? 0.8 : 1,
          alignSelf: full ? 'stretch' : 'auto',
          ...shadows.button,
          ...borderStyle,
        },
      ]}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
    >
      {loading ? (
        <ActivityIndicator color={textColor} size="small" />
      ) : (
        <>
          {icon && (
            <Ionicons name={icon} size={ICON[size]} color={textColor} style={styles.iconLeft} />
          )}
          <Text style={[styles.label, { fontSize: FONT[size], color: textColor }]}>
            {children}
          </Text>
          {iconRight && (
            <Ionicons name={iconRight} size={ICON[size]} color={textColor} style={styles.iconRight} />
          )}
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.full,
    minWidth: HIT_TARGET,
  },
  label: {
    fontFamily: FontFamily.sans,
    fontWeight: FontWeight.bold,
    includeFontPadding: false,
  },
  iconLeft:  { marginRight: 6 },
  iconRight: { marginLeft:  6 },
});
