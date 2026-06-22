/**
 * UnFocus — Surface Components
 * Card · HintCard
 */

import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/components/ThemeProvider';
import { FontFamily, FontSize, Radius, Spacing } from '@/constants/theme';

// ── Card ─────────────────────────────────────────────────────────────────────

/**
 * Container surface.
 * Default: white bg, 1px border, radius 6, 12px padding, card shadow.
 * `sunken` variant: soft background, no shadow — used for empty states and wells.
 */
interface CardProps {
  children:  React.ReactNode;
  sunken?:   boolean;
  style?:    ViewStyle;
  /** Remove the default padding (e.g. when the card contains a list of rows) */
  noPadding?: boolean;
}

export function Card({ children, sunken = false, style, noPadding = false }: CardProps) {
  const { colors, shadows } = useTheme();

  return (
    <View style={[
      styles.card,
      {
        backgroundColor: sunken ? colors.surfaceSunken : colors.surfaceCard,
        borderColor:     sunken ? colors.borderDivider  : colors.borderCard,
        padding:         noPadding ? 0 : Spacing.cardPadding,
      },
      !sunken && shadows.card,
      style,
    ]}>
      {children}
    </View>
  );
}

// ── HintCard ─────────────────────────────────────────────────────────────────

/**
 * Soft informational card.
 * Light tinted background matching the theme's hint colour.
 * Lightbulb icon to the left; text body to the right.
 */
interface HintCardProps {
  text:   string;
  example?: string;
  style?: ViewStyle;
}

export function HintCard({ text, example, style }: HintCardProps) {
  const { colors } = useTheme();

  return (
    <View style={[
      styles.hint,
      {
        backgroundColor: colors.hintBg,
        borderColor:     colors.hintBorder,
      },
      style,
    ]}>
      <Ionicons
        name="information-circle"
        size={18}
        color={colors.hintAccent}
        style={styles.hintIcon}
      />
      <View style={styles.hintBody}>
        <Text style={[styles.hintText, { color: colors.textBody }]}>{text}</Text>
        {example && (
          <Text style={[styles.hintExample, { color: colors.textMuted }]}>{example}</Text>
        )}
      </View>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.xl,
    borderWidth: 1,
    overflow: 'hidden',
  },
  hint: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: Spacing.s12,
    gap: Spacing.s8,
    marginTop: Spacing.s8,
  },
  hintIcon: {
    marginTop: 1,
    flexShrink: 0,
  },
  hintBody: {
    flex: 1,
    gap: Spacing.s4,
  },
  hintText: {
    fontFamily: FontFamily.sans,
    fontSize:   FontSize.smmd,
    lineHeight: FontSize.smmd * 1.5,
    includeFontPadding: false,
  },
  hintExample: {
    fontFamily: FontFamily.sans,
    fontSize:   FontSize.sm,
    lineHeight: FontSize.sm * 1.4,
    includeFontPadding: false,
  },
});
